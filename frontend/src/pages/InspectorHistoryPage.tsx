/**
 * InspectorHistoryPage
 *
 * Inspector's own inspection log with filter-by-status and full-detail view.
 * Uses Verdant Theme palette.
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { inspectionApi } from '../services/api';
import type { Inspection, InspectionStatus } from '../types';
import { SeverityBadge, StatusBadge, TypeBadge } from '../components/InspectionBadges';
import { EmptyState } from '../components/ui';
import {
  ClipboardList, ArrowLeft, Image as ImageIcon,
  MapPin, Wrench, Tag, ChevronRight, PlusCircle,
  Sparkles, AlertTriangle,
} from 'lucide-react';

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// ─── Detail Sub-View ──────────────────────────────────────────────────────────

function InspectionDetail({ id }: { id: string }) {
  const [insp, setInsp] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inspectionApi.get(id)
      .then(setInsp)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto p-6 page-enter">
        <div className="h-6 w-32 rounded skeleton" />
        <div className="h-48 rounded-2xl skeleton" />
        <div className="h-32 rounded-2xl skeleton" />
      </div>
    );
  }

  if (error || !insp) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Link to="/inspector/history" className="flex items-center gap-1.5 font-mono text-xs text-[#4f7a38] mb-4 hover:underline">
          <ArrowLeft size={13} /> Back to My History
        </Link>
        <p className="font-mono text-xs text-red-600">{error ?? 'Inspection not found'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-5 page-enter">
      {/* Back button */}
      <Link
        to="/inspector/history"
        className="inline-flex items-center gap-1.5 font-mono text-xs text-[#4f7a38] hover:text-[#25352b] transition-colors"
      >
        <ArrowLeft size={13} /> Back to My History
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-verdant">
        <div className="flex flex-wrap gap-2 mb-3">
          <TypeBadge type={insp.inspectionType} />
          <SeverityBadge severity={insp.severity} />
          <StatusBadge status={insp.status} />
        </div>
        <p className="font-mono text-xs text-[#6d7d70] mb-0.5">ID: <span className="text-[#25352b] font-bold">{insp.id}</span></p>
        <p className="font-mono text-xs text-[#6d7d70]">Submitted: {fmt(insp.createdAt)}</p>
        {insp.updatedAt !== insp.createdAt && (
          <p className="font-mono text-xs text-[#6d7d70]">Updated: {fmt(insp.updatedAt)}</p>
        )}
      </div>

      {/* Location */}
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-verdant">
        <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-[#4f7a38] font-bold mb-4">Location &amp; Equipment</h2>
        <div className="grid grid-cols-2 gap-3 font-mono text-xs">
          <div className="space-y-0.5">
            <p className="text-[10px] text-[#6d7d70] uppercase tracking-wider font-semibold">Zone</p>
            <p className="text-[#25352b] font-bold">{insp.zone.name}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-[#6d7d70] uppercase tracking-wider font-semibold">Equipment</p>
            <p className="text-[#25352b] font-bold">{insp.equipment?.label ?? '—'}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-[#6d7d70] uppercase tracking-wider font-semibold">Component</p>
            <p className="text-[#25352b] font-medium">{insp.component ?? '—'}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-[#6d7d70] uppercase tracking-wider font-semibold">Location Code</p>
            <p className="text-[#4f7a38] font-bold">{insp.locationCode ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Observation */}
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-verdant">
        <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-[#4f7a38] font-bold mb-3">Inspector Observation</h2>
        <p className="font-sans text-xs text-[#25352b] whitespace-pre-wrap leading-relaxed font-medium">{insp.message}</p>
      </div>

      {/* Images */}
      {insp.images.length > 0 && (
        <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-verdant">
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon size={14} className="text-[#6fa350]" />
            <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-[#4f7a38] font-bold">
              Inspection Photos ({insp.images.length})
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {insp.images.map((img) => (
              <div key={img.id} className="rounded-xl overflow-hidden border border-[var(--line)] shadow-sm">
                <img
                  src={inspectionApi.imageUrl(img.id)}
                  alt={img.originalName}
                  className="w-full h-40 object-cover bg-[#fbfbf9]"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="px-3 py-2 bg-[#fbfbf9] border-t border-[var(--line)]">
                  <p className="font-mono text-[10px] text-[#25352b] font-bold truncate">{img.originalName}</p>
                  {img.caption && <p className="font-mono text-[10px] text-[#6d7d70] mt-0.5">{img.caption}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Result */}
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-verdant">
        <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-[#4f7a38] font-bold mb-4">AI Analysis</h2>
        {insp.aiResult ? (
          <div className="space-y-4">
            {/* Risk level + confidence */}
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center rounded-full border px-3 py-1 font-mono text-xs font-bold uppercase ${
                (insp.aiResult as any).riskLevel === 'CRITICAL' ? 'border-red-300 text-red-700 bg-red-100' :
                (insp.aiResult as any).riskLevel === 'HIGH'     ? 'border-orange-300 text-orange-800 bg-orange-100' :
                (insp.aiResult as any).riskLevel === 'MEDIUM'   ? 'border-amber-300 text-amber-800 bg-amber-100' :
                (insp.aiResult as any).riskLevel === 'LOW'      ? 'border-[#6fa350]/30 text-[#4f7a38] bg-[#6fa350]/15' :
                'border-slate-300 text-slate-700 bg-slate-100'
              }`}>{(insp.aiResult as any).riskLevel ?? 'UNKNOWN'}</span>
              {(insp.aiResult as any).confidence != null && (
                <span className="font-mono text-xs text-[#6d7d70]">
                  confidence: {Math.round(((insp.aiResult as any).confidence ?? 0) * 100)}%
                </span>
              )}
            </div>

            {/* Narrative */}
            {(insp.aiResult as any).narrative && (
              <p className="font-sans text-xs text-[#25352b] bg-[#fbfbf9] p-3 rounded-xl border border-[var(--line)] leading-relaxed font-medium">
                {(insp.aiResult as any).narrative}
              </p>
            )}

            {/* Findings */}
            {Array.isArray((insp.aiResult as any).findings) && (insp.aiResult as any).findings.length > 0 && (
              <div className="space-y-1.5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#4f7a38] font-bold flex items-center gap-1.5">
                  <AlertTriangle size={12} /> Findings
                </p>
                <ul className="space-y-1">
                  {(insp.aiResult as any).findings.map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 rounded-xl bg-[#fbfbf9] border border-[var(--line)] px-3.5 py-2 font-sans text-xs text-[#25352b]">
                      <span className="text-[#6fa350] mt-0.5 shrink-0">›</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {Array.isArray((insp.aiResult as any).recommendations) && (insp.aiResult as any).recommendations.length > 0 && (
              <div className="space-y-1.5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#4f7a38] font-bold flex items-center gap-1.5">
                  <Sparkles size={12} /> Recommendations
                </p>
                <ul className="space-y-1">
                  {(insp.aiResult as any).recommendations.map((r: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 rounded-xl bg-[#fbfbf9] border border-[var(--line)] px-3.5 py-2 font-sans text-xs text-[#4f7a38] font-semibold">
                      <span className="text-[#6fa350] mt-0.5 shrink-0">→</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="font-mono text-xs text-[#6d7d70]">No AI analysis completed for this inspection.</p>
        )}
      </div>
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────

export function InspectorHistoryPage() {
  const { id } = useParams();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<InspectionStatus | 'ALL'>('ALL');

  useEffect(() => {
    inspectionApi.list()
      .then(setInspections)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (id) {
    return <InspectionDetail id={id} />;
  }

  const statuses: (InspectionStatus | 'ALL')[] = ['ALL', 'OPEN', 'UNDER_REVIEW', 'ACKNOWLEDGED', 'RESOLVED'];

  const filtered = filterStatus === 'ALL'
    ? inspections
    : inspections.filter((i) => i.status === filterStatus);

  return (
    <div className="p-6 space-y-6 page-enter max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#25352b] tracking-tight">My Inspection History</h1>
          <p className="mt-1 font-sans text-xs text-[#6d7d70]">
            Complete log of field inspections submitted from this account
          </p>
        </div>
        <Link
          to="/inspector/new"
          className="flex items-center gap-2 rounded-xl bg-[#6fa350] hover:bg-[#4f7a38] px-4 py-2.5 font-bold text-xs text-white shadow-md transition-all flex-shrink-0"
        >
          <PlusCircle size={15} />
          New Inspection
        </Link>
      </div>

      {error && <p className="font-mono text-xs text-red-600">{error}</p>}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`rounded-xl px-3.5 py-1.5 font-mono text-xs font-bold border transition-all shadow-sm ${
              filterStatus === s
                ? 'border-[#6fa350] bg-[#6fa350] text-white'
                : 'border-[var(--line)] bg-white text-[#6d7d70] hover:text-[#25352b]'
            }`}
          >
            {s === 'ALL' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="h-20 rounded-2xl skeleton" />)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title={filterStatus === 'ALL' ? 'No inspections submitted yet' : `No ${filterStatus.replace('_', ' ').toLowerCase()} inspections`}
          description="File a new inspection to get started."
          action={
            <Link
              to="/inspector/new"
              className="flex items-center gap-1.5 rounded-xl border border-[#6fa350] bg-[#6fa350]/15 px-4 py-2 font-mono text-xs font-bold text-[#4f7a38] hover:bg-[#6fa350] hover:text-white transition-all shadow-sm"
            >
              <PlusCircle size={13} />
              File Inspection
            </Link>
          }
        />
      )}

      <div className="rounded-2xl border border-[var(--line)] bg-white shadow-verdant overflow-hidden">
        <div className="divide-y divide-[var(--line)]">
          {filtered.map((insp) => (
            <Link
              key={insp.id}
              to={`/inspector/history/${insp.id}`}
              className="flex items-center gap-4 px-6 py-4 hover:bg-[#fbfbf9] transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <TypeBadge type={insp.inspectionType} />
                  <SeverityBadge severity={insp.severity} />
                  <StatusBadge status={insp.status} />
                </div>
                <p className="font-sans text-xs text-[#25352b] font-medium truncate">{insp.message}</p>
                <div className="mt-1 flex items-center flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] text-[#6d7d70]">
                  <span className="flex items-center gap-1">
                    <MapPin size={11} className="text-[#6fa350]" />{insp.zone.name}
                  </span>
                  {insp.equipment && (
                    <span className="flex items-center gap-1">
                      <Wrench size={11} className="text-[#6fa350]" />{insp.equipment.label}
                    </span>
                  )}
                  {insp.locationCode && (
                    <span className="flex items-center gap-1 text-[#4f7a38] font-bold">
                      <Tag size={11} />{insp.locationCode}
                    </span>
                  )}
                  {insp.images.length > 0 && (
                    <span className="flex items-center gap-1 text-[#4f7a38] font-bold">
                      <ImageIcon size={11} />{insp.images.length} image{insp.images.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="font-mono text-[11px] text-[#6d7d70]">{fmt(insp.createdAt)}</p>
              </div>
              <ChevronRight size={14} className="text-[#6d7d70] group-hover:text-[#4f7a38] transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
