import { FormEvent, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LoaderCircle, LockKeyhole, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { apiBaseUrl } from '../lib/api';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';

export default function ResetPassword() {
  const addToast = useStore((state) => state.addToast);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token.');
    }
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError('Reset token is required.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${apiBaseUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        addToast({ message: 'Password has been reset successfully', type: 'success' });
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(data.message || 'Failed to reset password.');
        addToast({ message: data.message || 'Password reset failed', type: 'error' });
      }
    } catch (err) {
      setError('A network error occurred. Please try again.');
      addToast({ message: 'A network error occurred. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
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
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">Reset Password</h2>
            <p className="mt-1 text-sm text-slate-400/80">Configure your new account password.</p>
          </div>
        </div>

        {success ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 text-center py-4"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-md font-bold text-slate-900">Success!</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-semibold">
                Password reset. Redirecting to login...
              </p>
            </div>
          </motion.div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">New Password</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500/40 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="New Password (min 8 chars)"
                required
                disabled={!token}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Confirm New Password</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500/40 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                placeholder="Confirm New Password"
                required
                disabled={!token}
              />
            </label>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200/60 bg-rose-50/80 px-4 py-3 text-sm text-rose-600 backdrop-blur-sm">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !token}
                className="group relative flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-slate-900/30 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading && <LoaderCircle className="h-4 w-4 animate-spin text-slate-100" />}
                <span>{loading ? 'Resetting password...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        )}
      </motion.section>
    </div>
  );
}
