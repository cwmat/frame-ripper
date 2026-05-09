import { motion } from 'framer-motion';
import { Settings, Image, Hash, Crosshair, Rewind, Scaling } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { Button } from '../ui/Button';
import { FPS_PRESETS, MAX_OUTPUT_WIDTH, OUTPUT_WIDTH_PRESETS } from '../../utils/constants';
import type { ExtractionMode, OutputFormat } from '../../types';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
}

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
    cursorTime,
    nearbyFrames,
    reverse,
    maxWidth,
    setExtractionMode,
    setFps,
    setNthFrame,
    setOutputFormat,
    setJpgQuality,
    setNearbyFrames,
    setReverse,
    setMaxWidth,
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
            { value: 'fps' as ExtractionMode, label: 'At FPS', icon: Hash },
            { value: 'every-nth' as ExtractionMode, label: 'Every Nth', icon: Image },
            { value: 'at-cursor' as ExtractionMode, label: 'At Cursor', icon: Crosshair },
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

      {/* Mode-specific config */}
      {extractionMode === 'fps' && (
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
      )}

      {extractionMode === 'every-nth' && (
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

      {extractionMode === 'at-cursor' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm text-[var(--text-secondary)]">
              Cursor position
            </label>
            <span className="text-sm text-[var(--text-primary)] font-mono tabular-nums">
              {formatTime(cursorTime)}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Seek the video to the desired position, then extract.
          </p>
          <div className="space-y-2">
            <label className="text-sm text-[var(--text-secondary)]">
              Nearby frames (each side)
            </label>
            <input
              type="number"
              min={0}
              max={50}
              step={1}
              value={nearbyFrames}
              onChange={(e) =>
                setNearbyFrames(Math.max(0, Math.min(50, parseInt(e.target.value) || 0)))
              }
              disabled={extracting}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-md)]
                         px-3 py-2 text-sm text-[var(--text-primary)] outline-none
                         focus:border-[var(--accent)] transition-colors
                         disabled:opacity-50"
            />
            <p className="text-xs text-[var(--text-muted)]">
              {nearbyFrames === 0
                ? 'Extract only the frame at cursor'
                : `Extract ${1 + 2 * nearbyFrames} frames (${nearbyFrames} before + cursor + ${nearbyFrames} after)`}
            </p>
          </div>
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

      {/* Max output width — orthogonal to mode */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
            <Scaling className="w-4 h-4" />
            Max output width
          </label>
          <span className="text-sm text-[var(--text-muted)] tabular-nums">
            {maxWidth === 0 ? 'Original' : `${maxWidth} px`}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {OUTPUT_WIDTH_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => setMaxWidth(preset)}
              disabled={extracting}
              className={`
                px-3 py-1.5 rounded-[var(--radius-sm)] text-sm transition-colors cursor-pointer
                ${
                  maxWidth === preset
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {preset === 0 ? 'Original' : preset}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={0}
          max={MAX_OUTPUT_WIDTH}
          step={1}
          value={maxWidth}
          onChange={(e) => setMaxWidth(parseInt(e.target.value) || 0)}
          disabled={extracting}
          className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-md)]
                     px-3 py-2 text-sm text-[var(--text-primary)] outline-none
                     focus:border-[var(--accent)] transition-colors
                     disabled:opacity-50"
          placeholder="Custom width (0 = original)"
        />
        <p className="text-xs text-[var(--text-muted)] px-1">
          Caps frame width in pixels. Won't upscale narrower videos.
        </p>
      </div>

      {/* Reverse order toggle — orthogonal to mode */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setReverse(!reverse)}
          disabled={extracting}
          aria-pressed={reverse}
          className={`
            w-full flex items-center justify-between gap-3 px-4 py-3
            rounded-[var(--radius-md)] text-sm font-medium transition-colors
            cursor-pointer
            ${
              reverse
                ? 'bg-[var(--accent)] text-white glow-accent'
                : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <span className="flex items-center gap-2">
            <Rewind className="w-4 h-4" />
            Reverse order
          </span>
          <span
            className={`
              relative inline-flex h-5 w-9 items-center rounded-full transition-colors
              ${reverse ? 'bg-white/30' : 'bg-[var(--surface-3)]'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${reverse ? 'translate-x-4' : 'translate-x-0.5'}
              `}
            />
          </span>
        </button>
        <p className="text-xs text-[var(--text-muted)] px-1">
          Last frame becomes #1.
        </p>
      </div>

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
