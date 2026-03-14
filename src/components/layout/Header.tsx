import { Film } from 'lucide-react';

export function Header() {
  return (
    <header className="w-full border-b border-[var(--border)] bg-[var(--surface-0)]/80 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
        <Film className="w-6 h-6 text-[var(--accent)]" />
        <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
          FrameRipper
        </h1>
        <span className="text-xs text-[var(--text-muted)] hidden sm:inline">
          Video Frame Extractor
        </span>
      </div>
    </header>
  );
}
