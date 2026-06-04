import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoaderCircle, LockKeyhole, ArrowLeft, Mail } from 'lucide-react';
import { apiBaseUrl } from '../lib/api';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';

export default function ForgotPassword() {
  const addToast = useStore((state) => state.addToast);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${apiBaseUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        addToast({ message: 'Password reset request submitted', type: 'success' });
      } else {
        setError(data.message || 'Failed to send password reset email.');
        addToast({ message: data.message || 'Password reset request failed', type: 'error' });
      }
    } catch (err: any) {
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
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">Forgot Password</h2>
            <p className="mt-1 text-sm text-slate-400/80">Request a recovery link for your account.</p>
          </div>
        </div>

        {success ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 text-center py-4"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100">
              <Mail className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-md font-bold text-slate-900">Check your inbox</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                If that email exists, a reset link has been sent.
              </p>
            </div>
            <Link 
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors mt-4"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Login</span>
            </Link>
          </motion.div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-mono text-sm text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500/40 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="admin@sentra.ai"
                required
              />
            </label>

            {error && (
              <div className="rounded-xl border border-rose-200/60 bg-rose-50/80 px-4 py-3 text-sm text-rose-600 backdrop-blur-sm">
                <p>{error}</p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="group relative flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-slate-900/30 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading && <LoaderCircle className="h-4 w-4 animate-spin text-slate-100" />}
                <span>{loading ? 'Sending link...' : 'Send reset link'}</span>
              </button>
            </div>

            <div className="text-center mt-4">
              <Link 
                to="/login"
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>Cancel and return to login</span>
              </Link>
            </div>
          </form>
        )}
      </motion.section>
    </div>
  );
}
