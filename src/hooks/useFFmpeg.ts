import { useState, useEffect, useCallback } from 'react';
import type { FFmpeg } from '@ffmpeg/ffmpeg';
import { initFFmpeg, terminateFFmpeg } from '../wasm/ffmpegLoader';

interface UseFFmpegReturn {
  ffmpeg: FFmpeg | null;
  loading: boolean;
  error: Error | null;
  progress: number;
  load: () => Promise<void>;
  terminate: () => void;
}

export function useFFmpeg(): UseFFmpegReturn {
  const [ffmpeg, setFfmpeg] = useState<FFmpeg | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  const load = useCallback(async () => {
    if (ffmpeg?.loaded) return;
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      const instance = await initFFmpeg((p) => setProgress(p));
      setFfmpeg(instance);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load FFmpeg'));
    } finally {
      setLoading(false);
    }
  }, [ffmpeg]);

  const terminate = useCallback(() => {
    terminateFFmpeg();
    setFfmpeg(null);
    setProgress(0);
  }, []);

  useEffect(() => {
    return () => {
      // Don't terminate on unmount — singleton is reusable
    };
  }, []);

  return { ffmpeg, loading, error, progress, load, terminate };
}
