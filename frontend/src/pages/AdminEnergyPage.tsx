import { useEffect, useState } from 'react';
import { EnergySummaryPanel } from '../components/EnergySummaryPanel';
import { TrendChart } from '../components/TrendChart';
import { useEnergySummary } from '../hooks/useEnergySummary';
import { devicesApi } from '../services/api';
import { useReadingHistory } from '../hooks/useReadingHistory';
import type { Device } from '../types';
import {
  PageShell, PageHeader, ChartCard, SectionCard, DeviceSelect, ErrorBanner,
} from '../components/ui';
import { Zap } from 'lucide-react';
import { useStream } from '../hooks/useStream';

export function AdminEnergyPage() {
  const { summary, loading } = useEnergySummary();
  const { connected } = useStream();
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const { history, error: historyError } = useReadingHistory(selectedDevice);

  useEffect(() => {
    devicesApi.list().then((d) => {
      setDevices(d);
      if (d.length > 0) setSelectedDevice(d[0].id);
    }).catch((reason) => setDeviceError(reason instanceof Error ? reason.message : 'Failed to load devices'));
  }, []);

  const chartData = history.map((r) => ({
    time: new Date(r.recordedAt).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }),
    current: r.current,
    power: r.estimatedPowerW,
  }));

  return (
    <PageShell>
      <PageHeader
        title="Energy Monitoring"
        subtitle="Current draw, estimated power, and CO₂ equivalence — updated every 10 s"
        live={connected}
      >
      </PageHeader>

      {deviceError && <ErrorBanner message={deviceError} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Summary panel */}
        <SectionCard title="Energy Summary" className="lg:col-span-1">
          <EnergySummaryPanel summary={summary} loading={loading} />
        </SectionCard>

        {/* Charts */}
        <div className="lg:col-span-2 space-y-5">
          {/* Device selector */}
          <div className="flex items-center gap-4 flex-wrap">
            <DeviceSelect devices={devices} value={selectedDevice} onChange={setSelectedDevice} />
            <span className="font-mono text-[10px] text-slate-600">Last 60 min</span>
          </div>

          {historyError && <ErrorBanner message={historyError} />}

          <ChartCard
            title="Current Draw (A)"
            action={
              <div className="flex items-center gap-1.5">
                <Zap size={12} className="text-emerald-400" />
                <span className="font-mono text-[10px] text-emerald-400/70">Live</span>
              </div>
            }
          >
            <TrendChart
              title=""
              data={chartData}
              series={[{ key: 'current', label: 'Current (A)', color: '#10b981' }]}
              height={180}
            />
          </ChartCard>

          <ChartCard title="Estimated Power Consumption (W)">
            <TrendChart
              title=""
              data={chartData}
              series={[{ key: 'power', label: 'Power (W)', color: '#38bdf8' }]}
              height={180}
            />
          </ChartCard>
        </div>
      </div>
    </PageShell>
  );
}
