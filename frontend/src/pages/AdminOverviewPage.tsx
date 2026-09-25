import { useEffect, useState } from 'react';
import { AlertList } from '../components/AlertList';
import { DeviceStatusList } from '../components/DeviceStatusList';
import { SimulationControls } from '../components/SimulationControls';
import { useAlerts } from '../hooks/useAlerts';
import { useStream } from '../hooks/useStream';
import { useEnergySummary } from '../hooks/useEnergySummary';
import { useThresholds } from '../hooks/useThresholds';
import { readingsApi } from '../services/api';
import { useDevices } from '../hooks/useDevices';
import type { LatestReading } from '../types';
import { LiveBadge, ConnectionWarning, SectionTitle, RefreshButton } from '../components/ui';
import {
  Radio,
  Bell,
  Zap,
  Thermometer,
  Droplets,
  Wind,
  Activity,
  BarChart3,
  Leaf,
} from 'lucide-react';

export function AdminOverviewPage() {
  const { alerts, resolve, error: alertError } = useAlerts();
  const { latestReadings, connected } = useStream();
  const { summary } = useEnergySummary();
  const { thresholds } = useThresholds();
  const { devices, error: deviceError } = useDevices();
  const [latestFromApi, setLatestFromApi] = useState<LatestReading[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void readingsApi
      .latest()
      .then((readings) => {
        setLatestFromApi(readings);
        setLoadError(null);
      })
      .catch((reason) =>
        setLoadError(reason instanceof Error ? reason.message : 'Failed to load overview')
      );
  }, [refreshKey]);

  const allReadings = Object.values({
    ...Object.fromEntries(latestFromApi.map((r) => [r.deviceId, r])),
    ...latestReadings,
  });

  const onlineCount = devices.filter((d) => d.isOnline).length;
  const activeAlertCount = alerts.filter((a) => a.status === 'ACTIVE').length;
  const criticalAlertCount = alerts.filter(
    (a) => a.status === 'ACTIVE' && a.severity === 'CRITICAL'
  ).length;
  const reportingDevices = allReadings.length;

  const temps = allReadings.map((r) => r.temperature).filter((v): v is number => v != null);
  const humids = allReadings.map((r) => r.humidity).filter((v): v is number => v != null);
  const aqis = allReadings.map((r) => r.airQuality).filter((v): v is number => v != null);
  const currents = allReadings.map((r) => r.current).filter((v): v is number => v != null);
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  const avgTemp = avg(temps);
  const avgHumidity = avg(humids);
  const avgAqi = avg(aqis);
  const avgCurrent = avg(currents);
  const estimatedPowerKW =
    avgCurrent != null ? (avgCurrent * allReadings.length * 230 * 0.9) / 1000 : null;

  function tempStatus(t: number | null): 'ok' | 'warning' | 'critical' | 'neutral' {
    if (t === null) return 'neutral';
    if (t >= (thresholds.TEMPERATURE_CRITICAL ?? Infinity)) return 'critical';
    if (t >= (thresholds.TEMPERATURE_WARNING ?? Infinity)) return 'warning';
    return 'ok';
  }
  function aqiStatus(a: number | null): 'ok' | 'warning' | 'critical' | 'neutral' {
    if (a === null) return 'neutral';
    if (a >= (thresholds.AIR_QUALITY_CRITICAL ?? Infinity)) return 'critical';
    if (a >= (thresholds.AIR_QUALITY_WARNING ?? Infinity)) return 'warning';
    return 'ok';
  }

  const now = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'long',
    timeStyle: 'short',
  });

  return (
    <div className="px-6 py-6 page-enter max-w-7xl mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#6fa350]">
            Verdant Plant Intelligence
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#25352b] tracking-tight leading-tight mt-1">
            System Overview &amp; Live Telemetry
          </h1>
          <p className="mt-1 text-sm text-[#6d7d70]">
            Continuous industrial environmental, safety &amp; energy stewardship monitoring
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <RefreshButton onClick={() => setRefreshKey((k) => k + 1)} />
          <LiveBadge connected={connected} />
        </div>
      </div>

      {/* ── Timestamp + errors ── */}
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] text-[#6d7d70]">{now}</p>
        {(loadError || deviceError) && (
          <p className="font-mono text-xs text-red-600">{loadError ?? deviceError}</p>
        )}
      </div>

      {!connected && <ConnectionWarning />}

      {/* ── System status summary row ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Online devices */}
        <div
          className={`relative rounded-2xl border p-5 overflow-hidden card-hover bg-white shadow-verdant ${
            onlineCount > 0 ? 'border-[#6fa350]/30' : 'border-slate-300'
          }`}
        >
          <div
            className={`absolute bottom-0 left-0 right-0 h-[3px] opacity-80 ${
              onlineCount > 0 ? 'metric-strip-ok' : 'metric-strip-off'
            }`}
          />
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6d7d70] font-semibold">
              Online Devices
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                onlineCount > 0 ? 'bg-[#6fa350]/15 text-[#4f7a38]' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Radio size={16} />
            </div>
          </div>
          <div className="flex items-end gap-1.5">
            <span
              className={`font-serif text-[2.2rem] font-bold leading-none ${
                onlineCount > 0 ? 'text-[#4f7a38]' : 'text-slate-500'
              }`}
            >
              {onlineCount}
            </span>
            <span className="mb-0.5 font-mono text-sm text-[#6d7d70]">/ {devices.length}</span>
          </div>
          <p className="mt-2 font-mono text-[10px] text-[#6d7d70]">Reporting sensors</p>
        </div>

        {/* Active alerts */}
        <div
          className={`relative rounded-2xl border p-5 overflow-hidden card-hover bg-white shadow-verdant ${
            activeAlertCount === 0
              ? 'border-[#6fa350]/25'
              : criticalAlertCount > 0
              ? 'border-red-500/35'
              : 'border-amber-500/35'
          }`}
        >
          <div
            className={`absolute bottom-0 left-0 right-0 h-[3px] opacity-80 ${
              activeAlertCount === 0
                ? 'metric-strip-ok'
                : criticalAlertCount > 0
                ? 'metric-strip-crit'
                : 'metric-strip-warn'
            }`}
          />
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6d7d70] font-semibold">
              Active Alerts
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                activeAlertCount === 0
                  ? 'bg-[#6fa350]/15 text-[#4f7a38]'
                  : criticalAlertCount > 0
                  ? 'bg-red-50 text-red-600'
                  : 'bg-amber-50 text-amber-600'
              }`}
            >
              <Bell size={16} />
            </div>
          </div>
          <div className="flex items-end gap-1.5">
            <span
              className={`font-serif text-[2.2rem] font-bold leading-none ${
                activeAlertCount === 0
                  ? 'text-[#4f7a38]'
                  : criticalAlertCount > 0
                  ? 'text-red-600'
                  : 'text-amber-600'
              }`}
            >
              {activeAlertCount}
            </span>
          </div>
          <p className="mt-2 font-mono text-[10px] text-[#6d7d70]">
            {activeAlertCount === 0
              ? 'All channels normal'
              : criticalAlertCount > 0
              ? `${criticalAlertCount} critical active`
              : 'Requires review'}
          </p>
        </div>

        {/* Reporting data streams */}
        <div className="relative rounded-2xl border border-[var(--line)] bg-white p-5 overflow-hidden card-hover shadow-verdant">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6d7d70] font-semibold">
              Data Streams
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#4a8fa8]/15 text-[#346f86]">
              <BarChart3 size={16} />
            </div>
          </div>
          <div className="flex items-end gap-1.5">
            <span className="font-serif text-[2.2rem] font-bold leading-none text-[#25352b]">
              {reportingDevices}
            </span>
          </div>
          <p className="mt-2 font-mono text-[10px] text-[#6d7d70]">Live telemetry channels</p>
        </div>

        {/* CO₂ estimate */}
        <div className="relative rounded-2xl border border-[var(--line)] bg-white p-5 overflow-hidden card-hover shadow-verdant">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6d7d70] font-semibold">
              CO₂ Estimate
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#6fa350]/15 text-[#4f7a38]">
              <Leaf size={16} />
            </div>
          </div>
          <div className="flex items-end gap-1.5">
            <span className="font-serif text-[2.2rem] font-bold leading-none text-[#4f7a38]">
              {summary?.estimatedCO2g.toFixed(1) ?? '—'}
            </span>
            {summary && <span className="mb-0.5 font-mono text-sm text-[#6d7d70]">g</span>}
          </div>
          <p className="mt-2 font-mono text-[10px] text-[#6d7d70]">Aggregated carbon impact</p>
        </div>
      </div>

      {/* ── Live sensor averages ── */}
      <div className="space-y-3">
        <SectionTitle>Live Sensor Averages</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Temperature */}
          <div
            className={`relative rounded-2xl border p-5 overflow-hidden card-hover bg-white shadow-verdant ${
              tempStatus(avgTemp) === 'critical'
                ? 'border-red-400'
                : tempStatus(avgTemp) === 'warning'
                ? 'border-amber-400'
                : 'border-[var(--line)]'
            }`}
          >
            <div
              className={`absolute bottom-0 left-0 right-0 h-[3px] opacity-80 ${
                tempStatus(avgTemp) === 'critical'
                  ? 'metric-strip-crit'
                  : tempStatus(avgTemp) === 'warning'
                  ? 'metric-strip-warn'
                  : avgTemp != null
                  ? 'metric-strip-ok'
                  : 'metric-strip-off'
              }`}
            />
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6d7d70] font-semibold">
                Avg Temperature
              </span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                  tempStatus(avgTemp) === 'critical'
                    ? 'bg-red-50 text-red-600'
                    : tempStatus(avgTemp) === 'warning'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-[#6fa350]/15 text-[#4f7a38]'
                }`}
              >
                <Thermometer size={16} />
              </div>
            </div>
            <div className="flex items-end gap-1.5">
              <span
                className={`font-serif text-[2.2rem] font-bold leading-none ${
                  tempStatus(avgTemp) === 'critical'
                    ? 'text-red-600'
                    : tempStatus(avgTemp) === 'warning'
                    ? 'text-amber-600'
                    : avgTemp != null
                    ? 'text-[#25352b]'
                    : 'text-slate-400'
                }`}
              >
                {avgTemp != null ? avgTemp.toFixed(1) : '—'}
              </span>
              {avgTemp != null && <span className="mb-0.5 font-mono text-sm text-[#6d7d70]">°C</span>}
            </div>
            <p className="mt-2 font-mono text-[10px] text-[#6d7d70]">
              {tempStatus(avgTemp) === 'critical'
                ? 'Critical — elevated thermal reading'
                : tempStatus(avgTemp) === 'warning'
                ? 'Warning — above nominal range'
                : avgTemp != null
                ? 'Within optimal thermal limits'
                : 'Awaiting telemetry'}
            </p>
          </div>

          {/* Humidity */}
          <div className="relative rounded-2xl border border-[var(--line)] bg-white p-5 overflow-hidden card-hover shadow-verdant">
            <div
              className={`absolute bottom-0 left-0 right-0 h-[3px] opacity-80 ${
                avgHumidity != null ? 'metric-strip-ok' : 'metric-strip-off'
              }`}
            />
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6d7d70] font-semibold">
                Avg Humidity
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#4a8fa8]/15 text-[#346f86]">
                <Droplets size={16} />
              </div>
            </div>
            <div className="flex items-end gap-1.5">
              <span className="font-serif text-[2.2rem] font-bold leading-none text-[#25352b]">
                {avgHumidity != null ? avgHumidity.toFixed(1) : '—'}
              </span>
              {avgHumidity != null && <span className="mb-0.5 font-mono text-sm text-[#6d7d70]">%</span>}
            </div>
            <p className="mt-2 font-mono text-[10px] text-[#6d7d70]">
              {avgHumidity != null ? 'Ambient relative humidity' : 'Awaiting telemetry'}
            </p>
          </div>

          {/* Air Quality */}
          <div
            className={`relative rounded-2xl border p-5 overflow-hidden card-hover bg-white shadow-verdant ${
              aqiStatus(avgAqi) === 'critical'
                ? 'border-red-400'
                : aqiStatus(avgAqi) === 'warning'
                ? 'border-amber-400'
                : 'border-[var(--line)]'
            }`}
          >
            <div
              className={`absolute bottom-0 left-0 right-0 h-[3px] opacity-80 ${
                aqiStatus(avgAqi) === 'critical'
                  ? 'metric-strip-crit'
                  : aqiStatus(avgAqi) === 'warning'
                  ? 'metric-strip-warn'
                  : avgAqi != null
                  ? 'metric-strip-ok'
                  : 'metric-strip-off'
              }`}
            />
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6d7d70] font-semibold">
                Avg Air Quality
              </span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                  aqiStatus(avgAqi) === 'critical'
                    ? 'bg-red-50 text-red-600'
                    : aqiStatus(avgAqi) === 'warning'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-[#6fa350]/15 text-[#4f7a38]'
                }`}
              >
                <Wind size={16} />
              </div>
            </div>
            <div className="flex items-end gap-1.5">
              <span
                className={`font-serif text-[2.2rem] font-bold leading-none ${
                  aqiStatus(avgAqi) === 'critical'
                    ? 'text-red-600'
                    : aqiStatus(avgAqi) === 'warning'
                    ? 'text-amber-600'
                    : avgAqi != null
                    ? 'text-[#25352b]'
                    : 'text-slate-400'
                }`}
              >
                {avgAqi != null ? avgAqi.toFixed(0) : '—'}
              </span>
              {avgAqi != null && <span className="mb-0.5 font-mono text-sm text-[#6d7d70]">AQI</span>}
            </div>
            <p className="mt-2 font-mono text-[10px] text-[#6d7d70]">
              {aqiStatus(avgAqi) === 'critical'
                ? 'Critical — hazardous air density'
                : aqiStatus(avgAqi) === 'warning'
                ? 'Warning — degraded air quality'
                : avgAqi != null
                ? 'Optimal clean air index'
                : 'Awaiting telemetry'}
            </p>
          </div>

          {/* Power estimate */}
          <div className="relative rounded-2xl border border-[var(--line)] bg-white p-5 overflow-hidden card-hover shadow-verdant">
            <div
              className={`absolute bottom-0 left-0 right-0 h-[3px] opacity-80 ${
                estimatedPowerKW != null ? 'metric-strip-info' : 'metric-strip-off'
              }`}
            />
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6d7d70] font-semibold">
                Est. Total Power
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#6fa350]/15 text-[#4f7a38]">
                <Zap size={16} />
              </div>
            </div>
            <div className="flex items-end gap-1.5">
              <span className="font-serif text-[2.2rem] font-bold leading-none text-[#25352b]">
                {estimatedPowerKW != null ? estimatedPowerKW.toFixed(2) : '—'}
              </span>
              {estimatedPowerKW != null && (
                <span className="mb-0.5 font-mono text-sm text-[#6d7d70]">kW</span>
              )}
            </div>
            <p className="mt-2 font-mono text-[10px] text-[#6d7d70]">
              {avgCurrent != null ? `Avg ${avgCurrent.toFixed(2)} A · 230V · 0.9 PF` : 'Awaiting telemetry'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Activity section (Active Alerts + Device Status) ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Active alerts */}
        <div className="rounded-2xl border border-[var(--line)] bg-white shadow-verdant overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)] bg-[#fbfbf9]">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-[#6fa350]" />
              <SectionTitle>Active Alerts</SectionTitle>
            </div>
            {activeAlertCount > 0 && (
              <span
                className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold border ${
                  criticalAlertCount > 0
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}
              >
                {activeAlertCount}
              </span>
            )}
          </div>
          <div className="p-6">
            <AlertList alerts={alerts} onResolve={resolve} error={alertError} compact />
          </div>
        </div>

        {/* Device status */}
        <div className="rounded-2xl border border-[var(--line)] bg-white shadow-verdant overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)] bg-[#fbfbf9]">
            <div className="flex items-center gap-2">
              <Radio size={15} className="text-[#6fa350]" />
              <SectionTitle>Device Status</SectionTitle>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold border ${
                onlineCount === devices.length && devices.length > 0
                  ? 'bg-[#6fa350]/15 border-[#6fa350]/30 text-[#4f7a38]'
                  : 'bg-slate-100 border-slate-300 text-slate-600'
              }`}
            >
              {onlineCount}/{devices.length} online
            </span>
          </div>
          <div className="p-6">
            <DeviceStatusList devices={devices} />
          </div>
        </div>
      </div>

      {/* ── Simulation & Evidence/Integrity Center ── */}
      <SimulationControls />
    </div>
  );
}
