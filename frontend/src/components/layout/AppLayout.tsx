import React, { Suspense } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)]">
      {/* Sidebar - Fixed Width */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-[var(--sidebar-width)] transition-all duration-300">
        <Header />
        
        <main className="flex-1 pt-[var(--topbar-height)]">
          <Suspense fallback={
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--royal-indigo)] border-t-transparent" />
            </div>
          }>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
