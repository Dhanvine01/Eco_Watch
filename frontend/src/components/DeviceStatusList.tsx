import { Clock } from 'lucide-react';
import type { Device } from '../types';

interface Props {
  devices: Device[];
}

function timeAgo(iso: string | null) {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function DeviceStatusList({ devices }: Props) {
  if (devices.length === 0) {
    return (
      <p className="font-mono text-xs text-[#6d7d70] py-4 text-center">
        No devices registered
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {devices.map((d) => (
        <li
          key={d.id}
          className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all shadow-sm ${
            d.isOnline
              ? 'border-[var(--line)] bg-[#fbfbf9] hover:bg-[#f3f7f0]'
              : 'border-slate-200 bg-slate-50/80 hover:bg-slate-100'
          }`}
        >
          {/* Left — status dot + label */}
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                d.isOnline ? 'bg-[#6fa350] live-dot' : 'bg-slate-400'
              }`}
            />
            <span className="font-mono text-xs font-bold text-[#25352b] tracking-wide truncate">
              {d.label}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 font-mono text-[9px] uppercase font-bold tracking-wider border ${
                d.label === 'ESP-001'
                  ? 'bg-sky-100 text-sky-800 border-sky-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}
            >
              {d.label === 'ESP-001' ? 'Real Hardware' : 'Simulated Node'}
            </span>
          </div>

          {/* Right — status badge + time */}
          <div className="flex items-center gap-3 shrink-0 ml-3">
            <span
              className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase border ${
                d.isOnline
                  ? 'bg-[#dcfce7] border-[#86efac] text-[#15803d]'
                  : 'bg-slate-200 border-slate-300 text-slate-700'
              }`}
            >
              {d.isOnline ? 'Online' : 'Offline'}
            </span>
            <span className="flex items-center gap-1 font-mono text-[11px] font-medium text-[#6d7d70] w-18 text-right">
              <Clock size={11} />
              {timeAgo(d.lastSeenAt)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
