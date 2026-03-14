import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number; // 0 to 1
  label?: string;
  indeterminate?: boolean;
}

export function ProgressBar({ progress, label, indeterminate }: ProgressBarProps) {
  const percent = Math.round(Math.max(0, Math.min(1, progress)) * 100);

  return (
    <div className="w-full space-y-2">
      {label && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">{label}</span>
          {!indeterminate && (
            <span className="text-[var(--text-muted)] tabular-nums">{percent}%</span>
          )}
        </div>
      )}
      <div className="w-full h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
        {indeterminate ? (
          <motion.div
            className="h-full bg-[var(--accent)] rounded-full"
            style={{ width: '30%' }}
            animate={{ x: ['-100%', '400%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        ) : (
          <motion.div
            className="h-full bg-[var(--accent)] rounded-full glow-accent"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        )}
      </div>
    </div>
  );
}
