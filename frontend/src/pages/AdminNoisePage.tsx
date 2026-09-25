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
import { Volume2, TrendingUp, Gauge, AlertTriangle } from 'lucide-react';

export function AdminNoisePage() {
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

  const liveNoise = Object.values(latestReadings).map((r) => r.noise).filter((v): v is number => v !== null);
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const avgNoise = avg(liveNoise);
  const maxNoise = liveNoise.length ? Math.max(...liveNoise) : null;

  const noiseStatus = (n: number | null): 'ok' | 'warning' | 'critical' | 'neutral' => {
    if (n === null) return 'neutral';
    if (n >= (thresholds.NOISE_CRITICAL ?? Infinity)) return 'critical';
    if (n >= (thresholds.NOISE_WARNING ?? Infinity)) return 'warning';
    return 'ok';
  };

  const noiseSubtext = (n: number | null) => {
    if (n === null) return 'Awaiting telemetry';
    if (n >= (thresholds.NOISE_CRITICAL ?? Infinity)) return 'Critical — hearing hazard';
    if (n >= (thresholds.NOISE_WARNING ?? Infinity)) return 'Warning — elevated';
    return 'Within safe range';
  };

  const chartData = history.map((r) => ({
    time: new Date(r.recordedAt).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }),
    noise: r.noise,
  }));

  return (
    <PageShell>
      <PageHeader
        title="Noise Monitoring"
        subtitle="Decibel levels across all facility zones — occupational safety thresholds"
        live={connected}
      />

      {deviceError && <ErrorBanner message={deviceError} />}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <MetricCard
          label="Avg Noise"
          value={avgNoise?.toFixed(0) ?? '—'}
          unit={avgNoise !== null ? 'dB' : undefined}
          status={noiseStatus(avgNoise)}
          icon={Volume2}
          subtext={noiseSubtext(avgNoise)}
        />
        <MetricCard
          label="Peak Noise"
          value={maxNoise?.toFixed(0) ?? '—'}
          unit={maxNoise !== null ? 'dB' : undefined}
          status={noiseStatus(maxNoise)}
          icon={TrendingUp}
          subtext="Highest zone reading"
        />
        <MetricCard
          label="Warn Threshold"
          value={thresholds.NOISE_WARNING ?? '—'}
          unit="dB"
          status="neutral"
          icon={Gauge}
          subtext="Warning level"
        />
        <MetricCard
          label="Crit Threshold"
          value={thresholds.NOISE_CRITICAL ?? '—'}
          unit="dB"
          status="neutral"
          icon={AlertTriangle}
          subtext="Hearing hazard limit"
        />
      </div>

      {/* Per-device readings */}
      {devices.length > 0 && (
        <SectionCard title="Per-Device Noise Levels" className="mb-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {devices.map((d) => {
              const n = latestReadings[d.id]?.noise ?? null;
              return (
                <MetricCard
                  key={d.id}
                  label={d.label}
                  value={n?.toFixed(0) ?? '—'}
                  unit={n !== null ? 'dB' : undefined}
                  status={d.isOnline ? noiseStatus(n) : 'offline'}
                  subtext={d.isOnline ? noiseSubtext(n) : 'Offline'}
                />
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* History chart */}
      <ChartCard
        title="Noise Level — Last 60 min"
        action={<DeviceSelect devices={devices} value={selectedDevice} onChange={setSelectedDevice} />}
      >
        {historyError && <ErrorBanner message={historyError} />}
        <TrendChart
          title=""
          data={chartData}
          series={[{ key: 'noise', label: 'Noise (dB)', color: '#a78bfa' }]}
          height={220}
        />
      </ChartCard>
    </PageShell>
  );
}
