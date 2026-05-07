import { lazy, Suspense } from 'react';
import { LoaderCircle } from 'lucide-react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AuthProvider, useAuth } from './lib/auth';
import { SidebarProvider } from './context/SidebarContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

const DashboardPage = lazy(() => import('./pages/Dashboard'));

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
            {/* Redirect all to dashboard for now since other pages are being rebuilt */}
            <Route path="/" element={<Navigate to="/app" replace />} />
            
            <Route 
              path="/app" 
              element={user ? <AppLayout><DashboardPage /></AppLayout> : <Navigate to="/app" replace />}
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
