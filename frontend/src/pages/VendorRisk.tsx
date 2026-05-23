import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { 
  Building2, Plus, X, Search, CheckCircle2, ShieldAlert, 
  AlertCircle, ShieldCheck, User, Sparkles, Server, Info, ShieldX
} from 'lucide-react';

interface VendorTool {
  id: string;
  vendor_name: string;
  tool_name: string;
  tool_category: string;
  data_shared: Record<string, any>;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  review_status: 'PENDING' | 'APPROVED' | 'FLAGGED';
  reviewer_id: string | null;
  last_reviewed_at: string | null;
  created_at: string;
}

export default function VendorRisk() {
  const [vendors, setVendors] = useState<VendorTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userRole, setUserRole] = useState('VIEWER');
  
  // Registration State
  const [isOpen, setIsOpen] = useState(false);
  const [newVendor, setNewVendor] = useState({
    vendor_name: '',
    tool_name: '',
    tool_category: 'LLM',
    risk_level: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  });
  
  // Shared data checklist
  const [piiShared, setPiiShared] = useState(false);
  const [financialsShared, setFinancialsShared] = useState(false);
  const [codeShared, setCodeShared] = useState(false);
  const [logsShared, setLogsShared] = useState(false);

  useEffect(() => {
    loadVendors();
    loadCurrentUser();
  }, []);

  const loadVendors = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ items: VendorTool[] }>('/governance/vendor-ai-tools');
      setVendors(res.items || []);
    } catch (err) {
      console.error('Failed to load vendor AI tools:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const res = await apiRequest<{ user: { role: string } }>('/user/me');
      setUserRole(res.user?.role || 'VIEWER');
    } catch { /* fallback to viewer */ }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const dataShared = {
      customer_pii: piiShared,
      financial_records: financialsShared,
      source_code: codeShared,
      server_logs: logsShared
    };

    try {
      const res = await apiRequest<VendorTool>('/governance/vendor-ai-tools', {
        method: 'POST',
        body: JSON.stringify({
          ...newVendor,
          data_shared: dataShared
        })
      });
      setVendors([res, ...vendors]);
      setIsOpen(false);
      setNewVendor({ vendor_name: '', tool_name: '', tool_category: 'LLM', risk_level: 'MEDIUM' });
      setPiiShared(false);
      setFinancialsShared(false);
      setCodeShared(false);
      setLogsShared(false);
    } catch (err) {
      console.error('Failed to register vendor tool:', err);
    }
  };

  const handleReview = async (id: string, status: 'APPROVED' | 'FLAGGED') => {
    try {
      const updated = await apiRequest<VendorTool>(`/governance/vendor-ai-tools/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      setVendors(vendors.map(v => v.id === id ? updated : v));
    } catch (err) {
      console.error('Failed to submit vendor review:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <ShieldCheck className="h-5 w-5 text-emerald-400" />;
      case 'FLAGGED': return <ShieldX className="h-5 w-5 text-red-400" />;
      default: return <AlertCircle className="h-5 w-5 text-yellow-400 animate-pulse" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'FLAGGED': return 'bg-red-500/10 text-red-400 border border-red-500/20';
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
    v.tool_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.tool_category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in text-gray-200">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
            <Building2 className="h-8 w-8 text-indigo-400" />
            THIRD-PARTY VENDOR AI RISK
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Conduct risk assessments on external foundation models and third-party SaaS integrations.
          </p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Add Vendor Tool
        </button>
      </div>

      {/* Operations Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
        <input
          type="text"
          placeholder="Search by vendor, tool name, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#111827]/60 border border-gray-800 rounded-xl py-3 pl-11 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
        />
      </div>

      {/* Vendor Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="text-center py-20 text-gray-500 text-xs">
          No external vendor AI tools registered yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {filteredVendors.map((v) => (
            <div
              key={v.id}
              className="bg-[#111827]/40 border border-gray-800/80 rounded-2xl p-6 flex flex-col gap-4 hover:border-gray-700 transition-all relative overflow-hidden group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-gray-800/80 p-3 group-hover:bg-indigo-500/10 transition-all">
                    <Server className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base leading-tight group-hover:text-indigo-300 transition-all">
                      {v.tool_name}
                      <span className="text-[10px] text-gray-500 font-normal ml-2">by {v.vendor_name}</span>
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="text-[9px] px-2 py-0.5 rounded-full border border-gray-800 text-gray-500 font-bold font-mono">
                        {v.tool_category}
                      </span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${getRiskColor(v.risk_level)}`}>
                        {v.risk_level} RISK
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${getStatusBadge(v.review_status)}`}>
                    {getStatusIcon(v.review_status)}
                    <span className="text-[9px] font-black uppercase tracking-wider">{v.review_status}</span>
                  </div>
                </div>
              </div>

              {/* Data Shared list */}
              <div className="bg-[#0b0f19]/30 border border-gray-800/60 p-4 rounded-xl flex flex-col gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400/80">Corporate Data Egress Checklist</span>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${v.data_shared.customer_pii ? 'bg-red-400' : 'bg-gray-800'}`} />
                    <span>Customer PII / Profile details</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${v.data_shared.financial_records ? 'bg-red-400' : 'bg-gray-800'}`} />
                    <span>Financial or transactional data</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${v.data_shared.source_code ? 'bg-red-400' : 'bg-gray-800'}`} />
                    <span>Source code / proprietary IP</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${v.data_shared.server_logs ? 'bg-red-400' : 'bg-gray-800'}`} />
                    <span>Server logs / operational metadata</span>
                  </div>
                </div>
              </div>

              {/* Review workflow - Admin only */}
              {userRole === 'ADMIN' && v.review_status === 'PENDING' && (
                <div className="border-t border-gray-800/80 pt-4 mt-2 flex items-center justify-end gap-2.5">
                  <button
                    onClick={() => handleReview(v.id, 'FLAGGED')}
                    className="flex items-center gap-1.5 rounded-xl border border-red-500/30 px-4 py-2 text-[10px] font-black uppercase text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    Flag / Restrict
                  </button>
                  <button
                    onClick={() => handleReview(v.id, 'APPROVED')}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-[10px] font-black uppercase text-white shadow hover:from-indigo-500 hover:to-purple-500 transition-all"
                  >
                    Approve Tool
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Vendor Tool Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-gray-800 p-5 bg-[#0f172a]/60">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-400" />
                Register External AI Vendor
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 hover:bg-gray-800 text-gray-500 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-400 font-semibold">Vendor / Partner Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. OpenAI"
                    value={newVendor.vendor_name}
                    onChange={(e) => setNewVendor({ ...newVendor, vendor_name: e.target.value })}
                    className="bg-black/30 border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-400 font-semibold">Model / Integration Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Claude 3.5 Sonnet API"
                    value={newVendor.tool_name}
                    onChange={(e) => setNewVendor({ ...newVendor, tool_name: e.target.value })}
                    className="bg-black/30 border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-400 font-semibold">Tool Category *</label>
                  <select
                    value={newVendor.tool_category}
                    onChange={(e) => setNewVendor({ ...newVendor, tool_category: e.target.value })}
                    className="bg-black/30 border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  >
                    <option value="LLM">LLM (Language Model)</option>
                    <option value="AGENT">Autonomous Agent</option>
                    <option value="EMBEDDING">Vector Embedding API</option>
                    <option value="OTHER">Other Integration</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-400 font-semibold">Risk Classification *</label>
                  <select
                    value={newVendor.risk_level}
                    onChange={(e) => setNewVendor({ ...newVendor, risk_level: e.target.value as any })}
                    className="bg-black/30 border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  >
                    <option value="LOW">LOW RISK</option>
                    <option value="MEDIUM">MEDIUM RISK</option>
                    <option value="HIGH">HIGH RISK</option>
                    <option value="CRITICAL">CRITICAL RISK</option>
                  </select>
                </div>

                {/* Checklist */}
                <div className="flex flex-col gap-2 col-span-2 border-t border-gray-800/80 pt-4 mt-2">
                  <label className="text-gray-400 font-semibold flex items-center gap-1">
                    <Info className="h-4 w-4 text-indigo-400" />
                    Data Sharing & Egress Mapping
                  </label>
                  <p className="text-[10px] text-gray-500">Check all types of enterprise data sent to or processed by this external model.</p>
                  
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <label className="flex items-center gap-2.5 cursor-pointer bg-black/20 border border-gray-800 p-3 rounded-xl hover:border-gray-700 select-none">
                      <input
                        type="checkbox"
                        checked={piiShared}
                        onChange={(e) => setPiiShared(e.target.checked)}
                        className="rounded border-gray-800 text-indigo-600 bg-black/40 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span>Customer PII Data</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer bg-black/20 border border-gray-800 p-3 rounded-xl hover:border-gray-700 select-none">
                      <input
                        type="checkbox"
                        checked={financialsShared}
                        onChange={(e) => setFinancialsShared(e.target.checked)}
                        className="rounded border-gray-800 text-indigo-600 bg-black/40 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span>Financial Records</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer bg-black/20 border border-gray-800 p-3 rounded-xl hover:border-gray-700 select-none">
                      <input
                        type="checkbox"
                        checked={codeShared}
                        onChange={(e) => setCodeShared(e.target.checked)}
                        className="rounded border-gray-800 text-indigo-600 bg-black/40 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span>Source Code / IP</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer bg-black/20 border border-gray-800 p-3 rounded-xl hover:border-gray-700 select-none">
                      <input
                        type="checkbox"
                        checked={logsShared}
                        onChange={(e) => setLogsShared(e.target.checked)}
                        className="rounded border-gray-800 text-indigo-600 bg-black/40 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span>Server Logs</span>
                    </label>
                  </div>
                </div>

              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-800 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl border border-gray-800 px-5 py-2.5 text-sm font-semibold text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all"
                >
                  Submit for Risk Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
