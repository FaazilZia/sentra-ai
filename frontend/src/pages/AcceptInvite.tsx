import { FormEvent, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LoaderCircle, LockKeyhole, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { apiBaseUrl } from '../lib/api';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';

export default function AcceptInvite() {
  const addToast = useStore((state) => state.addToast);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [orgName, setOrgName] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verifying, setVerifying] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function verifyInvite() {
      if (!token) {
        setError('Missing invitation token.');
        setVerifying(false);
        return;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/tenant/invite/verify?token=${token}`);
        const result = await response.json();

        if (response.ok && result.success) {
          setEmail(result.data.email);
          setOrgName(result.data.organizationName);
        } else {
          setError(result.message || 'Invitation is invalid or has expired.');
        }
      } catch (err) {
        setError('A network error occurred. Please try again.');
      } finally {
        setVerifying(false);
      }
    }

    void verifyInvite();
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${apiBaseUrl}/tenant/invite/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      });
      const result = await response.json();

      if (response.ok && result.success) {
        setSuccess(true);
        addToast({ message: 'Account created! Please log in.', type: 'success' });
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(result.message || 'Failed to accept invitation.');
        addToast({ message: result.message || 'Invitation acceptance failed', type: 'error' });
      }
    } catch (err) {
      setError('A network error occurred. Please try again.');
      addToast({ message: 'A network error occurred. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900 relative overflow-hidden p-5 md:p-8">
      {/* Abstract Background Elements */}
      <div className="absolute inset-0 z-0 bg-slate-50">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0000000a_1px,transparent_1px),linear-gradient(to_bottom,#0000000a_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        <div className="absolute -right-[10%] -top-[10%] h-[60%] w-[50%] rounded-full bg-blue-200/20 blur-[100px]" />
        <div className="absolute bottom-[0%] right-[20%] h-[50%] w-[40%] rounded-full bg-emerald-100/30 blur-[100px]" />
      </div>

      {/* Glass SaaS Card */}
      <motion.section 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-[440px] rounded-2xl border border-white/20 bg-white/80 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 md:p-8"
      >
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-sm">
            <LockKeyhole className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">Join Organization</h2>
            <p className="mt-1 text-sm text-slate-400/80">
              {verifying ? 'Verifying invitation token...' : `You've been invited to join ${orgName}`}
            </p>
          </div>
        </div>

        {verifying ? (
          <div className="flex justify-center py-12">
            <LoaderCircle className="h-8 w-8 animate-spin text-[var(--royal-indigo)]" />
          </div>
        ) : error ? (
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500 border border-rose-100">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-md font-bold text-slate-900">Invitation Error</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {error}
              </p>
            </div>
            <div className="pt-4 border-t border-slate-200 text-xs text-slate-400">
              Need assistance? Please contact your administrator or <a href="mailto:support@sentra.ai" className="text-blue-600 hover:underline">support@sentra.ai</a>.
            </div>
          </div>
        ) : success ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 text-center py-4"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-md font-bold text-slate-900">Welcome to {orgName}!</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-semibold">
                Account created! Please log in...
              </p>
            </div>
          </motion.div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-500">Email (Read Only)</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 font-mono text-sm text-slate-400 outline-none cursor-not-allowed"
                value={email}
                type="email"
                readOnly
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Full Name</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500/40 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                value={name}
                onChange={(event) => setName(event.target.value)}
                type="text"
                placeholder="Jane Smith"
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
                placeholder="Password (min 8 chars)"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Confirm Password</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500/40 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                placeholder="Confirm Password"
                required
              />
            </label>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="group relative flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-slate-900/30 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting && <LoaderCircle className="h-4 w-4 animate-spin text-slate-100" />}
                <span>{submitting ? 'Creating account...' : 'Accept Invitation'}</span>
              </button>
            </div>
          </form>
        )}
      </motion.section>
    </div>
  );
}
