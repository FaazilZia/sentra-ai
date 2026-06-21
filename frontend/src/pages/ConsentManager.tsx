import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  History, 
  Calendar, 
  Key,
  LoaderCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { 
  fetchConsentHistory, 
  grantConsent, 
  withdrawConsent, 
  ConsentEvent 
} from '@/lib/api';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

export default function ConsentManager() {
  const addToast = useStore(state => state.addToast);
  const [history, setHistory] = useState<ConsentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load consent records
  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await fetchConsentHistory();
      setHistory(data || []);
    } catch (err: any) {
      console.error('Failed to load consent history:', err);
      addToast({ message: 'FAILED TO RETRIEVE CONSENT HISTORY', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Derive current status: latest record in history determines current status
  const currentRecord = history[0];
  const isConsentGranted = currentRecord ? currentRecord.action === 'GRANT' : false;

  const handleToggleConsent = async () => {
    setSubmitting(true);
    const targetAction = isConsentGranted ? 'WITHDRAW' : 'GRANT';
    
    // Optimistic UI update: generate a temporary local history item
    const originalHistory = [...history];
    const tempRecord: ConsentEvent = {
      id: 'temp-id',
      action: targetAction,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      hash: 'optimistic-hash-fingerprint-generating...'
    };
    setHistory([tempRecord, ...history]);

    try {
      if (isConsentGranted) {
        await withdrawConsent();
        addToast({ message: 'PRIVACY CONSENT WITHDRAWN SUCCESSFULLY', type: 'success' });
      } else {
        await grantConsent();
        addToast({ message: 'PRIVACY CONSENT GRANTED SUCCESSFULLY', type: 'success' });
      }
      // Re-fetch the real history to replace the optimistic state
      const updatedData = await fetchConsentHistory();
      setHistory(updatedData || []);
    } catch (err: any) {
      console.error('Failed to update consent status:', err);
      addToast({ message: err.message || 'FAILED TO UPDATE CONSENT STATUS', type: 'error' });
      // Rollback to original history on failure
      setHistory(originalHistory);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in text-[var(--text-secondary)] text-left">
      
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-semibold text-[var(--text-primary)] flex items-center gap-2 tracking-tight">
          <ShieldCheck className="h-6 w-6 text-indigo-400" />
          Consent Manager
        </h1>
        <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mt-0.5">
          GDPR / HIPAA / DPDP cryptographic consent ledger and authorization control
        </p>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Status Widget */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="card-base p-6 border border-[var(--border-default)] bg-[var(--bg-page)] rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[340px]">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-indigo-500/5 blur-xl pointer-events-none" />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest">Active Status</span>
                <span className={cn(
                  "text-[9px] font-semibold uppercase bg-black/30 px-2.5 py-1 rounded border tracking-wider",
                  isConsentGranted 
                    ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" 
                    : "text-rose-400 border-rose-500/20 bg-rose-500/5"
                )}>
                  {isConsentGranted ? 'Consent Active' : 'No Consent'}
                </span>
              </div>
              
              <div className="py-4 text-center">
                <div className={cn(
                  "mx-auto h-16 w-16 rounded-2xl flex items-center justify-center border shadow-xl transition-all duration-300",
                  isConsentGranted
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse-subtle"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                )}>
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-white text-base mt-4 uppercase tracking-wider">
                  {isConsentGranted ? 'Authorization Granted' : 'Authorization Withdrawn'}
                </h3>
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed mt-2 max-w-xs mx-auto">
                  {isConsentGranted 
                    ? 'Your organization permits AI systems to safely analyze baseline activities, enforce guardrails, and dispatch secure telemetry logs.'
                    : 'All advanced AI scanning and telemetry logging are suspended until consent is granted for privacy framework compliance.'}
                </p>
              </div>
            </div>

            {/* Action CTA Button */}
            <div className="pt-4 border-t border-[var(--border-default)]">
              <button
                onClick={handleToggleConsent}
                disabled={loading || submitting}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[10px] font-semibold text-white uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                  isConsentGranted
                    ? "bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 shadow-rose-500/10"
                    : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/10 animate-pulse-subtle"
                )}
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    <span>Processing Ledger...</span>
                  </>
                ) : isConsentGranted ? (
                  <span>Withdraw Consent</span>
                ) : (
                  <span>Grant Consent</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Information & History */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Informational Notice */}
          <div className="bg-indigo-950/10 border border-indigo-900/30 p-5 rounded-2xl flex gap-3 text-xs leading-relaxed text-indigo-300">
            <Info className="h-5 w-5 shrink-0 text-indigo-400 mt-0.5" />
            <div>
              <span className="font-semibold text-white uppercase tracking-wider block mb-1 text-[10px]">GDPR Recital 32 Obligations</span>
              <span>
                Every action taken regarding user consent is cryptographically recorded onto an immutable, hash-chained ledger. This guarantees audit-proof compliance records mapped automatically to global regulatory frameworks, including GDPR, HIPAA, and DPDP.
              </span>
            </div>
          </div>

          {/* History Ledger Table */}
          <div className="card-base overflow-hidden border border-[var(--border-default)] bg-[var(--bg-card)] shadow-2xl rounded-2xl">
            
            <div className="p-5 border-b border-[var(--border-default)] bg-[var(--bg-page)] flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-wider text-indigo-400 uppercase flex items-center gap-1.5">
                <History className="h-4 w-4 text-indigo-400" />
                Consent History Ledger
              </span>
              <span className="text-xs text-[var(--text-muted)]">{history.length} records active</span>
            </div>

            {loading && history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <LoaderCircle className="h-8 w-8 animate-spin text-indigo-500" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Retrieving Ledger...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertTriangle className="h-12 w-12 text-[var(--text-muted)] opacity-60 mb-3 animate-pulse" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Empty Consent Ledger</h3>
                <p className="text-[10px] text-[var(--text-secondary)] mt-1 max-w-sm uppercase leading-normal">
                  No cryptographic consent records exist for your user profile on this tenant. Grant consent above to initialize the registry.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-gray-950/20 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border-default)]">
                      <th className="py-3.5 px-4 pl-6">Action Event</th>
                      <th className="py-3.5 px-4">Notice Version</th>
                      <th className="py-3.5 px-4">Ledger Timestamp</th>
                      <th className="py-3.5 px-4 text-right pr-6">Ledger Signature (SHA-256)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40 text-[var(--text-secondary)]">
                    {history.map((record) => (
                      <tr key={record.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-4 px-4 pl-6">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider border",
                            record.action === 'GRANT'
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          )}>
                            {record.action}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-[var(--text-secondary)]">
                          v{record.version}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                            <Calendar className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                            <span>{new Date(record.timestamp).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="p-1 px-2.5 rounded bg-black/40 text-indigo-400 border border-indigo-500/15 font-mono text-[9px] font-bold shadow-inner" title={record.hash}>
                              <Key className="h-3 w-3 inline mr-1 text-indigo-400" />
                              {record.hash.substring(0, 8)}...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
