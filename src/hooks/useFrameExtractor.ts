import { useCallback, useRef } from 'react';
import type { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import type { ExtractionSettings, ExtractedFrame, ExtractionStatus } from '../types';
import { buildExtractionArgs } from '../utils/ffmpegCommands';
import { generateId, getFileExtension } from '../utils/fileUtils';
import { saveFrame } from '../store/frameDb';
import { useAppStore } from '../store/appStore';

interface UseFrameExtractorReturn {
  extract: (ffmpeg: FFmpeg, videoFile: File, settings: ExtractionSettings) => Promise<number>;
  cancel: () => void;
}

export function useFrameExtractor(): UseFrameExtractorReturn {
  const cancelledRef = useRef(false);
  const setStatus = useAppStore((s) => s.setStatus);
  const setProgress = useAppStore((s) => s.setProgress);
  const setFrameCount = useAppStore((s) => s.setFrameCount);
  const setError = useAppStore((s) => s.setError);

  const updateStatus = useCallback(
    (status: ExtractionStatus, label: string) => {
      setStatus(status);
      setProgress(0, label);
    },
    [setStatus, setProgress],
  );

  const extract = useCallback(
    async (ffmpeg: FFmpeg, videoFile: File, settings: ExtractionSettings): Promise<number> => {
      cancelledRef.current = false;

      try {
        // Step 1: Write video to WASM filesystem
        updateStatus('reading-video', 'Reading video file…');
        const ext = getFileExtension(videoFile.name) || '.mp4';
        const inputName = `input${ext}`;
        await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

        if (cancelledRef.current) return 0;

        // Step 2: Extract frames
        updateStatus('extracting', 'Extracting frames…');

        // Capture ffmpeg logs for debugging (they don't appear in console otherwise)
        const logHandler = ({ message }: { message: string }) => {
          console.debug('[ffmpeg]', message);
        };
        ffmpeg.on('log', logHandler);

        // Listen for progress during extraction
        const progressHandler = ({ progress }: { progress: number }) => {
          setProgress(Math.max(0, Math.min(1, progress)), 'Extracting frames…');
        };
        ffmpeg.on('progress', progressHandler);

        const args = buildExtractionArgs(inputName, settings);
        console.debug('[ffmpeg] exec args:', args);
        const exitCode = await ffmpeg.exec(args);

        ffmpeg.off('progress', progressHandler);
        ffmpeg.off('log', logHandler);

        if (exitCode !== 0) {
          throw new Error(`FFmpeg exited with code ${exitCode}`);
        }

        if (cancelledRef.current) return 0;

        // Step 3: Read extracted frames and cache to IndexedDB
        updateStatus('caching', 'Saving frames…');

        const outputExt = settings.format === 'jpg' ? 'jpg' : 'png';
        const prefix = 'frame_';
        const dirContents = await ffmpeg.listDir('/');
        const frameFiles = dirContents
          .filter((f) => !f.isDir && f.name.startsWith(prefix) && f.name.endsWith(`.${outputExt}`))
          .sort((a, b) => a.name.localeCompare(b.name));

        const totalFrames = frameFiles.length;
        setFrameCount(totalFrames);

        for (let i = 0; i < frameFiles.length; i++) {
          if (cancelledRef.current) break;

          const file = frameFiles[i];
          const data = (await ffmpeg.readFile(file.name)) as Uint8Array;

          const frame: ExtractedFrame = {
            id: generateId(),
            index: i,
            filename: file.name,
            data: new Uint8Array(data),
            size: data.byteLength,
          };

          await saveFrame(frame);
          await ffmpeg.deleteFile(file.name);

          setProgress((i + 1) / totalFrames, `Saving frame ${i + 1} of ${totalFrames}…`);
        }

        // Cleanup input file
        try {
          await ffmpeg.deleteFile(inputName);
        } catch {
          // Ignore cleanup errors
        }

        if (!cancelledRef.current) {
          setStatus('done');
          setProgress(1, 'Done!');
        }

        return totalFrames;
      } catch (err) {
        console.error('[FrameRipper] Extraction error:', err);
        const message = err instanceof Error ? err.message : 'Extraction failed';
        setError(message);
        return 0;
      }
    },
    [updateStatus, setProgress, setFrameCount, setStatus, setError],
  );

  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  return { extract, cancel };
}
