import type { ExtractionSettings, OutputFormat } from '../types';
import { AT_CURSOR_NEIGHBOR_FPS } from './constants';

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

export function computeFramePlacement(
  i: number,
  total: number,
  originalName: string,
  reverse: boolean,
): { index: number; filename: string } {
  if (!reverse) {
    return { index: i, filename: originalName };
  }
  const dot = originalName.lastIndexOf('.');
  const ext = dot === -1 ? '' : originalName.slice(dot);
  const reversedIndex = total - 1 - i;
  const filename = `frame_${String(reversedIndex + 1).padStart(4, '0')}${ext}`;
  return { index: reversedIndex, filename };
}

function scaleFilterClause(maxWidth: number): string {
  // \\, in JS source → \, in the string → ffmpeg reads it as an escaped comma
  // (so the comma inside min() is not parsed as a filter-chain separator).
  // min(iw,W) prevents upscaling narrower videos. -2 keeps aspect ratio with an even height.
  return `scale='min(iw\\,${maxWidth})':-2`;
}

export function buildExtractionArgs(
  inputFilename: string,
  settings: ExtractionSettings,
): string[] {
  const outputPattern = getOutputPattern(settings.format);
  const args: string[] = [];
  const scale = settings.maxWidth > 0 ? scaleFilterClause(settings.maxWidth) : null;

  if (settings.mode === 'at-cursor') {
    // For cursor mode: seek to the cursor time, extract 1 + 2*nearby frames
    const totalFrames = 1 + 2 * settings.nearbyFrames;
    // Seek before the cursor to capture nearby frames before it.
    // Use a generous window: nearby * 1/AT_CURSOR_NEIGHBOR_FPS s (assumed neighborhood fps).
    const seekOffset = settings.nearbyFrames / AT_CURSOR_NEIGHBOR_FPS;
    const seekTime = Math.max(0, settings.cursorTime - seekOffset);
    args.push('-ss', String(seekTime), '-i', inputFilename);
    args.push('-frames:v', String(totalFrames));
    if (scale) {
      args.push('-vf', scale);
    }
  } else {
    args.push('-i', inputFilename);

    // Video filter chain: selection filter + optional scale, joined by `,`
    const filters: string[] = [];
    if (settings.mode === 'fps') {
      filters.push(`fps=${settings.fps}`);
    } else {
      // \\, in JS source → \, in the string → ffmpeg reads it as an escaped comma
      filters.push(`select=not(mod(n\\,${settings.nthFrame}))`);
    }
    if (scale) {
      filters.push(scale);
    }
    args.push('-vf', filters.join(','));

    if (settings.mode === 'every-nth') {
      args.push('-vsync', 'vfr');
    }
  }

  // Output format quality
  if (settings.format === 'jpg') {
    args.push('-q:v', String(mapJpgQuality(settings.jpgQuality)));
  }

  args.push(outputPattern);
  return args;
}
