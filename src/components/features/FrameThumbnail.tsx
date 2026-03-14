import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { Download, Check } from 'lucide-react';
import type { ExtractedFrame } from '../../types';

interface FrameThumbnailProps {
  frame: ExtractedFrame;
  selected: boolean;
  onToggleSelect: (index: number) => void;
  onDownload: (frame: ExtractedFrame) => void;
}

export const FrameThumbnail = memo(function FrameThumbnail({
  frame,
  selected,
  onToggleSelect,
  onDownload,
}: FrameThumbnailProps) {
  const imgRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Lazy loading via IntersectionObserver
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Compute object URL via useMemo to avoid setState-in-effect
  const objectUrl = useMemo(() => {
    if (!visible || !frame.data) return null;
    const mimeType = frame.filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return URL.createObjectURL(new Blob([frame.data.buffer as ArrayBuffer], { type: mimeType }));
  }, [visible, frame.data, frame.filename]);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const handleToggle = useCallback(() => {
    onToggleSelect(frame.index);
  }, [onToggleSelect, frame.index]);

  const handleDownload = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDownload(frame);
    },
    [onDownload, frame],
  );

  return (
    <div
      ref={imgRef}
      className={`
        relative group rounded-[var(--radius-md)] overflow-hidden
        border-2 transition-colors cursor-pointer
        ${selected ? 'border-[var(--accent)] glow-accent' : 'border-[var(--border)] hover:border-[var(--text-muted)]'}
      `}
      onClick={handleToggle}
    >
      {/* Image */}
      <div className="aspect-video bg-[var(--surface-2)]">
        {objectUrl ? (
          <img
            src={objectUrl}
            alt={`Frame ${frame.index + 1}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-[var(--text-muted)] border-t-transparent animate-spin" />
          </div>
        )}
      </div>

      {/* Selection checkbox */}
      <div
        className={`
          absolute top-2 left-2 w-6 h-6 rounded-[var(--radius-sm)]
          flex items-center justify-center transition-colors
          ${selected ? 'bg-[var(--accent)]' : 'bg-[var(--surface-0)]/70 border border-[var(--border)]'}
        `}
      >
        {selected && <Check className="w-4 h-4 text-white" />}
      </div>

      {/* Frame number overlay */}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 text-xs text-white flex items-center justify-between">
        <span className="tabular-nums">#{frame.index + 1}</span>
        <button
          onClick={handleDownload}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-[var(--accent)] cursor-pointer"
          title="Download frame"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
});
