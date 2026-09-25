/**
 * EquipmentHistoryPage
 *
 * Equipment Unit Life-Cycle & Diagnostic History.
 * Shows historical sensor trend, energy degradation indicator, and linked inspection reports.
 * Uses Verdant Theme palette.
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { equipmentApi, inspectionApi } from '../services/api';
import type { EquipmentHistory } from '../types';
import { TrendChart } from '../components/TrendChart';
import { EnergyClassificationBadge, SeverityBadge, StatusBadge, TypeBadge } from '../components/InspectionBadges';
import {
  PageShell,
  PageHeader,
  MetricCard,
  SectionCard,
  EmptyState,
} from '../components/ui';
import {
  Cpu,
  Layers,
  Zap,
  Thermometer,
  Wind,
  Sparkles,
  ArrowLeft,
  Clock,
  ShieldAlert,
  User,
  Tag,
  Activity,
  Info,
} from 'lucide-react';

function fmt(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return dateStr;
  }
}

function fmtW(w: number | null | undefined) {
  if (w == null) return '—';
  if (w >= 1000) return `${(w / 1000).toFixed(2)} kW`;
  return `${w.toFixed(0)} W`;
}

export function EquipmentHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<EquipmentHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    equipmentApi.history(id)
      .then((res) => {
        setData(res);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <PageShell>
        <div className="space-y-4 max-w-5xl mx-auto">
          <div className="h-6 w-36 rounded skeleton" />
          <div className="h-32 rounded-2xl skeleton" />
          <div className="h-64 rounded-2xl skeleton" />
        </div>
      </PageShell>
    );
  }

  if (error || !data || !data.equipment) {
    return (
      <PageShell>
        <div className="max-w-5xl mx-auto space-y-4">
          <Link to="/admin/inspections" className="flex items-center gap-1.5 font-mono text-xs text-[#4f7a38] hover:underline">
            <ArrowLeft size={13} /> Back to Inspection Queue
          </Link>
          <p className="font-mono text-xs text-red-600">{error ?? 'Equipment unit not found'}</p>
        </div>
      </PageShell>
    );
  }

  const { equipment, latestReadings, activeAlerts, inspections, energyTrend } = data;

  const chartData = latestReadings.map((r) => ({
    time: new Date(r.recordedAt).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }),
    power: r.current != null ? r.current * 230 * 0.9 : 0,
    temperature: r.temperature,
    airQuality: r.airQuality,
  }));

  // Compute live aggregates
  const totalPower = latestReadings.reduce((sum, r) => sum + (r.current ? r.current * 230 * 0.9 : 0), 0);
  const avgTemp = latestReadings.length
    ? latestReadings.reduce((s, r) => s + (r.temperature ?? 0), 0) / latestReadings.length
    : null;
  const avgAq = latestReadings.length
    ? latestReadings.reduce((s, r) => s + (r.airQuality ?? 0), 0) / latestReadings.length
    : null;

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/admin/inspections"
            className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#4f7a38] hover:text-[#25352b] transition-colors"
          >
            <ArrowLeft size={13} /> Back to Inspection Queue
          </Link>
        </div>

        {/* Page Header */}
        <PageHeader
          title={`${equipment.label} — Diagnostic Life-Cycle`}
          subtitle={`Unit ID: ${equipment.id} · ${equipment.description ?? 'Industrial Machine Asset'}`}
          live={true}
        />

        {/* Top summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard
            label="Baseline Power"
            value={fmtW(equipment.baselinePowerW)}
            status="neutral"
            icon={Zap}
            subtext="Rated design load"
          />
          <MetricCard
            label="Active Anomalies"
            value={activeAlerts.length}
            status={activeAlerts.length > 0 ? 'critical' : 'ok'}
            icon={ShieldAlert}
            subtext={activeAlerts.length > 0 ? 'Active alerts detected' : 'All channels normal'}
          />
          <MetricCard
            label="Logged Inspections"
            value={inspections.length}
            status="info"
            icon={Layers}
            subtext="Total visual audit reports"
          />
          <MetricCard
            label="Installed Zone"
            value={equipment.zone?.name ?? '—'}
            status="neutral"
            icon={Cpu}
            subtext="Facility deployment area"
          />
        </div>

        {/* Energy Degradation Panel */}
        {energyTrend && (
          <SectionCard>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-[#6fa350]" />
                <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-[#4f7a38] font-bold">
                  Energy Consumption Degradation Vector
                </h2>
              </div>
              <EnergyClassificationBadge classification={energyTrend.classification} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="rounded-2xl bg-[#fbfbf9] border border-[var(--line)] p-4 shadow-sm">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#6d7d70] font-semibold">Short-term Moving Avg</p>
                <p className="font-serif text-xl font-bold text-[#25352b] mt-1">{fmtW(energyTrend.avgPowerShortW)}</p>
              </div>
              <div className="rounded-2xl bg-[#fbfbf9] border border-[var(--line)] p-4 shadow-sm">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#6d7d70] font-semibold">Long-term Baseline Avg</p>
                <p className="font-serif text-xl font-bold text-[#25352b] mt-1">{fmtW(energyTrend.avgPowerLongW)}</p>
              </div>
              <div className="rounded-2xl bg-[#fbfbf9] border border-[var(--line)] p-4 shadow-sm">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#6d7d70] font-semibold">Baseline Deviation</p>
                <p className={`font-serif text-xl font-bold mt-1 ${
                  energyTrend.deviationPct > 10 ? 'text-red-600' : energyTrend.deviationPct > 0 ? 'text-amber-600' : 'text-[#4f7a38]'
                }`}>
                  {energyTrend.deviationPct > 0 ? '+' : ''}{energyTrend.deviationPct.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-[#fbfbf9] border border-[var(--line)] p-3.5 text-xs font-mono text-[#25352b]">
              {energyTrend.note}
            </div>

            <div className="mt-3 flex items-center gap-2 font-mono text-[11px] text-[#6d7d70]">
              <Info size={13} className="text-[#6fa350] flex-shrink-0" />
              <span>Statistical operational indicator computed from continuous load telemetry. Does not replace mechanical vibration analysis.</span>
            </div>
          </SectionCard>
        )}

        {/* Live zone sensor telemetry */}
        <SectionCard>
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-[#6fa350]" />
            <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-[#4f7a38] font-bold">
              Current Zone Telemetry Readings
            </h2>
          </div>

          {latestReadings.length === 0 ? (
            <p className="font-mono text-xs text-[#6d7d70]">No telemetry packets received for this zone yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {totalPower > 0 && (
                <div className="rounded-2xl border border-[var(--line)] bg-[#fbfbf9] p-4 shadow-sm">
                  <div className="flex items-center justify-between text-[#6d7d70] mb-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">Estimated Load</span>
                    <Zap size={14} className="text-[#6fa350]" />
                  </div>
                  <p className="font-serif text-2xl font-bold text-[#25352b]">{fmtW(totalPower)}</p>
                  {equipment.baselinePowerW && (
                    <p className="font-mono text-[10px] text-[#6d7d70] mt-1">Design baseline: {fmtW(equipment.baselinePowerW)}</p>
                  )}
                </div>
              )}
              {avgTemp != null && !isNaN(avgTemp) && (
                <div className="rounded-2xl border border-[var(--line)] bg-[#fbfbf9] p-4 shadow-sm">
                  <div className="flex items-center justify-between text-[#6d7d70] mb-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">Zone Temperature</span>
                    <Thermometer size={14} className="text-amber-600" />
                  </div>
                  <p className="font-serif text-2xl font-bold text-[#25352b]">{avgTemp.toFixed(1)}°C</p>
                  <p className="font-mono text-[10px] text-[#6d7d70] mt-1">Ambient environmental gauge</p>
                </div>
              )}
              {avgAq != null && !isNaN(avgAq) && (
                <div className="rounded-2xl border border-[var(--line)] bg-[#fbfbf9] p-4 shadow-sm">
                  <div className="flex items-center justify-between text-[#6d7d70] mb-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">Air Quality (AQI)</span>
                    <Wind size={14} className="text-[#4f7a38]" />
                  </div>
                  <p className="font-serif text-2xl font-bold text-[#25352b]">{avgAq.toFixed(0)} AQI</p>
                  <p className="font-mono text-[10px] text-[#6d7d70] mt-1">Gas / particulate density</p>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* Active Alerts */}
        {activeAlerts.length > 0 && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-red-600" />
              <h2 className="font-serif text-base text-red-800 font-bold">
                Active Zone Anomalies ({activeAlerts.length})
              </h2>
            </div>
            <div className="space-y-2">
              {activeAlerts.map((alert: any) => (
                <div key={alert.id} className="flex items-center justify-between rounded-xl bg-white border border-red-200 px-4 py-3 shadow-sm">
                  <div>
                    <span className="font-mono text-xs text-red-700 font-bold uppercase tracking-wider">
                      {alert.type.replace('_', ' ')}
                    </span>
                    <span className="ml-2 font-sans text-xs text-[#25352b] font-medium">{alert.message}</span>
                  </div>
                  <span className="font-mono text-[11px] text-[#6d7d70] flex items-center gap-1">
                    <Clock size={11} />
                    {fmt(alert.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Telemetry Graph */}
        <SectionCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-[#4f7a38] font-bold">
              Continuous Sensor Telemetry Graph
            </h2>
          </div>
          <TrendChart
            title=""
            data={chartData}
            series={[
              { key: 'power', label: 'Load (W)', color: '#6fa350' },
              { key: 'temperature', label: 'Temp (°C)', color: '#d9822b' },
              { key: 'airQuality', label: 'AQI', color: '#4a8fa8' },
            ]}
          />
        </SectionCard>

        {/* Inspection Reports */}
        <SectionCard>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-[#6fa350]" />
              <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-[#4f7a38] font-bold">
                Logged Field Inspection Reports ({inspections.length})
              </h2>
            </div>
          </div>

          {inspections.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No Inspection Reports"
              description="No inspection reports have been recorded for this equipment unit yet."
            />
          ) : (
            <div className="space-y-3">
              {inspections.map((insp) => (
                <div key={insp.id} className="rounded-2xl border border-[var(--line)] bg-[#fbfbf9] p-4 space-y-3 hover:border-[#6fa350] transition-all shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap gap-1.5">
                        <TypeBadge type={insp.inspectionType} />
                        <SeverityBadge severity={insp.severity} />
                        <StatusBadge status={insp.status} />
                      </div>
                      <p className="font-sans text-xs text-[#25352b] leading-relaxed font-semibold">{insp.message}</p>
                      <div className="flex items-center gap-3 font-mono text-[11px] text-[#6d7d70] flex-wrap">
                        <span className="flex items-center gap-1">
                          <User size={11} />
                          {insp.inspector?.name ?? 'Inspector'}
                        </span>
                        {insp.locationCode && (
                          <span className="flex items-center gap-1 text-[#4f7a38] font-bold">
                            <Tag size={11} />
                            {insp.locationCode}
                          </span>
                        )}
                        {insp.component && <span>• Comp: {insp.component}</span>}
                      </div>

                      {/* Photo thumbnails */}
                      {(insp.images ?? []).length > 0 && (
                        <div className="flex gap-2 pt-1">
                          {(insp.images ?? []).slice(0, 4).map((img) => (
                            <a
                              key={img.id}
                              href={inspectionApi.imageUrl(img.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="block rounded-xl overflow-hidden border border-[var(--line)] hover:border-[#6fa350] transition-all shadow-sm"
                            >
                              <img
                                src={inspectionApi.imageUrl(img.id)}
                                alt={img.originalName ?? 'Inspection image'}
                                className="h-12 w-16 object-cover bg-white"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </a>
                          ))}
                          {(insp.images ?? []).length > 4 && (
                            <div className="h-12 w-16 rounded-xl border border-[var(--line)] bg-white flex items-center justify-center font-mono text-[10px] text-[#6d7d70] font-bold">
                              +{(insp.images ?? []).length - 4}
                            </div>
                          )}
                        </div>
                      )}

                      {/* AI Result */}
                      {insp.aiResult && (
                        <div className="space-y-2 pt-1">
                          <div className="rounded-xl bg-white border border-[var(--line)] p-2.5 flex items-center justify-between gap-3 shadow-sm">
                            <div className="flex items-center gap-2">
                              <Sparkles size={13} className="text-[#6fa350]" />
                              <span className="font-mono text-[10px] uppercase tracking-wider text-[#4f7a38] font-bold">AI Diagnostic:</span>
                              <span className={`font-mono text-xs font-bold ${
                                (insp.aiResult as any).riskLevel === 'CRITICAL' ? 'text-red-600' :
                                (insp.aiResult as any).riskLevel === 'HIGH' ? 'text-orange-600' :
                                (insp.aiResult as any).riskLevel === 'MEDIUM' ? 'text-amber-600' : 'text-[#4f7a38]'
                              }`}>
                                {(insp.aiResult as any).riskLevel ?? 'ASSESSED'}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-[#6d7d70]">
                              {(insp.aiResult as any).modelVersion ?? ''}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-[#6d7d70] flex-shrink-0">{fmt(insp.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </PageShell>
  );
}
