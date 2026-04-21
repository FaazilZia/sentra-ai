import { useEffect, useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, ArrowLeft, Trash2, Clock, Key } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { fetchConsentHistory, withdrawConsent, grantConsent, ConsentEvent } from '../lib/api';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { StatusBadge } from '../components/ui/StatusBadge';

export default function PrivacySettingsPage() {
  const { logout, accessToken } = useAuth();
  const [history, setHistory] = useState<ConsentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const loadHistory = async () => {
    try {
      const data = await fetchConsentHistory();
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [accessToken]);

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    try {
      await withdrawConsent();
      alert('Consent withdrawn. Your data is being purged. You will be signed out.');
      logout();
    } catch (err) {
      alert('Failed to withdraw consent');
      setIsWithdrawing(false);
      setShowConfirm(false);
    }
  };

  const isConsented = history.length > 0 && history[0].action === 'GRANT';

  return (
    <div className="mx-auto max-w-[1000px] space-y-6 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <Link to="/app" className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-950 transition-colors">
            <ArrowLeft className="h-3 w-3" /> Back to Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Privacy & Consent Ledger</h1>
          <p className="text-sm text-slate-400">Manage your data permissions and view the immutable audit trail.</p>
        </div>
        <StatusBadge 
          label={isConsented ? 'Active Consent' : 'Consent Withdrawn'} 
          tone={isConsented ? 'success' : 'danger'} 
        />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <SurfaceCard 
            title="Privacy Ledger (The Diary)" 
            description="Every time you grant or withdraw consent, it is recorded in this tamper-proof audit trail."
          >
            {loading ? (
              <div className="space-y-4 py-8">
                {[1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Shield className="h-12 w-12 text-slate-200 mb-4" />
                <p className="text-sm text-slate-400">No consent history found.</p>
                <button 
                  onClick={() => grantConsent().then(loadHistory)}
                  className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Grant Initial Consent
                </button>
              </div>
            ) : (
              <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {history.map((event) => (
                  <div key={event.id} className="relative flex items-start gap-4">
                    <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-4 border-white ring-1 ring-slate-200 shadow-sm ${event.action === 'GRANT' ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
                      {event.action === 'GRANT' ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold uppercase tracking-tight text-slate-900">
                          {event.action === 'GRANT' ? 'Consent Granted' : 'Consent Withdrawn'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">ID: {event.id.slice(0, 8)}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                        <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(event.timestamp).toLocaleString()}</div>
                        <div className="flex items-center gap-1"><Shield className="h-3 w-3" /> Version {event.version}</div>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2.5 font-mono text-[9px] text-slate-300 break-all leading-relaxed">
                        <span className="text-slate-600 font-bold">DIGITAL SIGNATURE (HASH):</span> {event.hash}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>
        </div>

        <div className="space-y-6">
          <SurfaceCard title="Control Actions">
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Under India's DPDP Act, you have the <strong>Right to Erasure</strong> and the <strong>Right to Withdraw Consent</strong> at any time.
            </p>
            
            {showConfirm ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 animate-in fade-in zoom-in duration-300">
                <h4 className="text-sm font-bold text-rose-900 mb-2">Are you absolutely sure?</h4>
                <p className="text-[11px] text-rose-700 leading-relaxed mb-4">
                  Withdrawing consent will immediately initiate an <strong>Automated Purge</strong> of your security incidents, AI requests, and logs. This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={handleWithdraw}
                    disabled={isWithdrawing}
                    className="flex-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {isWithdrawing ? 'Wiping Data...' : 'Confirm Wipe'}
                  </button>
                  <button 
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 rounded-lg bg-white border border-rose-200 px-3 py-2 text-xs font-bold text-rose-900 hover:bg-rose-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setShowConfirm(true)}
                disabled={!isConsented}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-rose-600 transition-all hover:bg-rose-50 hover:border-rose-200 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> Withdraw All Consent
              </button>
            )}
            
            {!isConsented && !loading && (
              <button 
                onClick={() => grantConsent().then(loadHistory)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800"
              >
                <ShieldCheck className="h-4 w-4" /> Grant Consent
              </button>
            )}
          </SurfaceCard>

          <SurfaceCard 
            title="Privacy Compliance" 
            contentClassName="space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Key className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Right to Access</p>
                <p className="text-[10px] text-slate-400">View and export all data we hold.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Right to Correction</p>
                <p className="text-[10px] text-slate-400">Keep your profiling data accurate.</p>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
