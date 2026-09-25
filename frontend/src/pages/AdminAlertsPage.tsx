import { useEffect, useState } from 'react';
import { AlertList } from '../components/AlertList';
import { useAlerts } from '../hooks/useAlerts';
import { alertsApi } from '../services/api';
import type { Alert } from '../types';
import { RefreshButton, SectionTitle, ErrorBanner, PageShell } from '../components/ui';
import { Bell, Clock, CheckCircle2 } from 'lucide-react';

export function AdminAlertsPage() {
  const { alerts: active, loading, error, resolve, refetch } = useAlerts();
  const [historyAlerts, setHistoryAlerts] = useState<Alert[]>([]);
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (tab === 'history') {
      setHistoryLoading(true);
      alertsApi
        .history()
        .then((a) => { setHistoryAlerts(a); setHistoryError(null); })
        .catch((r) => setHistoryError(r instanceof Error ? r.message : 'Failed to load alert history'))
        .finally(() => setHistoryLoading(false));
    }
  }, [tab]);

  const criticalCount = active.filter((a) => a.severity === 'CRITICAL').length;
  const warningCount = active.filter((a) => a.severity === 'WARNING').length;

  return (
    <PageShell>
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-7 gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#25352b] tracking-tight">Alert Management</h1>
          <p className="mt-1 text-sm text-[#6d7d70]">Threshold violations and system events</p>
        </div>
        <RefreshButton onClick={refetch} />
      </div>

      {/* ── Summary row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className={`rounded-2xl border p-5 shadow-verdant bg-white ${active.length === 0 ? 'border-[#6fa350]/30' : 'border-amber-300'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Bell size={15} className="text-[#6fa350]" />
            <SectionTitle>Total Active</SectionTitle>
          </div>
          <p className={`font-serif text-3xl font-bold ${active.length === 0 ? 'text-[#4f7a38]' : 'text-amber-700'}`}>
            {active.length}
          </p>
          <p className="font-mono text-xs text-[#6d7d70] mt-1">Monitored triggers</p>
        </div>
        <div className={`rounded-2xl border p-5 shadow-verdant bg-white ${criticalCount > 0 ? 'border-red-300 bg-red-50/50' : 'border-[var(--line)]'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`h-2.5 w-2.5 rounded-full ${criticalCount > 0 ? 'bg-red-500 animate-ping' : 'bg-slate-400'}`} />
            <SectionTitle>Critical Alerts</SectionTitle>
          </div>
          <p className={`font-serif text-3xl font-bold ${criticalCount > 0 ? 'text-red-700' : 'text-slate-400'}`}>
            {criticalCount}
          </p>
          <p className="font-mono text-xs text-[#6d7d70] mt-1">Requires immediate response</p>
        </div>
        <div className={`rounded-2xl border p-5 shadow-verdant bg-white ${warningCount > 0 ? 'border-amber-300 bg-amber-50/50' : 'border-[var(--line)]'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`h-2.5 w-2.5 rounded-full ${warningCount > 0 ? 'bg-amber-500' : 'bg-slate-400'}`} />
            <SectionTitle>Warning Alerts</SectionTitle>
          </div>
          <p className={`font-serif text-3xl font-bold ${warningCount > 0 ? 'text-amber-800' : 'text-slate-400'}`}>
            {warningCount}
          </p>
          <p className="font-mono text-xs text-[#6d7d70] mt-1">Above warning limits</p>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 mb-5 rounded-2xl border border-[var(--line)] bg-white p-1.5 w-fit shadow-sm">
        {(['active', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-xs font-bold capitalize transition-all ${
              tab === t ? 'bg-[#6fa350] text-white shadow-sm' : 'text-[#6d7d70] hover:text-[#25352b]'
            }`}
          >
            {t === 'active' ? <Bell size={13} /> : <Clock size={13} />}
            {t === 'active' ? `Active (${active.length})` : 'History'}
          </button>
        ))}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[var(--line)] bg-white shadow-verdant overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--line)] bg-[#fbfbf9]">
          {tab === 'active'
            ? <Bell size={15} className="text-[#6fa350]" />
            : <CheckCircle2 size={15} className="text-[#6fa350]" />
          }
          <SectionTitle>
            {tab === 'active' ? 'Active Alerts' : 'Alert History'}
          </SectionTitle>
        </div>
        <div className="p-6">
          {tab === 'active' && error && <ErrorBanner message={error} onRetry={refetch} />}
          {tab === 'history' && historyError && <ErrorBanner message={historyError} />}

          {loading || historyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl skeleton" />
              ))}
            </div>
          ) : tab === 'active' ? (
            <AlertList alerts={active} onResolve={resolve} />
          ) : (
            <AlertList alerts={historyAlerts} />
          )}
        </div>
      </div>
    </PageShell>
  );
}
