import type { ExtractionSettings, OutputFormat } from '../types';

/**
 * Map a 1-100 quality scale to ffmpeg's inverted 2-31 scale for JPEG.
 * Quality 100 → q:v 2 (best), Quality 1 → q:v 31 (worst).
 */
function mapJpgQuality(quality: number): number {
  const clamped = Math.max(1, Math.min(100, quality));
  return Math.round(31 - ((clamped - 1) / 99) * 29);
}

export function getOutputPattern(format: OutputFormat): string {
  return `frame_%04d.${format === 'jpg' ? 'jpg' : 'png'}`;
}

export function buildExtractionArgs(
  inputFilename: string,
  settings: ExtractionSettings,
): string[] {
  const outputPattern = getOutputPattern(settings.format);
  const args: string[] = [];

  if (settings.mode === 'at-cursor') {
    // For cursor mode: seek to the cursor time, extract 1 + 2*nearby frames
    const totalFrames = 1 + 2 * settings.nearbyFrames;
    // Seek before the cursor to capture nearby frames before it.
    // Use a generous window: nearby * 1/24s (assuming ~24fps ballpark).
    const seekOffset = settings.nearbyFrames / 24;
    const seekTime = Math.max(0, settings.cursorTime - seekOffset);
    args.push('-ss', String(seekTime), '-i', inputFilename);
    args.push('-frames:v', String(totalFrames));
  } else {
    args.push('-i', inputFilename);

    // Video filter
    if (settings.mode === 'fps') {
      args.push('-vf', `fps=${settings.fps}`);
    } else {
      // \\, in JS source → \, in the string → ffmpeg reads it as an escaped comma
      args.push('-vf', `select=not(mod(n\\,${settings.nthFrame}))`, '-vsync', 'vfr');
    }
  }

  // Output format quality
  if (settings.format === 'jpg') {
    args.push('-q:v', String(mapJpgQuality(settings.jpgQuality)));
  }

  args.push(outputPattern);
  return args;
}
