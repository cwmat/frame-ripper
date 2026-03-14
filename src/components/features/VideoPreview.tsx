import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileVideo, X } from 'lucide-react';
import { formatFileSize } from '../../utils/fileUtils';
import type { VideoInfo } from '../../types';
import { Button } from '../ui/Button';

interface VideoPreviewProps {
  videoInfo: VideoInfo;
  onRemove: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  disabled?: boolean;
}

export function VideoPreview({ videoInfo, onRemove, onTimeUpdate, disabled }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && onTimeUpdate) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  }, [onTimeUpdate]);

  const handleSeeked = useCallback(() => {
    if (videoRef.current && onTimeUpdate) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  }, [onTimeUpdate]);

  useEffect(() => {
    return () => {
      // objectUrl cleanup is handled by the parent
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden"
    >
      <div className="aspect-video bg-black relative">
        <video
          ref={videoRef}
          src={videoInfo.objectUrl}
          controls
          className="w-full h-full object-contain"
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onSeeked={handleSeeked}
        />
      </div>
      <div className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <FileVideo className="w-5 h-5 text-[var(--accent)] shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {videoInfo.name}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {formatFileSize(videoInfo.size)} &middot; {videoInfo.type || 'video'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={disabled}
          aria-label="Remove video"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
