import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  resolveShareLink, SharedViewResponse,
  RiskPortfolioResponse, ComplianceFeature, AuditLog 
} from '@/lib/api';
import { 
  LoaderCircle, AlertTriangle, ShieldCheck, ClipboardCheck, 
  Building2, Cpu, Award, ShieldAlert, Clock, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SharedView() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SharedViewResponse | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!token) {
        setError('Token is required');
        setLoading(false);
        return;
      }
      try {
        const res = await resolveShareLink(token);
        setData(res);
      } catch (err: any) {
        console.error('Failed to resolve shared link:', err);
        setError(err.message || 'Link is invalid or has expired');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex flex-col items-center justify-center text-gray-200">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-[var(--royal-indigo)]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] font-mono">
            SENTRAA.AI // SECURE_PORTAL
          </span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex flex-col items-center justify-center text-gray-200 px-6">
        <div className="max-w-md w-full card-base p-8 text-center border border-red-500/20 bg-red-500/5">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-black uppercase text-white tracking-tight">Access Denied</h2>
          <p className="text-[var(--text-xs)] text-[var(--text-secondary)] leading-relaxed mt-2 uppercase tracking-wider font-bold">
            {error || 'This share link has expired or is invalid.'}
          </p>
          <div className="mt-6 border-t border-[var(--border-default)] pt-6">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] block">
              SENTRAA AI GOVERNANCE GATEWAY
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex flex-col text-left">
      {/* Top Branding Navigation Header */}
      <header className="border-b border-[var(--border-default)] bg-[var(--bg-card)]/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-[var(--royal-indigo)] to-[var(--lavender)] flex items-center justify-center font-black text-white">
              <svg viewBox="0 0 240 140" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" xmlns="http://www.w3.org/2000/svg">
                <g stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <line x1="152" y1="30" x2="132" y2="18"/>
                  <line x1="132" y1="18" x2="104" y2="13"/>
                  <line x1="104" y1="13" x2="78" y2="30"/>
                  <line x1="78" y1="30" x2="74" y2="58"/>
                  <line x1="74" y1="58" x2="108" y2="66"/>
                  <line x1="108" y1="66" x2="128" y2="47"/>
                  <line x1="108" y1="66" x2="95" y2="86"/>
                  <line x1="108" y1="66" x2="150" y2="73"/>
                  <line x1="150" y1="73" x2="146" y2="104"/>
                  <line x1="146" y1="104" x2="163" y2="99"/>
                  <line x1="146" y1="104" x2="162" y2="119"/>
                  <line x1="146" y1="104" x2="119" y2="121"/>
                  <line x1="119" y1="121" x2="90" y2="112"/>
                  <line x1="90" y1="112" x2="66" y2="104"/>
                </g>
                <g fill="currentColor">
                  <circle cx="152" cy="30" r="3"/>
                  <circle cx="132" cy="18" r="10"/>
                  <circle cx="104" cy="13" r="6"/>
                  <circle cx="78" cy="30" r="9"/>
                  <circle cx="74" cy="58" r="7"/>
                  <circle cx="128" cy="47" r="3"/>
                  <circle cx="95" cy="86" r="3"/>
                  <circle cx="150" cy="73" r="7"/>
                  <circle cx="146" cy="104" r="10"/>
                  <circle cx="163" cy="99" r="3"/>
                  <circle cx="162" cy="119" r="3"/>
                  <circle cx="119" cy="121" r="6"/>
                  <circle cx="90" cy="112" r="10"/>
                  <circle cx="66" cy="104" r="3"/>
                </g>
                <circle cx="108" cy="66" r="11" fill="none" stroke="currentColor" strokeWidth="7"/>
              </svg>
            </div>
            <div>
              <span className="text-[11px] font-black text-white tracking-[0.3em] uppercase block">
                SENTRAA AI // SHARE
              </span>
              <span className="text-[8px] font-black tracking-wider text-[var(--text-muted)] uppercase block mt-0.5">
                TRUST PORTAL FOR {data.organization.name}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
              <Eye className="h-3.5 w-3.5" />
              <span>{data.viewCount} views</span>
            </div>
            {data.expiresAt && (
              <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span>Expires: {new Date(data.expiresAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <div className="mb-8 border-b border-[var(--border-default)] pb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-[var(--soft-indigo)] text-[var(--text-primary)] border border-[var(--border-default)] mb-3">
            SECURE SHARED GATEWAY
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">
            {data.resourceType === 'report' && 'Executive Governance Overview'}
            {data.resourceType === 'compliance' && 'Compliance Proof Audit'}
            {data.resourceType === 'risk' && 'Quantitative Risk Score Portfolio'}
            {data.resourceType === 'audit' && 'System Audit Log Ledger'}
          </h1>
          <p className="text-gray-400 text-xs mt-1 uppercase tracking-wider font-bold">
            Public read-only snapshot generated on {new Date(data.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Dynamic Resource Renderer */}
        {data.resourceType === 'report' && <ReportView data={data.data} />}
        {data.resourceType === 'compliance' && <ComplianceView data={data.data} />}
        {data.resourceType === 'risk' && <RiskView data={data.data} />}
        {data.resourceType === 'audit' && <AuditView data={data.data} />}
      </main>

      {/* Branding Footer */}
      <footer className="border-t border-[var(--border-default)] bg-[var(--bg-card)]/20 py-8 text-center text-gray-500">
        <p className="text-[10px] font-bold uppercase tracking-widest">
          Secured by Sentraa AI Governance Engine
        </p>
        <p className="text-[8px] font-medium tracking-wider text-[var(--text-muted)] uppercase mt-2">
          This portal uses cryptographically secure tokens. Anyone with the URL can view this dashboard.
        </p>
      </footer>
    </div>
  );
}

/* ============================================================================
 * RENDERER COMPONENTS FOR RESOURCE TYPES
 * ============================================================================ */

function ReportView({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card-base p-5 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider block">Total AI Systems</span>
            <span className="text-2xl font-black text-white mt-1 block">{data.totalSystems}</span>
          </div>
          <div className="rounded-xl bg-indigo-500/10 p-3">
            <Cpu className="h-6 w-6 text-indigo-400" />
          </div>
        </div>

        <div className="card-base p-5 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider block">Active Controls MET</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">
              {data.activeControls} <span className="text-xs text-gray-500 font-normal">/ {data.totalControls}</span>
            </span>
          </div>
          <div className="rounded-xl bg-emerald-500/10 p-3">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
          </div>
        </div>

        <div className="card-base p-5 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider block">Obligations MET</span>
            <span className="text-2xl font-black text-indigo-400 mt-1 block">
              {data.obligationsByStatus?.MET || 0} <span className="text-xs text-gray-500 font-normal">/ {data.totalObligations}</span>
            </span>
          </div>
          <div className="rounded-xl bg-indigo-500/10 p-3">
            <ClipboardCheck className="h-6 w-6 text-indigo-400" />
          </div>
        </div>

        <div className="card-base p-5 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider block">External Vendor Tools</span>
            <span className="text-2xl font-black text-purple-400 mt-1 block">{data.totalVendors}</span>
          </div>
          <div className="rounded-xl bg-purple-500/10 p-3">
            <Building2 className="h-6 w-6 text-purple-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-base p-6 space-y-4">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-indigo-400" />
            AI Risk Distribution
          </h3>
          <div className="flex flex-col gap-3 mt-1">
            <div className="flex items-center justify-between p-3 rounded-xl border border-red-500/20 bg-red-500/5">
              <span className="font-bold text-red-400 text-xs">CRITICAL TIER</span>
              <span className="font-black text-red-300 text-sm">{data.systemsByTier?.CRITICAL || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl border border-orange-500/20 bg-orange-500/5">
              <span className="font-bold text-orange-400 text-xs">HIGH TIER</span>
              <span className="font-black text-orange-300 text-sm">{data.systemsByTier?.HIGH || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
              <span className="font-bold text-yellow-400 text-xs">MEDIUM TIER</span>
              <span className="font-black text-yellow-300 text-sm">{data.systemsByTier?.MEDIUM || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <span className="font-bold text-emerald-400 text-xs">LOW TIER</span>
              <span className="font-black text-emerald-300 text-sm">{data.systemsByTier?.LOW || 0}</span>
            </div>
          </div>
        </div>

        <div className="card-base p-6 space-y-4">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Award className="h-4 w-4 text-indigo-400" />
            Compliance Performance
          </h3>
          <div className="flex flex-col gap-3 mt-1 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-[var(--border-default)]">
              <span className="text-gray-400">Total MET (Compliant)</span>
              <span className="font-bold text-emerald-400">{data.obligationsByStatus?.MET || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-[var(--border-default)]">
              <span className="text-gray-400">In Progress (Active)</span>
              <span className="font-bold text-indigo-400">{data.obligationsByStatus?.IN_PROGRESS || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-[var(--border-default)]">
              <span className="text-gray-400">Pending Review</span>
              <span className="font-bold text-yellow-400">{data.obligationsByStatus?.PENDING || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-[var(--border-default)]">
              <span className="text-gray-400">Not Applicable (Exempt)</span>
              <span className="font-bold text-gray-500">{data.obligationsByStatus?.NOT_APPLICABLE || 0}</span>
            </div>
          </div>
        </div>

        <div className="card-base p-6 space-y-4">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-400" />
            Vendor Review Statuses
          </h3>
          <div className="flex flex-col gap-3 mt-1 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-[var(--border-default)]">
              <span className="text-gray-400">Approved SaaS Tools</span>
              <span className="font-bold text-emerald-400">{data.vendorsByStatus?.APPROVED || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-[var(--border-default)]">
              <span className="text-gray-400">Pending Safety Audits</span>
              <span className="font-bold text-yellow-400">{data.vendorsByStatus?.PENDING || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-[var(--border-default)]">
              <span className="text-gray-400">Flagged / Restricted Integrations</span>
              <span className="font-bold text-red-400">{data.vendorsByStatus?.FLAGGED || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-[var(--border-default)]">
              <span className="text-gray-400">Dynamic Drift Alerts Logged</span>
              <span className="font-bold text-red-400/90 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                {data.driftAlertsCount || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComplianceView({ data }: { data: ComplianceFeature[] }) {
  if (!data) return null;
  return (
    <div className="space-y-6 animate-fade-in">
      {data.map((feature, idx) => (
        <div key={feature.id || idx} className="card-base p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight">{feature.feature_name}</h3>
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">{feature.description}</p>
            </div>
            <span className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight",
              feature.status === 'compliant' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
              feature.status === 'warning' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
              "bg-red-500/10 text-red-400 border border-red-500/20"
            )}>
              {feature.status}
            </span>
          </div>

          <div className="space-y-3">
            <h4 className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Verified Evidence Logs</h4>
            <div className="grid grid-cols-1 gap-3">
              {feature.evidence?.map((item: any, eIdx: number) => (
                <div key={eIdx} className="bg-white/5 p-4 rounded-xl border border-[var(--border-default)] flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-mono text-[var(--text-secondary)]">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] block">
                      Type: {item.type}
                    </span>
                    <pre className="text-[10px] text-left text-white leading-relaxed font-sans max-w-2xl whitespace-pre-wrap font-mono">
                      {JSON.stringify(item.content, null, 2)}
                    </pre>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 self-start md:self-center uppercase tracking-wider">
                    <ShieldCheck className="h-3 w-3" />
                    Verified
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RiskView({ data }: { data: RiskPortfolioResponse }) {
  if (!data) return null;
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card-base p-5 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider block">Average Risk Score</span>
            <span className="text-2xl font-black text-white mt-1 block">{data.averageScore}</span>
          </div>
          <div className="rounded-xl bg-indigo-500/10 p-3">
            <Cpu className="h-6 w-6 text-indigo-400" />
          </div>
        </div>

        <div className="card-base p-5 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider block">High Risk Agents</span>
            <span className="text-2xl font-black text-red-400 mt-1 block">{data.highRiskCount}</span>
          </div>
          <div className="rounded-xl bg-red-500/10 p-3">
            <ShieldAlert className="h-6 w-6 text-red-400" />
          </div>
        </div>

        <div className="card-base p-5 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider block">Medium Risk Agents</span>
            <span className="text-2xl font-black text-amber-400 mt-1 block">{data.mediumRiskCount}</span>
          </div>
          <div className="rounded-xl bg-amber-500/10 p-3">
            <AlertTriangle className="h-6 w-6 text-amber-400" />
          </div>
        </div>

        <div className="card-base p-5 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider block">Low Risk Agents</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">{data.lowRiskCount}</span>
          </div>
          <div className="rounded-xl bg-emerald-500/10 p-3">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
          </div>
        </div>
      </div>

      <div className="card-base p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
          <h3 className="text-sm font-black text-white uppercase tracking-tight">Active AI Agent Risk Matrix</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 border-b border-[var(--border-default)] font-mono text-[var(--text-secondary)] uppercase">
              <tr>
                <th className="px-6 py-3">Agent / System</th>
                <th className="px-6 py-3">Composite Risk</th>
                <th className="px-6 py-3">Likelihood Score</th>
                <th className="px-6 py-3">Impact Score</th>
                <th className="px-6 py-3">Last Assessed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {data.scoresByAgent?.map((agent) => (
                <tr key={agent.agentId} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-bold text-white">{agent.agentName}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight",
                      agent.compositeScore <= 33 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      agent.compositeScore <= 66 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      "bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.1)]"
                    )}>
                      {agent.compositeScore} - {agent.compositeScore <= 33 ? 'Low' : agent.compositeScore <= 66 ? 'Medium' : 'High'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold">{agent.likelihood} / 100</td>
                  <td className="px-6 py-4 font-bold">{agent.impact} / 100</td>
                  <td className="px-6 py-4 text-[var(--text-muted)] font-mono">{new Date(agent.lastUpdated).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AuditView({ data }: { data: AuditLog[] }) {
  if (!data) return null;
  return (
    <div className="card-base p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
        <h3 className="text-sm font-black text-white uppercase tracking-tight">Enterprise Compliance Logs</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/5 border-b border-[var(--border-default)] font-mono text-[var(--text-secondary)] uppercase">
            <tr>
              <th className="px-6 py-3">Action Type</th>
              <th className="px-6 py-3">Resource Feature</th>
              <th className="px-6 py-3">Actor Email</th>
              <th className="px-6 py-3">Audit Details</th>
              <th className="px-6 py-3">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {data.map((log) => (
              <tr key={log.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-mono font-bold text-white uppercase text-[10px] tracking-wide">
                  {log.action}
                </td>
                <td className="px-6 py-4 text-indigo-400 font-bold">{log.feature_id || 'Global Scope'}</td>
                <td className="px-6 py-4 font-bold">{(log as any).user?.email || 'System / Auto'}</td>
                <td className="px-6 py-4 font-mono text-[10px] text-[var(--text-secondary)] whitespace-pre-wrap max-w-sm">
                  {JSON.stringify(log.metadata)}
                </td>
                <td className="px-6 py-4 text-[var(--text-muted)] font-mono">{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
