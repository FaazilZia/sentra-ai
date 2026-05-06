import { lazy, Suspense } from 'react';
import { LoaderCircle } from 'lucide-react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AuthProvider, useAuth } from './lib/auth';
import { GoogleOAuthProvider } from '@react-oauth/google';
import LoginPage from './pages/Login';

const DashboardPage = lazy(() => import('./pages/Dashboard'));
const InventoryPage = lazy(() => import('./pages/Inventory'));
const RiskCenterPage = lazy(() => import('./pages/RiskCenter'));
const AuditLogPage = lazy(() => import('./pages/AuditLog'));
import GovernancePage from './pages/Governance';
const AIActivityLogsPage = lazy(() => import('./pages/AIActivityLogs'));
const SecurityFeedPage = lazy(() => import('./pages/SecurityFeed'));
const ConnectPage = lazy(() => import('./pages/Connect'));
const CompliancePage = lazy(() => import('./pages/Compliance'));
const RelationshipGraphPage = lazy(() => import('./pages/RelationshipGraph'));
const PrivacySettingsPage = lazy(() => import('./pages/PrivacySettings'));
const AuditProofPage = lazy(() => import('./pages/AuditProof'));
const GuardrailsPage = lazy(() => import('./pages/Guardrails'));
const AlertSettingsPage = lazy(() => import('./pages/AlertSettings'));
const DemoPage = lazy(() => import('./pages/Demo'));


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
          {/* Direct to Dashboard */}
          <Route path="/" element={<Navigate to="/app" replace />} />
          
          {/* Login Route */}
          <Route 
            path="/login" 
            element={user ? <Navigate to="/app" replace /> : <LoginPage />} 
          />

          {/* Signup Route */}
          <Route 
            path="/signup" 
            element={user ? <Navigate to="/app" replace /> : <LoginPage defaultIsSignUp={true} />} 
          />

          {/* Demo Route */}
          <Route path="/demo" element={<DemoPage />} />

          {/* Protected Application Routes */}
          <Route 
            path="/app" 
            element={user ? <AppLayout /> : <Navigate to="/login" state={{ from: '/app' }} replace />}
          >
            <Route index element={<DashboardPage />} />
            <Route path="connect" element={<ConnectPage />} />
            <Route path="security" element={<SecurityFeedPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="risk" element={<RiskCenterPage />} />
            <Route path="audit" element={<AuditLogPage />} />
            <Route path="violations" element={<AIActivityLogsPage />} />
            <Route path="governance" element={<GovernancePage />} />
            <Route path="compliance" element={<CompliancePage />} />
            <Route path="relationships" element={<RelationshipGraphPage />} />
            <Route path="privacy" element={<PrivacySettingsPage />} />
            <Route path="audit-proof" element={<AuditProofPage />} />
            <Route path="guardrails" element={<GuardrailsPage />} />
            <Route path="settings/api-keys" element={<ConnectPage />} />
            <Route path="settings/alerts" element={<AlertSettingsPage />} />

            
            <Route path="board-review" element={<Navigate to="/app" replace />} />
          </Route>

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  if (!googleClientId) {
    console.warn('⚠️ VITE_GOOGLE_CLIENT_ID not set. Google OAuth will be disabled.');
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;

