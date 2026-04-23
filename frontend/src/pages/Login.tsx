import { FormEvent, useState } from 'react';
import { Activity, Database, LoaderCircle, LockKeyhole, Server, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { apiBaseUrl } from '../lib/api';
import { GoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const { login, signUp, googleLogin, loginPending, loginError } = useAuth();
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

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (credentialResponse.credential) {
      await googleLogin(credentialResponse.credential);
    }
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

          <div className="mb-6 space-y-3">
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  console.error('Login Failed');
                }}
                useOneTap
                theme="outline"
                width="100%"
                shape="pill"
              />
            </div>
            
            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:shadow-sm"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.052-.102.001-.226-.112-.269a12.726 12.726 0 0 1-1.816-.864.077.077 0 0 1-.01-.128c.12-.09.24-.184.355-.278a.077.077 0 0 1 .081-.01c3.927 1.793 8.18 1.793 12.061 0a.077.077 0 0 1 .081.01c.115.095.235.188.356.278a.077.077 0 0 1-.01.128 12.73 12.73 0 0 1-1.815.864.077.077 0 0 0-.112.27c.355.698.766 1.362 1.226 1.993.033.045.084.07.139.045a19.877 19.877 0 0 0 6.027-3.03.077.077 0 0 0 .032-.057c.488-5.181-.84-9.66-3.645-13.66a.066.066 0 0 0-.031-.027zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Sign in with Discord
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/80 px-2 text-slate-400 backdrop-blur-md">Or continue with email</span>
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
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                placeholder="••••••••"
                required
              />
            </label>

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
