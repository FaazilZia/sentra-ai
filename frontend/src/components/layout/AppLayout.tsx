import React, { Suspense } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SocketProvider } from './SocketProvider';
import { useAuth } from '@/lib/auth';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { originalUser, user, exitImpersonation } = useAuth();

  return (
    <div className="flex h-screen bg-[var(--bg-page)] text-[var(--text-primary)] overflow-hidden">
      {/* Sidebar - Fixed Width */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-[var(--sidebar-width)] transition-all duration-300 h-screen overflow-hidden">
        <Header />
        
        <main className="flex-1 pt-[var(--topbar-height)] overflow-y-auto h-[calc(100vh-var(--topbar-height))]">
          <SocketProvider>
            <Suspense fallback={
              <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--royal-indigo)] border-t-transparent" />
              </div>
            }>
              {children}
            </Suspense>
          </SocketProvider>
        </main>
      </div>

      {/* Impersonation Floating HUD */}
      {originalUser && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-[#d97706]/95 backdrop-blur-md text-white px-5 py-3 rounded-full flex items-center gap-6 shadow-2xl border border-amber-400/40 text-[10px] font-black uppercase tracking-widest animate-pulse-slow">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <span>Impersonating User: <strong className="text-amber-100">{user?.fullName || user?.email}</strong></span>
          </div>
          <button
            onClick={exitImpersonation}
            className="bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all"
          >
            Exit Impersonation
          </button>
        </div>
      )}
    </div>
  );
}

