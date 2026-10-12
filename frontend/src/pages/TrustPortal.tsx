import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiRequest, apiBaseUrl } from '@/lib/api';
import { 
  Globe, ShieldCheck, CheckCircle2, Lock, Bot, 
  Sparkles, Clipboard, Award
} from 'lucide-react';

interface PublicSystem {
  name: string;
  use_case: string;
  risk_tier: string;
}

interface PublicScores {
  gdprScore: number;
  dpdpScore: number;
  hipaaScore: number;
  pciDssScore: number;
  nistAiRmfScore: number;
}

interface PublicTrustResponse {
  organizationName: string;
  slug: string;
  systems: PublicSystem[];
  scores: PublicScores;
}

export default function TrustPortal() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [data, setData] = useState<PublicTrustResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Admin visibility toggle (only visible when authenticated user views their own portal)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPortalEnabled, setIsPortalEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    void loadPublicData();
    void checkAuthSession();
  }, [orgSlug]);

  const loadPublicData = async () => {
    if (!orgSlug) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/public/${orgSlug}/trust`);
      const resData = await response.json();
      
      if (!response.ok) {
        throw new Error(resData.message || 'Failed to load public trust registry');
      }

      setData(resData.data);
      setIsPortalEnabled(true);
    } catch (err: any) {
      setError(err.message || 'Public Trust Portal is disabled or organization not found.');
      setIsPortalEnabled(false);
    } finally {
      setLoading(false);
    }
  };

  const checkAuthSession = async () => {
    try {
      const res = await apiRequest<{ user: { id: string } }>('/user/me');
      if (res.user?.id) {
        setIsAuthenticated(true);
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  const handleTogglePortal = async (enabled: boolean) => {
    try {
      await apiRequest('/public/settings', {
        method: 'PATCH',
        body: JSON.stringify({ enabled })
      });
      setIsPortalEnabled(enabled);
      if (enabled) {
        void loadPublicData();
      } else {
        setData(null);
        setError('Public Trust Portal is disabled by the administrator');
      }
    } catch (err) {
      console.error('Failed to toggle public trust setting:', err);
    }
  };

  const handleCopyLink = () => {
    const link = window.location.href;
    void navigator.clipboard.writeText(link);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getRiskColor = (tier: string) => {
    switch (tier) {
      case 'CRITICAL': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'HIGH': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'MEDIUM': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
  };

  const getComplianceStatusBadge = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (score >= 50) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-red-500/10 text-red-400 border-red-500/20';
  };

  const getComplianceStatusText = (score: number) => {
    if (score >= 80) return 'Fully Verified';
    if (score >= 50) return 'In Progress';
    return 'Not Started';
  };

  return (
    <div className="min-h-screen bg-[#070a13] text-gray-200 font-sans flex flex-col items-center justify-start p-4 sm:p-8 relative overflow-hidden">
      
      {/* Dynamic Background Gradients */}
      <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />

      {/* Authenticated Admin Visibility Controls Panel */}
      {isAuthenticated && (
        <div className="w-full max-w-4xl bg-gradient-to-r from-indigo-950/40 to-purple-950/20 border border-indigo-500/20 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10 shadow-2xl">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-indigo-500/10 p-2.5 shadow-md">
              <Globe className="h-5 w-5 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Public Trust Directory visibility</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Control if customers can anonymously browse your active compliance registry.</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 rounded-xl border border-gray-800 px-4 py-2 text-[10px] font-bold uppercase text-gray-400 hover:bg-gray-800 hover:text-white transition-all shadow-inner"
            >
              <Clipboard className="h-4 w-4" />
              {isCopied ? 'Copied Link' : 'Copy Public URL'}
            </button>

            <button
              onClick={() => handleTogglePortal(!isPortalEnabled)}
              className={`rounded-xl px-5 py-2.5 text-[10px] font-black uppercase shadow-lg transition-all ${
                isPortalEnabled 
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/5' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/5'
              }`}
            >
              {isPortalEnabled ? 'Disable Directory' : 'Enable Directory'}
            </button>
          </div>
        </div>
      )}

      {/* Main Public Certificate Container */}
      <div className="w-full max-w-4xl z-10 flex flex-col gap-6">
        
        {loading ? (
          <div className="flex items-center justify-center py-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          </div>
        ) : error || isPortalEnabled === false ? (
          <div className="flex flex-col items-center justify-center py-20 bg-gradient-to-br from-[#111827]/40 to-black/40 border border-gray-800/80 rounded-3xl p-8 text-center max-w-lg mx-auto shadow-2xl">
            <div className="rounded-full bg-red-500/10 p-4 border border-red-500/20 mb-4">
              <Lock className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="text-xl font-black text-white">Trust Directory Restricted</h2>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              The public trust directory for this organization is currently disabled by the administrator. Contact support or verify compliance status internally.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8 bg-gradient-to-br from-[#111827]/60 to-[#030712]/90 border border-gray-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
            
            {/* Hologram verified badge */}
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
            
            {/* Portal Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-800/80 pb-6 relative z-10">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-indigo-500/10 p-3 border border-indigo-500/20 shadow-md">
                  <ShieldCheck className="h-7 w-7 text-indigo-400 animate-pulse" />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-white uppercase">{data?.organizationName}</h1>
                  <span className="text-[10px] font-black tracking-wider text-indigo-400 flex items-center gap-1.5 mt-0.5 uppercase">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    Verified Public AI Trust Portal
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 border border-gray-800/80 rounded-xl px-4 py-2 bg-black/20 self-start md:self-auto text-[10px] shadow-inner">
                <Globe className="h-4 w-4 text-indigo-400" />
                <span className="text-gray-400">Status: </span>
                <span className="font-bold text-emerald-400 uppercase">compliant</span>
              </div>
            </div>

            {/* Certificate description */}
            <div className="text-xs text-gray-400 leading-relaxed max-w-2xl relative z-10">
              This registry provides a transparent catalog of AI models and tools utilized by <span className="text-white font-bold">{data?.organizationName}</span>. 
              Every catalog item represents an audited integration verified in real-time against privacy, security, and human oversight standards by <span className="text-indigo-400 font-bold">Sentraa AI Governance</span>.
            </div>

            {/* Verified Compliance Badges */}
            {data?.scores && (
              <div className="flex flex-col gap-4 relative z-10">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider text-indigo-300">
                  Verified Compliance Badges
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { key: 'gdpr', label: 'GDPR Privacy Assurance', score: data.scores.gdprScore },
                    { key: 'dpdp', label: 'DPDP Data Protection', score: data.scores.dpdpScore },
                    { key: 'hipaa', label: 'HIPAA Health Security', score: data.scores.hipaaScore },
                    { key: 'pci', label: 'PCI-DSS Data Security', score: data.scores.pciDssScore },
                    { key: 'nist', label: 'NIST AI RMF Posture', score: data.scores.nistAiRmfScore },
                  ].map(badge => (
                    <div 
                      key={badge.key} 
                      className="bg-black/20 border border-gray-800 rounded-2xl p-4 flex flex-col justify-between hover:border-indigo-500/20 hover:shadow-indigo-500/2 transition-all relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase leading-snug">{badge.label}</span>
                        <Award className="h-4 w-4 text-indigo-400/50" />
                      </div>
                      
                      <div className="flex items-baseline justify-between mt-4">
                        <span className="text-2xl font-black text-white">{badge.score}%</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getComplianceStatusBadge(badge.score)}`}>
                          {getComplianceStatusText(badge.score)}
                        </span>
                      </div>

                      {/* Progress Visual Mini-Bar */}
                      <div className="w-full bg-gray-850 h-1 rounded-full mt-2.5 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${badge.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Public Systems list */}
            <div className="flex flex-col gap-4 relative z-10">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider text-indigo-300">
                Verified AI Inventory ({data?.systems.length})
              </h3>
              
              <div className="border border-gray-800/80 rounded-2xl overflow-hidden bg-black/25">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-800 bg-[#0f172a]/40 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-4 pl-6">System Name</th>
                      <th className="p-4">Usecase / Purpose</th>
                      <th className="p-4 pr-6 text-right">Risk Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 text-gray-300">
                    {data?.systems.map((sys, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-all">
                        <td className="p-4 pl-6 font-bold text-white flex items-center gap-2.5">
                          <Bot className="h-4 w-4 text-indigo-400" />
                          {sys.name}
                        </td>
                        <td className="p-4 font-semibold text-gray-400">{sys.use_case}</td>
                        <td className="p-4 pr-6 text-right">
                          <span className={`text-[9px] px-2.5 py-0.5 rounded-full border font-black uppercase ${getRiskColor(sys.risk_tier)}`}>
                            {sys.risk_tier}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Seal Certificate Footer */}
            <div className="border-t border-gray-800/80 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[10px] text-gray-500 relative z-10">
              <span>Security Audited and Cryptographically Verified</span>
              <span className="flex items-center gap-1.5 font-bold uppercase text-indigo-400">
                <Sparkles className="h-4 w-4" />
                Sentraa AI Blueprint Registry
              </span>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
