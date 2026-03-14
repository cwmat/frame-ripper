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
  const args: string[] = ['-i', inputFilename];

  // Video filter
  if (settings.mode === 'fps') {
    args.push('-vf', `fps=${settings.fps}`);
  } else {
    // \\, in JS source → \, in the string → ffmpeg reads it as an escaped comma
    args.push('-vf', `select=not(mod(n\\,${settings.nthFrame}))`, '-vsync', 'vfr');
  }

  // Output format quality
  if (settings.format === 'jpg') {
    args.push('-q:v', String(mapJpgQuality(settings.jpgQuality)));
  }

  args.push(outputPattern);
  return args;
}
