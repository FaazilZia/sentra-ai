import { FormEvent, useState } from 'react';
import { LoaderCircle, LockKeyhole, Server } from 'lucide-react';
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_34%),linear-gradient(160deg,_#020617_0%,_#0f172a_55%,_#111827_100%)] text-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid gap-8 lg:grid-cols-[1.15fr_0.85fr] items-stretch">
        <section className="rounded-[32px] border border-white/10 bg-white/6 backdrop-blur-2xl shadow-2xl shadow-slate-950/40 p-8 lg:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/15 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
            <Server className="h-3.5 w-3.5" />
            Sentra AI Control Plane
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white">
            Connect the dashboard to your live backend
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
            Your Supabase-backed API is ready. Sign in with the seeded demo admin to verify the
            frontend, backend, and database are all talking to each other.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Backend URL</p>
              <p className="mt-2 text-sm font-medium text-slate-100">http://127.0.0.1:8000/api/v1</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Database</p>
              <p className="mt-2 text-sm font-medium text-slate-100">Supabase Postgres</p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-slate-950/45 backdrop-blur-2xl shadow-2xl shadow-slate-950/50 p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
              <LockKeyhole className="h-5 w-5 text-cyan-200" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">Sign In</h2>
              <p className="text-sm text-slate-400">Use the seeded backend admin credentials.</p>
            </div>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Email</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-200/30 focus:bg-white/10"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Password</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-200/30 focus:bg-white/10"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
              />
            </label>

            {loginError ? (
              <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {loginError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loginPending}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-200/20 bg-cyan-300/15 px-4 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loginPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {loginPending ? 'Signing In...' : 'Connect Dashboard'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
