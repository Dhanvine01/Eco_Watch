/**
 * InspectorDashboardPage
 *
 * Landing page for the INSPECTOR role.
 * Shows: zone summary, own recent inspections, quick-action links.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { inspectionApi, zonesApi } from '../services/api';
import type { Inspection, Zone } from '../types';
import { SeverityBadge, StatusBadge, TypeBadge } from '../components/InspectionBadges';
import { EmptyState, MetricCard } from '../components/ui';
import {
  PlusCircle, ClipboardList, FolderOpen, AlertTriangle,
  Droplets, Flame, ClipboardCheck, Building2, ChevronRight,
  Image, CheckCircle2,
} from 'lucide-react';

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function InspectorDashboardPage() {
  const { user } = useAuth();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([inspectionApi.list(), zonesApi.list()])
      .then(([insp, z]) => { setInspections(insp); setZones(z); })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  const open = inspections.filter((i) => i.status === 'OPEN').length;
  const resolved = inspections.filter((i) => i.status === 'RESOLVED').length;
  const recent = inspections.slice(0, 6);

  const quickActions = [
    {
      to: '/inspector/new',
      label: 'Routine Inspection',
      icon: ClipboardCheck,
      color: 'border-[#6fa350]/30 bg-[#6fa350]/10 text-[#4f7a38] hover:bg-[#6fa350]/20',
    },
    {
      to: '/inspector/new?type=CORROSION',
      label: 'Report Corrosion',
      icon: AlertTriangle,
      color: 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100',
    },
    {
      to: '/inspector/new?type=POSSIBLE_LEAK',
      label: 'Report Suspected Leak',
      icon: Droplets,
      color: 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100',
    },
    {
      to: '/inspector/new?type=DAMAGE',
      label: 'Report Damage',
      icon: Flame,
      color: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100',
    },
    {
      to: '/inspector/history',
      label: 'View My History',
      icon: FolderOpen,
      color: 'border-[var(--line)] bg-[#fbfbf9] text-[#25352b] hover:bg-[#f3f7f0]',
    },
  ];

  return (
    <div className="space-y-6 page-enter max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#25352b] tracking-tight">Inspector Dashboard</h1>
          <p className="mt-1 font-mono text-xs text-[#6fa350] uppercase tracking-widest font-semibold">
            Welcome, {user?.name}
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

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Total Submitted"
          value={inspections.length}
          status="neutral"
          icon={ClipboardList}
          subtext="All inspections filed"
        />
        <MetricCard
          label="Open"
          value={open}
          status={open > 0 ? 'warning' : 'ok'}
          icon={AlertTriangle}
          subtext={open > 0 ? 'Pending review' : 'None pending'}
        />
        <MetricCard
          label="Resolved"
          value={resolved}
          status="ok"
          icon={CheckCircle2}
          subtext="Resolved inspections"
        />
      </div>

      {/* Quick actions */}
      <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-verdant">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#4f7a38] mb-4">
          Quick Actions
        </p>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={action.to}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 font-mono text-xs font-bold transition-all shadow-sm ${action.color}`}
              >
                <Icon size={14} />
                {action.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Zones overview */}
      {zones.length > 0 && (
        <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-verdant">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#4f7a38] mb-4">
            Available Monitored Zones
          </p>
          <div className="flex flex-wrap gap-2.5">
            {zones.map((z) => (
              <span
                key={z.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[#fbfbf9] px-3.5 py-1 font-mono text-xs text-[#25352b] font-medium shadow-sm"
              >
                <Building2 size={12} className="text-[#6fa350]" />
                {z.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent inspections */}
      <div className="rounded-2xl border border-[var(--line)] bg-white shadow-verdant overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)] bg-[#fbfbf9]">
          <div className="flex items-center gap-2">
            <ClipboardList size={15} className="text-[#6fa350]" />
            <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#4f7a38]">
              Recent Inspections
            </span>
          </div>
          <Link
            to="/inspector/history"
            className="font-mono text-xs font-bold text-[#4f7a38] hover:text-[#25352b] flex items-center gap-1 transition-colors"
          >
            View all <ChevronRight size={12} />
          </Link>
        </div>

        <div className="divide-y divide-[var(--line)]">
          {loading && (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl skeleton" />)}
            </div>
          )}

          {!loading && error && (
            <div className="p-6">
              <p className="font-mono text-xs text-red-600 font-semibold">{error}</p>
            </div>
          )}

          {!loading && !error && inspections.length === 0 && (
            <EmptyState
              icon={ClipboardList}
              title="No inspections submitted yet"
              description="File your first inspection using the New Inspection button above."
              action={
                <Link
                  to="/inspector/new"
                  className="flex items-center gap-1.5 rounded-xl border border-[#6fa350] bg-[#6fa350]/15 px-4 py-2 font-mono text-xs font-bold text-[#4f7a38] hover:bg-[#6fa350] hover:text-white transition-all shadow-sm"
                >
                  <PlusCircle size={14} />
                  File First Inspection
                </Link>
              }
            />
          )}

          {!loading && !error && recent.map((insp) => (
            <Link
              key={insp.id}
              to={`/inspector/history/${insp.id}`}
              className="flex items-center gap-4 px-6 py-4 hover:bg-[#fbfbf9] transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <TypeBadge type={insp.inspectionType} />
                  <SeverityBadge severity={insp.severity} />
                  <StatusBadge status={insp.status} />
                </div>
                <p className="font-mono text-xs text-[#25352b] font-medium truncate">{insp.message}</p>
                <p className="font-mono text-[11px] text-[#6d7d70] mt-0.5">
                  {insp.zone.name}
                  {insp.equipment ? ` · ${insp.equipment.label}` : ''}
                  {insp.locationCode ? ` · ${insp.locationCode}` : ''}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="font-mono text-[11px] text-[#6d7d70]">{fmt(insp.createdAt)}</p>
                {insp.images.length > 0 && (
                  <p className="font-mono text-[10px] text-[#4f7a38] font-bold mt-0.5 flex items-center justify-end gap-1">
                    <Image size={11} />
                    {insp.images.length} image{insp.images.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <ChevronRight size={14} className="text-[#6d7d70] group-hover:text-[#4f7a38] transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
