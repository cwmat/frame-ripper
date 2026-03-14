import { useCallback, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';

import { Layout } from './components/layout/Layout';
import { DropZone } from './components/ui/DropZone';
import { ProgressBar } from './components/ui/ProgressBar';
import { Button } from './components/ui/Button';
import { VideoPreview } from './components/features/VideoPreview';
import { ExtractionSettings } from './components/features/ExtractionSettings';
import { FrameGallery } from './components/features/FrameGallery';
import { DownloadPanel } from './components/features/DownloadPanel';
import { toast } from './utils/toast';

import { useFFmpeg } from './hooks/useFFmpeg';
import { useFrameExtractor } from './hooks/useFrameExtractor';
import { useDownload } from './hooks/useDownload';
import { useAppStore } from './store/appStore';
import { clearFrames } from './store/frameDb';
import { STATUS_LABELS } from './utils/constants';

import type { ExtractedFrame, VideoInfo } from './types';

export default function App() {
  const {
    status,
    progress,
    progressLabel,
    videoInfo,
    videoFile,
    frameCount,
    error,
    extractionMode,
    fps,
    nthFrame,
    outputFormat,
    jpgQuality,
    setVideoInfo,
    setVideoFile,
    setStatus,
    setFrameCount,
    resetExtraction,
    resetAll,
  } = useAppStore();

  const { ffmpeg, load: loadFFmpeg } = useFFmpeg();
  const { extract, cancel: cancelExtraction } = useFrameExtractor();
  const { downloadZip, downloadSingleFrame, zipping, zipProgress } = useDownload();

  const [selectedFrames, setSelectedFrames] = useState<ExtractedFrame[]>([]);
  const objectUrlRef = useRef<string | null>(null);

  const isExtracting = ['loading-ffmpeg', 'reading-video', 'extracting', 'caching'].includes(status);

  // Handle video file drop
  const handleFileDrop = useCallback(
    (file: File) => {
      // Cleanup previous object URL
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }

      const objectUrl = URL.createObjectURL(file);
      objectUrlRef.current = objectUrl;

      const info: VideoInfo = {
        name: file.name,
        size: file.size,
        type: file.type,
        objectUrl,
      };

      setVideoFile(file);
      setVideoInfo(info);
      resetExtraction();
      clearFrames();
      setSelectedFrames([]);
    },
    [setVideoFile, setVideoInfo, resetExtraction],
  );

  // Remove video
  const handleRemoveVideo = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    resetAll();
    clearFrames();
    setSelectedFrames([]);
  }, [resetAll]);

  // Start extraction
  const handleExtract = useCallback(async () => {
    if (!videoFile) return;

    // Clear previous results
    await clearFrames();
    setSelectedFrames([]);
    setFrameCount(0);

    // Load FFmpeg if needed
    setStatus('loading-ffmpeg');
    try {
      let instance = ffmpeg;
      if (!instance?.loaded) {
        instance = await (async () => {
          await loadFFmpeg();
          // The hook state updates async, so re-init
          const { initFFmpeg } = await import('./wasm/ffmpegLoader');
          return initFFmpeg();
        })();
      }

      if (!instance) {
        throw new Error('Failed to initialize FFmpeg');
      }

      const count = await extract(instance, videoFile, {
        mode: extractionMode,
        fps,
        nthFrame,
        format: outputFormat,
        jpgQuality,
      });

      if (count > 0) {
        toast(`Extracted ${count} frames!`, 'success');
      }
    } catch (err) {
      console.error('[FrameRipper] handleExtract error:', err);
      toast(err instanceof Error ? err.message : 'Extraction failed', 'error');
    }
  }, [
    videoFile,
    ffmpeg,
    loadFFmpeg,
    extract,
    extractionMode,
    fps,
    nthFrame,
    outputFormat,
    jpgQuality,
    setStatus,
    setFrameCount,
  ]);

  // Download ZIP
  const handleDownloadZip = useCallback(() => {
    if (selectedFrames.length === 0 || !videoInfo) return;
    downloadZip(selectedFrames, videoInfo.name);
  }, [selectedFrames, videoInfo, downloadZip]);

  // Clear all frames
  const handleClearAll = useCallback(async () => {
    await clearFrames();
    setFrameCount(0);
    setSelectedFrames([]);
    resetExtraction();
    toast('All frames cleared', 'info');
  }, [setFrameCount, resetExtraction]);

  // Start over
  const handleStartOver = useCallback(() => {
    cancelExtraction();
    handleRemoveVideo();
    toast('Ready for a new video', 'info');
  }, [cancelExtraction, handleRemoveVideo]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Hero / Description — only when no video is loaded */}
        <AnimatePresence>
          {!videoInfo && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center mb-8"
            >
              <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                Extract frames from any video
              </h2>
              <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
                Drop a video file, pick your FPS or frame interval, and download
                individual PNG/JPG frames as a ZIP. Perfect for sprite sheets, ML
                training data, or pulling stills.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drop Zone — shown when no video loaded */}
        {!videoInfo && (
          <DropZone onFileDrop={handleFileDrop} disabled={isExtracting} />
        )}

        {/* Video Preview + Settings */}
        <AnimatePresence>
          {videoInfo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              <VideoPreview
                videoInfo={videoInfo}
                onRemove={handleRemoveVideo}
                disabled={isExtracting}
              />
              <ExtractionSettings
                onExtract={handleExtract}
                extracting={isExtracting}
                disabled={!videoFile}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress */}
        <AnimatePresence>
          {isExtracting && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <ProgressBar
                progress={progress}
                label={progressLabel || STATUS_LABELS[status] || ''}
                indeterminate={status === 'loading-ffmpeg' || status === 'reading-video'}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm"
            >
              <p className="font-medium">Error</p>
              <p>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Frame Gallery + Download */}
        {status === 'done' && frameCount > 0 && videoInfo && (
          <>
            <FrameGallery
              frameCount={frameCount}
              onSelectionChange={setSelectedFrames}
              onDownloadFrame={downloadSingleFrame}
            />

            <DownloadPanel
              selectedFrames={selectedFrames}
              totalFrames={frameCount}
              onDownloadZip={handleDownloadZip}
              onClearAll={handleClearAll}
              zipping={zipping}
              zipProgress={zipProgress}
            />

            {/* Start Over */}
            <div className="flex justify-center pt-4">
              <Button variant="secondary" onClick={handleStartOver}>
                <RotateCcw className="w-4 h-4" />
                Start Over
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
