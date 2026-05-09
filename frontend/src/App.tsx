import { lazy, Suspense } from 'react';
import { LoaderCircle } from 'lucide-react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AuthProvider, useAuth } from './lib/auth';
import { SidebarProvider } from './context/SidebarContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

import LoginPage from './pages/Login';

const DashboardPage = lazy(() => import('./pages/Dashboard'));
const RiskCenterPage = lazy(() => import('./pages/RiskCenter'));
const CompliancePage = lazy(() => import('./pages/Compliance'));
const ShadowAIPage = lazy(() => import('./pages/ShadowAI'));
const GuardrailsPage = lazy(() => import('./pages/Guardrails'));
const PoliciesPage = lazy(() => import('./pages/Policies'));
const InventoryPage = lazy(() => import('./pages/Inventory'));

import { ModalProvider } from './components/shared/ModalProvider';
import { ToastProvider } from './components/shared/ToastProvider';

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <LoaderCircle className="h-8 w-8 animate-spin text-[var(--royal-indigo)]" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Initializing System...</span>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-[var(--royal-indigo)]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] font-mono">SENTRA.AI // AUTH_SYNC</span>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <SidebarProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Redirect all to dashboard */}
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

            <Route 
              path="/app" 
              element={user ? <AppLayout><DashboardPage /></AppLayout> : <Navigate to="/login" replace />}
            />
            <Route 
              path="/app/risk" 
              element={user ? <AppLayout><RiskCenterPage /></AppLayout> : <Navigate to="/login" replace />}
            />
            <Route 
              path="/app/compliance" 
              element={user ? <AppLayout><CompliancePage /></AppLayout> : <Navigate to="/login" replace />}
            />
            <Route 
              path="/app/shadow" 
              element={user ? <AppLayout><ShadowAIPage /></AppLayout> : <Navigate to="/login" replace />}
            />
            <Route 
              path="/app/guardrails" 
              element={user ? <AppLayout><GuardrailsPage /></AppLayout> : <Navigate to="/login" replace />}
            />
            <Route 
              path="/app/policies" 
              element={user ? <AppLayout><PoliciesPage /></AppLayout> : <Navigate to="/login" replace />}
            />
            <Route 
              path="/app/inventory" 
              element={user ? <AppLayout><InventoryPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
          
          <ModalProvider />
          <ToastProvider />
        </Suspense>
      </SidebarProvider>
    </BrowserRouter>
  );
}

function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
