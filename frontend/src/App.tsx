import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AdminLayout } from './layouts/AdminLayout';
import { WorkerLayout } from './layouts/WorkerLayout';
import { InspectorLayout } from './layouts/InspectorLayout';
import { AdminAirQualityPage } from './pages/AdminAirQualityPage';
import { AdminAlertsPage } from './pages/AdminAlertsPage';
import { AdminDevicesPage } from './pages/AdminDevicesPage';
import { AdminEnergyPage } from './pages/AdminEnergyPage';
import { AdminHistoryPage } from './pages/AdminHistoryPage';
import { AdminIntegrityPage } from './pages/AdminIntegrityPage';
import { AdminInspectionsPage } from './pages/AdminInspectionsPage';
import { AdminNoisePage } from './pages/AdminNoisePage';
import { AdminOverviewPage } from './pages/AdminOverviewPage';
import { AdminTempHumidityPage } from './pages/AdminTempHumidityPage';
import { AdminWaterFirePage } from './pages/AdminWaterFirePage';
import { EquipmentHistoryPage } from './pages/EquipmentHistoryPage';
import { InspectorDashboardPage } from './pages/InspectorDashboardPage';
import { InspectorHistoryPage } from './pages/InspectorHistoryPage';
import { InspectorInspectionPage } from './pages/InspectorInspectionPage';
import { LoginPage } from './pages/LoginPage';
import { WorkerDashboardPage } from './pages/WorkerDashboardPage';

/** Auth guard — redirects unauthenticated users to /login */
function RequireAuth({ role, children }: { role?: 'ADMIN' | 'WORKER' | 'INSPECTOR'; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
          <p className="font-mono text-xs text-slate-500">Authenticating…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    // Redirect to appropriate home for role
    const home = user.role === 'ADMIN' ? '/admin' : user.role === 'INSPECTOR' ? '/inspector' : '/worker';
    return <Navigate to={home} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <RequireAuth role="ADMIN">
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<AdminOverviewPage />} />
        <Route path="energy" element={<AdminEnergyPage />} />
        <Route path="air-quality" element={<AdminAirQualityPage />} />
        <Route path="temp-humidity" element={<AdminTempHumidityPage />} />
        <Route path="noise" element={<AdminNoisePage />} />
        <Route path="water-fire" element={<AdminWaterFirePage />} />
        <Route path="alerts" element={<AdminAlertsPage />} />
        <Route path="devices" element={<AdminDevicesPage />} />
        <Route path="history" element={<AdminHistoryPage />} />
        <Route path="inspections" element={<AdminInspectionsPage />} />
        <Route path="inspections/:id" element={<AdminInspectionsPage />} />
        <Route path="integrity" element={<AdminIntegrityPage />} />
        <Route path="equipment/:id/history" element={<EquipmentHistoryPage />} />
      </Route>

      {/* Worker */}
      <Route
        path="/worker"
        element={
          <RequireAuth role="WORKER">
            <WorkerLayout />
          </RequireAuth>
        }
      >
        <Route index element={<WorkerDashboardPage />} />
      </Route>

      {/* Inspector */}
      <Route
        path="/inspector"
        element={
          <RequireAuth role="INSPECTOR">
            <InspectorLayout />
          </RequireAuth>
        }
      >
        <Route index element={<InspectorDashboardPage />} />
        <Route path="new" element={<InspectorInspectionPage />} />
        <Route path="history" element={<InspectorHistoryPage />} />
        <Route path="history/:id" element={<InspectorHistoryPage />} />
      </Route>

      {/* Fallback — redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
