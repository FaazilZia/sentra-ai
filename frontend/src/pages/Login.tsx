import { FormEvent, useState } from 'react';
import { cn } from '../lib/utils';
import { Activity, Database, LoaderCircle, LockKeyhole, Server, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { apiBaseUrl } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage({ defaultIsSignUp = false }: { defaultIsSignUp?: boolean }) {
  const { login, signUp, loginPending, loginError } = useAuth();
  const [isSignUp, setIsSignUp] = useState(defaultIsSignUp);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showSsoInput, setShowSsoInput] = useState(false);
  const [orgSlug, setOrgSlug] = useState('');

  const calculateStrength = (pass: string) => {
    let score = 0;
    if (pass.length > 8) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;
    if (/[^A-Za-z0-9]/.test(pass)) score += 25;
    setPasswordStrength(score);
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSignUp) {
      await signUp(email, password, fullName, organizationName);
    } else {
      await login(email, password);
    }
  }

  const handleSsoLogin = () => {
    if (!orgSlug.trim()) return;
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
    window.location.href = `${base}/saml/${orgSlug.trim().toLowerCase()}`;
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Left Sidebar Info */}
      <section className="hidden min-h-screen w-[360px] flex-col justify-between border-r border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-xl lg:flex relative overflow-hidden">
        {/* Subtle pattern for left side */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        <div className="relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-bold text-slate-900 shadow-md">
              S
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-tight text-white">Sentra AI</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Compliance OS
              </p>
            </div>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-14 max-w-[280px] text-3xl font-semibold leading-tight tracking-tight text-white"
          >
            Access governance for AI systems and sensitive data.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 max-w-[300px] text-sm leading-6 text-slate-300"
          >
            Review policy coverage, risky agent activity, and approval readiness from one operator workspace.
          </motion.p>

          <div className="mt-10 space-y-3">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="group rounded-xl border border-slate-800 bg-slate-950/40 p-3 transition-colors hover:bg-slate-900/60"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Policy coverage
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-400">Track published controls and access exceptions.</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="group rounded-xl border border-slate-800 bg-slate-950/40 p-3 transition-colors hover:bg-slate-900/60"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Activity className="h-4 w-4 text-blue-400" />
                Risk signals
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-400">Surface agent and app access that needs review.</p>
            </motion.div>
          </div>
        </div>

        <div className="relative z-10 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Environment</p>
          <div className="mt-3 space-y-2 text-xs text-slate-100">
            <div className="flex items-center gap-2">
              <Server className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate font-mono">{apiBaseUrl}</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-slate-400" />
              <span>Supabase Postgres</span>
            </div>
          </div>
        </div>
      </section>

      {/* Right Side Main Content */}
      <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden p-5 md:p-8">
        
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 z-0 bg-slate-50">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0000000a_1px,transparent_1px),linear-gradient(to_bottom,#0000000a_1px,transparent_1px)] bg-[size:32px_32px]"></div>
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
        <motion.section 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-[440px] rounded-2xl border border-white/20 bg-white/80 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 md:p-8"
        >
          
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-sm">
              <LockKeyhole className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                {isSignUp ? 'Create an account' : 'Sign in'}
              </h2>
              <p className="mt-1 text-sm text-slate-400/80">
                {isSignUp ? 'Sign up to start your workspace.' : 'Enter your credentials to continue.'}
              </p>
            </div>
          </div>



          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-mono text-sm text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500/40 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                placeholder="admin@sentra.ai"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500/40 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (isSignUp) calculateStrength(event.target.value);
                }}
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                placeholder="••••••••"
                required
              />
              {isSignUp && password && (
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-200">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${passwordStrength}%` }}
                    className={cn(
                      "h-full transition-all",
                      passwordStrength <= 25 ? "bg-rose-500" :
                      passwordStrength <= 50 ? "bg-amber-500" :
                      passwordStrength <= 75 ? "bg-blue-500" : "bg-emerald-500"
                    )}
                  />
                </div>
              )}
            </label>

            {isSignUp && (
              <>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Full Name</span>
                  <input
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500/40 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    type="text"
                    autoComplete="name"
                    placeholder="Jane Smith"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Organization Name</span>
                  <input
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500/40 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    value={organizationName}
                    onChange={(event) => setOrganizationName(event.target.value)}
                    type="text"
                    autoComplete="organization"
                    placeholder="Acme Corp"
                    required
                  />
                </label>
              </>
            )}

            <AnimatePresence>
              {loginError && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 rounded-xl border border-rose-200/60 bg-rose-50/80 px-4 py-3 text-sm text-rose-600 backdrop-blur-sm"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>{loginError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loginPending}
                className="group relative flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-slate-900/30 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loginPending && <LoaderCircle className="h-4 w-4 animate-spin text-slate-100" />}
                <span>
                  {loginPending 
                    ? (isSignUp ? 'Creating account...' : 'Signing in...') 
                    : (isSignUp ? 'Create account' : 'Open workspace')}
                </span>
              </button>
            </div>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white/80 px-3 text-xs text-slate-400 backdrop-blur-xl">or</span></div>
          </div>
          {!showSsoInput ? (
            <button type="button" onClick={() => setShowSsoInput(true)} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 transition-all hover:bg-slate-100 hover:border-slate-300">
              <ShieldCheck className="h-4 w-4 text-slate-500" />
              Sign in with SSO
            </button>
          ) : (
            <div className="space-y-3">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Organization Slug</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-mono text-sm text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500/40 focus:bg-white focus:ring-4 focus:ring-blue-500/10" value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSsoLogin()} type="text" placeholder="acme-corp" autoFocus />
                <p className="mt-1.5 text-xs text-slate-400">Enter your organization's slug to be redirected to your identity provider.</p>
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={handleSsoLogin} disabled={!orgSlug.trim()} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:opacity-50">
                  <ShieldCheck className="h-4 w-4" /> Continue with SSO
                </button>
                <button type="button" onClick={() => { setShowSsoInput(false); setOrgSlug(''); }} className="h-10 px-4 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-sm">
            <span className="text-slate-400">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </span>{' '}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-medium text-slate-900 hover:underline focus:outline-none"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </div>

        </motion.section>
      </main>
    </div>
  );
}
