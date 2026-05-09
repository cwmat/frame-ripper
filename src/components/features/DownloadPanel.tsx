import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Trash2, Archive } from 'lucide-react';
import { formatFileSize, sanitizeFilename } from '../../utils/fileUtils';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';

interface DownloadPanelProps {
  videoName: string;
  selectedCount: number;
  selectedSize: number;
  totalFrames: number;
  format: string;
  onDownloadZip: (prefix?: string) => void;
  onClearAll: () => void;
  zipping: boolean;
  zipProgress: number;
}

export function DownloadPanel({
  videoName,
  selectedCount,
  selectedSize,
  totalFrames,
  format,
  onDownloadZip,
  onClearAll,
  zipping,
  zipProgress,
}: DownloadPanelProps) {
  const defaultPrefix = useMemo(
    () => sanitizeFilename(videoName.replace(/\.[^.]+$/, '')),
    [videoName],
  );
  const [prefix, setPrefix] = useState(defaultPrefix);

  useEffect(() => {
    setPrefix(defaultPrefix);
  }, [defaultPrefix]);

  const previewPrefix = sanitizeFilename(prefix.trim()) || defaultPrefix;
  const previewExt = format.toLowerCase() === 'png' ? 'png' : 'jpg';
  const previewName = `${previewPrefix}_0001.${previewExt}`;

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

      {/* Filename prefix */}
      <div className="space-y-1">
        <label
          htmlFor="filename-prefix"
          className="block text-xs font-medium text-[var(--text-muted)]"
        >
          Filename prefix
        </label>
        <input
          id="filename-prefix"
          type="text"
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          placeholder={defaultPrefix}
          disabled={zipping}
          className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
        />
        <p className="text-xs text-[var(--text-muted)] tabular-nums">
          Preview: <span className="text-[var(--text-primary)]">{previewName}</span>
        </p>
      </div>

      {/* Zip progress */}
      {zipping && (
        <ProgressBar progress={zipProgress} label="Creating ZIP…" />
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={() => onDownloadZip(prefix)}
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
