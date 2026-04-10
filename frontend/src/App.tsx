import { lazy, Suspense } from 'react';
import { LoaderCircle } from 'lucide-react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AuthProvider, useAuth } from './lib/auth';
import LoginPage from './pages/Login';

const DashboardPage = lazy(() => import('./pages/Dashboard'));
const InventoryPage = lazy(() => import('./pages/Inventory'));
const ObservabilityPage = lazy(() => import('./pages/Observability'));
const RiskCenterPage = lazy(() => import('./pages/RiskCenter'));
const AuditLogPage = lazy(() => import('./pages/AuditLog'));
const GovernancePage = lazy(() => import('./pages/Governance'));
const SecurityFeedPage = lazy(() => import('./pages/SecurityFeed'));

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
        <LoaderCircle className="h-5 w-5 animate-spin text-cyan-200" />
        <span className="text-sm text-slate-200">Loading workspace view...</span>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
          <LoaderCircle className="h-5 w-5 animate-spin text-cyan-200" />
          <span className="text-sm text-slate-200">Restoring dashboard session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/security" element={<SecurityFeedPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/observability" element={<ObservabilityPage />} />
            <Route path="/risk" element={<RiskCenterPage />} />
            <Route path="/audit" element={<AuditLogPage />} />
            <Route path="/governance" element={<GovernancePage />} />

            <Route path="/board-review" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
