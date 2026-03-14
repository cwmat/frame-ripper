import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { FFMPEG_CORE_BASE_URL } from '../utils/constants';

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export async function initFFmpeg(
  onProgress?: (progress: number) => void,
): Promise<FFmpeg> {
  // Return existing instance if already loaded
  if (ffmpegInstance?.loaded) return ffmpegInstance;

  // If currently loading, return the pending promise
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();

    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.max(0, Math.min(1, progress)));
      });
    }

    const coreURL = await toBlobURL(
      `${FFMPEG_CORE_BASE_URL}/ffmpeg-core.js`,
      'text/javascript',
    );
    const wasmURL = await toBlobURL(
      `${FFMPEG_CORE_BASE_URL}/ffmpeg-core.wasm`,
      'application/wasm',
    );

    await ffmpeg.load({ coreURL, wasmURL });

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  try {
    return await loadPromise;
  } catch (err) {
    loadPromise = null;
    throw err;
  }
}

export function getFFmpegInstance(): FFmpeg | null {
  return ffmpegInstance;
}

export function terminateFFmpeg(): void {
  if (ffmpegInstance) {
    ffmpegInstance.terminate();
    ffmpegInstance = null;
    loadPromise = null;
  }
}
