import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { StreamProvider } from '../context/StreamContext';
import { useStream } from '../hooks/useStream';
import { useAlerts } from '../hooks/useAlerts';
import { LeafCanvas } from '../components/LeafCanvas';
import { LogOut, Wifi, WifiOff, Bell } from 'lucide-react';

export function WorkerLayout() {
  return <StreamProvider><WorkerLayoutContent /></StreamProvider>;
}

function WorkerLayoutContent() {
  const { user, logout } = useAuth();
  const { connected } = useStream();
  const { alerts } = useAlerts();
  const navigate = useNavigate();

  const criticalCount = alerts.filter(
    (a) => a.status === 'ACTIVE' && a.severity === 'CRITICAL'
  ).length;
  const activeCount = alerts.filter((a) => a.status === 'ACTIVE').length;

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-[#fbfbf9] text-[#25352b] relative">
      {/* Interactive floating leaf canvas background */}
      <LeafCanvas />

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-white/95 backdrop-blur-md shadow-sm">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-5 h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[var(--line)] shadow-sm overflow-hidden p-1 flex-shrink-0">
              <img src="/logo.png" alt="Verdant Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="font-serif font-bold text-lg text-[#25352b] leading-none tracking-wide">
                EcoWatch
              </p>
              <p className="font-sans text-[9px] uppercase tracking-[0.18em] text-[#6fa350] font-semibold mt-0.5">
                Worker Safety Portal
              </p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Connection */}
            <div className={`hidden sm:flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
              connected
                ? 'border-[var(--line)] bg-[#6fa350]/10 text-[#4f7a38]'
                : 'border-slate-200 bg-slate-100 text-[#6d7d70]'
            }`}>
              {connected
                ? <Wifi size={12} className="text-[#6fa350]" />
                : <WifiOff size={12} className="text-[#6d7d70]" />
              }
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider">
                {connected ? 'Live' : 'Offline'}
              </span>
            </div>

            {/* Alert pill */}
            {activeCount > 0 && (
              <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] ${
                criticalCount > 0
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : 'border-amber-300 bg-amber-50 text-amber-800'
              }`}>
                <Bell size={12} />
                {activeCount} alert{activeCount !== 1 ? 's' : ''}
                {criticalCount > 0 && ` · ${criticalCount} critical`}
              </div>
            )}

            {/* User + logout */}
            {user && (
              <div className="flex items-center gap-2.5">
                <div className="text-right hidden sm:block">
                  <p className="text-[13px] font-medium text-[#25352b] leading-none">{user.name}</p>
                  <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6fa350] mt-0.5">
                    {user.role}
                  </p>
                </div>
                <div className="h-5 w-px bg-[var(--line)] hidden sm:block" />
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-2.5 py-1.5 font-sans text-xs font-semibold text-[#6d7d70] hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition-all shadow-sm"
                >
                  <LogOut size={12} />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main page content */}
      <main className="mx-auto max-w-5xl px-5 py-8 relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
