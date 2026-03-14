import { Shield } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-[var(--border)] bg-[var(--surface-0)]/80 backdrop-blur-sm mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          <span>Fully client-side &middot; Your data stays local</span>
        </div>
        <span>MIT License</span>
      </div>
    </footer>
  );
}
