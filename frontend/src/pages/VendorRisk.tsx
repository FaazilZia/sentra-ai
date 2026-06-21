import { NodePulseLoader } from '@/components/ui/NodePulseLoader';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { 
  Building2, Plus, X, Search, 
  AlertCircle, ShieldCheck, User, Server, Info, ShieldX,
  TrendingUp, Trash2, Award, FileText
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

interface VendorRiskAssessment {
  id: string;
  vendor_name: string;
  vendor_type: 'AI_MODEL' | 'DATA_PROVIDER' | 'INFRASTRUCTURE' | 'INTEGRATION';
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  data_access: string[];
  compliance_frameworks: string[];
  assessment_notes: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVIEWED';
  reviewed_by: string | null;
  created_at: string;
}

export default function VendorRisk() {
  const [vendors, setVendors] = useState<VendorRiskAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userRole, setUserRole] = useState('VIEWER');
  const [riskSummary, setRiskSummary] = useState<Record<string, number>>({
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0
  });
  
  // Registration State
  const [isOpen, setIsOpen] = useState(false);
  const [newVendor, setNewVendor] = useState({
    vendor_name: '',
    vendor_type: 'AI_MODEL' as 'AI_MODEL' | 'DATA_PROVIDER' | 'INFRASTRUCTURE' | 'INTEGRATION',
    risk_score: 50,
    risk_level: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    assessment_notes: '',
  });

  // Shared data checklist
  const [piiShared, setPiiShared] = useState(false);
  const [financialsShared, setFinancialsShared] = useState(false);
  const [codeShared, setCodeShared] = useState(false);
  const [logsShared, setLogsShared] = useState(false);

  // Frameworks checklist
  const [iso42001, setIso42001] = useState(false);
  const [iso27001, setIso27001] = useState(false);
  const [soc2, setSoc2] = useState(false);

  useEffect(() => {
    loadVendors();
    loadCurrentUser();
  }, []);

  const loadVendors = async () => {
    setLoading(true);
    try {
      const [listRes, summaryRes] = await Promise.all([
        apiRequest<VendorRiskAssessment[]>('/vendors'),
        apiRequest<Record<string, number>>('/vendors/summary')
      ]);
      setVendors(listRes || []);
      if (summaryRes) {
        setRiskSummary(summaryRes);
      }
    } catch (err) {
      console.error('Failed to load vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const res = await apiRequest<{ user: { role: string } }>('/user/me');
      setUserRole(res.user?.role || 'VIEWER');
    } catch { /* fallback */ }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const dataAccess: string[] = [];
    if (piiShared) dataAccess.push('Customer PII');
    if (financialsShared) dataAccess.push('Financial Records');
    if (codeShared) dataAccess.push('Source Code');
    if (logsShared) dataAccess.push('Server Logs');

    const frameworks: string[] = [];
    if (iso42001) frameworks.push('ISO 42001');
    if (iso27001) frameworks.push('ISO 27001');
    if (soc2) frameworks.push('SOC 2 Type II');

    // Auto calculate risk level based on score
    let calculatedLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (newVendor.risk_score >= 80) calculatedLevel = 'CRITICAL';
    else if (newVendor.risk_score >= 60) calculatedLevel = 'HIGH';
    else if (newVendor.risk_score >= 35) calculatedLevel = 'MEDIUM';

    try {
      const res = await apiRequest<VendorRiskAssessment>('/vendors', {
        method: 'POST',
        body: JSON.stringify({
          ...newVendor,
          risk_level: calculatedLevel,
          data_access: dataAccess,
          compliance_frameworks: frameworks
        })
      });
      setVendors([res, ...vendors]);
      
      // Update summary count
      setRiskSummary(prev => ({
        ...prev,
        [calculatedLevel]: (prev[calculatedLevel] || 0) + 1
      }));

      setIsOpen(false);
      setNewVendor({
        vendor_name: '',
        vendor_type: 'AI_MODEL',
        risk_score: 50,
        risk_level: 'MEDIUM',
        assessment_notes: ''
      });
      setPiiShared(false);
      setFinancialsShared(false);
      setCodeShared(false);
      setLogsShared(false);
      setIso42001(false);
      setIso27001(false);
      setSoc2(false);
    } catch (err) {
      console.error('Failed to register vendor:', err);
    }
  };

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const updated = await apiRequest<VendorRiskAssessment>(`/vendors/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ status })
      });
      setVendors(vendors.map(v => v.id === id ? updated : v));
    } catch (err) {
      console.error('Failed to submit vendor review:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vendor assessment?')) return;
    try {
      await apiRequest(`/vendors/${id}`, { method: 'DELETE' });
      const deleted = vendors.find(v => v.id === id);
      if (deleted) {
        setRiskSummary(prev => ({
          ...prev,
          [deleted.risk_level]: Math.max(0, (prev[deleted.risk_level] || 1) - 1)
        }));
      }
      setVendors(vendors.filter(v => v.id !== id));
    } catch (err) {
      console.error('Failed to delete vendor:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <ShieldCheck className="h-5 w-5 text-emerald-400" />;
      case 'REJECTED': return <ShieldX className="h-5 w-5 text-red-400" />;
      default: return <AlertCircle className="h-5 w-5 text-yellow-400 animate-pulse" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'REJECTED': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default: return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
    }
  };

  const getRiskColor = (tier: string) => {
    switch (tier) {
      case 'CRITICAL': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'HIGH': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  const filteredVendors = vendors.filter(v =>
    v.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.vendor_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.assessment_notes.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in  ">
      
      <PageHeader 
        title="Third-Party Vendor AI Risk"
        description="Conduct automated risk auditing, compile egress controls, and manage administrative approvals for external model vendors."
        action={
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all hover:scale-105 active:scale-95 animate-pulse-subtle"
          >
            <Plus className="h-5 w-5" />
            Audit New Vendor
          </button>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { key: 'CRITICAL', label: 'Critical Risk', count: riskSummary.CRITICAL || 0, color: 'border-red-900/60 text-red-400 bg-red-950/10' },
          { key: 'HIGH', label: 'High Risk', count: riskSummary.HIGH || 0, color: 'border-orange-900/60 text-orange-400 bg-orange-950/10' },
          { key: 'MEDIUM', label: 'Medium Risk', count: riskSummary.MEDIUM || 0, color: 'border-yellow-900/60 text-yellow-400 bg-yellow-950/10' },
          { key: 'LOW', label: 'Low Risk', count: riskSummary.LOW || 0, color: 'border-emerald-900/60 text-emerald-400 bg-emerald-950/10' }
        ].map(card => (
          <div key={card.key} className={`border rounded-2xl p-4 flex flex-col justify-between backdrop-blur-md ${card.color}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">{card.label}</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-semibold">{card.count}</span>
              <Building2 className="h-4 w-4 opacity-30" />
            </div>
          </div>
        ))}
      </div>

      {/* Operations Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search by vendor name, category, or notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl py-3 pl-11 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
        />
      </div>

      {/* Vendor Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <NodePulseLoader label="Syncing vendor risk registers..." />
        </div>
      ) : filteredVendors.length === 0 ? (
        <EmptyState 
          icon={Building2}
          title="No Vendor Tools Registered"
          description="Conduct risk assessments on external foundation models and third-party SaaS integrations."
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {filteredVendors.map((v) => (
            <div
              key={v.id}
              className="bg-[var(--bg-page)] border border-[var(--border-default)]/80 rounded-2xl p-6 flex flex-col gap-4 hover:border-indigo-500/20 hover:shadow-indigo-500/2 transition-all relative overflow-hidden group shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-gray-800/80 p-3 group-hover:bg-indigo-500/10 transition-all shadow-md">
                    <Server className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base leading-tight group-hover:text-indigo-300 transition-all flex items-center gap-2">
                      {v.vendor_name}
                      <span className="text-[10px] bg-indigo-950/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-900/30 uppercase font-bold tracking-wider font-mono">
                        {v.vendor_type}
                      </span>
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="text-[9px] px-2 py-0.5 rounded-full border border-[var(--border-default)] bg-black/40 text-[var(--text-secondary)] font-bold font-mono">
                        Risk Score: {v.risk_score}/100
                      </span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${getRiskColor(v.risk_level)}`}>
                        {v.risk_level} RISK
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${getStatusBadge(v.status)}`}>
                    {getStatusIcon(v.status)}
                    <span className="text-[9px] font-semibold uppercase tracking-wider">{v.status}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="rounded-xl border border-[var(--border-default)] p-2 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/5 hover:border-red-500/20 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Data Shared list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="bg-[var(--bg-card)] border border-[var(--border-default)]/60 p-4 rounded-xl flex flex-col gap-2">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-indigo-400/80 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Data Egress Map
                  </span>
                  <div className="flex flex-col gap-1.5 mt-1 text-[10px] text-[var(--text-secondary)]">
                    {v.data_access.length > 0 ? (
                      v.data_access.map(d => (
                        <div key={d} className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-md shadow-red-400/20" />
                          <span>{d}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[var(--text-muted)] italic">No sensitive data egress configured.</span>
                    )}
                  </div>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-default)]/60 p-4 rounded-xl flex flex-col gap-2">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-purple-400/80 flex items-center gap-1">
                    <Award className="h-3 w-3" /> Certifications Verified
                  </span>
                  <div className="flex flex-col gap-1.5 mt-1 text-[10px] text-[var(--text-secondary)]">
                    {v.compliance_frameworks.length > 0 ? (
                      v.compliance_frameworks.map(f => (
                        <div key={f} className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/20" />
                          <span>{f}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[var(--text-muted)] italic">No framework verified.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Assessment Notes */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-4 rounded-xl flex flex-col gap-1.5 text-[11px] leading-relaxed">
                <span className="text-[9px] font-semibold uppercase text-[var(--text-muted)] flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Auditor Assessment Notes
                </span>
                <p className="text-[var(--text-secondary)]">{v.assessment_notes || 'No assessment notes recorded.'}</p>
              </div>

              {/* Review workflow - Admin only */}
              {userRole === 'ADMIN' && v.status === 'PENDING' && (
                <div className="border-t border-[var(--border-default)] pt-4 mt-1 flex items-center justify-between">
                  <span className="text-[10px] text-[var(--text-muted)] italic">Waiting for Admin compliance review...</span>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => handleReview(v.id, 'REJECTED')}
                      className="flex items-center gap-1.5 rounded-xl border border-red-500/30 px-4 py-2 text-[10px] font-semibold uppercase text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      Reject / Flag
                    </button>
                    <button
                      onClick={() => handleReview(v.id, 'APPROVED')}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-[10px] font-semibold uppercase text-white shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all"
                    >
                      Approve Compliance
                    </button>
                  </div>
                </div>
              )}

              {v.reviewed_by && (
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] border-t border-[var(--border-default)]/50 pt-3 mt-1">
                  <User className="h-3.5 w-3.5" />
                  <span>Audited by <span className="text-[var(--text-secondary)] font-bold">{v.reviewed_by}</span></span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Vendor Tool Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] p-5 bg-[#0f172a]/60">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-400 animate-pulse" />
                Audit External Vendor Compliance
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 flex flex-col gap-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                
                <div className="flex flex-col gap-1.5 col-span-2 md:col-span-1">
                  <label htmlFor="v-vendor-name" className="text-[var(--text-secondary)] font-semibold">Vendor / Partner Name *</label>
                  <input
                    id="v-vendor-name"
                    type="text"
                    required
                    placeholder="e.g. Anthropic"
                    value={newVendor.vendor_name}
                    onChange={(e) => setNewVendor({ ...newVendor, vendor_name: e.target.value })}
                    className="bg-black/30 border border-[var(--border-default)] rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1.5 col-span-2 md:col-span-1">
                  <label htmlFor="v-type" className="text-[var(--text-secondary)] font-semibold">Vendor Type *</label>
                  <select
                    id="v-type"
                    value={newVendor.vendor_type}
                    onChange={(e) => setNewVendor({ ...newVendor, vendor_type: e.target.value as any })}
                    className="bg-black/30 border border-[var(--border-default)] rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  >
                    <option value="AI_MODEL">Foundation AI Model</option>
                    <option value="DATA_PROVIDER">Data Broker / Provider</option>
                    <option value="INFRASTRUCTURE">Cloud Infrastructure</option>
                    <option value="INTEGRATION">SaaS / API Integration</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 col-span-2 md:col-span-1">
                  <label htmlFor="v-score" className="text-[var(--text-secondary)] font-semibold">Calculated Risk Score (0-100) *</label>
                  <input
                    id="v-score"
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={newVendor.risk_score}
                    onChange={(e) => setNewVendor({ ...newVendor, risk_score: parseInt(e.target.value) || 0 })}
                    className="bg-black/30 border border-[var(--border-default)] rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 text-xs font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5 col-span-2 md:col-span-1">
                  <span className="text-[var(--text-secondary)] font-semibold">Risk Class Preview</span>
                  <div className="h-9 flex items-center pl-3 border border-[var(--border-default)] rounded-xl bg-black/20 text-[var(--text-muted)] font-bold">
                    {newVendor.risk_score >= 80 ? (
                      <span className="text-red-400">CRITICAL RISK</span>
                    ) : newVendor.risk_score >= 60 ? (
                      <span className="text-orange-400">HIGH RISK</span>
                    ) : newVendor.risk_score >= 35 ? (
                      <span className="text-yellow-400">MEDIUM RISK</span>
                    ) : (
                      <span className="text-emerald-400">LOW RISK</span>
                    )}
                  </div>
                </div>

                {/* Checklist Egress */}
                <div className="flex flex-col gap-2 col-span-2 border-t border-[var(--border-default)]/80 pt-4 mt-2">
                  <span className="text-[var(--text-secondary)] font-semibold flex items-center gap-1">
                    <Info className="h-4 w-4 text-indigo-400" />
                    Data Sharing & Egress Mapping
                  </span>
                  <p className="text-[10px] text-[var(--text-muted)]">Check all types of enterprise data sent to or processed by this external model.</p>
                  
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <label htmlFor="chk-pii" className="flex items-center gap-2.5 cursor-pointer bg-black/20 border border-[var(--border-default)] p-3 rounded-xl hover:border-[var(--border-default)] select-none">
                      <input
                        id="chk-pii"
                        type="checkbox"
                        checked={piiShared}
                        onChange={(e) => setPiiShared(e.target.checked)}
                        className="rounded border-[var(--border-default)] text-indigo-600 bg-black/40 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span>Customer PII Data</span>
                    </label>

                    <label htmlFor="chk-financials" className="flex items-center gap-2.5 cursor-pointer bg-black/20 border border-[var(--border-default)] p-3 rounded-xl hover:border-[var(--border-default)] select-none">
                      <input
                        id="chk-financials"
                        type="checkbox"
                        checked={financialsShared}
                        onChange={(e) => setFinancialsShared(e.target.checked)}
                        className="rounded border-[var(--border-default)] text-indigo-600 bg-black/40 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span>Financial Records</span>
                    </label>

                    <label htmlFor="chk-code" className="flex items-center gap-2.5 cursor-pointer bg-black/20 border border-[var(--border-default)] p-3 rounded-xl hover:border-[var(--border-default)] select-none">
                      <input
                        id="chk-code"
                        type="checkbox"
                        checked={codeShared}
                        onChange={(e) => setCodeShared(e.target.checked)}
                        className="rounded border-[var(--border-default)] text-indigo-600 bg-black/40 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span>Source Code / IP</span>
                    </label>

                    <label htmlFor="chk-logs" className="flex items-center gap-2.5 cursor-pointer bg-black/20 border border-[var(--border-default)] p-3 rounded-xl hover:border-[var(--border-default)] select-none">
                      <input
                        id="chk-logs"
                        type="checkbox"
                        checked={logsShared}
                        onChange={(e) => setLogsShared(e.target.checked)}
                        className="rounded border-[var(--border-default)] text-indigo-600 bg-black/40 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span>Server Logs</span>
                    </label>
                  </div>
                </div>

                {/* Framework verification */}
                <div className="flex flex-col gap-2 col-span-2 border-t border-[var(--border-default)]/80 pt-4 mt-2">
                  <span className="text-[var(--text-secondary)] font-semibold flex items-center gap-1">
                    <Award className="h-4 w-4 text-purple-400" />
                    Security Frameworks Verified
                  </span>
                  
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    <label htmlFor="chk-iso4" className="flex items-center gap-2 cursor-pointer bg-black/20 border border-[var(--border-default)] p-2.5 rounded-xl hover:border-[var(--border-default)] select-none">
                      <input
                        id="chk-iso4"
                        type="checkbox"
                        checked={iso42001}
                        onChange={(e) => setIso42001(e.target.checked)}
                        className="rounded border-[var(--border-default)] text-purple-600 bg-black/40 focus:ring-purple-500 h-3.5 w-3.5"
                      />
                      <span className="text-[10px]">ISO 42001</span>
                    </label>

                    <label htmlFor="chk-iso2" className="flex items-center gap-2 cursor-pointer bg-black/20 border border-[var(--border-default)] p-2.5 rounded-xl hover:border-[var(--border-default)] select-none">
                      <input
                        id="chk-iso2"
                        type="checkbox"
                        checked={iso27001}
                        onChange={(e) => setIso27001(e.target.checked)}
                        className="rounded border-[var(--border-default)] text-purple-600 bg-black/40 focus:ring-purple-500 h-3.5 w-3.5"
                      />
                      <span className="text-[10px]">ISO 27001</span>
                    </label>

                    <label htmlFor="chk-soc2" className="flex items-center gap-2 cursor-pointer bg-black/20 border border-[var(--border-default)] p-2.5 rounded-xl hover:border-[var(--border-default)] select-none">
                      <input
                        id="chk-soc2"
                        type="checkbox"
                        checked={soc2}
                        onChange={(e) => setSoc2(e.target.checked)}
                        className="rounded border-[var(--border-default)] text-purple-600 bg-black/40 focus:ring-purple-500 h-3.5 w-3.5"
                      />
                      <span className="text-[10px]">SOC 2 II</span>
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 col-span-2 border-t border-[var(--border-default)]/80 pt-4 mt-2">
                  <label htmlFor="v-notes" className="text-[var(--text-secondary)] font-semibold">Vendor Security Assessment Notes *</label>
                  <textarea
                    id="v-notes"
                    required
                    placeholder="Enter compliance details, contract parameters, encryption layers, or assessment results..."
                    value={newVendor.assessment_notes}
                    onChange={(e) => setNewVendor({ ...newVendor, assessment_notes: e.target.value })}
                    className="bg-black/30 border border-[var(--border-default)] rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 min-h-[80px]"
                  />
                </div>

              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[var(--border-default)] pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl border border-[var(--border-default)] px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all animate-pulse-subtle"
                >
                  Launch Risk Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
