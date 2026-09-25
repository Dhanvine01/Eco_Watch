import { useEffect, useState } from 'react';
import { useStream } from '../hooks/useStream';
import { devicesApi } from '../services/api';
import type { Device } from '../types';
import {
  PageShell, PageHeader, TableWrapper, Th, Td, SectionCard, ErrorBanner,
} from '../components/ui';
import { Flame, Droplets, ShieldAlert, ShieldCheck } from 'lucide-react';

export function AdminWaterFirePage() {
  const { latestReadings, connected } = useStream();
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  useEffect(() => {
    devicesApi.list().then(setDevices).catch((reason) =>
      setDeviceError(reason instanceof Error ? reason.message : 'Failed to load devices')
    );
  }, []);

  const anyFire = Object.values(latestReadings).some((r) => r.fireDetected);
  const anyLeak = Object.values(latestReadings).some((r) => r.waterLeak);

  return (
    <PageShell>
      <PageHeader
        title="Water & Fire Safety"
        subtitle="Binary safety sensor status — any detection triggers an immediate alert"
        live={connected}
      />

      {deviceError && <ErrorBanner message={deviceError} />}

      {/* Critical safety banners */}
      {(anyFire || anyLeak) && (
        <div className="mb-6 flex flex-col gap-3">
          {anyFire && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-300 bg-red-50 px-4 py-3.5 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 border border-red-200 flex-shrink-0">
                <Flame size={18} className="text-red-600" />
              </div>
              <div>
                <p className="font-bold text-sm text-red-800">FIRE DETECTED</p>
                <p className="font-mono text-xs text-red-700 mt-0.5 font-medium">
                  Evacuate immediately — contact emergency services
                </p>
              </div>
            </div>
          )}
          {anyLeak && (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3.5 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 border border-amber-200 flex-shrink-0">
                <Droplets size={18} className="text-amber-800" />
              </div>
              <div>
                <p className="font-bold text-sm text-amber-900">WATER LEAK ACTIVE</p>
                <p className="font-mono text-xs text-amber-800 mt-0.5 font-medium">
                  Inspect affected zones — isolate water supply if necessary
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status panels */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-7">
        {/* Fire Detection */}
        <div className={`relative rounded-2xl border p-6 overflow-hidden card-hover bg-white shadow-verdant ${
          anyFire
            ? 'border-red-300 bg-red-50/50'
            : 'border-[var(--line)]'
        }`}>
          <div className={`absolute bottom-0 left-0 right-0 h-[3px] opacity-80 ${
            anyFire ? 'metric-strip-crit' : 'metric-strip-ok'
          }`} />
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${
              anyFire ? 'bg-red-100 border border-red-200 text-red-600' : 'bg-[#6fa350]/15 border border-[#6fa350]/30 text-[#4f7a38]'
            }`}>
              <Flame size={24} />
            </div>
            <div className="flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6d7d70] font-semibold mb-1">
                Fire Detection System
              </p>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${anyFire ? 'bg-red-500 animate-ping' : 'bg-[#6fa350]'}`} />
                <span className={`font-serif font-bold text-xl ${anyFire ? 'text-red-700' : 'text-[#4f7a38]'}`}>
                  {anyFire ? 'FIRE DETECTED' : 'ALL CLEAR'}
                </span>
              </div>
              <p className={`font-sans text-xs ${anyFire ? 'text-red-700 font-semibold' : 'text-[#6d7d70]'}`}>
                {anyFire
                  ? 'Immediate evacuation required — contact emergency services'
                  : 'No fire detected across all monitored zones'
                }
              </p>
            </div>
            <div className="flex-shrink-0">
              {anyFire
                ? <ShieldAlert size={22} className="text-red-600" />
                : <ShieldCheck size={22} className="text-[#6fa350]" />
              }
            </div>
          </div>
        </div>

        {/* Water Leak */}
        <div className={`relative rounded-2xl border p-6 overflow-hidden card-hover bg-white shadow-verdant ${
          anyLeak
            ? 'border-amber-300 bg-amber-50/50'
            : 'border-[var(--line)]'
        }`}>
          <div className={`absolute bottom-0 left-0 right-0 h-[3px] opacity-80 ${
            anyLeak ? 'metric-strip-warn' : 'metric-strip-ok'
          }`} />
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${
              anyLeak ? 'bg-amber-100 border border-amber-200 text-amber-800' : 'bg-[#6fa350]/15 border border-[#6fa350]/30 text-[#4f7a38]'
            }`}>
              <Droplets size={24} />
            </div>
            <div className="flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6d7d70] font-semibold mb-1">
                Water Leak Detection
              </p>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${anyLeak ? 'bg-amber-500 animate-ping' : 'bg-[#6fa350]'}`} />
                <span className={`font-serif font-bold text-xl ${anyLeak ? 'text-amber-800' : 'text-[#4f7a38]'}`}>
                  {anyLeak ? 'LEAK ACTIVE' : 'ALL CLEAR'}
                </span>
              </div>
              <p className={`font-sans text-xs ${anyLeak ? 'text-amber-800 font-semibold' : 'text-[#6d7d70]'}`}>
                {anyLeak
                  ? 'Inspect affected zones — isolate water supply if required'
                  : 'No leaks detected across all monitored zones'
                }
              </p>
            </div>
            <div className="flex-shrink-0">
              {anyLeak
                ? <ShieldAlert size={22} className="text-amber-700" />
                : <ShieldCheck size={22} className="text-[#6fa350]" />
              }
            </div>
          </div>
        </div>
      </div>

      {/* Per-device table */}
      <SectionCard title="Per-Device Safety Status" noPadding>
        <TableWrapper>
          <thead>
            <tr>
              <Th>Device</Th>
              <Th>Zone</Th>
              <Th center>Fire</Th>
              <Th center>Water Leak</Th>
              <Th>Overall Status</Th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => {
              const r = latestReadings[d.id];
              const fire = r?.fireDetected ?? false;
              const leak = r?.waterLeak ?? false;
              const alert = fire || leak;
              return (
                <tr key={d.id} className="hover:bg-[#fbfbf9] transition-colors">
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${d.isOnline ? 'bg-[#6fa350]' : 'bg-slate-400'}`} />
                      <span className="font-bold text-[#25352b]">{d.label}</span>
                    </div>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs text-[#6d7d70]">
                      {d.zoneId ? `Zone ${d.zoneId.slice(-4)}` : '—'}
                    </span>
                  </Td>
                  <Td center>
                    {r === undefined ? (
                      <span className="font-mono text-xs text-[#6d7d70]">No data</span>
                    ) : fire ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-300 px-2.5 py-0.5 font-mono text-[10px] font-bold text-red-700">
                        <Flame size={10} /> DETECTED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#6fa350]/15 border border-[#6fa350]/30 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#4f7a38]">
                        Clear
                      </span>
                    )}
                  </Td>
                  <Td center>
                    {r === undefined ? (
                      <span className="font-mono text-xs text-[#6d7d70]">No data</span>
                    ) : leak ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-800">
                        <Droplets size={10} /> DETECTED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#6fa350]/15 border border-[#6fa350]/30 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#4f7a38]">
                        Clear
                      </span>
                    )}
                  </Td>
                  <Td>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold ${
                      alert
                        ? 'bg-red-100 border-red-300 text-red-700'
                        : r === undefined
                          ? 'bg-slate-100 border-slate-300 text-slate-600'
                          : 'bg-[#6fa350]/15 border-[#6fa350]/30 text-[#4f7a38]'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        alert ? 'bg-red-500' : r === undefined ? 'bg-slate-400' : 'bg-[#6fa350]'
                      }`} />
                      {alert ? 'ALERT' : r === undefined ? 'No Data' : 'NOMINAL'}
                    </span>
                  </Td>
                </tr>
              );
            })}
            {devices.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center font-mono text-xs text-[#6d7d70]">
                  No devices registered
                </td>
              </tr>
            )}
          </tbody>
        </TableWrapper>
      </SectionCard>
    </PageShell>
  );
}
