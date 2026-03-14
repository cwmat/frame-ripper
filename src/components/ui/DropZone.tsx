import { useCallback, useState, useRef, type DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Film } from 'lucide-react';
import { validateVideoFile } from '../../utils/fileUtils';
import { ACCEPTED_VIDEO_EXTENSIONS } from '../../utils/constants';

interface DropZoneProps {
  onFileDrop: (file: File) => void;
  disabled?: boolean;
}

export function DropZone({ onFileDrop, disabled }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleFile = useCallback(
    (file: File) => {
      const err = validateVideoFile(file);
      if (err) {
        setError(err);
        return;
      }
      setError(null);
      onFileDrop(file);
    },
    [onFileDrop],
  );

  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      dragCounter.current++;
      setIsDragging(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile],
  );

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset value so the same file can be re-selected
      e.target.value = '';
    },
    [handleFile],
  );

  return (
    <div className="w-full">
      <motion.div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        animate={isDragging ? { scale: 1.02 } : { scale: 1 }}
        className={`
          relative w-full rounded-[var(--radius-lg)] border-2 border-dashed
          transition-colors duration-200 cursor-pointer
          flex flex-col items-center justify-center gap-4 p-12
          ${
            isDragging
              ? 'border-[var(--accent)] bg-[var(--accent-muted)] glow-accent'
              : 'border-[var(--border)] hover:border-[var(--text-muted)] bg-[var(--surface-1)]'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_VIDEO_EXTENSIONS.join(',')}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        <AnimatePresence mode="wait">
          {isDragging ? (
            <motion.div
              key="dragging"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-3"
            >
              <Upload className="w-12 h-12 text-[var(--accent)]" />
              <p className="text-lg font-medium text-[var(--accent)]">Drop it here!</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-3"
            >
              <Film className="w-12 h-12 text-[var(--text-muted)]" />
              <div className="text-center">
                <p className="text-lg font-medium text-[var(--text-primary)]">
                  Drop a video file here
                </p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  or click to browse &middot; MP4, WebM, MKV, MOV, AVI
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-red-400 text-sm mt-2 px-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
