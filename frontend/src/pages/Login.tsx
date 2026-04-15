import { FormEvent, useState } from 'react';
import { Activity, Database, LoaderCircle, LockKeyhole, Server, ShieldCheck, AlertCircle, Moon, Sun } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/useTheme';
import { apiBaseUrl } from '../lib/api';

export default function LoginPage() {
  const { login, signUp, loginPending, loginError } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSignUp) {
      await signUp(email, password);
    } else {
      await login(email, password);
    }
  }

  return (
    <div className="relative flex min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-cyan-500/20 transition-colors duration-300">
      <div className="varonis-bg" />
      <div className="varonis-mesh" />

      {/* Left Sidebar Info */}
      <section className="hidden min-h-screen w-[360px] flex-col justify-between border-r border-[var(--card-border)] bg-[var(--sidebar)] p-8 lg:flex relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--foreground)] text-sm font-bold text-[var(--background)] shadow-md transition-colors">
              S
            </div>
            <div>
              <p className="text-[15px] font-black tracking-tight text-[var(--foreground)] uppercase">Sentra AI</p>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--muted)]">
                Compliance OS
              </p>
            </div>
          </div>

          <h1 className="mt-14 max-w-[280px] text-4xl font-black leading-tight tracking-tighter text-[var(--foreground)]">
            Access governance for AI systems.
          </h1>
          <p className="mt-4 max-w-[300px] text-[10px] font-bold uppercase tracking-widest leading-6 text-[var(--muted)] opacity-60">
            Review policy coverage, risky agent activity, and approval readiness from your node.
          </p>

          <div className="mt-12 space-y-4">
            <div className="group rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 transition-all hover:bg-[var(--foreground)]/5">
              <div className="flex items-center gap-3 text-xs font-black uppercase text-[var(--foreground)] tracking-wider">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Policy coverage
              </div>
              <p className="mt-2 text-[10px] font-medium leading-relaxed text-[var(--muted)]">Track published controls and access exceptions across node clusters.</p>
            </div>
            <div className="group rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 transition-all hover:bg-[var(--foreground)]/5">
              <div className="flex items-center gap-3 text-xs font-black uppercase text-[var(--foreground)] tracking-wider">
                <Activity className="h-4 w-4 text-cyan-400" />
                Risk signals
              </div>
              <p className="mt-2 text-[10px] font-medium leading-relaxed text-[var(--muted)]">Surface agent and app access that needs immediate operator review.</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--muted)] mb-3">Gateway Environment</p>
          <div className="space-y-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
            <div className="flex items-center gap-3">
              <Server className="h-3 w-3" />
              <span className="truncate">{apiBaseUrl}</span>
            </div>
            <div className="flex items-center gap-3">
              <Database className="h-3 w-3" />
              <span>Vector Node Active</span>
            </div>
          </div>
        </div>
      </section>

      {/* Right Side Main Content */}
      <main className="relative flex min-h-screen flex-1 items-center justify-center p-5 md:p-8">
        
        {/* Top Controls: Status + Theme */}
        <div className="absolute right-6 top-6 z-10 flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)] shadow-sm backdrop-blur-md transition-all"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <div className="flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--card)] px-4 py-1.5 shadow-sm backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">All Systems Secure</span>
          </div>
        </div>

        {/* Global SaaS Card */}
        <section className="relative z-10 w-full max-w-[440px] rounded-[2.5rem] border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1">
          
          <div className="mb-10 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--card-border)] bg-[var(--background)] shadow-sm">
                <LockKeyhole className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter text-[var(--foreground)] uppercase">
                {isSignUp ? 'Initialize' : 'Authenticate'}
              </h2>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-[var(--muted)] opacity-60">
                {isSignUp ? 'Register operator node credentials.' : 'Unlock your secure workspace.'}
              </p>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Email Identifier</span>
              <input
                className="h-12 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--background)]/50 px-4 font-bold text-sm text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)] placeholder:opacity-40 focus:border-cyan-500/40 focus:bg-[var(--background)] focus:ring-4 focus:ring-cyan-500/10"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="operator@sentra.live"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Access Token</span>
              <input
                className="h-12 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--background)]/50 px-4 font-bold text-sm text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)] placeholder:opacity-40 focus:border-cyan-500/40 focus:bg-[var(--background)] focus:ring-4 focus:ring-cyan-500/10"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="••••••••"
                required
              />
            </label>

            {loginError ? (
              <div className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-rose-500 backdrop-blur-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{loginError}</p>
              </div>
            ) : null}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loginPending}
                className="group relative flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-[var(--foreground)] px-4 text-xs font-black uppercase tracking-[0.2em] text-[var(--background)] shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loginPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                <span>
                  {loginPending 
                    ? (isSignUp ? 'Syncing...' : 'Verifying...') 
                    : (isSignUp ? 'Create Node' : 'Open Workspace')}
                </span>
              </button>
            </div>
          </form>

          <div className="mt-8 text-center text-[10px] font-black uppercase tracking-widest">
            <span className="text-[var(--muted)]">
              {isSignUp ? 'Existing session?' : "First initialization?"}
            </span>{' '}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[var(--foreground)] hover:text-cyan-400 transition-colors"
            >
              {isSignUp ? 'Access Portal' : 'Register'}
            </button>
          </div>

        </section>
      </main>
    </div>
  );
}
