import type { Severity } from '../types';

interface Props {
  severity: Severity;
  className?: string;
}

const CONFIG: Record<Severity, { label: string; classes: string; dot: string }> = {
  INFO: {
    label: 'INFO',
    classes: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
    dot: 'bg-sky-400',
  },
  WARNING: {
    label: 'WARN',
    classes: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    dot: 'bg-amber-400',
  },
  CRITICAL: {
    label: 'CRIT',
    classes: 'bg-red-500/10 border-red-500/30 text-red-400',
    dot: 'bg-red-400',
  },
};

export function AlertBadge({ severity, className = '' }: Props) {
  const c = CONFIG[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-mono font-medium border ${c.classes} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot} animate-pulse`} />
      {c.label}
    </span>
  );
}
