import { FormEvent, useState } from 'react';
import { Activity, Database, LoaderCircle, LockKeyhole, Server, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function LoginPage() {
  const { login, loginPending, loginError } = useAuth();
  const [email, setEmail] = useState('admin@nemoguard.local');
  const [password, setPassword] = useState('ChangeMe123!');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await login(email, password);
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Left Sidebar Info */}
      <section className="hidden min-h-screen w-[360px] flex-col justify-between border-r border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-xl lg:flex relative overflow-hidden">
        {/* Subtle pattern for left side */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-bold text-slate-900 shadow-md">
              S
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-tight text-white">Sentra AI</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Compliance OS
              </p>
            </div>
          </div>

          <h1 className="mt-14 max-w-[280px] text-3xl font-semibold leading-tight tracking-tight text-white">
            Access governance for AI systems and sensitive data.
          </h1>
          <p className="mt-4 max-w-[300px] text-sm leading-6 text-slate-400">
            Review policy coverage, risky agent activity, and approval readiness from one operator workspace.
          </p>

          <div className="mt-10 space-y-3">
            <div className="group rounded-xl border border-slate-800 bg-slate-950/40 p-3 transition-colors hover:bg-slate-900/60">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Policy coverage
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">Track published controls and access exceptions.</p>
            </div>
            <div className="group rounded-xl border border-slate-800 bg-slate-950/40 p-3 transition-colors hover:bg-slate-900/60">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Activity className="h-4 w-4 text-blue-400" />
                Risk signals
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">Surface agent and app access that needs review.</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Environment</p>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Server className="h-3.5 w-3.5 text-slate-500" />
              <span className="truncate font-mono">http://127.0.0.1:8000/api/v1</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-slate-500" />
              <span>Supabase Postgres</span>
            </div>
          </div>
        </div>
      </section>

      {/* Right Side Main Content */}
      <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden p-5 md:p-8">
        
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 z-0 bg-slate-50">
          {/* Subtle Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0000000a_1px,transparent_1px),linear-gradient(to_bottom,#0000000a_1px,transparent_1px)] bg-[size:32px_32px]"></div>
          
          {/* Soft Blur Shapes */}
          <div className="absolute -right-[10%] -top-[10%] h-[60%] w-[50%] rounded-full bg-blue-200/20 blur-[100px]" />
          <div className="absolute bottom-[0%] right-[20%] h-[50%] w-[40%] rounded-full bg-emerald-100/30 blur-[100px]" />
        </div>

        {/* System Trust Indicator */}
        <div className="absolute right-6 top-6 z-10 flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 shadow-sm backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <span className="text-xs font-medium text-slate-600">All Systems Operational</span>
        </div>

        {/* Glass SaaS Card */}
        <section className="relative z-10 w-full max-w-[440px] rounded-2xl border border-white/20 bg-white/80 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl md:p-8">
          
          {/* Mobile Header */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white shadow-md">
              S
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-tight text-slate-950">Sentra AI</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Compliance OS
              </p>
            </div>
          </div>

          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-sm">
              <LockKeyhole className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">Sign in</h2>
              <p className="mt-1 text-sm text-slate-500/80">Use the seeded backend admin credentials.</p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-mono text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500/40 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                placeholder="admin@example.com"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500/40 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </label>

            {loginError ? (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200/60 bg-rose-50/80 px-4 py-3 text-sm text-rose-600 backdrop-blur-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{loginError}</p>
              </div>
            ) : null}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loginPending}
                className="group relative flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-slate-900/30 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {loginPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin text-slate-300" />
                ) : null}
                <span>{loginPending ? 'Signing in...' : 'Open workspace'}</span>
                
                {/* Subtle glow effect overlay on hover */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
