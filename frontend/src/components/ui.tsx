/**
 * ui.tsx — Shared design-system components for EcoWatch (Verdant Green Technology Theme)
 */

import type { ReactNode } from 'react';
import { AlertTriangle, WifiOff, RefreshCw } from 'lucide-react';

// ─── PageShell ────────────────────────────────────────────────────────────────

export function PageShell({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`page-enter px-6 py-6 min-h-full ${className}`}>
      {children}
    </div>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  live = false,
  accent = 'eco',
  children,
}: {
  title: string;
  subtitle?: string;
  live?: boolean;
  accent?: 'eco' | 'amber';
  children?: ReactNode;
}) {
  const now = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const accentColor = accent === 'amber'
    ? 'text-[#d9822b]'
    : 'text-[#4f7a38]';

  return (
    <div className="flex items-start justify-between mb-7 gap-4">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#25352b] tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-[#6d7d70] leading-relaxed">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 mt-0.5">
        {children}
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full flex-shrink-0 ${
              live
                ? `${accent === 'amber' ? 'bg-[#d9822b]' : 'bg-[#6fa350]'} live-dot`
                : 'bg-slate-400'
            }`}
          />
          <span className={`font-mono text-[10px] font-semibold uppercase ${live ? accentColor : 'text-[#6d7d70]'} hidden sm:block`}>
            {live ? 'LIVE' : 'STATIC'}
          </span>
          <span className="font-mono text-[10px] text-[#6d7d70] hidden md:block ml-1">
            {now}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── SectionCard ─────────────────────────────────────────────────────────────

export function SectionCard({
  children,
  className = '',
  title,
  action,
  noPadding = false,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
  noPadding?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--line)] bg-[#ffffff]/95 shadow-verdant ${noPadding ? '' : 'p-6'} ${className}`}
    >
      {(title || action) && (
        <div className={`flex items-center justify-between ${noPadding ? 'px-6 pt-5 pb-3' : 'mb-4'}`}>
          {title && <SectionTitle>{title}</SectionTitle>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────

export function SectionTitle({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#4f7a38] ${className}`}>
      {children}
    </p>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

type MetricStatus = 'ok' | 'warning' | 'critical' | 'offline' | 'neutral' | 'info';

const METRIC_BORDER: Record<MetricStatus, string> = {
  ok:       'border-[#6fa350]/30',
  warning:  'border-[#d9822b]/35',
  critical: 'border-[#c94a44]/35',
  offline:  'border-slate-300',
  neutral:  'border-[var(--line)]',
  info:     'border-[#4a8fa8]/35',
};

const METRIC_VALUE: Record<MetricStatus, string> = {
  ok:       'text-[#4f7a38]',
  warning:  'text-[#d9822b]',
  critical: 'text-[#c94a44]',
  offline:  'text-slate-500',
  neutral:  'text-[#25352b]',
  info:     'text-[#346f86]',
};

const METRIC_STRIP: Record<MetricStatus, string> = {
  ok:       'metric-strip-ok',
  warning:  'metric-strip-warn',
  critical: 'metric-strip-crit',
  offline:  'metric-strip-off',
  neutral:  '',
  info:     'metric-strip-info',
};

const METRIC_ICON_BG: Record<MetricStatus, string> = {
  ok:       'bg-[#6fa350]/12 text-[#4f7a38]',
  warning:  'bg-[#d9822b]/12 text-[#d9822b]',
  critical: 'bg-[#c94a44]/12 text-[#c94a44]',
  offline:  'bg-slate-100 text-slate-500',
  neutral:  'bg-[#f3f7f0] text-[#6fa350]',
  info:     'bg-[#4a8fa8]/12 text-[#346f86]',
};

const TREND_ICON: Record<string, string> = { UP: '↑', DOWN: '↓', STABLE: '→' };
const TREND_COLOR: Record<string, string> = {
  UP: 'text-[#d9822b]',
  DOWN: 'text-[#4f7a38]',
  STABLE: 'text-[#6d7d70]',
};

export function MetricCard({
  label,
  value,
  unit,
  subtext,
  status = 'neutral',
  icon: Icon,
  trend,
  className = '',
}: {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  status?: MetricStatus;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  trend?: 'UP' | 'DOWN' | 'STABLE';
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-2xl border bg-[#ffffff]/95 p-5 overflow-hidden card-hover shadow-verdant ${METRIC_BORDER[status]} ${className}`}
    >
      {/* Bottom status strip */}
      {status !== 'neutral' && (
        <div className={`absolute bottom-0 left-0 right-0 h-[3px] opacity-80 ${METRIC_STRIP[status]}`} />
      )}

      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6d7d70] font-semibold">
          {label}
        </span>
        {Icon && (
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${METRIC_ICON_BG[status]}`}>
            <Icon size={16} />
          </div>
        )}
      </div>

      {/* Value row */}
      <div className="flex items-end gap-1.5">
        <span className={`text-[2.1rem] font-serif font-bold leading-none tracking-tight ${METRIC_VALUE[status]}`}>
          {value}
        </span>
        {unit && (
          <span className="mb-0.5 font-mono text-xs text-[#6d7d70] font-semibold">{unit}</span>
        )}
        {trend && (
          <span className={`mb-0.5 ml-1 font-mono text-sm font-bold ${TREND_COLOR[trend]}`}>
            {TREND_ICON[trend]}
          </span>
        )}
      </div>

      {subtext && (
        <p className="mt-2 font-mono text-[10px] text-[#6d7d70] leading-snug">{subtext}</p>
      )}
    </div>
  );
}

// ─── StatusDot ────────────────────────────────────────────────────────────────

const DOT_COLOR: Record<MetricStatus, string> = {
  ok:       'bg-[#6fa350]',
  warning:  'bg-[#d9822b]',
  critical: 'bg-[#c94a44]',
  offline:  'bg-slate-400',
  neutral:  'bg-slate-500',
  info:     'bg-[#4a8fa8]',
};

export function StatusDot({
  status,
  pulse = false,
  size = 'md',
}: {
  status: MetricStatus;
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass = size === 'sm' ? 'h-1.5 w-1.5' : size === 'lg' ? 'h-3 w-3' : 'h-2 w-2';
  return (
    <span
      className={`inline-block rounded-full flex-shrink-0 ${sizeClass} ${DOT_COLOR[status]} ${
        pulse && status === 'ok' ? 'live-dot' : ''
      }`}
    />
  );
}

// ─── LiveBadge ────────────────────────────────────────────────────────────────

export function LiveBadge({ connected }: { connected: boolean }) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 shadow-sm ${
        connected
          ? 'border-[#6fa350]/30 bg-[#6fa350]/10 text-[#4f7a38]'
          : 'border-slate-300 bg-slate-100 text-slate-500'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full flex-shrink-0 ${
          connected ? 'bg-[#6fa350] live-dot' : 'bg-slate-400'
        }`}
      />
      <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
        {connected ? 'Live Stream' : 'Disconnected'}
      </span>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--line)] bg-[#f3f7f0]">
          <Icon size={24} className="text-[#6fa350]" />
        </div>
      )}
      <div>
        <p className="font-serif font-bold text-[#25352b] text-base">{title}</p>
        {description && (
          <p className="mt-1 font-sans text-xs text-[#6d7d70] max-w-xs leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

// ─── SkeletonLine / SkeletonCard ──────────────────────────────────────────────

export function SkeletonLine({
  w = 'w-full',
  h = 'h-4',
}: {
  w?: string;
  h?: string;
}) {
  return <div className={`skeleton ${w} ${h}`} />;
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[#ffffff] p-5 space-y-3 shadow-sm">
      <SkeletonLine w="w-1/3" h="h-3" />
      <SkeletonLine w="w-1/2" h="h-8" />
      {Array.from({ length: Math.max(0, rows - 2) }).map((_, i) => (
        <SkeletonLine key={i} w="w-2/3" h="h-3" />
      ))}
    </div>
  );
}

export function SkeletonMetricGrid({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 gap-4 lg:grid-cols-${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} rows={3} />
      ))}
    </div>
  );
}

// ─── ErrorBanner ─────────────────────────────────────────────────────────────

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-50 px-4 py-3.5 mb-5 shadow-sm">
      <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-mono text-xs text-red-700 leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 font-mono text-[11px] text-red-700 border border-red-200 rounded-lg px-2.5 py-1 hover:bg-red-100 transition-colors flex-shrink-0"
        >
          <RefreshCw size={11} />
          Retry
        </button>
      )}
    </div>
  );
}

// ─── ConnectionWarning ────────────────────────────────────────────────────────

export function ConnectionWarning() {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-amber-500/25 bg-amber-50 px-4 py-3 mb-5 shadow-sm">
      <WifiOff size={14} className="text-amber-600 flex-shrink-0" />
      <p className="font-mono text-xs text-amber-800">
        Live telemetry stream disconnected — displaying cached records
      </p>
    </div>
  );
}

