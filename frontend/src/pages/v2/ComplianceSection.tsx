import { useState, useEffect, useCallback } from "react";
import { PageContainer } from "@/components/v2/PageContainer";
import { TabBar } from "@/components/v2/TabBar";
import { StatusBadge } from "@/components/v2/StatusBadge";
import { MetricCard } from "@/components/v2/MetricCard";
import { DataTable, Column } from "@/components/v2/DataTable";
import { apiRequest } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { 
  ClipboardCheck, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Download, 
  FileText,
  Lock,
  RefreshCw,
  SlidersHorizontal,
  AlertCircle
} from "lucide-react";

// The 5 active frameworks specified by the prompt
export type ActiveFramework = "GDPR" | "DPDP" | "HIPAA" | "PCI-DSS" | "NIST AI RMF";

export interface FrameworkSummary {
  id: ActiveFramework;
  name: string;
  readinessScore: number;
  totalControls: number;
  passedControls: number;
  openFindings: number;
  description: string;
}

export interface ControlItem {
  id: string;
  code: string;
  title: string;
  category: string;
  status: "COMPLIANT" | "NEEDS_REVIEW" | "NON_COMPLIANT";
  mappedAgents: number;
  framework: ActiveFramework;
}

export const FIVE_FRAMEWORKS: FrameworkSummary[] = [
  {
    id: "GDPR",
    name: "GDPR (EU General Data Protection Regulation)",
    readinessScore: 0,
    totalControls: 0,
    passedControls: 0,
    openFindings: 0,
    description: "Data protection, consent verification, and right-to-erasure compliance for EU user data processed by AI agents."
  },
  {
    id: "DPDP",
    name: "DPDP (India Digital Personal Data Protection Act)",
    readinessScore: 0,
    totalControls: 0,
    passedControls: 0,
    openFindings: 0,
    description: "Consent manager alignment, purpose limitation, and data fiduciary obligations for Indian digital data."
  },
  {
    id: "HIPAA",
    name: "HIPAA (Health Insurance Portability & Accountability)",
    readinessScore: 0,
    totalControls: 0,
    passedControls: 0,
    openFindings: 0,
    description: "Protected Health Information (PHI) encryption, access logging, and prompt masking guardrails."
  },
  {
    id: "PCI-DSS",
    name: "PCI-DSS v4.0 (Payment Card Industry Data Standard)",
    readinessScore: 0,
    totalControls: 0,
    passedControls: 0,
    openFindings: 0,
    description: "Primary Account Number (PAN) and CVV redaction across agent memory and vector stores."
  },
  {
    id: "NIST AI RMF",
    name: "NIST AI RMF (Risk Management Framework 1.0)",
    readinessScore: 0,
    totalControls: 0,
    passedControls: 0,
    openFindings: 0,
    description: "GOVERN, MAP, MEASURE, and MANAGE functions for trustworthy and accountable AI deployments."
  }
];

