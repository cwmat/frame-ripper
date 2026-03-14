import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Grid3X3, CheckSquare, Square } from 'lucide-react';
import type { ExtractedFrame } from '../../types';
import { getAllFrames } from '../../store/frameDb';
import { FrameThumbnail } from './FrameThumbnail';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

interface FrameGalleryProps {
  frameCount: number;
  onSelectionChange: (selectedIndices: Set<number>, selectedCount: number, selectedSize: number) => void;
  onDownloadFrame: (frame: ExtractedFrame) => void;
}

export function FrameGallery({ frameCount, onSelectionChange, onDownloadFrame }: FrameGalleryProps) {
  const [frames, setFrames] = useState<ExtractedFrame[]>([]);
  const [loadedFrameCount, setLoadedFrameCount] = useState<number | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  // Keep a size lookup so we can compute selected size without iterating frame data
  const frameSizeMap = useRef<Map<number, number>>(new Map());

  // Derive loading state instead of setting it inside the effect
  const loading = loadedFrameCount !== frameCount;

  // Load frames from IndexedDB
  useEffect(() => {
    let cancelled = false;

    getAllFrames().then((data) => {
      if (!cancelled) {
        setFrames(data);
        const sizeMap = new Map<number, number>();
        const allIndices = new Set<number>();
        for (const f of data) {
          allIndices.add(f.index);
          sizeMap.set(f.index, f.size);
        }
        frameSizeMap.current = sizeMap;
        setSelectedIndices(allIndices);
        setLoadedFrameCount(frameCount);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [frameCount]);

  // Notify parent of lightweight selection info
  useEffect(() => {
    let size = 0;
    for (const idx of selectedIndices) {
      size += frameSizeMap.current.get(idx) ?? 0;
    }
    onSelectionChange(selectedIndices, selectedIndices.size, size);
  }, [selectedIndices, onSelectionChange]);

  const toggleSelect = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIndices(new Set(frames.map((f) => f.index)));
  }, [frames]);

  const deselectAll = useCallback(() => {
    setSelectedIndices(new Set());
  }, []);

  const allSelected = selectedIndices.size === frames.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size={32} />
        <span className="ml-3 text-[var(--text-secondary)]">Loading frames…</span>
      </div>
    );
  }

  if (frames.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-4"
    >
      {/* Gallery header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[var(--text-primary)]">
          <Grid3X3 className="w-5 h-5 text-[var(--accent)]" />
          <h2 className="font-semibold">
            Extracted Frames
            <span className="text-[var(--text-muted)] font-normal ml-2">
              ({selectedIndices.size} / {frames.length} selected)
            </span>
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={allSelected ? deselectAll : selectAll}
        >
          {allSelected ? (
            <>
              <Square className="w-4 h-4" /> Deselect All
            </>
          ) : (
            <>
              <CheckSquare className="w-4 h-4" /> Select All
            </>
          )}
        </Button>
      </div>

      {/* Frame grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {frames.map((frame) => (
          <FrameThumbnail
            key={frame.id}
            frame={frame}
            selected={selectedIndices.has(frame.index)}
            onToggleSelect={toggleSelect}
            onDownload={onDownloadFrame}
          />
        ))}
      </div>
    </motion.div>
  );
}
