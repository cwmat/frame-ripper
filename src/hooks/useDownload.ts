import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import type { ExtractedFrame, ExtractionMode } from '../types';
import { sanitizeFilename } from '../utils/fileUtils';
import { buildZipEntryName, resolveZipPrefix } from '../utils/zipNaming';

export interface DownloadZipContext {
  mode: ExtractionMode;
  fps: number;
  nthFrame: number;
  cursorTime: number;
  nearbyFrames: number;
  filenamePrefix?: string;
}

interface UseDownloadReturn {
  downloadZip: (
    frames: ExtractedFrame[],
    videoName: string,
    context: DownloadZipContext,
  ) => Promise<void>;
  downloadSingleFrame: (frame: ExtractedFrame) => void;
  zipping: boolean;
  zipProgress: number;
}

export function useDownload(): UseDownloadReturn {
  const [zipping, setZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  const downloadZip = useCallback(
    async (frames: ExtractedFrame[], videoName: string, context: DownloadZipContext) => {
      if (frames.length === 0) return;

      setZipping(true);
      setZipProgress(0);

      try {
        const zip = new JSZip();
        const folderName = 'frames';
        const folder = zip.folder(folderName)!;

        const baseName = sanitizeFilename(videoName.replace(/\.[^.]+$/, ''));
        const effectivePrefix = resolveZipPrefix(context.filenamePrefix, baseName);

        for (let i = 0; i < frames.length; i++) {
          const frame = frames[i];
          const ext = frame.filename.endsWith('.png') ? '.png' : '.jpg';
          const entryName = buildZipEntryName({
            baseName: effectivePrefix,
            mode: context.mode,
            archiveIndex: i,
            totalFrames: frames.length,
            ext,
            cursorTime: context.cursorTime,
            nearbyFrames: context.nearbyFrames,
          });
          folder.file(entryName, frame.data);
        }

        const blob = await zip.generateAsync(
          {
            type: 'blob',
            compression: 'STORE', // Images are already compressed
            streamFiles: true,
          },
          (metadata) => {
            setZipProgress(metadata.percent / 100);
          },
        );

        // Trigger download
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const zipFilename = `frame-ripper-${effectivePrefix}-${timestamp}.zip`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = zipFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } finally {
        setZipping(false);
        setZipProgress(0);
      }
    },
    [],
  );

  const downloadSingleFrame = useCallback((frame: ExtractedFrame) => {
    const mimeType = frame.filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const blob = new Blob([frame.data.buffer as ArrayBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = frame.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return { downloadZip, downloadSingleFrame, zipping, zipProgress };
}
