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
    <div className="mx-auto max-w-[1000px] space-y-6 pb-12 text-[var(--foreground)]">
      <header className="flex items-center justify-between px-2">
        <div>
          <Link to="/app" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-black tracking-tighter text-[var(--foreground)] uppercase">Privacy & Consent Ledger</h1>
          <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Manage your data permissions and view the immutable audit trail.</p>
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
            className="bg-[var(--card)] border-[var(--card-border)] rounded-[2.5rem] backdrop-blur-xl"
          >
            {loading ? (
              <div className="space-y-4 py-8">
                {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-[var(--foreground)]/5" />)}
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Shield className="h-16 w-16 text-[var(--muted)] mb-4 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">No consent history found.</p>
                <button 
                  onClick={() => grantConsent().then(loadHistory)}
                  className="mt-6 rounded-xl bg-[var(--foreground)] px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--background)] shadow-lg"
                >
                  Grant Initial Consent
                </button>
              </div>
            ) : (
              <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[var(--card-border)] before:to-transparent">
                {history.map((event) => (
                  <div key={event.id} className="relative flex items-start gap-4">
                    <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-4 border-[var(--background)] ring-1 ring-[var(--card-border)] shadow-sm ${event.action === 'GRANT' ? 'bg-green-500/20 text-green-500' : 'bg-rose-500/20 text-rose-500'}`}>
                      {event.action === 'GRANT' ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 rounded-2xl border border-[var(--card-border)] bg-[var(--muted-background)]/50 p-5 shadow-sm backdrop-blur-md">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black uppercase tracking-widest text-[var(--foreground)]">
                          {event.action === 'GRANT' ? 'Consent Granted' : 'Consent Withdrawn'}
                        </span>
                        <span className="text-[9px] font-mono text-[var(--muted)]">ID: {event.id.slice(0, 8)}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-[var(--muted)] uppercase tracking-tight mb-4 opacity-80">
                        <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {new Date(event.timestamp).toLocaleString()}</div>
                        <div className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Version {event.version}</div>
                      </div>
                      <div className="rounded-xl bg-[var(--background)]/50 border border-[var(--card-border)] p-3.5 font-mono text-[9px] text-[var(--muted)] break-all leading-relaxed">
                        <span className="text-[var(--foreground)] font-black opacity-40">DIGITAL SIGNATURE (HASH):</span> {event.hash}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>
        </div>

        <div className="space-y-6">
          <SurfaceCard title="Control Actions" className="bg-[var(--card)] border-[var(--card-border)] rounded-[2.5rem]">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] leading-relaxed mb-6 opacity-80">
              Under India's DPDP Act, you have the <strong>Right to Erasure</strong> and the <strong>Right to Withdraw Consent</strong> at any time.
            </p>
            
            {showConfirm ? (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 animate-in fade-in zoom-in duration-300">
                <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest mb-3">Are you absolutely sure?</h4>
                <p className="text-[10px] text-rose-500/80 leading-relaxed mb-5 font-bold uppercase tracking-tight">
                  Withdrawing consent will immediately initiate an <strong>Automated Purge</strong> of your security incidents, AI requests, and logs. This cannot be undone.
                </p>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={handleWithdraw}
                    disabled={isWithdrawing}
                    className="w-full rounded-xl bg-rose-500 border border-rose-600/20 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-rose-600 disabled:opacity-50"
                  >
                    {isWithdrawing ? 'Wiping Data...' : 'Confirm Wipe'}
                  </button>
                  <button 
                    onClick={() => setShowConfirm(false)}
                    className="w-full rounded-xl bg-[var(--foreground)]/5 border border-[var(--card-border)] py-3 text-[10px] font-black uppercase tracking-widest text-[var(--foreground)] hover:bg-[var(--foreground)]/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setShowConfirm(true)}
                disabled={!isConsented}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--background)]/50 py-4 text-[10px] font-black uppercase tracking-widest text-rose-500 transition-all hover:bg-rose-500/5 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> Withdraw All Consent
              </button>
            )}
            
            {!isConsented && !loading && (
              <button 
                onClick={() => grantConsent().then(loadHistory)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 py-4 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-cyan-600 shadow-lg shadow-cyan-500/20"
              >
                <ShieldCheck className="h-4 w-4" /> Grant Consent
              </button>
            )}
          </SurfaceCard>

          <SurfaceCard 
            title="Privacy Compliance" 
            className="bg-[var(--card)] border-[var(--card-border)] rounded-[2.5rem]"
            contentClassName="space-y-5"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-[var(--foreground)] uppercase tracking-widest">Right to Access</p>
                <p className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-tighter">View and export all data.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-500 border border-green-500/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-[var(--foreground)] uppercase tracking-widest">Right to Correction</p>
                <p className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-tighter">Keep your data accurate.</p>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
