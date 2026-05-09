import type { ExtractionSettings } from '../types';

export const APP_NAME = 'FrameRipper';
export const APP_SLUG = 'frame-ripper';

export const FFMPEG_CORE_VERSION = '0.12.10';
export const FFMPEG_CORE_BASE_URL = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;

export const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/x-matroska',
  'video/quicktime',
  'video/x-msvideo',
];

export const ACCEPTED_VIDEO_EXTENSIONS = [
  '.mp4',
  '.webm',
  '.ogv',
  '.mkv',
  '.mov',
  '.avi',
];

export const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB

export const FPS_PRESETS = [0.5, 1, 2, 5, 10, 24, 30] as const;

export const OUTPUT_WIDTH_PRESETS = [0, 1920, 1280, 854, 640] as const;

export const MAX_OUTPUT_WIDTH = 7680;

export const AT_CURSOR_NEIGHBOR_FPS = 24;

export const DEFAULT_SETTINGS: ExtractionSettings = {
  mode: 'fps',
  fps: 1,
  nthFrame: 10,
  format: 'jpg',
  jpgQuality: 85,
  cursorTime: 0,
  nearbyFrames: 0,
  reverse: false,
  maxWidth: 0,
};

export const STATUS_LABELS: Record<string, string> = {
  idle: 'Ready',
  'loading-ffmpeg': 'Loading FFmpeg…',
  'reading-video': 'Reading video…',
  extracting: 'Extracting frames…',
  caching: 'Saving frames…',
  done: 'Done!',
  error: 'Error',
};
