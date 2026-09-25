import { useEffect, useState } from 'react';
import { TrendChart } from '../components/TrendChart';
import { useStream } from '../hooks/useStream';
import { devicesApi } from '../services/api';
import { useThresholds } from '../hooks/useThresholds';
import { useReadingHistory } from '../hooks/useReadingHistory';
import type { Device } from '../types';
import {
  PageShell, PageHeader, ChartCard, MetricCard, DeviceSelect, ErrorBanner, SectionCard,
} from '../components/ui';
import { Thermometer, Droplets, Gauge, Radio } from 'lucide-react';

export function AdminTempHumidityPage() {
  const { latestReadings, connected } = useStream();
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState('');
  const { history, error: historyError } = useReadingHistory(selectedDevice);
  const { thresholds } = useThresholds();

  useEffect(() => {
    devicesApi.list().then((d) => {
      setDevices(d);
      if (d[0]) setSelectedDevice(d[0].id);
    }).catch((reason) => setDeviceError(reason instanceof Error ? reason.message : 'Failed to load devices'));
  }, []);

  const liveTemps = Object.values(latestReadings).map((r) => r.temperature).filter((v): v is number => v !== null);
  const liveHumids = Object.values(latestReadings).map((r) => r.humidity).filter((v): v is number => v !== null);
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const avgTemp = avg(liveTemps);
  const avgHumidity = avg(liveHumids);

  const tempStatus = (t: number | null): 'ok' | 'warning' | 'critical' | 'neutral' => {
    if (t === null) return 'neutral';
    if (t >= (thresholds.TEMPERATURE_CRITICAL ?? Infinity)) return 'critical';
    if (t >= (thresholds.TEMPERATURE_WARNING ?? Infinity)) return 'warning';
    return 'ok';
  };

  const tempSubtext = (t: number | null) => {
    if (t === null) return 'Awaiting telemetry';
    if (t >= (thresholds.TEMPERATURE_CRITICAL ?? Infinity)) return 'Critical — above safe limit';
    if (t >= (thresholds.TEMPERATURE_WARNING ?? Infinity)) return 'Warning — elevated';
    return 'Within normal range';
  };

  const chartData = history.map((r) => ({
    time: new Date(r.recordedAt).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }),
    temperature: r.temperature,
    humidity: r.humidity,
  }));

  return (
    <PageShell>
      <PageHeader
        title="Temperature & Humidity"
        subtitle="Ambient climate monitoring across all facility zones"
        live={connected}
      />

      {deviceError && <ErrorBanner message={deviceError} />}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <MetricCard
          label="Avg Temperature"
          value={avgTemp?.toFixed(1) ?? '—'}
          unit={avgTemp !== null ? '°C' : undefined}
          status={tempStatus(avgTemp)}
          icon={Thermometer}
          subtext={tempSubtext(avgTemp)}
        />
        <MetricCard
          label="Avg Humidity"
          value={avgHumidity?.toFixed(0) ?? '—'}
          unit={avgHumidity !== null ? '%' : undefined}
          status="info"
          icon={Droplets}
          subtext="Relative humidity"
        />
        <MetricCard
          label="Temp Warning At"
          value={thresholds.TEMPERATURE_WARNING ?? '—'}
          unit="°C"
          status="neutral"
          icon={Gauge}
          subtext="Warning threshold"
        />
        <MetricCard
          label="Reporting"
          value={liveTemps.length}
          status="ok"
          icon={Radio}
          subtext="Devices with temp data"
        />
      </div>

      {/* Per-device temperature */}
      {devices.length > 0 && (
        <SectionCard title="Per-Device Readings" className="mb-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {devices.map((d) => {
              const t = latestReadings[d.id]?.temperature ?? null;
              const h = latestReadings[d.id]?.humidity ?? null;
              const st = tempStatus(t);
              return (
                <div
                  key={d.id}
                  className={`relative rounded-2xl border bg-white p-4 overflow-hidden card-hover shadow-verdant ${
                    !d.isOnline ? 'border-slate-300' :
                    st === 'critical' ? 'border-red-400' :
                    st === 'warning' ? 'border-amber-400' : 'border-[var(--line)]'
                  }`}
                >
                  {/* Status strip */}
                  <div className={`absolute bottom-0 left-0 right-0 h-[3px] opacity-80 ${
                    !d.isOnline ? 'bg-slate-300' :
                    st === 'critical' ? 'metric-strip-crit' :
                    st === 'warning' ? 'metric-strip-warn' : 'metric-strip-ok'
                  }`} />
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6d7d70] font-bold truncate">
                      {d.label}
                    </span>
                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ml-2 ${d.isOnline ? 'bg-[#6fa350] live-dot' : 'bg-slate-400'}`} />
                  </div>
                  <div className="flex items-end gap-1">
                    <span className={`font-serif text-2xl font-bold leading-none ${
                      !d.isOnline ? 'text-slate-400' :
                      st === 'critical' ? 'text-red-600' :
                      st === 'warning' ? 'text-amber-600' : 'text-[#25352b]'
                    }`}>
                      {t?.toFixed(1) ?? '—'}
                    </span>
                    {t !== null && <span className="mb-0.5 font-mono text-xs text-[#6d7d70]">°C</span>}
                  </div>
                  {h !== null && (
                    <p className="mt-1 font-mono text-[11px] text-[#6d7d70]">{h.toFixed(0)}% RH</p>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* History chart */}
      <ChartCard
        title="Temperature & Humidity — Last 60 min"
        action={<DeviceSelect devices={devices} value={selectedDevice} onChange={setSelectedDevice} />}
      >
        {historyError && <ErrorBanner message={historyError} />}
        <TrendChart
          title=""
          data={chartData}
          series={[
            { key: 'temperature', label: 'Temp (°C)', color: '#f97316' },
            { key: 'humidity', label: 'Humidity (%)', color: '#38bdf8' },
          ]}
          height={220}
        />
      </ChartCard>
    </PageShell>
  );
}
