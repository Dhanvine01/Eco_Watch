import { useEffect, useState } from 'react';
import { TrendChart } from '../components/TrendChart';
import { devicesApi } from '../services/api';
import { useReadingHistory } from '../hooks/useReadingHistory';
import type { Device } from '../types';
import {
  PageShell, PageHeader, ChartCard, DeviceSelect, RangeButtons, ErrorBanner, RefreshButton,
} from '../components/ui';

const METRIC_SERIES = [
  { key: 'temperature', label: 'Temperature (°C)', color: '#f97316' },
  { key: 'humidity',    label: 'Humidity (%)',     color: '#38bdf8' },
  { key: 'airQuality',  label: 'Air Quality (AQI)', color: '#f59e0b' },
  { key: 'current',     label: 'Current (A)',       color: '#10b981' },
  { key: 'noise',       label: 'Noise (dB)',        color: '#a78bfa' },
];

const RANGE_OPTIONS = [
  { label: '1h',  ms: 3_600_000 },
  { label: '6h',  ms: 21_600_000 },
  { label: '24h', ms: 86_400_000 },
];

export function AdminHistoryPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [range, setRange] = useState(3_600_000);
  const { history, error, refetch } = useReadingHistory(selectedDevice, range);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  useEffect(() => {
    devicesApi.list().then((d) => {
      setDevices(d);
      if (d[0]) setSelectedDevice(d[0].id);
    }).catch((reason) => setDeviceError(reason instanceof Error ? reason.message : 'Failed to load devices'));
  }, []);

  const chartData = history.map((r) => ({
    time: new Date(r.recordedAt).toLocaleTimeString('en-IN',
      range <= 3_600_000
        ? { hour: '2-digit', minute: '2-digit', second: '2-digit' }
        : { hour: '2-digit', minute: '2-digit' }
    ),
    temperature: r.temperature,
    humidity:    r.humidity,
    airQuality:  r.airQuality,
    current:     r.current,
    noise:       r.noise,
  }));

  return (
    <PageShell>
      <PageHeader
        title="Sensor History"
        subtitle="Historical readings from the database — select a device and time range"
      />

      {deviceError && <ErrorBanner message={deviceError} />}
      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-verdant">
        <DeviceSelect devices={devices} value={selectedDevice} onChange={setSelectedDevice} />
        <div className="h-5 w-px bg-[var(--line)] hidden sm:block" />
        <RangeButtons options={RANGE_OPTIONS} value={range} onChange={setRange} />
        <RefreshButton onClick={refetch} />
      </div>

      {/* Charts */}
      <div className="space-y-4">
        {METRIC_SERIES.map((s) => (
          <ChartCard key={s.key} title={s.label}>
            <TrendChart title="" data={chartData} series={[s]} height={180} />
          </ChartCard>
        ))}
      </div>
    </PageShell>
  );
}
