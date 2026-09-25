import type { ComponentType } from 'react';

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  status?: 'ok' | 'warning' | 'critical' | 'offline' | 'neutral' | 'info';
  icon?: ComponentType<{ size?: number; className?: string }> | React.ReactNode;
  trend?: 'UP' | 'DOWN' | 'STABLE';
  className?: string;
}

const STATUS_BORDER = {
  ok:       'border-[#6fa350]/30',
  warning:  'border-amber-400',
  critical: 'border-red-400',
  offline:  'border-slate-300',
  neutral:  'border-[var(--line)]',
  info:     'border-[#6fa350]/30',
};

const VALUE_COLORS = {
  ok:       'text-[#4f7a38]',
  warning:  'text-amber-700',
  critical: 'text-red-700',
  offline:  'text-slate-400',
  neutral:  'text-[#25352b]',
  info:     'text-[#4f7a38]',
};

const STRIP_CLASSES = {
  ok:       'metric-strip-ok',
  warning:  'metric-strip-warn',
  critical: 'metric-strip-crit',
  offline:  'metric-strip-off',
  neutral:  '',
  info:     'metric-strip-info',
};

const ICON_BG = {
  ok:       'bg-[#6fa350]/15 text-[#4f7a38]',
  warning:  'bg-amber-100 text-amber-800',
  critical: 'bg-red-100 text-red-700',
  offline:  'bg-slate-100 text-slate-500',
  neutral:  'bg-[#f3f7f0] text-[#6fa350]',
  info:     'bg-[#6fa350]/15 text-[#4f7a38]',
};

const TREND_ICONS = { UP: '↑', DOWN: '↓', STABLE: '→' };
const TREND_COLORS = { UP: 'text-amber-700', DOWN: 'text-[#4f7a38]', STABLE: 'text-[#6d7d70]' };

export function SensorCard({
  label,
  value,
  unit,
  subtext,
  status = 'neutral',
  icon,
  trend,
  className = '',
}: Props) {
  const IconComponent = typeof icon === 'function'
    ? icon as ComponentType<{ size?: number; className?: string }>
    : null;
  const iconNode = typeof icon !== 'function' ? icon : null;

  return (
    <div
      className={`relative rounded-2xl border bg-white p-5 overflow-hidden card-hover shadow-verdant ${STATUS_BORDER[status]} ${className}`}
    >
      {/* Bottom status strip */}
      {status !== 'neutral' && (
        <div className={`absolute bottom-0 left-0 right-0 h-[3px] opacity-80 ${STRIP_CLASSES[status]}`} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6d7d70] font-bold">
          {label}
        </span>
        {(IconComponent || iconNode) && (
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${ICON_BG[status]}`}>
            {IconComponent
              ? <IconComponent size={16} />
              : <span className="text-sm leading-none">{iconNode}</span>
            }
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-end gap-1.5">
        <span className={`font-serif text-[2.2rem] font-bold leading-none tracking-tight ${VALUE_COLORS[status]}`}>
          {value}
        </span>
        {unit && (
          <span className="mb-0.5 text-xs font-mono text-[#6d7d70] font-semibold">{unit}</span>
        )}
        {trend && (
          <span className={`mb-0.5 ml-1 font-mono text-sm font-bold ${TREND_COLORS[trend]}`}>
            {TREND_ICONS[trend]}
          </span>
        )}
      </div>

      {/* Subtext */}
      {subtext && (
        <p className="mt-2 font-mono text-[10px] text-[#6d7d70] leading-snug">{subtext}</p>
      )}
    </div>
  );
}