// ─── TableWrapper ─────────────────────────────────────────────────────────────

export function TableWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-white shadow-verdant">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  right = false,
  center = false,
}: {
  children: ReactNode;
  right?: boolean;
  center?: boolean;
}) {
  return (
    <th
      className={`border-b border-[var(--line)] bg-[#f6f9f3] px-4 py-3.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#4f7a38] font-bold whitespace-nowrap ${
        right ? 'text-right' : center ? 'text-center' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  right = false,
  center = false,
  className = '',
}: {
  children: ReactNode;
  right?: boolean;
  center?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`border-b border-[var(--line)] px-4 py-3.5 text-sm text-[#25352b] ${
        right ? 'text-right' : center ? 'text-center' : ''
      } ${className}`}
    >
      {children}
    </td>
  );
}

// ─── ChartCard ────────────────────────────────────────────────────────────────

export function ChartCard({
  title,
  children,
  className = '',
  action,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-[var(--line)] bg-[#ffffff]/95 p-6 shadow-verdant ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <SectionTitle>{title}</SectionTitle>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── StatRow ─────────────────────────────────────────────────────────────────

export function StatRow({
  label,
  value,
  unit,
  valueColor,
}: {
  label: string;
  value: string;
  unit?: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--line)] last:border-0">
      <span className="font-mono text-xs text-[#6d7d70] uppercase tracking-wider">
        {label}
      </span>
      <span className={`font-mono text-sm font-bold ${valueColor ?? 'text-[#25352b]'}`}>
        {value}
        {unit && <span className="ml-1 text-[#6d7d70] text-xs font-normal">{unit}</span>}
      </span>
    </div>
  );
}

// ─── DeviceStatusBadge ────────────────────────────────────────────────────────

export function DeviceStatusBadge({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
        online
          ? 'bg-[#6fa350]/15 border-[#6fa350]/30 text-[#4f7a38]'
          : 'bg-slate-100 border-slate-300 text-slate-500'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-[#6fa350] live-dot' : 'bg-slate-400'}`} />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}

// ─── PageControls (device selector + range buttons) ──────────────────────────

export function DeviceSelect({
  devices,
  value,
  onChange,
}: {
  devices: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6d7d70] font-semibold whitespace-nowrap">
        Device
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-base select-base w-auto min-w-[10rem] border-[var(--line)] bg-white font-mono text-xs text-[#25352b]"
      >
        {devices.map((d) => (
          <option key={d.id} value={d.id}>{d.label}</option>
        ))}
      </select>
    </div>
  );
}

export function RangeButtons({
  options,
  value,
  onChange,
}: {
  options: { label: string; ms: number }[];
  value: number;
  onChange: (ms: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6d7d70] font-semibold whitespace-nowrap">
        Range
      </span>
      <div className="flex gap-1">
        {options.map((o) => (
          <button
            key={o.label}
            onClick={() => onChange(o.ms)}
            className={`rounded-lg px-3 py-1.5 font-mono text-[11px] font-semibold transition-all border ${
              value === o.ms
                ? 'bg-[#6fa350] border-[#6fa350] text-white shadow-sm'
                : 'border-[var(--line)] bg-white text-[#6d7d70] hover:text-[#25352b] hover:border-[#6fa350]/40'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function RefreshButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3 py-1.5 font-mono text-[11px] font-medium text-[#4f7a38] hover:bg-[#f3f7f0] transition-colors shadow-sm"
    >
      <RefreshCw size={12} />
      Refresh
    </button>
  );
}
