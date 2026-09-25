import { useEffect, useState } from 'react';
import { devicesApi, zonesApi } from '../services/api';
import type { Device, Zone } from '../types';
import {
  PageShell, PageHeader, MetricCard, TableWrapper, Th, Td, ErrorBanner, EmptyState, RefreshButton,
} from '../components/ui';
import { Radio, Wifi, WifiOff, Building2 } from 'lucide-react';

function timeAgo(iso: string | null) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AdminDevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [d, z] = await Promise.all([devicesApi.list(), zonesApi.list()]);
      setDevices(d);
      setZones(z);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  }

  // oxlint-disable-next-line react/set-state-in-effect -- load updates state after API requests.
  useEffect(() => { void load(); }, []);

  const onlineCount = devices.filter((d) => d.isOnline).length;
  const offlineCount = devices.length - onlineCount;

  return (
    <PageShell>
      <PageHeader
        title="Device Inventory"
        subtitle="Connected sensors and monitoring nodes across all facility zones"
      >
        <RefreshButton onClick={() => void load()} />
      </PageHeader>

      {error && <ErrorBanner message={error} onRetry={() => void load()} />}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-7">
        <MetricCard
          label="Total Devices"
          value={devices.length}
          status="neutral"
          icon={Radio}
          subtext="Registered in system"
        />
        <MetricCard
          label="Online"
          value={onlineCount}
          status={onlineCount === devices.length && devices.length > 0 ? 'ok' : 'neutral'}
          icon={Wifi}
          subtext="Currently reporting"
        />
        <MetricCard
          label="Offline"
          value={offlineCount}
          status={offlineCount > 0 ? 'warning' : 'ok'}
          icon={WifiOff}
          subtext={offlineCount > 0 ? 'Require attention' : 'All devices online'}
        />
      </div>

      {/* Zones + devices */}
      {zones.length > 0 ? (
        <div className="space-y-6">
          {zones.map((zone) => {
            const zoneDevices = devices.filter((d) => d.zoneId === zone.id);
            const zoneOnline = zoneDevices.filter((d) => d.isOnline).length;

            return (
              <div key={zone.id} className="rounded-2xl border border-[var(--line)] bg-white shadow-verdant overflow-hidden">
                {/* Zone header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)] bg-[#fbfbf9]">
                  <div className="flex items-center gap-2.5">
                    <Building2 size={16} className="text-[#6fa350]" />
                    <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#4f7a38]">
                      {zone.name}
                    </span>
                  </div>
                  <span className={`rounded-full border px-3 py-0.5 font-mono text-xs font-bold ${
                    zoneOnline === zoneDevices.length && zoneDevices.length > 0
                      ? 'bg-[#6fa350]/15 border-[#6fa350]/30 text-[#4f7a38]'
                      : 'bg-slate-100 border-slate-300 text-slate-700'
                  }`}>
                    {zoneOnline}/{zoneDevices.length} online
                  </span>
                </div>

                {loading ? (
                  <div className="p-6 space-y-2">
                    {[1, 2].map((i) => <div key={i} className="h-12 rounded-xl skeleton" />)}
                  </div>
                ) : zoneDevices.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="font-mono text-xs text-[#6d7d70]">No devices in this zone</p>
                  </div>
                ) : (
                  <TableWrapper>
                    <thead>
                      <tr>
                        <Th>Device</Th>
                        <Th>Device ID</Th>
                        <Th>Status</Th>
                        <Th right>Last Seen</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {zoneDevices.map((d) => (
                        <tr key={d.id} className="hover:bg-[#fbfbf9] transition-colors">
                          <Td>
                            <div className="flex items-center gap-2.5">
                              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${
                                d.isOnline ? 'bg-[#6fa350]/15 text-[#4f7a38]' : 'bg-slate-100 text-slate-400'
                              }`}>
                                <Radio size={15} />
                              </div>
                              <span className="font-bold text-[#25352b]">{d.label}</span>
                            </div>
                          </Td>
                          <Td>
                            <span className="font-mono text-xs text-[#6d7d70]">{d.id}</span>
                          </Td>
                          <Td>
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                              d.isOnline
                                ? 'bg-[#6fa350]/15 border-[#6fa350]/30 text-[#4f7a38]'
                                : 'bg-slate-100 border-slate-300 text-slate-600'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${d.isOnline ? 'bg-[#6fa350] live-dot' : 'bg-slate-400'}`} />
                              {d.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </Td>
                          <Td right>
                            <span className="font-mono text-xs text-[#6d7d70]">
                              {timeAgo(d.lastSeenAt)}
                            </span>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </TableWrapper>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Radio}
          title="No devices found"
          description="No facility zones or sensor devices are currently configured in the database."
        />
      )}
    </PageShell>
  );
}
