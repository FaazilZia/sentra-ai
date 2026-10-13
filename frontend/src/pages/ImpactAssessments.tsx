import { NodePulseLoader } from "@/components/ui/NodePulseLoader";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { 
  Plus, X, CheckCircle2, FileText, ShieldAlert, 
  User, Building
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

interface AISystem {
  id: string;
  name: string;
  risk_tier: string;
}

interface ImpactAssessment {
  id: string;
  type: "DPIA" | "AIA";
  status: "DRAFT" | "IN_REVIEW" | "APPROVED" | "REJECTED";
  form_data: {
    description?: string;
    benefits?: string;
    data_protection?: string;
    oversight?: string;
  };
  submitted_by: string | null;
  reviewed_by: string | null;
  approved_at: string | null;
  created_at: string;
  ai_system: AISystem;
}

export default function ImpactAssessments() {
  // DPIA/AIA State
  const [assessments, setAssessments] = useState<ImpactAssessment[]>([]);
  const [systems, setSystems] = useState<AISystem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State DPIA/AIA
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSystemId, setSelectedSystemId] = useState("");
  const [type, setType] = useState<"DPIA" | "AIA">("DPIA");
  const [formData, setFormData] = useState({
    description: "",
    benefits: "",
    data_protection: "",
    oversight: ""
  });
  const [selectedAssessment, setSelectedAssessment] = useState<ImpactAssessment | null>(null);

  useEffect(() => {
    void fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [assData, sysData] = await Promise.all([
        apiRequest<{ data: ImpactAssessment[] }>("/impact-assessments"),
        apiRequest<{ items: AISystem[] }>("/ai-systems")
      ]);
      setAssessments(assData.data || []);
      setSystems(sysData.items || []);
      if (sysData.items && sysData.items.length > 0) {
        setSelectedSystemId(sysData.items[0].id);
      }
    } catch (err) {
      console.error("Failed to load assessments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest("/impact-assessments", {
        method: "POST",
        body: JSON.stringify({
          ai_system_id: selectedSystemId,
          type,
          form_data: formData
        })
      });
      setIsOpen(false);
      setFormData({ description: "", benefits: "", data_protection: "", oversight: "" });
      void fetchInitialData();
    } catch (err) {
      console.error("Failed to create assessment:", err);
    }
  };

  const handleUpdateStatus = async (id: string, status: ImpactAssessment["status"]) => {
    try {
      await apiRequest(`/impact-assessments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      setSelectedAssessment(null);
      void fetchInitialData();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const columns = [
    { title: "Draft", status: "DRAFT", color: "bg-gray-500/10 text-gray-400", border: "border-gray-500/20" },
    { title: "In Review", status: "IN_REVIEW", color: "bg-amber-500/10 text-amber-400", border: "border-amber-500/20" },
    { title: "Approved", status: "APPROVED", color: "bg-emerald-500/10 text-emerald-400", border: "border-emerald-500/20" },
    { title: "Rejected", status: "REJECTED", color: "bg-rose-500/10 text-rose-400", border: "border-rose-500/20" }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Algorithmic & Privacy Impact Assessments"
        description="Manage end-to-end statutory DPIA and algorithmic impact assessment lifecycles"
        action={
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all hover:scale-105 active:scale-95 animate-pulse-subtle"
          >
            <Plus className="h-5 w-5" />
            Launch DPIA/AIA
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-40">
          <NodePulseLoader label="Compiling assessment workspace..." />
        </div>
      ) : (
        /* Kanban Board Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {columns.map((col) => {
            const list = assessments.filter(a => a.status === col.status);
            return (
              <div
                key={col.status}
                className={`rounded-2xl border ${col.border} ${col.color} p-4 flex flex-col gap-4 min-h-[500px]`}
              >
                <div className="flex items-center justify-between border-b border-[var(--border-default)]/80 pb-2">
                  <h3 className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider">{col.title}</h3>
                  <span className="text-[10px] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full border border-[var(--border-default)] text-[var(--text-muted)] font-bold">
                    {list.length}
                  </span>
                </div>

                <div className="flex flex-col gap-3 overflow-y-auto max-h-[60vh] pr-1">
                  {list.map((ass) => (
                    <div
                      key={ass.id}
                      onClick={() => setSelectedAssessment(ass)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedAssessment(ass);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className="bg-[var(--bg-page)] border border-[var(--border-default)]/60 hover:border-indigo-500/40 p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 active:scale-98"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          ass.type === "DPIA" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                        }`}>
                          {ass.type}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">{new Date(ass.created_at).toLocaleDateString()}</span>
                      </div>

                      <h4 className="font-bold text-[var(--text-primary)] text-sm mt-2 line-clamp-1">{ass.ai_system?.name || "Unknown System"}</h4>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-1 line-clamp-2">{ass.form_data.description || "No description entered."}</p>
                      
                      <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-[var(--border-default)]/40 text-[10px] text-[var(--text-muted)]">
                        <User className="h-3 w-3" />
                        <span className="truncate">{ass.submitted_by || "Anonymous"}</span>
                      </div>
                    </div>
                  ))}
                  {list.length === 0 && (
                    <div className="text-center py-10 text-[10px] text-[var(--text-muted)] border border-dashed border-[var(--border-default)]/40 rounded-xl">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assessment Creator Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-2xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] px-6 py-4">
              <h3 className="font-bold text-[var(--text-primary)] text-base">Launch Impact Assessment</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="assessment-target-system" className="text-[var(--text-secondary)] font-semibold">Target AI System *</label>
                  <select
                    id="assessment-target-system"
                    required
                    value={selectedSystemId}
                    onChange={(e) => setSelectedSystemId(e.target.value)}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-2.5 text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                  >
                    {systems.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.risk_tier})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="assessment-type" className="text-[var(--text-secondary)] font-semibold">Assessment Type *</label>
                  <select
                    id="assessment-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as "DPIA" | "AIA")}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-2.5 text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                  >
                    <option value="DPIA">DPIA (Data Protection Impact Assessment)</option>
                    <option value="AIA">AIA (Algorithmic Impact Assessment)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 col-span-2">
                  <label htmlFor="pipeline-description" className="text-[var(--text-secondary)] font-semibold">Pipeline & Model Processing Description *</label>
                  <textarea
                    id="pipeline-description"
                    required
                    placeholder="Describe how agent uses data, inputs, outputs, models, and third parties..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-2.5 text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 min-h-[60px]"
                  />
                </div>

                <div className="flex flex-col gap-1.5 col-span-2">
                  <label htmlFor="pipeline-benefits" className="text-[var(--text-secondary)] font-semibold">Anticipated Usecase Benefits *</label>
                  <textarea
                    id="pipeline-benefits"
                    required
                    placeholder="List expected functional, speed, or performance utility gains..."
                    value={formData.benefits}
                    onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-2.5 text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 min-h-[60px]"
                  />
                </div>

                <div className="flex flex-col gap-1.5 col-span-2">
                  <label htmlFor="pipeline-protection" className="text-[var(--text-secondary)] font-semibold">Data Protection & Privacy Safeguards *</label>
                  <textarea
                    id="pipeline-protection"
                    required
                    placeholder="Detail active masking, filter APIs, retention controls, or PII scrubbers..."
                    value={formData.data_protection}
                    onChange={(e) => setFormData({ ...formData, data_protection: e.target.value })}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-2.5 text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 min-h-[60px]"
                  />
                </div>

                <div className="flex flex-col gap-1.5 col-span-2">
                  <label htmlFor="pipeline-oversight" className="text-[var(--text-secondary)] font-semibold">Human Oversight & Fallback Protocols *</label>
                  <textarea
                    id="pipeline-oversight"
                    required
                    placeholder="Explain audit rules, human queues, veto options, and panic-stop configurations..."
                    value={formData.oversight}
                    onChange={(e) => setFormData({ ...formData, oversight: e.target.value })}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-2.5 text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 min-h-[60px]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[var(--border-default)] pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl border border-[var(--border-default)] px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all"
                >
                  Submit for Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Slide-Over / Modal */}
      {selectedAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-2xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] px-6 py-4 bg-[var(--bg-secondary)]">
              <div className="flex items-center gap-3">
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${
                  selectedAssessment.type === "DPIA" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                }`}>
                  {selectedAssessment.type}
                </span>
                <h3 className="font-bold text-[var(--text-primary)] text-base">{selectedAssessment.ai_system?.name}</h3>
              </div>
              <button
                onClick={() => setSelectedAssessment(null)}
                className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 text-xs max-h-[75vh] overflow-y-auto">
              <div>
                <h4 className="font-bold text-[var(--text-primary)] mb-1 flex items-center gap-1.5"><FileText className="h-4 w-4 text-indigo-400" /> Operational Context</h4>
                <p className="bg-[var(--bg-card)] border border-[var(--border-default)] p-3 rounded-xl leading-relaxed">{selectedAssessment.form_data.description}</p>
              </div>

              <div>
                <h4 className="font-bold text-[var(--text-primary)] mb-1 flex items-center gap-1.5"><Building className="h-4 w-4 text-purple-400" /> Anticipated Benefits</h4>
                <p className="bg-[var(--bg-card)] border border-[var(--border-default)] p-3 rounded-xl leading-relaxed">{selectedAssessment.form_data.benefits}</p>
              </div>

              <div>
                <h4 className="font-bold text-[var(--text-primary)] mb-1 flex items-center gap-1.5"><ShieldAlert className="h-4 w-4 text-blue-400" /> Privacy & Protection</h4>
                <p className="bg-[var(--bg-card)] border border-[var(--border-default)] p-3 rounded-xl leading-relaxed">{selectedAssessment.form_data.data_protection}</p>
              </div>

              <div>
                <h4 className="font-bold text-[var(--text-primary)] mb-1 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Human Oversight</h4>
                <p className="bg-[var(--bg-card)] border border-[var(--border-default)] p-3 rounded-xl leading-relaxed">{selectedAssessment.form_data.oversight}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-t border-[var(--border-default)]/80 pt-4 mt-1 text-[10px] text-[var(--text-muted)]">
                <span>Submitted by: <span className="text-[var(--text-primary)] font-semibold">{selectedAssessment.submitted_by}</span></span>
                <span>Date: <span className="text-[var(--text-primary)] font-semibold">{new Date(selectedAssessment.created_at).toLocaleString()}</span></span>
              </div>
            </div>

            {selectedAssessment.status === "IN_REVIEW" && (
              <div className="bg-[var(--bg-secondary)] border-t border-[var(--border-default)] p-5 flex items-center justify-end gap-3">
                <button
                  onClick={() => handleUpdateStatus(selectedAssessment.id, "REJECTED")}
                  className="rounded-xl border border-red-500/30 px-5 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-all"
                >
                  Flag / Reject
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedAssessment.id, "APPROVED")}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-all"
                >
                  Approve Assessment
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
