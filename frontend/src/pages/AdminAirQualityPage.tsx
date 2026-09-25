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
import { Wind, AlertTriangle, Gauge, Radio } from 'lucide-react';

function aqiStatus(v: number | null, warning?: number, critical?: number): 'ok' | 'warning' | 'critical' | 'neutral' {
  if (v === null) return 'neutral';
  if (v >= (critical ?? Infinity)) return 'critical';
  if (v >= (warning ?? Infinity)) return 'warning';
  return 'ok';
}

function aqiLabel(v: number | null, warning?: number, critical?: number) {
  if (v === null) return 'Awaiting telemetry';
  if (v >= (critical ?? Infinity)) return 'Critical — hazardous';
  if (v >= (warning ?? Infinity)) return 'Warning — degraded';
  return 'Good air quality';
}

export function AdminAirQualityPage() {
  const { latestReadings, connected } = useStream();
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState('');
  const { history, error: historyError } = useReadingHistory(selectedDevice);
  const { thresholds } = useThresholds();

  useEffect(() => {
    devicesApi.list().then((d) => {
      setDevices(d);
      if (d.length > 0) setSelectedDevice(d[0].id);
    }).catch((reason) => setDeviceError(reason instanceof Error ? reason.message : 'Failed to load devices'));
  }, []);

  const liveValues = Object.values(latestReadings)
    .map((r) => r.airQuality)
    .filter((v): v is number => v !== null);
  const avgAqi = liveValues.length
    ? liveValues.reduce((a, b) => a + b, 0) / liveValues.length
    : null;
  const maxAqi = liveValues.length ? Math.max(...liveValues) : null;

  const chartData = history.map((r) => ({
    time: new Date(r.recordedAt).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }),
    aqi: r.airQuality,
  }));

  const avgStatus = aqiStatus(avgAqi, thresholds.AIR_QUALITY_WARNING, thresholds.AIR_QUALITY_CRITICAL);
  const maxStatus = aqiStatus(maxAqi, thresholds.AIR_QUALITY_WARNING, thresholds.AIR_QUALITY_CRITICAL);

  return (
    <PageShell>
      <PageHeader
        title="Air Quality"
        subtitle="AQI readings across all zones — live sensor data and historical trends"
        live={connected}
      />

      {deviceError && <ErrorBanner message={deviceError} />}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <MetricCard
          label="Avg AQI"
          value={avgAqi?.toFixed(0) ?? '—'}
          status={avgStatus}
          icon={Wind}
          subtext={aqiLabel(avgAqi, thresholds.AIR_QUALITY_WARNING, thresholds.AIR_QUALITY_CRITICAL)}
        />
        <MetricCard
          label="Peak AQI"
          value={maxAqi?.toFixed(0) ?? '—'}
          status={maxStatus}
          icon={AlertTriangle}
          subtext="Worst zone reading"
        />
        <MetricCard
          label="Warn Threshold"
          value={thresholds.AIR_QUALITY_WARNING ?? '—'}
          unit="AQI"
          status="neutral"
          icon={Gauge}
          subtext="Warning level"
        />
        <MetricCard
          label="Reporting"
          value={liveValues.length}
          status="ok"
          icon={Radio}
          subtext="Devices with AQI data"
        />
      </div>

      {/* Per-device readings */}
      {devices.length > 0 && (
        <SectionCard title="Per-Device Air Quality" className="mb-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {devices.map((d) => {
              const aqi = latestReadings[d.id]?.airQuality ?? null;
              const st = aqiStatus(aqi, thresholds.AIR_QUALITY_WARNING, thresholds.AIR_QUALITY_CRITICAL);
              return (
                <MetricCard
                  key={d.id}
                  label={d.label}
                  value={aqi?.toFixed(0) ?? '—'}
                  unit={aqi !== null ? 'AQI' : undefined}
                  status={d.isOnline ? st : 'offline'}
                  subtext={d.isOnline ? aqiLabel(aqi, thresholds.AIR_QUALITY_WARNING, thresholds.AIR_QUALITY_CRITICAL) : 'Offline'}
                />
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* History chart */}
      <ChartCard
        title="Air Quality Index — Last 60 min"
        action={<DeviceSelect devices={devices} value={selectedDevice} onChange={setSelectedDevice} />}
      >
        {historyError && <ErrorBanner message={historyError} />}
        <TrendChart
          title=""
          data={chartData}
          series={[{ key: 'aqi', label: 'AQI', color: '#f59e0b' }]}
          height={220}
        />
      </ChartCard>
    </PageShell>
  );
}
