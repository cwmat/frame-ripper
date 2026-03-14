import { motion } from 'framer-motion';
import { Download, Trash2, Archive } from 'lucide-react';
import { formatFileSize } from '../../utils/fileUtils';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';

interface DownloadPanelProps {
  selectedCount: number;
  selectedSize: number;
  totalFrames: number;
  format: string;
  onDownloadZip: () => void;
  onClearAll: () => void;
  zipping: boolean;
  zipProgress: number;
}

export function DownloadPanel({
  selectedCount,
  selectedSize,
  totalFrames,
  format,
  onDownloadZip,
  onClearAll,
  zipping,
  zipProgress,
}: DownloadPanelProps) {

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)] p-6 space-y-4"
    >
      <div className="flex items-center gap-2 text-[var(--text-primary)]">
        <Archive className="w-5 h-5 text-[var(--accent)]" />
        <h2 className="font-semibold">Download</h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {selectedCount}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            of {totalFrames} frames
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {formatFileSize(selectedSize)}
          </p>
          <p className="text-xs text-[var(--text-muted)]">estimated size</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--text-primary)] uppercase">
            {format}
          </p>
          <p className="text-xs text-[var(--text-muted)]">format</p>
        </div>
      </div>

      {/* Zip progress */}
      {zipping && (
        <ProgressBar progress={zipProgress} label="Creating ZIP…" />
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={onDownloadZip}
          disabled={selectedCount === 0 || zipping}
          loading={zipping}
          size="lg"
          className="flex-1"
        >
          <Download className="w-4 h-4" />
          {zipping ? 'Zipping…' : `Download ZIP (${selectedCount} frames)`}
        </Button>
        <Button
          variant="danger"
          size="lg"
          onClick={onClearAll}
          disabled={zipping}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
