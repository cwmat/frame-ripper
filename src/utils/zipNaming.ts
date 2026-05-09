import type { ExtractionMode } from '../types';
import { AT_CURSOR_NEIGHBOR_FPS } from './constants';
import { sanitizeFilename } from './fileUtils';

export interface ZipEntryNameInput {
  baseName: string;
  mode: ExtractionMode;
  archiveIndex: number;
  totalFrames: number;
  ext: string;
  cursorTime?: number;
  nearbyFrames?: number;
}

export function formatTimestampLabel(seconds: number): string | null {
  if (!Number.isFinite(seconds) || seconds < 0) return null;

  const totalMs = Math.round(seconds * 1000);
  const ms = totalMs % 1000;
  const totalSecs = Math.floor(totalMs / 1000);
  const s = totalSecs % 60;
  const totalMins = Math.floor(totalSecs / 60);
  const m = totalMins % 60;
  const h = Math.floor(totalMins / 60);

  const pad2 = (n: number) => String(n).padStart(2, '0');
  const pad3 = (n: number) => String(n).padStart(3, '0');

  return `${pad2(h)}-${pad2(m)}-${pad2(s)}.${pad3(ms)}`;
}

function indexLabel(archiveIndex: number, totalFrames: number): string {
  const width = Math.max(4, Math.ceil(Math.log10(totalFrames + 1)));
  return String(archiveIndex + 1).padStart(width, '0');
}

export function resolveZipPrefix(
  userPrefix: string | undefined,
  fallback: string,
): string {
  return sanitizeFilename(userPrefix?.trim() ?? '') || fallback;
}

export function buildZipEntryName(input: ZipEntryNameInput): string {
  const { baseName, mode, archiveIndex, totalFrames, ext } = input;

  let frameLabel: string | null = null;

  if (mode === 'at-cursor') {
    const cursorTime = input.cursorTime ?? NaN;
    const nearbyFrames = input.nearbyFrames ?? 0;
    const seekTime = Math.max(0, cursorTime - nearbyFrames / AT_CURSOR_NEIGHBOR_FPS);
    const frameTime = seekTime + archiveIndex / AT_CURSOR_NEIGHBOR_FPS;
    frameLabel = formatTimestampLabel(frameTime);
  }

  if (frameLabel === null) {
    frameLabel = indexLabel(archiveIndex, totalFrames);
  }

  return `${baseName}_${frameLabel}${ext}`;
}