export const normalizeFrameworkKey = (name: string): string => {
  return String(name || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
};

export const mapFrameworkId = (fwStr: string): ActiveFramework | null => {
  const norm = normalizeFrameworkKey(fwStr);
  if (norm === "GDPR") return "GDPR";
  if (norm === "DPDP") return "DPDP";
  if (norm === "HIPAA") return "HIPAA";
  if (norm === "PCIDSS") return "PCI-DSS";
  if (norm === "NISTAIRMF") return "NIST AI RMF";
  return null;
};

export const mapControlStatus = (
  status?: string
): "COMPLIANT" | "NEEDS_REVIEW" | "NON_COMPLIANT" => {
  const s = String(status || "").toUpperCase();
  if (s === "IMPLEMENTED" || s === "COMPLIANT") return "COMPLIANT";
  if (s === "IN_PROGRESS" || s === "NEEDS_REVIEW") return "NEEDS_REVIEW";
  return "NON_COMPLIANT";
};

export function mapFrameworkControlToItem(
  c: any,
  framework: ActiveFramework,
  totalAgents: number,
  index = 0
): ControlItem {
  const fallbackId = `ctrl-${framework.toLowerCase().replace(/[^a-z0-9]/g, "")}-${index}`;
  const code = c.code || c.articleNumber || c.control_id || `CTRL-${index + 1}`;
  const title = c.title || c.name || "Untitled Control";
  const category = c.function || c.category || c.chapter?.title || "Governance";
  const status = mapControlStatus(
    c.status || c.implementation?.status || c.control_implementations?.[0]?.status
  );

  return {
    id: c.id || c.code || fallbackId,
    code,
    title,
    category,
    status,
    mappedAgents: Math.max(0, totalAgents),
    framework
  };
}

export function mapRawControlToItem(c: any, totalAgents: number, index = 0): ControlItem | null {
  const targetFw = mapFrameworkId(c.framework);
  if (!targetFw) return null;

  return mapFrameworkControlToItem(c, targetFw, totalAgents, index);
}

export default function ComplianceSection() {
  const { addToast } = useStore();
  const [activeTab, setActiveTab] = useState<string>("GDPR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frameworks, setFrameworks] = useState<FrameworkSummary[]>(FIVE_FRAMEWORKS);
  const [controls, setControls] = useState<ControlItem[]>([]);

  const loadComplianceData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        statsRes,
        gdprRes,
        dpdpRes,
        hipaaRes,
        pciRes,
        nistRes,
        govControlsRes,
        sysRes
      ] = await Promise.all([
        apiRequest<any>("/compliance/stats").catch(() => null),
        apiRequest<any[]>("/gdpr/controls").catch(() => []),
        apiRequest<any[]>("/dpdp/controls").catch(() => []),
        apiRequest<any[]>("/hipaa/controls").catch(() => []),
        apiRequest<any[]>("/pci/controls").catch(() => []),
        apiRequest<any[]>("/compliance/nist-ai-rmf/controls").catch(() => []),
        apiRequest<{ items: any[] }>("/governance/controls").catch(() => null),
        apiRequest<{ items: any[] }>("/ai-systems").catch(() => null)
      ]);

      const hasStats = Boolean(statsRes);
      const hasGovControls = Boolean(govControlsRes?.items?.length);
      const hasFwControls = Boolean(
        (gdprRes && gdprRes.length > 0) ||
        (dpdpRes && dpdpRes.length > 0) ||
        (hipaaRes && hipaaRes.length > 0) ||
        (pciRes && pciRes.length > 0) ||
        (nistRes && nistRes.length > 0)
      );

      if (!hasStats && !hasGovControls && !hasFwControls) {
        throw new Error("Unable to reach compliance service. Please try again.");
      }

      const totalAgents = sysRes?.items?.length ?? 0;
      const mappedControls: ControlItem[] = [];

      // Map GDPR controls
      if (Array.isArray(gdprRes) && gdprRes.length > 0) {
        gdprRes.forEach((c, idx) => mappedControls.push(mapFrameworkControlToItem(c, "GDPR", totalAgents, idx)));
      } else if (govControlsRes?.items) {
        govControlsRes.items
          .filter(c => mapFrameworkId(c.framework) === "GDPR")
          .forEach((c, idx) => mappedControls.push(mapFrameworkControlToItem(c, "GDPR", totalAgents, idx)));
      }

      // Map DPDP controls
      if (Array.isArray(dpdpRes) && dpdpRes.length > 0) {
        dpdpRes.forEach((c, idx) => mappedControls.push(mapFrameworkControlToItem(c, "DPDP", totalAgents, idx)));
      } else if (govControlsRes?.items) {
        govControlsRes.items
          .filter(c => mapFrameworkId(c.framework) === "DPDP")
          .forEach((c, idx) => mappedControls.push(mapFrameworkControlToItem(c, "DPDP", totalAgents, idx)));
      }

      // Map HIPAA controls
      if (Array.isArray(hipaaRes) && hipaaRes.length > 0) {
        hipaaRes.forEach((c, idx) => mappedControls.push(mapFrameworkControlToItem(c, "HIPAA", totalAgents, idx)));
      } else if (govControlsRes?.items) {
        govControlsRes.items
          .filter(c => mapFrameworkId(c.framework) === "HIPAA")
          .forEach((c, idx) => mappedControls.push(mapFrameworkControlToItem(c, "HIPAA", totalAgents, idx)));
      }

      // Map PCI-DSS controls
      if (Array.isArray(pciRes) && pciRes.length > 0) {
        pciRes.forEach((c, idx) => mappedControls.push(mapFrameworkControlToItem(c, "PCI-DSS", totalAgents, idx)));
      } else if (govControlsRes?.items) {
        govControlsRes.items
          .filter(c => mapFrameworkId(c.framework) === "PCI-DSS")
          .forEach((c, idx) => mappedControls.push(mapFrameworkControlToItem(c, "PCI-DSS", totalAgents, idx)));
      }

      // Map NIST AI RMF controls
      if (Array.isArray(nistRes) && nistRes.length > 0) {
        nistRes.forEach((c, idx) => mappedControls.push(mapFrameworkControlToItem(c, "NIST AI RMF", totalAgents, idx)));
      } else if (govControlsRes?.items) {
        govControlsRes.items
          .filter(c => mapFrameworkId(c.framework) === "NIST AI RMF")
          .forEach((c, idx) => mappedControls.push(mapFrameworkControlToItem(c, "NIST AI RMF", totalAgents, idx)));
      }

      setControls(mappedControls);

      // Synchronize framework summaries so that totalControls strictly equals table rows length
      setFrameworks(prev => prev.map(fw => {
        const fwControls = mappedControls.filter(c => c.framework === fw.id);
        const total = fwControls.length;
        const passed = fwControls.filter(c => c.status === "COMPLIANT").length;
        const open = total - passed;

        const apiFw = statsRes?.frameworks?.find((f: any) => 
          normalizeFrameworkKey(f.name) === normalizeFrameworkKey(fw.id)
        );

        let score = 0;
        if (total > 0) {
          if (typeof apiFw?.score === "number") {
            score = apiFw.score;
          } else {
            score = Math.round((passed / total) * 100);
          }
        }

        return {
          ...fw,
          totalControls: total,
          passedControls: passed,
          openFindings: open,
          readinessScore: score
        };
      }));
    } catch (err: any) {
      console.error("Error loading compliance:", err);
      setError(err?.message || "Failed to load compliance data. Please verify your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComplianceData();
  }, [loadComplianceData]);

  const currentFw = frameworks.find(f => f.id === activeTab) || frameworks[0];
  const currentControls = controls.filter(c => c.framework === activeTab);

  const getFwScoreDisplay = (id: ActiveFramework) => {
    const fw = frameworks.find(f => f.id === id);
    if (!fw || fw.totalControls === 0) return "0%";
    return `${fw.readinessScore}%`;
  };

  const controlColumns: Column<ControlItem>[] = [
    {
      header: "Control Code",
      accessorKey: "code",
      sortable: true,
      cell: (item) => (
        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
          {item.code}
        </span>
      )
    },
    {
      header: "Control Requirement Title",
      accessorKey: "title",
      sortable: true,
      cell: (item) => (
        <div>
          <span className="font-bold text-xs text-slate-900 dark:text-white block">{item.title}</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">{item.category}</span>
        </div>
      )
    },
    {
      header: "Mapped Agents",
      accessorKey: "mappedAgents",
      sortable: true,
      cell: (item) => (
        <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-white">
          {item.mappedAgents} Agents
        </span>
      )
    },
    {
      header: "Audit Status",
      accessorKey: "status",
      sortable: true,
      cell: (item) => <StatusBadge status={item.status} />
    },
    {
      header: "Action",
      cell: (item) => (
        <button
          onClick={() => addToast({ message: `Viewing evidence mapping for ${item.code}`, type: "info" })}
          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold uppercase tracking-wider transition-all border border-slate-300 dark:border-slate-700"
        >
          Inspect Evidence
        </button>
      )
    }
  ];

  return (
    <PageContainer
      title="Compliance"
      subtitle="Unified regulatory compliance hub — 5 active frameworks (GDPR, DPDP, HIPAA, PCI-DSS, NIST AI RMF) with GovernanceOS matrix."
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => addToast({ message: "Generating audit-ready compliance export bundle...", type: "success" })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            Export Compliance Audit
          </button>
          <button
            onClick={loadComplianceData}
            aria-label="Refresh compliance data"
            className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-300 dark:border-slate-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      }
    >
      {/* Honest Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="text-xs font-medium">{error}</span>
          </div>
          <button
            onClick={loadComplianceData}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all"
          >
            Retry
          </button>
        </div>
      )}

      {/* 5 Framework Tabs */}
      <TabBar
        tabs={[
          { id: "GDPR", label: "GDPR", count: getFwScoreDisplay("GDPR"), icon: Lock },
          { id: "DPDP", label: "DPDP", count: getFwScoreDisplay("DPDP"), icon: ShieldCheck },
          { id: "HIPAA", label: "HIPAA", count: getFwScoreDisplay("HIPAA"), icon: AlertTriangle },
          { id: "PCI-DSS", label: "PCI-DSS", count: getFwScoreDisplay("PCI-DSS"), icon: CheckCircle2 },
          { id: "NIST AI RMF", label: "NIST AI RMF", count: getFwScoreDisplay("NIST AI RMF"), icon: ClipboardCheck },
          { id: "GOVERNANCE_OS", label: "GovernanceOS Matrix", icon: Layers }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Render active framework tab or GovernanceOS matrix */}
      {activeTab !== "GOVERNANCE_OS" ? (
        <div className="space-y-6">
          {/* Framework Scorecard Header */}
          <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                  {currentFw.name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
                  {currentFw.description}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Readiness</span>
                  <span className="text-2xl font-mono font-black text-indigo-600 dark:text-indigo-400">
                    {currentFw.readinessScore}%
                  </span>
                </div>
                <StatusBadge status={currentFw.readinessScore >= 85 ? "compliant" : "warning"} size="md" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                label="Total Mapped Controls"
                value={currentFw.totalControls}
                status="primary"
                icon={FileText}
                testId="metric-total-controls"
              />
              <MetricCard
                label="Passed Controls"
                value={currentFw.passedControls}
                status="success"
                icon={CheckCircle2}
                testId="metric-passed-controls"
              />
              <MetricCard
                label="Open Findings & Obligations"
                value={currentFw.openFindings}
                status={currentFw.openFindings > 3 ? "danger" : "warning"}
                icon={AlertTriangle}
                testId="metric-open-findings"
              />
            </div>
          </div>

          {/* Controls & Findings Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-indigo-500" />
                {currentFw.id} Mapped Controls & Audit Obligations
              </h3>
            </div>

            <DataTable
              columns={controlColumns}
              data={currentControls}
              keyExtractor={(item) => item.id}
              isLoading={loading}
              emptyMessage={`No compliance controls assessed yet for ${currentFw.id}.`}
            />
          </div>
        </div>
      ) : (
        /* GovernanceOS Cross-Framework Matrix */
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-500" /> GovernanceOS Cross-Framework Alignment Matrix
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Unified cross-mapping across our 5 active frameworks: GDPR, DPDP, HIPAA, PCI-DSS, and NIST AI RMF.
              </p>
            </div>
            <StatusBadge status="compliant" label="5 Active Standards" />
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">Governance Control Objective</th>
                  <th className="p-3 text-center">GDPR</th>
                  <th className="p-3 text-center">DPDP</th>
                  <th className="p-3 text-center">HIPAA</th>
                  <th className="p-3 text-center">PCI-DSS</th>
                  <th className="p-3 text-center">NIST AI RMF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                {[
                  { obj: "Prompt PII Masking & Tokenization", gdpr: "Art. 6", dpdp: "Sec. 6", hipaa: "164.312", pci: "Req 3.4", nist: "MEASURE-2" },
                  { obj: "Automated Data Subject Erasure Hook", gdpr: "Art. 17", dpdp: "Sec. 12", hipaa: "N/A", pci: "N/A", nist: "MANAGE-1" },
                  { obj: "Agent Access Control & Auth Tokens", gdpr: "Art. 32", dpdp: "Sec. 8", hipaa: "164.308", pci: "Req 7.1", nist: "GOVERN-1" },
                  { obj: "Model Drift & Hallucination Audit Logs", gdpr: "Art. 35", dpdp: "Sec. 10", hipaa: "164.312", pci: "Req 10.2", nist: "MEASURE-1" }
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-sans font-bold text-slate-900 dark:text-white">{row.obj}</td>
                    <td className="p-3 text-center text-indigo-600 dark:text-indigo-400 font-bold">{row.gdpr}</td>
                    <td className="p-3 text-center text-indigo-600 dark:text-indigo-400 font-bold">{row.dpdp}</td>
                    <td className="p-3 text-center text-indigo-600 dark:text-indigo-400 font-bold">{row.hipaa}</td>
                    <td className="p-3 text-center text-indigo-600 dark:text-indigo-400 font-bold">{row.pci}</td>
                    <td className="p-3 text-center text-indigo-600 dark:text-indigo-400 font-bold">{row.nist}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
