import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LeafCanvas } from '../components/LeafCanvas';
import {
  LayoutDashboard, PlusCircle, FolderOpen, LogOut,
  ChevronRight, Menu, X,
} from 'lucide-react';
import { useState } from 'react';

const NAV_ITEMS = [
  { to: '/inspector',         label: 'Dashboard',       icon: LayoutDashboard, end: true },
  { to: '/inspector/new',     label: 'New Inspection',  icon: PlusCircle },
  { to: '/inspector/history', label: 'My History',      icon: FolderOpen },
];

export function InspectorLayout() {
  return <InspectorLayoutContent />;
}

function InspectorLayoutContent() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-[var(--line)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white border border-[var(--line)] shadow-sm overflow-hidden p-1">
            <img src="/logo.png" alt="Verdant Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="font-serif font-bold text-lg text-[#25352b] leading-none tracking-wide">EcoWatch</p>
            <p className="font-sans text-[9px] uppercase tracking-[0.18em] text-[#6fa350] font-semibold mt-1">
              Inspector Portal
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5">
        <p className="mb-2 px-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#6d7d70] font-semibold">
          Inspections
        </p>
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150 ${
                    isActive
                      ? 'nav-active'
                      : 'text-[#6d7d70] hover:bg-[rgba(111,163,80,0.06)] hover:text-[#25352b]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={15} className={isActive ? 'text-[#4f7a38]' : 'text-[#6d7d70]'} />
                    <span>{item.label}</span>
                    {isActive && (
                      <ChevronRight size={12} className="ml-auto text-[#6fa350] flex-shrink-0" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--line)] px-3 py-3">
        {user && (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[#25352b] truncate leading-none">
                {user.name}
              </p>
              <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6fa350] mt-0.5">
                {user.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="flex items-center justify-center h-8 w-8 rounded-lg border border-[var(--line)] text-[#6d7d70] hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition-all flex-shrink-0"
            >
              <LogOut size={13} />
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-[#fbfbf9] text-[#25352b]">
      {/* Interactive floating leaf canvas background */}
      <LeafCanvas />

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 border-r border-[var(--line)] bg-white/95 backdrop-blur-md sticky top-0 h-screen z-20 shadow-sm">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex flex-col w-64 bg-white z-10 shadow-2xl border-r border-[var(--line)]">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-[#6d7d70] hover:text-[#25352b]"
            >
              <X size={18} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 h-14 border-b border-[var(--line)] bg-white/95 sticky top-0 z-10">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg border border-[var(--line)] text-[#6d7d70]"
          >
            <Menu size={17} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Verdant Logo" className="h-6 w-6 object-contain" />
            <span className="font-serif font-bold text-base text-[#25352b]">EcoWatch</span>
          </div>
          <div className="w-8" />
        </div>

        <main className="flex-1 p-5 md:p-7 max-w-6xl w-full mx-auto relative z-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
