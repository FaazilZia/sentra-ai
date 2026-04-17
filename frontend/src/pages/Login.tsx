import React, { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  LoaderCircle, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ArrowRight,
  Github,
  Chrome,
  Zap
} from 'lucide-react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Logo } from '../components/layout/Logo';
import { AtmosphericBackground } from '../components/ui/AtmosphericBackground';

export default function LoginPage() {
  const { login, signUp, demoLogin, loginPending, loginError, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(() => searchParams.get('signup') === 'true');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{email?: string, password?: string}>({});

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/app" replace />;
  }

  const handleDemoLogin = () => {
    demoLogin();
    navigate('/app', { replace: true });
  };

  const validateForm = () => {
    const errors: {email?: string, password?: string} = {};
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Invalid email format';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateForm()) return;

    if (isSignUp) {
      await signUp(email, password);
    } else {
      await login(email, password);
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 selection:bg-blue-500/30 font-sans overflow-y-auto">
      {/* Background - pointer events disabled so it never blocks inputs */}
      <div className="pointer-events-none">
        <AtmosphericBackground />
      </div>

      {/* Main Glass Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md my-8"
      >
        <div className="rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-2xl border border-[var(--glass-border)]"
          style={{
            background: 'var(--glass-bg)',
            boxShadow: 'var(--glass-shadow)',
          }}>
          {/* All child content is interactive — no noise-overlay blocking */}
          
          <div className="relative z-10">
            {/* Header */}
            <div className="flex flex-col items-center mb-8">
              <Link to="/">
                <Logo size="md" className="mb-6 hover:scale-105 transition-transform" iconOnly={false} />
              </Link>
              <h1 className="text-3xl font-black text-[var(--foreground)] tracking-tighter uppercase mb-2">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </h1>
              <p className="text-[var(--muted)] text-sm font-medium">
                {isSignUp ? 'Initialize your node credentials.' : 'Unlock your secure AI workspace.'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              
              {/* Email Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setValidationErrors(prev => ({...prev, email: undefined})); }}
                    className={`login-input w-full border rounded-xl py-3 pl-11 pr-4 text-sm font-medium outline-none transition-all focus:ring-4 ${validationErrors.email ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'focus:border-blue-500 focus:ring-blue-500/20'}`}
                    placeholder="operator@sentra.live"
                  />
                </div>
                {validationErrors.email && (
                  <p className="text-red-400 text-xs mt-1 ml-1 font-medium">{validationErrors.email}</p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Password
                  </label>
                  {!isSignUp && (
                    <a href="#" className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors">
                      Forgot Password?
                    </a>
                  )}
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setValidationErrors(prev => ({...prev, password: undefined})); }}
                    className={`login-input w-full border rounded-xl py-3 pl-11 pr-12 text-sm font-medium outline-none transition-all focus:ring-4 ${validationErrors.password ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'focus:border-blue-500 focus:ring-blue-500/20'}`}
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="text-red-400 text-xs mt-1 ml-1 font-medium">{validationErrors.password}</p>
                )}
              </div>

              {/* Remember Me */}
              {!isSignUp && (
                <div className="flex items-center ml-1 mt-2">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--glass-border)] text-blue-500 focus:ring-blue-500/30 bg-[var(--background)]/50 cursor-pointer"
                  />
                  <label htmlFor="remember" className="ml-2 text-xs text-[var(--muted)] cursor-pointer hover:text-[var(--foreground)] transition-colors">
                    Remember my node
                  </label>
                </div>
              )}

              {/* API Error Box */}
              {loginError && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-500"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>{loginError}</p>
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loginPending}
                className="w-full mt-6 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all hover:bg-blue-500 hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] active:scale-95 disabled:opacity-70 disabled:pointer-events-none disabled:transform-none"
              >
                {loginPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {isSignUp ? 'Initialize Node' : 'Authenticate'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Social Login */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <div className="h-px bg-[var(--glass-border)] flex-1"></div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] px-3 whitespace-nowrap">
                Or Continue With
              </span>
              <div className="h-px bg-[var(--glass-border)] flex-1"></div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--background)]/30 py-2.5 text-xs font-bold text-[var(--foreground)] transition-all hover:bg-[var(--foreground)]/5 hover:-translate-y-0.5">
                <Github className="h-4 w-4" /> GitHub
              </button>
              <button className="flex items-center justify-center gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--background)]/30 py-2.5 text-xs font-bold text-[var(--foreground)] transition-all hover:bg-[var(--foreground)]/5 hover:-translate-y-0.5">
                <Chrome className="h-4 w-4" /> Google
              </button>
            </div>

            {/* Demo Bypass */}
            <div className="mt-4">
              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-3 text-xs font-black uppercase tracking-widest text-amber-500 transition-all hover:bg-amber-500/20 hover:-translate-y-0.5 active:scale-95"
              >
                <Zap className="h-4 w-4" />
                Enter Demo Mode — No Account Needed
              </button>
            </div>

            {/* Toggle Sign Up / Login */}
            <div className="mt-8 text-center border-t border-[var(--glass-border)] pt-6">
              <span className="text-xs text-[var(--muted)]">
                {isSignUp ? "Already have a node?" : "Don't have access?"}
              </span>{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setValidationErrors({}); }}
                className="text-xs font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 transition-colors"
              >
                {isSignUp ? 'Login Here' : 'Create Account'}
              </button>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
