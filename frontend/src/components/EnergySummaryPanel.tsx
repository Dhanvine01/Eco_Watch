import type { EnergySummary } from '../types';

interface Props {
  summary: EnergySummary | null;
  loading?: boolean;
}

const TREND_ICON = { UP: '↑', DOWN: '↓', STABLE: '→' };
const TREND_COLOR = {
  UP: 'text-amber-700',
  DOWN: 'text-[#4f7a38]',
  STABLE: 'text-[#6d7d70]',
};

function Row({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--line)] last:border-0">
      <span className="font-mono text-xs text-[#6d7d70] uppercase tracking-wider font-semibold">
        {label}
      </span>
      <span className="font-mono text-sm font-bold text-[#25352b]">
        {value}
        {unit && <span className="ml-1 text-[#6d7d70] text-xs font-normal">{unit}</span>}
      </span>
    </div>
  );
}

export function EnergySummaryPanel({ summary, loading }: Props) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-3 py-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-7 rounded-xl skeleton" />
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <p className="font-mono text-xs text-[#6d7d70] py-4 text-center">
        No energy data available
      </p>
    );
  }

  return (
    <div>
      <Row label="Current" value={summary.currentA.toFixed(2)} unit="A" />
      <Row label="Est. Power" value={summary.estimatedPowerW.toFixed(1)} unit="W" />
      <Row label="Est. Energy" value={summary.estimatedEnergyWh.toFixed(2)} unit="Wh" />
      <Row label="CO₂ Estimate" value={summary.estimatedCO2g.toFixed(1)} unit="g" />
      <Row label="Peak Power" value={summary.peakPowerW.toFixed(1)} unit="W" />
      <div className="flex items-center justify-between pt-2.5">
        <span className="font-mono text-xs text-[#6d7d70] uppercase tracking-wider font-semibold">
          Trend
        </span>
        <span className={`font-mono text-sm font-bold ${TREND_COLOR[summary.trend]}`}>
          {TREND_ICON[summary.trend]} {summary.trend}
        </span>
      </div>
      <p className="mt-4 rounded-xl border border-slate-200 bg-[#fbfbf9] px-3.5 py-2.5 font-mono text-[11px] text-[#6d7d70] leading-relaxed">
        ⚠ Prototype estimate: calculated from current sensor assuming 230V / 0.9 PF
      </p>
    </div>
  );
}
