import { motion } from 'framer-motion';
import { Settings, Image, Hash } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { Button } from '../ui/Button';
import { FPS_PRESETS } from '../../utils/constants';
import type { ExtractionMode, OutputFormat } from '../../types';

interface ExtractionSettingsProps {
  onExtract: () => void;
  extracting: boolean;
  disabled?: boolean;
}

export function ExtractionSettings({ onExtract, extracting, disabled }: ExtractionSettingsProps) {
  const {
    extractionMode,
    fps,
    nthFrame,
    outputFormat,
    jpgQuality,
    setExtractionMode,
    setFps,
    setNthFrame,
    setOutputFormat,
    setJpgQuality,
  } = useAppStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)] p-6 space-y-6"
    >
      <div className="flex items-center gap-2 text-[var(--text-primary)]">
        <Settings className="w-5 h-5 text-[var(--accent)]" />
        <h2 className="font-semibold">Extraction Settings</h2>
      </div>

      {/* Mode toggle */}
      <div className="space-y-3">
        <label className="text-sm text-[var(--text-secondary)]">Mode</label>
        <div className="flex gap-2">
          {[
            { value: 'fps' as ExtractionMode, label: 'Extract at FPS', icon: Hash },
            { value: 'every-nth' as ExtractionMode, label: 'Every Nth Frame', icon: Image },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setExtractionMode(value)}
              disabled={extracting}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-2.5
                rounded-[var(--radius-md)] text-sm font-medium transition-colors
                cursor-pointer
                ${
                  extractionMode === value
                    ? 'bg-[var(--accent)] text-white glow-accent'
                    : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* FPS / Nth frame config */}
      {extractionMode === 'fps' ? (
        <div className="space-y-3">
          <label className="text-sm text-[var(--text-secondary)]">
            Frames per second
          </label>
          <div className="flex flex-wrap gap-2">
            {FPS_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setFps(preset)}
                disabled={extracting}
                className={`
                  px-3 py-1.5 rounded-[var(--radius-sm)] text-sm transition-colors cursor-pointer
                  ${
                    fps === preset
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {preset}
              </button>
            ))}
          </div>
          <input
            type="number"
            min={0.1}
            max={60}
            step={0.1}
            value={fps}
            onChange={(e) => setFps(Math.max(0.1, Math.min(60, parseFloat(e.target.value) || 1)))}
            disabled={extracting}
            className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-md)]
                       px-3 py-2 text-sm text-[var(--text-primary)] outline-none
                       focus:border-[var(--accent)] transition-colors
                       disabled:opacity-50"
            placeholder="Custom FPS"
          />
        </div>
      ) : (
        <div className="space-y-3">
          <label className="text-sm text-[var(--text-secondary)]">
            Every Nth frame (extract 1 frame every {nthFrame} frames)
          </label>
          <input
            type="number"
            min={1}
            max={1000}
            step={1}
            value={nthFrame}
            onChange={(e) =>
              setNthFrame(Math.max(1, Math.min(1000, parseInt(e.target.value) || 10)))
            }
            disabled={extracting}
            className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-md)]
                       px-3 py-2 text-sm text-[var(--text-primary)] outline-none
                       focus:border-[var(--accent)] transition-colors
                       disabled:opacity-50"
          />
        </div>
      )}

      {/* Output format */}
      <div className="space-y-3">
        <label className="text-sm text-[var(--text-secondary)]">Output format</label>
        <div className="flex gap-2">
          {(['jpg', 'png'] as OutputFormat[]).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setOutputFormat(fmt)}
              disabled={extracting}
              className={`
                flex-1 px-4 py-2.5 rounded-[var(--radius-md)] text-sm font-medium
                uppercase transition-colors cursor-pointer
                ${
                  outputFormat === fmt
                    ? 'bg-[var(--accent)] text-white glow-accent'
                    : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {/* JPG Quality */}
      {outputFormat === 'jpg' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <label className="text-sm text-[var(--text-secondary)]">JPG Quality</label>
            <span className="text-sm text-[var(--text-muted)] tabular-nums">{jpgQuality}%</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={jpgQuality}
            onChange={(e) => setJpgQuality(parseInt(e.target.value))}
            disabled={extracting}
            className="w-full accent-[var(--accent)]"
          />
          <div className="flex justify-between text-xs text-[var(--text-muted)]">
            <span>Smaller file</span>
            <span>Better quality</span>
          </div>
        </motion.div>
      )}

      {/* Extract button */}
      <Button
        onClick={onExtract}
        loading={extracting}
        disabled={disabled || extracting}
        size="lg"
        className="w-full"
      >
        {extracting ? 'Extracting…' : 'Extract Frames'}
      </Button>
    </motion.div>
  );
}
