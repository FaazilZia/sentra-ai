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
const ConnectPage = lazy(() => import('./pages/Connect'));
const PrivacySettingsPage = lazy(() => import('./pages/PrivacySettings'));
const HomePage = lazy(() => import('./pages/Home'));

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
          <span className="text-sm text-slate-200">Restoring workspace session...</span>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<HomePage />} />
          
          {/* Login Route */}
          <Route 
            path="/login" 
            element={user ? <Navigate to="/app" replace /> : <LoginPage />} 
          />

          {/* Protected Application Routes */}
          <Route 
            path="/app" 
            element={user ? <AppLayout /> : <Navigate to="/login" state={{ from: '/app' }} replace />}
          >
            <Route index element={<DashboardPage />} />
            <Route path="connect" element={<ConnectPage />} />
            <Route path="security" element={<SecurityFeedPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="observability" element={<ObservabilityPage />} />
            <Route path="risk" element={<RiskCenterPage />} />
            <Route path="audit" element={<AuditLogPage />} />
            <Route path="governance" element={<GovernancePage />} />
            <Route path="privacy" element={<PrivacySettingsPage />} />
            
            <Route path="board-review" element={<Navigate to="/app" replace />} />
          </Route>

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

import { ThemeProvider } from './lib/useTheme';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
