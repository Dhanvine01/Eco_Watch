import { AlertList } from '../components/AlertList';
import { useAlerts } from '../hooks/useAlerts';
import { useStream } from '../hooks/useStream';
import { useDevices } from '../hooks/useDevices';
import { useThresholds } from '../hooks/useThresholds';
import { MetricCard, SectionCard, EmptyState } from '../components/ui';
import {
  Flame, Droplets, Thermometer, Wind, ShieldAlert, ShieldCheck,
  Radio, Wifi, WifiOff, Bell,
} from 'lucide-react';

export function WorkerDashboardPage() {
  const { alerts, error: alertError } = useAlerts();
  const { latestReadings, connected } = useStream();
  const { devices, error: deviceError } = useDevices(true);
  const { thresholds } = useThresholds();

  const anyFire = Object.values(latestReadings).some((r) => r.fireDetected);
  const anyLeak = Object.values(latestReadings).some((r) => r.waterLeak);
  const criticalAlerts = alerts.filter((a) => a.severity === 'CRITICAL' && a.status === 'ACTIVE');
  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE');

  const liveTemps = Object.values(latestReadings).map((r) => r.temperature).filter((v): v is number => v !== null);
  const liveHumids = Object.values(latestReadings).map((r) => r.humidity).filter((v): v is number => v !== null);
  const liveAqis = Object.values(latestReadings).map((r) => r.airQuality).filter((v): v is number => v !== null);
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const avgTemp = avg(liveTemps);
  const avgHumidity = avg(liveHumids);
  const avgAqi = avg(liveAqis);

  const tempStatus = (): 'ok' | 'warning' | 'critical' | 'neutral' => {
    if (avgTemp === null) return 'neutral';
    if (avgTemp >= (thresholds.TEMPERATURE_CRITICAL ?? Infinity)) return 'critical';
    if (avgTemp >= (thresholds.TEMPERATURE_WARNING ?? Infinity)) return 'warning';
    return 'ok';
  };

  const aqiStatus = (): 'ok' | 'warning' | 'critical' | 'neutral' => {
    if (avgAqi === null) return 'neutral';
    if (avgAqi >= (thresholds.AIR_QUALITY_CRITICAL ?? Infinity)) return 'critical';
    if (avgAqi >= (thresholds.AIR_QUALITY_WARNING ?? Infinity)) return 'warning';
    return 'ok';
  };

  const hasEmergency = anyFire || anyLeak || criticalAlerts.length > 0;

  return (
    <div className="space-y-6 page-enter max-w-5xl mx-auto">
      {/* Emergency banner */}
      {hasEmergency && (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-100 border border-red-200">
              <ShieldAlert size={20} className="text-red-600" />
            </div>
            <div>
              <p className="font-bold text-sm text-red-800">SAFETY ALERT — IMMEDIATE ACTION REQUIRED</p>
              <p className="font-mono text-xs text-red-700 mt-0.5">
                {anyFire ? 'Fire detected. ' : ''}
                {anyLeak ? 'Water leak active. ' : ''}
                {criticalAlerts.length > 0 ? `${criticalAlerts.length} critical alert${criticalAlerts.length !== 1 ? 's' : ''}. ` : ''}
                Contact supervisor immediately.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#25352b] tracking-tight">Worker Safety Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            {connected
              ? <Wifi size={12} className="text-[#6fa350]" />
              : <WifiOff size={12} className="text-[#6d7d70]" />
            }
            <p className="font-sans text-xs text-[#6d7d70]">
              {connected ? 'Live telemetry monitoring active' : 'Stream disconnected — last known data shown'}
            </p>
          </div>
        </div>
      </div>

      {/* Safety status — fire & water */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Fire status */}
        <div className={`relative rounded-2xl border p-5 overflow-hidden card-hover bg-white shadow-verdant ${
          anyFire
            ? 'border-red-300 bg-red-50/60'
            : 'border-[var(--line)]'
        }`}>
          <div className={`absolute bottom-0 left-0 right-0 h-[3px] opacity-80 ${anyFire ? 'metric-strip-crit' : 'metric-strip-ok'}`} />
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6d7d70] font-bold">Fire Status</span>
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${anyFire ? 'bg-red-100 text-red-600' : 'bg-[#6fa350]/15 text-[#4f7a38]'}`}>
              <Flame size={16} />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${anyFire ? 'bg-red-500 animate-ping' : 'bg-[#6fa350]'}`} />
            <span className={`font-serif text-2xl font-bold ${anyFire ? 'text-red-700' : 'text-[#4f7a38]'}`}>
              {anyFire ? 'DETECTED' : 'CLEAR'}
            </span>
          </div>
          <p className="font-sans text-xs text-[#6d7d70]">
            {anyFire ? 'Evacuate immediately' : 'No fire detected'}
          </p>
        </div>

        {/* Water leak status */}
        <div className={`relative rounded-2xl border p-5 overflow-hidden card-hover bg-white shadow-verdant ${
          anyLeak
            ? 'border-amber-300 bg-amber-50/60'
            : 'border-[var(--line)]'
        }`}>
          <div className={`absolute bottom-0 left-0 right-0 h-[3px] opacity-80 ${anyLeak ? 'metric-strip-warn' : 'metric-strip-ok'}`} />
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6d7d70] font-bold">Water Leak</span>
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${anyLeak ? 'bg-amber-100 text-amber-800' : 'bg-[#6fa350]/15 text-[#4f7a38]'}`}>
              <Droplets size={16} />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${anyLeak ? 'bg-amber-500 animate-ping' : 'bg-[#6fa350]'}`} />
            <span className={`font-serif text-2xl font-bold ${anyLeak ? 'text-amber-800' : 'text-[#4f7a38]'}`}>
              {anyLeak ? 'DETECTED' : 'CLEAR'}
            </span>
          </div>
          <p className="font-sans text-xs text-[#6d7d70]">
            {anyLeak ? 'Inspect zones' : 'No leaks detected'}
          </p>
        </div>
      </div>

      {/* Environmental readings — 3 core live sensors */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Avg Temperature"
          value={avgTemp?.toFixed(1) ?? '—'}
          unit={avgTemp !== null ? '°C' : undefined}
          status={tempStatus()}
          icon={Thermometer}
          subtext={
            tempStatus() === 'critical' ? 'Critical — above safe limit' :
            tempStatus() === 'warning' ? 'Warning — elevated' :
            avgTemp !== null ? 'Within normal range' : 'Awaiting telemetry'
          }
        />
        <MetricCard
          label="Avg Humidity"
          value={avgHumidity?.toFixed(1) ?? '—'}
          unit={avgHumidity !== null ? '%' : undefined}
          status="info"
          icon={Droplets}
          subtext={avgHumidity !== null ? 'Relative humidity' : 'Awaiting telemetry'}
        />
        <MetricCard
          label="Avg Air Quality"
          value={avgAqi?.toFixed(0) ?? '—'}
          unit={avgAqi !== null ? 'AQI' : undefined}
          status={aqiStatus()}
          icon={Wind}
          subtext={
            aqiStatus() === 'critical' ? 'Critical — hazardous air' :
            aqiStatus() === 'warning' ? 'Warning — degraded quality' :
            avgAqi !== null ? 'Good air quality' : 'Awaiting telemetry'
          }
        />
      </div>

      {/* Active alerts */}
      <div className="rounded-2xl border border-[var(--line)] bg-white shadow-verdant overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)] bg-[#fbfbf9]">
          <div className="flex items-center gap-2">
            <Bell size={15} className="text-[#6fa350]" />
            <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#4f7a38]">
              Active Alerts
            </span>
          </div>
          {activeAlerts.length > 0 && (
            <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold ${
              criticalAlerts.length > 0
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
              {activeAlerts.length}
            </span>
          )}
        </div>
        <div className="p-6">
          <AlertList alerts={alerts} error={alertError} compact />
        </div>
      </div>

      {/* Device status (read-only) */}
      <SectionCard title="Sensor Network Status">
        {deviceError && (
          <p className="mb-3 font-mono text-xs text-red-600">{deviceError}</p>
        )}
        {devices.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="No devices registered"
            description="No monitoring sensors have been configured."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {devices.map((d) => (
              <div
                key={d.id}
                className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 shadow-sm ${
                  d.isOnline
                    ? 'border-[var(--line)] bg-[#fbfbf9]'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${d.isOnline ? 'bg-[#6fa350] live-dot' : 'bg-slate-400'}`} />
                <span className="font-mono text-xs font-bold text-[#25352b] truncate">{d.label}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center gap-2">
          <span className="font-mono text-xs text-[#6d7d70]">
            {devices.filter((d) => d.isOnline).length}/{devices.length} devices online
          </span>
          {!connected && (
            <span className="font-mono text-xs text-amber-700 font-semibold">· Stream disconnected</span>
          )}
        </div>
      </SectionCard>

      {/* All-clear state */}
      {!hasEmergency && activeAlerts.length === 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#6fa350]/30 bg-[#6fa350]/10 px-5 py-4 shadow-sm">
          <ShieldCheck size={20} className="text-[#4f7a38] flex-shrink-0" />
          <div>
            <p className="font-bold text-sm text-[#4f7a38]">All Systems Nominal</p>
            <p className="font-mono text-xs text-[#6d7d70] mt-0.5">
              No active alerts · No safety events detected
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
