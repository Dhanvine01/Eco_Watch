import { CheckCircle2, AlertTriangle, AlertOctagon, Clock, CheckCheck, Sparkles } from 'lucide-react';
import type { Alert } from '../types';

interface Props {
  alerts: Alert[];
  onResolve?: (id: string) => void;
  error?: string | null;
  compact?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  AIR_QUALITY:    'Air Quality',
  ENERGY_ANOMALY: 'Energy Anomaly',
  WATER_LEAK:     'Water Leak',
  FIRE:           'Fire Detected',
  NOISE:          'Noise Level',
  TEMPERATURE:    'Temperature',
  DEVICE_OFFLINE: 'Device Offline',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === 'CRITICAL') return <AlertOctagon size={16} className="text-red-600 flex-shrink-0 mt-0.5" />;
  if (severity === 'WARNING') return <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />;
  return <AlertTriangle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />;
}

function severityBorderClass(severity: string) {
  if (severity === 'CRITICAL') return 'border-red-200 bg-red-50/70 hover:bg-red-50';
  if (severity === 'WARNING') return 'border-amber-200 bg-amber-50/70 hover:bg-amber-50';
  return 'border-blue-200 bg-blue-50/70 hover:bg-blue-50';
}

function severityBadgeClass(severity: string) {
  if (severity === 'CRITICAL') return 'bg-red-100 text-red-700 border border-red-300 font-bold';
  if (severity === 'WARNING') return 'bg-amber-100 text-amber-800 border border-amber-300 font-bold';
  return 'bg-blue-100 text-blue-800 border border-blue-300 font-bold';
}

export function AlertList({ alerts, onResolve, error, compact = false }: Props) {
  const errorEl = error
    ? <p className="mb-3 font-mono text-xs text-red-600 font-semibold">{error}</p>
    : null;

  if (alerts.length === 0) {
    return (
      <>
        {errorEl}
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#6fa350]/30 bg-[#6fa350]/10">
            <CheckCircle2 size={24} className="text-[#4f7a38]" />
          </div>
          <div>
            <p className="font-serif font-bold text-[#25352b] text-base">All systems nominal</p>
            <p className="font-sans text-xs text-[#6d7d70] mt-0.5">No active alerts detected</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {errorEl}
      <ul className="space-y-2.5">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className={`rounded-xl border transition-all shadow-sm ${severityBorderClass(alert.severity)} ${compact ? 'px-3.5 py-2.5' : 'px-4 py-3.5'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <SeverityIcon severity={alert.severity} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${severityBadgeClass(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    <span className="font-sans font-bold text-[#25352b] text-sm">
                      {TYPE_LABELS[alert.type] ?? alert.type}
                    </span>
                    {alert.zone && (
                      <span className="font-mono text-[10px] font-semibold text-[#4f7a38] bg-[#f3f7f0] rounded-full px-2.5 py-0.5 border border-[var(--line)]">
                        {alert.zone.name}
                      </span>
                    )}
                  </div>
                  {!compact && (
                    <div className="space-y-1.5 mt-1.5">
                      <p className="text-xs text-[#374151] leading-relaxed font-medium">
                        {alert.message.includes('AI Diagnostic Correlation:')
                          ? alert.message.split('|')[0].trim()
                          : alert.message}
                      </p>
                      {alert.message.includes('AI Diagnostic Correlation:') && (
                        <div className="rounded-xl bg-amber-100/70 border border-amber-300 p-2.5 space-y-1">
                          <div className="flex items-center gap-1.5 font-mono text-[10px] text-amber-900 font-bold uppercase tracking-wider">
                            <Sparkles size={13} className="text-amber-700" />
                            <span>AI Predictive Root Cause</span>
                          </div>
                          <p className="font-mono text-xs text-amber-900 leading-relaxed font-semibold">
                            {alert.message.split('AI Diagnostic Correlation:')[1]?.trim()}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {alert.value != null && !compact && (
                    <p className="mt-1 font-mono text-[11px] text-[#6d7d70] font-medium">
                      Measured: <strong className="text-[#25352b]">{alert.value.toFixed(2)}</strong>
                      {alert.threshold != null && (
                        <> · Threshold: <strong className="text-[#25352b]">{alert.threshold.toFixed(2)}</strong></>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex items-center gap-1 font-mono text-[11px] font-semibold text-[#6d7d70]">
                  <Clock size={12} />
                  {timeAgo(alert.createdAt)}
                </div>
                {alert.status === 'RESOLVED' && (
                  <span className="flex items-center gap-1 rounded-full border border-[#6fa350]/30 bg-[#6fa350]/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#4f7a38]">
                    <CheckCheck size={12} />
                    Resolved
                  </span>
                )}
                {onResolve && alert.status !== 'RESOLVED' && (
                  <button
                    onClick={() => onResolve(alert.id)}
                    className="rounded-lg px-3 py-1 font-mono text-xs font-bold text-[#4f7a38] border border-[#6fa350] bg-white hover:bg-[#6fa350] hover:text-white transition-all shadow-sm"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
