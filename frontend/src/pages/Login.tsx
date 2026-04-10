import { FormEvent, useState } from 'react';
import { Activity, Database, LoaderCircle, LockKeyhole, Server, ShieldCheck } from 'lucide-react';
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
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
      <section className="hidden min-h-screen w-[360px] flex-col justify-between border-r border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-xl lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-bold text-slate-900">
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
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <ShieldCheck className="h-4 w-4 text-cyan-200" />
                Policy coverage
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">Track published controls and access exceptions.</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Activity className="h-4 w-4 text-cyan-200" />
                Risk signals
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">Surface agent and app access that needs review.</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Environment</p>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Server className="h-3.5 w-3.5 text-slate-500" />
              <span className="truncate">http://127.0.0.1:8000/api/v1</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-slate-500" />
              <span>Supabase Postgres</span>
            </div>
          </div>
        </div>
      </section>

      <main className="flex min-h-screen flex-1 items-center justify-center p-5 md:p-8">
        <section className="w-full max-w-[430px] rounded-lg border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.05)] md:p-6">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
              S
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-tight text-slate-950">Sentra AI</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Compliance OS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
              <LockKeyhole className="h-4 w-4 text-slate-700" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">Sign in</h2>
              <p className="text-sm text-slate-500">Use the seeded backend admin credentials.</p>
            </div>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
              <input
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
              <input
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
              />
            </label>

            {loginError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {loginError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loginPending}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loginPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {loginPending ? 'Signing in...' : 'Open workspace'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
