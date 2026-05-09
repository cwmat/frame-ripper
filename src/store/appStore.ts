import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ExtractionMode,
  ExtractionStatus,
  OutputFormat,
  VideoInfo,
} from '../types';
import { DEFAULT_SETTINGS } from '../utils/constants';

interface AppState {
  // Extraction settings (persisted)
  extractionMode: ExtractionMode;
  fps: number;
  nthFrame: number;
  outputFormat: OutputFormat;
  jpgQuality: number;
  nearbyFrames: number;
  reverse: boolean;

  // Transient state (not persisted)
  cursorTime: number;
  status: ExtractionStatus;
  progress: number;
  progressLabel: string;
  videoInfo: VideoInfo | null;
  videoFile: File | null;
  frameCount: number;
  error: string | null;

  // Settings actions
  setExtractionMode: (mode: ExtractionMode) => void;
  setFps: (fps: number) => void;
  setNthFrame: (n: number) => void;
  setOutputFormat: (format: OutputFormat) => void;
  setJpgQuality: (quality: number) => void;
  setNearbyFrames: (n: number) => void;
  setCursorTime: (time: number) => void;
  setReverse: (value: boolean) => void;

  // State actions
  setStatus: (status: ExtractionStatus) => void;
  setProgress: (progress: number, label?: string) => void;
  setVideoInfo: (info: VideoInfo | null) => void;
  setVideoFile: (file: File | null) => void;
  setFrameCount: (count: number) => void;
  setError: (error: string | null) => void;

  // Resets
  resetExtraction: () => void;
  resetAll: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Persisted settings
      extractionMode: DEFAULT_SETTINGS.mode,
      fps: DEFAULT_SETTINGS.fps,
      nthFrame: DEFAULT_SETTINGS.nthFrame,
      outputFormat: DEFAULT_SETTINGS.format,
      jpgQuality: DEFAULT_SETTINGS.jpgQuality,
      nearbyFrames: DEFAULT_SETTINGS.nearbyFrames,
      reverse: DEFAULT_SETTINGS.reverse,

      // Transient state
      cursorTime: 0,
      status: 'idle',
      progress: 0,
      progressLabel: '',
      videoInfo: null,
      videoFile: null,
      frameCount: 0,
      error: null,

      // Settings actions
      setExtractionMode: (mode) => set({ extractionMode: mode }),
      setFps: (fps) => set({ fps }),
      setNthFrame: (n) => set({ nthFrame: n }),
      setOutputFormat: (format) => set({ outputFormat: format }),
      setJpgQuality: (quality) => set({ jpgQuality: quality }),
      setNearbyFrames: (n) => set({ nearbyFrames: n }),
      setCursorTime: (time) => set({ cursorTime: time }),
      setReverse: (value) => set({ reverse: value }),

      // State actions
      setStatus: (status) => set({ status }),
      setProgress: (progress, label) =>
        set(label ? { progress, progressLabel: label } : { progress }),
      setVideoInfo: (info) => set({ videoInfo: info }),
      setVideoFile: (file) => set({ videoFile: file }),
      setFrameCount: (count) => set({ frameCount: count }),
      setError: (error) => set({ error, status: error ? 'error' : 'idle' }),

      // Resets
      resetExtraction: () =>
        set({
          status: 'idle',
          progress: 0,
          progressLabel: '',
          frameCount: 0,
          error: null,
        }),
      resetAll: () =>
        set({
          extractionMode: DEFAULT_SETTINGS.mode,
          fps: DEFAULT_SETTINGS.fps,
          nthFrame: DEFAULT_SETTINGS.nthFrame,
          outputFormat: DEFAULT_SETTINGS.format,
          jpgQuality: DEFAULT_SETTINGS.jpgQuality,
          nearbyFrames: DEFAULT_SETTINGS.nearbyFrames,
          reverse: DEFAULT_SETTINGS.reverse,
          cursorTime: 0,
          status: 'idle',
          progress: 0,
          progressLabel: '',
          videoInfo: null,
          videoFile: null,
          frameCount: 0,
          error: null,
        }),
    }),
    {
      name: 'frame-ripper-settings',
      partialize: (state) => ({
        extractionMode: state.extractionMode,
        fps: state.fps,
        nthFrame: state.nthFrame,
        outputFormat: state.outputFormat,
        jpgQuality: state.jpgQuality,
        nearbyFrames: state.nearbyFrames,
        reverse: state.reverse,
      }),
    },
  ),
);
