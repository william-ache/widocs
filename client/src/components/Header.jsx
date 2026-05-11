import { IconSparkles } from './Icons';

export default function Header() {
  return (
    <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-surface-800/60">
      {/* ── Brand ── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 shadow-glow">
          <span className="text-white font-extrabold text-sm tracking-tight">W</span>
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-surface-50">
            Wi<span className="text-accent-400">Docs</span>
          </h1>
          <p className="text-[10px] font-medium uppercase tracking-widest text-surface-500">
            Markdown → PDF
          </p>
        </div>
      </div>

      {/* ── Status pill ── */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-800/50 border border-surface-700/40 text-xs text-surface-400">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        Backend conectado
      </div>
    </header>
  );
}
