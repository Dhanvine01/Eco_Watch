/**
 * AdminInspectionsPage
 *
 * Inspection queue for the ADMIN role.
 * Shows all inspections sorted by deterministic priority score.
 * Allows status updates, viewing details, evidentiary photos, and AI triage breakdown.
 */
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { equipmentApi, inspectionApi } from '../services/api';
import type { Equipment, Inspection, InspectionStatus, PriorityLevel } from '../types';
import {
  SeverityBadge,
  StatusBadge,
  TypeBadge,
  PriorityBadge,
} from '../components/InspectionBadges';
import {
  PageShell,
  PageHeader,
  MetricCard,
  SectionCard,
  EmptyState,
} from '../components/ui';
import {
  ShieldAlert,
  AlertTriangle,
  ClipboardList,
  Cpu,
  MapPin,
  Tag,
  User,
  Image as ImageIcon,
  Clock,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Layers,
  Filter,
  X,
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

const STATUS_OPTIONS: InspectionStatus[] = ['OPEN', 'UNDER_REVIEW', 'ACKNOWLEDGED', 'RESOLVED'];

type InspectionWithPriority = Inspection & {
  priority?: { score: number; level: PriorityLevel; label: string };
};

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  insp,
  onClose,
  onStatusChange,
}: {
  insp: InspectionWithPriority;
  onClose?: () => void;
  onStatusChange: (id: string, status: InspectionStatus) => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  async function handleStatus(status: InspectionStatus) {
    setUpdating(true);
    try {
      await inspectionApi.updateStatus(insp.id, status);
      onStatusChange(insp.id, status);
    } catch (e) {
      console.error('Failed to update inspection status:', e);
    } finally {
      setUpdating(false);
    }
  }

  const ai = insp.aiResult as any;
  const images = insp.images ?? [];
  const priority = insp.priority ?? { score: 0, level: 'LOW' as PriorityLevel, label: 'Standard' };

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-5 space-y-4 shadow-verdant">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <PriorityBadge level={priority.level} label={priority.label} />
            <TypeBadge type={insp.inspectionType} />
            <SeverityBadge severity={insp.severity} />
            <StatusBadge status={insp.status} />
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] text-[#6d7d70]">
            <span>ID: {insp.id ? insp.id.slice(0, 8) : '—'}…</span>
            <span className="text-[#4f7a38] font-bold">Priority Score: {priority.score ?? 0}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 font-mono text-[10px] text-[#6d7d70]">
            <Clock size={11} />
            <span>{fmt(insp.createdAt)}</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-[#6d7d70] hover:text-[#25352b] hover:bg-[#f3f7f0] transition-colors"
              title="Close details"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Location info */}
      <div className="grid grid-cols-2 gap-2.5 font-mono text-xs bg-[#fbfbf9] border border-[var(--line)] rounded-xl p-3">
        <div>
          <span className="text-[#6d7d70] block text-[10px] uppercase tracking-wider font-semibold">Zone</span>
          <span className="text-[#25352b] font-bold">{insp.zone?.name ?? '—'}</span>
        </div>
        <div>
          <span className="text-[#6d7d70] block text-[10px] uppercase tracking-wider font-semibold">Equipment</span>
          {insp.equipment ? (
            <Link
              to={`/admin/equipment/${insp.equipment.id}/history`}
              className="text-[#4f7a38] hover:text-[#25352b] font-bold inline-flex items-center gap-1"
            >
              <span className="truncate">{insp.equipment.label}</span>
              <ExternalLink size={11} className="shrink-0" />
            </Link>
          ) : (
            <span className="text-[#6d7d70]">—</span>
          )}
        </div>
        <div>
          <span className="text-[#6d7d70] block text-[10px] uppercase tracking-wider font-semibold">Component</span>
          <span className="text-[#25352b] font-medium">{insp.component ?? '—'}</span>
        </div>
        <div>
          <span className="text-[#6d7d70] block text-[10px] uppercase tracking-wider font-semibold">Location Code</span>
          <span className="text-[#4f7a38] font-bold">{insp.locationCode ?? '—'}</span>
        </div>
      </div>

      {/* Inspector observation */}
      <div className="space-y-1 bg-[#fbfbf9] border border-[var(--line)] rounded-xl p-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#4f7a38] font-bold">Field Observation</p>
        <p className="font-sans text-xs text-[#25352b] leading-relaxed whitespace-pre-wrap font-medium">{insp.message ?? 'No observation notes recorded.'}</p>
        <div className="flex items-center gap-1.5 pt-1 font-mono text-[10px] text-[#6d7d70]">
          <User size={11} className="text-[#6fa350]" />
          <span>Recorded by: {insp.inspector?.name ?? 'Inspector'}</span>
        </div>
      </div>

      {/* Evidentiary Photos */}
      {images.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#4f7a38] font-bold flex items-center gap-1.5">
            <ImageIcon size={13} />
            <span>Evidentiary Photos ({images.length})</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {images.map((img) => (
              <div
                key={img.id}
                className="group relative rounded-xl overflow-hidden border border-[var(--line)] hover:border-[#6fa350] transition-all bg-[#fbfbf9] cursor-pointer shadow-sm"
                onClick={() => setSelectedPhoto(inspectionApi.imageUrl(img.id))}
              >
                <img
                  src={inspectionApi.imageUrl(img.id)}
                  alt={img.originalName ?? 'Inspection Photo'}
                  className="h-24 w-full object-cover group-hover:scale-105 transition-transform"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.style.display = 'none';
                  }}
                />
                <div className="p-1.5 bg-white border-t border-[var(--line)]">
                  <p className="font-mono text-[9px] text-[#25352b] truncate font-medium">{img.originalName}</p>
                  {img.caption && <p className="font-mono text-[9px] text-[#6d7d70] truncate">{img.caption}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Triage & Analysis */}
      <div className="rounded-xl bg-[#fbfbf9] border border-[var(--line)] p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[#4f7a38] font-bold">
            <Sparkles size={13} className="text-[#6fa350]" />
            <span>Automated AI Triage</span>
          </div>
          {ai?.provider && (
            <span className="font-mono text-[9px] px-2 py-0.5 rounded-full border border-[#6fa350]/30 text-[#4f7a38] bg-[#6fa350]/15 font-bold">
              {ai.provider === 'mock' ? 'Simulated Engine' : ai.provider}
            </span>
          )}
        </div>

        {ai ? (
          <div className="space-y-3">
            {/* Risk & Confidence */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                ai.riskLevel === 'CRITICAL' ? 'border-red-300 text-red-700 bg-red-100' :
                ai.riskLevel === 'HIGH'     ? 'border-orange-300 text-orange-800 bg-orange-100' :
                ai.riskLevel === 'MEDIUM'   ? 'border-amber-300 text-amber-800 bg-amber-100' :
                ai.riskLevel === 'LOW'      ? 'border-[#6fa350]/30 text-[#4f7a38] bg-[#6fa350]/15' :
                'border-slate-300 text-slate-700 bg-slate-100'
              }`}>
                RISK: {ai.riskLevel ?? 'ASSESSED'}
              </span>
              <div className="font-mono text-[10px] text-[#6d7d70] flex items-center gap-2 font-medium">
                {ai.confidence != null && (
                  <span>{Math.round(Number(ai.confidence) * (Number(ai.confidence) <= 1 ? 100 : 1))}% confidence</span>
                )}
                {ai.modelVersion && <span>· {ai.modelVersion}</span>}
              </div>
            </div>

            {/* Narrative */}
            {ai.narrative && (
              <p className="font-sans text-xs text-[#25352b] leading-relaxed bg-white p-2.5 rounded-lg border border-[var(--line)] font-medium">
                {ai.narrative}
              </p>
            )}

            {/* Findings */}
            {Array.isArray(ai.findings) && ai.findings.length > 0 && (
              <div className="space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#4f7a38] font-bold">Key Findings</p>
                <ul className="space-y-1 bg-white p-2.5 rounded-lg border border-[var(--line)]">
                  {ai.findings.map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5 font-sans text-xs text-[#25352b]">
                      <span className="text-[#6fa350] mt-0.5 shrink-0">›</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {Array.isArray(ai.recommendations) && ai.recommendations.length > 0 && (
              <div className="space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#4f7a38] font-bold">Recommended Actions</p>
                <ul className="space-y-1 bg-white p-2.5 rounded-lg border border-[var(--line)]">
                  {ai.recommendations.map((r: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5 font-sans text-xs text-[#4f7a38] font-semibold">
                      <span className="text-[#6fa350] mt-0.5 shrink-0">→</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="font-mono text-[11px] text-[#6d7d70]">Pending automated AI diagnostics.</p>
        )}
      </div>

      {/* Status workflow transitions */}
      <div className="space-y-2 pt-1 border-t border-[var(--line)]">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#4f7a38] font-bold">State Transition</p>
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.filter((s) => s !== insp.status).map((s) => (
            <button
              key={s}
              onClick={() => handleStatus(s)}
              disabled={updating}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[#fbfbf9] hover:bg-[#f3f7f0] px-3 py-1.5 font-mono text-[11px] font-bold text-[#25352b] hover:border-[#6fa350] transition-all disabled:opacity-40 shadow-sm"
            >
              <ArrowRight size={11} className="text-[#6fa350]" />
              <span>Mark {s.replace('_', ' ')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Equipment history button */}
      {insp.equipment && (
        <Link
          to={`/admin/equipment/${insp.equipment.id}/history`}
          className="flex items-center justify-center gap-2 rounded-xl border border-[#6fa350] bg-[#6fa350]/12 hover:bg-[#6fa350] hover:text-white px-4 py-2.5 font-mono text-xs font-bold text-[#4f7a38] transition-all text-center shadow-sm"
        >
          <Cpu size={14} />
          <span>Full Telemetry Lifecycle for {insp.equipment.label}</span>
          <ArrowRight size={13} />
        </Link>
      )}

      {/* Lightbox / Zoom Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-[var(--line)] bg-white p-2 shadow-2xl">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-10 rounded-full bg-white/90 p-2 text-[#25352b] hover:bg-white shadow-md transition-colors"
            >
              <X size={16} />
            </button>
            <img
              src={selectedPhoto}
              alt="Inspection enlarged view"
              className="max-h-[85vh] w-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function AdminInspectionsPage() {
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('id');

  const [inspections, setInspections] = useState<InspectionWithPriority[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(routeId || queryId || null);
  const [filterLevel, setFilterLevel] = useState<PriorityLevel | 'ALL'>('ALL');

  useEffect(() => {
    if (routeId) {
      setSelected(routeId);
    } else if (queryId) {
      setSelected(queryId);
    }
  }, [routeId, queryId]);

  useEffect(() => {
    Promise.all([
      inspectionApi.list() as Promise<InspectionWithPriority[]>,
      equipmentApi.list(),
    ])
      .then(([insp, eq]) => {
        const sorted = [...(insp ?? [])].sort((a, b) => (b.priority?.score ?? 0) - (a.priority?.score ?? 0));
        setInspections(sorted);
        setEquipment(eq ?? []);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  function handleStatusChange(id: string, status: InspectionStatus) {
    setInspections((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status } : i))
    );
  }

  const filtered = filterLevel === 'ALL'
    ? inspections
    : inspections.filter((i) => (i.priority?.level ?? 'LOW') === filterLevel);

  const selectedInsp = inspections.find((i) => i.id === selected);

  const highCount = inspections.filter((i) => i.priority?.level === 'HIGH').length;
  const medCount = inspections.filter((i) => i.priority?.level === 'MEDIUM').length;
  const openCount = inspections.filter((i) => i.status === 'OPEN').length;

  return (
    <PageShell>
      <PageHeader
        title="Field Inspection Queue"
        subtitle="Ranked triage pipeline driven by deterministic multi-sensor priority algorithms"
        live={true}
      />

      <div className="space-y-6">
        {/* Metric summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard
            label="High Priority"
            value={highCount}
            status={highCount > 0 ? 'critical' : 'ok'}
            icon={ShieldAlert}
            subtext="Urgent intervention"
          />
          <MetricCard
            label="Medium Priority"
            value={medCount}
            status={medCount > 0 ? 'warning' : 'ok'}
            icon={AlertTriangle}
            subtext="Elevated risk"
          />
          <MetricCard
            label="Open Pending"
            value={openCount}
            status={openCount > 0 ? 'warning' : 'ok'}
            icon={ClipboardList}
            subtext="Awaiting disposition"
          />
          <MetricCard
            label="Total Audited"
            value={inspections.length}
            status="info"
            icon={Layers}
            subtext="All inspections filed"
          />
        </div>

        {/* Equipment quick navigation */}
        {equipment.length > 0 && (
          <SectionCard>
            <div className="flex items-center gap-2 mb-3">
              <Cpu size={15} className="text-[#6fa350]" />
              <span className="font-mono text-xs uppercase tracking-widest text-[#4f7a38] font-bold">
                Equipment Unit Lifecycles
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {equipment.map((eq) => (
                <Link
                  key={eq.id}
                  to={`/admin/equipment/${eq.id}/history`}
                  className="flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[#fbfbf9] hover:bg-[#f3f7f0] px-3.5 py-1.5 font-mono text-xs font-semibold text-[#25352b] hover:border-[#6fa350] transition-all shadow-sm"
                >
                  <Cpu size={12} className="text-[#6fa350]" />
                  <span>{eq.label}</span>
                </Link>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Filter controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-[#6fa350]" />
            <span className="font-mono text-xs uppercase tracking-widest text-[#6d7d70] font-bold">
              Priority Filter:
            </span>
          </div>
          <div className="flex gap-2">
            {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setFilterLevel(l)}
                className={`rounded-xl px-3.5 py-1.5 font-mono text-xs font-bold border transition-all shadow-sm ${
                  filterLevel === l
                    ? l === 'HIGH'
                      ? 'border-red-400 bg-red-100 text-red-800'
                      : l === 'MEDIUM'
                      ? 'border-amber-400 bg-amber-100 text-amber-800'
                      : 'border-[#6fa350] bg-[#6fa350] text-white'
                    : 'border-[var(--line)] bg-white text-[#6d7d70] hover:text-[#25352b]'
                }`}
              >
                {l === 'ALL' ? 'All Priority' : `${l} Priority`}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="font-mono text-xs text-[#6d7d70] animate-pulse">Loading inspection queue…</p>}
        {error && <p className="font-mono text-xs text-red-600 font-semibold">{error}</p>}

        {/* Two-column layout: list + detail panel */}
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* List */}
          <div className="flex-1 w-full min-w-0 space-y-3">
            {!loading && filtered.length === 0 && (
              <EmptyState
                icon={ClipboardList}
                title="No Inspections Found"
                description="There are currently no reports registered under this priority filter."
              />
            )}
            {filtered.map((insp) => {
              const p = insp.priority ?? { score: 0, level: 'LOW' as PriorityLevel, label: 'Standard' };
              const imgs = insp.images ?? [];
              const isSelected = selected === insp.id;

              return (
                <button
                  key={insp.id}
                  onClick={() => setSelected(isSelected ? null : insp.id)}
                  className={`w-full text-left rounded-2xl border p-4 transition-all shadow-verdant ${
                    isSelected
                      ? 'border-[#6fa350] bg-[#f4f9f0] ring-2 ring-[#6fa350]/30'
                      : 'border-[var(--line)] bg-white hover:border-[#6fa350]/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <PriorityBadge level={p.level} label={p.label} />
                        <TypeBadge type={insp.inspectionType} />
                        <SeverityBadge severity={insp.severity} />
                        <StatusBadge status={insp.status} />
                      </div>
                      <p className="font-sans text-xs text-[#25352b] line-clamp-2 leading-relaxed font-semibold">
                        {insp.message}
                      </p>
                      <div className="flex items-center gap-3 font-mono text-[11px] text-[#6d7d70] flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-[#6fa350]" />
                          {insp.zone?.name ?? '—'}
                        </span>
                        {insp.equipment && (
                          <span className="flex items-center gap-1">
                            <Cpu size={11} className="text-[#6fa350]" />
                            {insp.equipment.label}
                          </span>
                        )}
                        {insp.locationCode && (
                          <span className="flex items-center gap-1 text-[#4f7a38] font-bold">
                            <Tag size={11} />
                            {insp.locationCode}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <User size={11} />
                          {insp.inspector?.name ?? 'Inspector'}
                        </span>
                        {imgs.length > 0 && (
                          <span className="flex items-center gap-1 text-[#4f7a38] font-bold">
                            <ImageIcon size={11} />
                            {imgs.length} photo{imgs.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="font-mono text-[11px] text-[#6d7d70]">{fmt(insp.createdAt)}</span>
                      <span className="font-mono text-[10px] text-[#4f7a38] font-bold bg-[#6fa350]/15 px-2 py-0.5 rounded-full border border-[#6fa350]/30">
                        SCORE: {p.score ?? 0}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail panel */}
          {selectedInsp && (
            <div className="w-full lg:w-[420px] flex-shrink-0 sticky top-20">
              <DetailPanel
                insp={selectedInsp}
                onClose={() => setSelected(null)}
                onStatusChange={handleStatusChange}
              />
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
