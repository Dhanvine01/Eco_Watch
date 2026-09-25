import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { StreamProvider } from '../context/StreamContext';
import { useStream } from '../hooks/useStream';
import { useAlerts } from '../hooks/useAlerts';
import { LeafCanvas } from '../components/LeafCanvas';
import {
  LayoutDashboard,
  Zap,
  Wind,
  Thermometer,
  Volume2,
  Droplets,
  Bell,
  Radio,
  BarChart2,
  ClipboardList,
  ShieldCheck,
  LogOut,
  Wifi,
  WifiOff,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'Monitoring',
    items: [
      { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/admin/energy', label: 'Energy', icon: Zap },
      { to: '/admin/air-quality', label: 'Air Quality', icon: Wind },
      { to: '/admin/temp-humidity', label: 'Temp & Humidity', icon: Thermometer },
      { to: '/admin/noise', label: 'Noise', icon: Volume2 },
      { to: '/admin/water-fire', label: 'Water & Fire', icon: Droplets },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/admin/alerts', label: 'Alerts', icon: Bell },
      { to: '/admin/devices', label: 'Devices', icon: Radio },
      { to: '/admin/history', label: 'History', icon: BarChart2 },
      { to: '/admin/inspections', label: 'Inspections', icon: ClipboardList },
      { to: '/admin/integrity', label: 'Evidence & Integrity', icon: ShieldCheck },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'System Overview',
  '/admin/energy': 'Energy Monitoring',
  '/admin/air-quality': 'Air Quality',
  '/admin/temp-humidity': 'Temperature & Humidity',
  '/admin/noise': 'Noise Monitoring',
  '/admin/water-fire': 'Water & Fire Safety',
  '/admin/alerts': 'Alert Management',
  '/admin/devices': 'Device Inventory',
  '/admin/history': 'Sensor History',
  '/admin/inspections': 'Inspection Queue',
  '/admin/integrity': 'Evidence & Integrity Center',
};

export function AdminLayout() {
  return (
    <StreamProvider>
      <AdminLayoutContent />
    </StreamProvider>
  );
}

function AdminLayoutContent() {
  const { user, logout } = useAuth();
  const { connected } = useStream();
  const { alerts } = useAlerts();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeAlertCount = alerts.filter((a) => a.status === 'ACTIVE').length;

  const currentTitle = (() => {
    if (location.pathname.includes('/equipment/') && location.pathname.includes('/history')) {
      return 'Equipment History';
    }
    return PAGE_TITLES[location.pathname] ?? 'EcoWatch';
  })();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const sidebarContent = (
    <>
      {/* Brand */}
      <div
        className={`px-4 pt-5 pb-4 border-b border-[var(--line)] flex items-center ${
          collapsed ? 'justify-center' : 'gap-3'
        }`}
      >
        {/* Verdant Logo mark */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white border border-[var(--line)] shadow-sm overflow-hidden p-1">
          <img src="/logo.png" alt="EcoWatch Logo" className="h-full w-full object-contain" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-serif font-bold text-lg text-[#25352b] leading-none tracking-wide truncate">
              EcoWatch
            </p>
            <p className="font-sans text-[9px] uppercase tracking-[0.18em] text-[#6fa350] font-semibold mt-1">
              Green Technology
            </p>
          </div>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="mb-2 px-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#6d7d70] font-semibold">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isAlerts = item.to === '/admin/alerts';
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150 ${
                        isActive
                          ? 'nav-active'
                          : 'text-[#6d7d70] hover:bg-[rgba(111,163,80,0.06)] hover:text-[#25352b]'
                      } ${collapsed ? 'justify-center' : ''}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="relative flex-shrink-0">
                          <Icon
                            size={16}
                            className={isActive ? 'text-[#4f7a38]' : 'text-[#6d7d70]'}
                          />
                          {isAlerts && activeAlertCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 font-mono text-[8px] text-white font-bold leading-none">
                              {activeAlertCount > 9 ? '9+' : activeAlertCount}
                            </span>
                          )}
                        </div>
                        {!collapsed && (
                          <>
                            <span className="truncate">{item.label}</span>
                            {isActive && (
                              <ChevronRight size={12} className="ml-auto text-[#6fa350] flex-shrink-0" />
                            )}
                          </>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--line)] px-3 py-3 space-y-2.5">
        {/* Connection state */}
        {!collapsed && (
          <div className="flex items-center justify-between rounded-lg bg-[#fbfbf9] border border-[var(--line)] px-2.5 py-1.5 font-mono text-[10px]">
            <span className="text-[#6d7d70]">Telemetry Link</span>
            <span
              className={`flex items-center gap-1.5 font-semibold ${
                connected ? 'text-[#4f7a38]' : 'text-[#d9822b]'
              }`}
            >
              {connected ? <Wifi size={10} /> : <WifiOff size={10} />}
              {connected ? 'LIVE STREAM' : 'OFFLINE'}
            </span>
          </div>
        )}

        {/* User profile & Logout */}
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="min-w-0 pr-2">
              <p className="font-sans text-xs font-semibold text-[#25352b] truncate">
                {user?.name ?? 'Admin'}
              </p>
              <p className="font-mono text-[9px] uppercase tracking-wider text-[#6fa350] font-bold">
                {user?.role ?? 'ADMIN'}
              </p>
            </div>
          )}
          <button
            onClick={() => void handleLogout()}
            title="Sign out"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[#6d7d70] hover:bg-[rgba(111,163,80,0.1)] hover:text-[#25352b] transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="hidden md:flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[#fbfbf9] py-1 font-mono text-[10px] text-[#6d7d70] hover:text-[#25352b] transition-colors"
        >
          {collapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
          {!collapsed && <span>Collapse Menu</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="relative flex min-h-screen bg-[#fbfbf9] text-[#25352b] overflow-hidden">
      {/* Nature Leaves Background Canvas */}
      <LeafCanvas />

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-[var(--line)] bg-[#ffffff]/90 backdrop-blur-md relative z-10 transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex w-64 flex-col bg-[#ffffff] border-r border-[var(--line)] shadow-2xl z-10">
            <div className="flex items-center justify-end p-2 border-b border-[var(--line)]">
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 rounded-lg text-[#6d7d70] hover:bg-[rgba(111,163,80,0.1)]"
              >
                <X size={18} />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--line)] bg-[#ffffff]/90 backdrop-blur-md px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] bg-[#fbfbf9] text-[#25352b]"
            >
              <Menu size={18} />
            </button>
            <div>
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#4f7a38] tracking-tight leading-tight">
                {currentTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Indicator Badge */}
            <span className="rounded-full border border-[#6fa350]/30 bg-[#6fa350]/10 px-3 py-1 font-mono text-[10px] font-semibold text-[#4f7a38] uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#6fa350] live-dot" />
              <span>Verdant Live</span>
            </span>

            {/* Quick alert badge */}
            {activeAlertCount > 0 && (
              <NavLink
                to="/admin/alerts"
                className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 font-mono text-[10px] font-bold text-red-600 hover:bg-red-500/20 transition-colors"
              >
                <Bell size={11} />
                <span>{activeAlertCount} alert{activeAlertCount !== 1 ? 's' : ''}</span>
              </NavLink>
            )}
          </div>
        </header>

        {/* Page body */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
