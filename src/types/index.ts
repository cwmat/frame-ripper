export type ExtractionMode = 'fps' | 'every-nth' | 'at-cursor';

export type OutputFormat = 'png' | 'jpg';

export interface ExtractionSettings {
  mode: ExtractionMode;
  fps: number;
  nthFrame: number;
  format: OutputFormat;
  jpgQuality: number;
  cursorTime: number;
  nearbyFrames: number;
}

export interface ExtractedFrame {
  id: string;
  index: number;
  filename: string;
  data: Uint8Array;
  size: number;
}

export type ExtractionStatus =
  | 'idle'
  | 'loading-ffmpeg'
  | 'reading-video'
  | 'extracting'
  | 'caching'
  | 'done'
  | 'error';

export interface VideoInfo {
  name: string;
  size: number;
  type: string;
  objectUrl: string;
}

export interface FrameSelectionState {
  selected: Set<number>;
  allSelected: boolean;
}
