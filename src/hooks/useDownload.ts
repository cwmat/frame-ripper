import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import type { ExtractedFrame } from '../types';
import { sanitizeFilename } from '../utils/fileUtils';

interface UseDownloadReturn {
  downloadZip: (frames: ExtractedFrame[], videoName: string) => Promise<void>;
  downloadSingleFrame: (frame: ExtractedFrame) => void;
  zipping: boolean;
  zipProgress: number;
}

export function useDownload(): UseDownloadReturn {
  const [zipping, setZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  const downloadZip = useCallback(
    async (frames: ExtractedFrame[], videoName: string) => {
      if (frames.length === 0) return;

      setZipping(true);
      setZipProgress(0);

      try {
        const zip = new JSZip();
        const folderName = 'frames';
        const folder = zip.folder(folderName)!;

        for (const frame of frames) {
          folder.file(frame.filename, frame.data);
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
        const baseName = sanitizeFilename(videoName.replace(/\.[^.]+$/, ''));
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const zipFilename = `frame-ripper-${baseName}-${timestamp}.zip`;

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
