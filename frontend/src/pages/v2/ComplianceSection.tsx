import { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@/components/v2/PageContainer';
import { TabBar } from '@/components/v2/TabBar';
import { StatusBadge } from '@/components/v2/StatusBadge';
import { MetricCard } from '@/components/v2/MetricCard';
import { DataTable, Column } from '@/components/v2/DataTable';
import { apiRequest } from '@/lib/api';
import { useStore } from '@/store/useStore';
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
  SlidersHorizontal
} from 'lucide-react';

// The 5 active frameworks specified by the prompt
type ActiveFramework = 'GDPR' | 'DPDP' | 'HIPAA' | 'PCI-DSS' | 'NIST AI RMF';

interface FrameworkSummary {
  id: ActiveFramework;
  name: string;
  readinessScore: number;
  totalControls: number;
  passedControls: number;
  openFindings: number;
  description: string;
}

interface ControlItem {
  id: string;
  code: string;
  title: string;
  category: string;
  status: 'COMPLIANT' | 'NEEDS_REVIEW' | 'NON_COMPLIANT';
  mappedAgents: number;
  framework: ActiveFramework;
}

const FIVE_FRAMEWORKS: FrameworkSummary[] = [
  {
    id: 'GDPR',
    name: 'GDPR (EU General Data Protection Regulation)',
    readinessScore: 92,
    totalControls: 28,
    passedControls: 26,
    openFindings: 2,
    description: 'Data protection, consent verification, and right-to-erasure compliance for EU user data processed by AI agents.'
  },
  {
    id: 'DPDP',
    name: 'DPDP (India Digital Personal Data Protection Act)',
    readinessScore: 85,
    totalControls: 22,
    passedControls: 19,
    openFindings: 3,
    description: 'Consent manager alignment, purpose limitation, and data fiduciary obligations for Indian digital data.'
  },
  {
    id: 'HIPAA',
    name: 'HIPAA (Health Insurance Portability & Accountability)',
    readinessScore: 78,
    totalControls: 34,
    passedControls: 27,
    openFindings: 7,
    description: 'Protected Health Information (PHI) encryption, access logging, and prompt masking guardrails.'
  },
  {
    id: 'PCI-DSS',
    name: 'PCI-DSS v4.0 (Payment Card Industry Data Standard)',
    readinessScore: 94,
    totalControls: 20,
    passedControls: 19,
    openFindings: 1,
    description: 'Primary Account Number (PAN) and CVV redaction across agent memory and vector stores.'
  },
  {
    id: 'NIST AI RMF',
    name: 'NIST AI RMF (Risk Management Framework 1.0)',
    readinessScore: 81,
    totalControls: 30,
    passedControls: 24,
    openFindings: 6,
    description: 'GOVERN, MAP, MEASURE, and MANAGE functions for trustworthy and accountable AI deployments.'
  }
];

export default function ComplianceSection() {
  const { addToast } = useStore();
  const [activeTab, setActiveTab] = useState<string>('GDPR');
  const [loading, setLoading] = useState(false);
  const [frameworks, setFrameworks] = useState<FrameworkSummary[]>(FIVE_FRAMEWORKS);
  const [controls, setControls] = useState<ControlItem[]>([]);

  const loadComplianceData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<any>('/compliance/stats').catch(() => null);
      if (res?.frameworks) {
        setFrameworks(prev => prev.map(fw => {
          const apiFw = res.frameworks.find((f: any) => 
            f.name.toUpperCase().includes(fw.id.replace('-', ''))
          );
          if (apiFw) {
            return {
              ...fw,
              readinessScore: apiFw.score || fw.readinessScore,
              passedControls: apiFw.passedControls || fw.passedControls,
              openFindings: apiFw.openFindings || fw.openFindings
            };
          }
          return fw;
        }));
      }

      // Generate controls for active 5 frameworks
      const mockControls: ControlItem[] = [
        { id: 'c-1', code: 'GDPR-Art6', title: 'Lawful Basis for AI Model Training', category: 'Consent & Transparency', status: 'COMPLIANT', mappedAgents: 18, framework: 'GDPR' },
        { id: 'c-2', code: 'GDPR-Art17', title: 'Automated Erasure in Vector Memory', category: 'Data Subject Rights', status: 'NEEDS_REVIEW', mappedAgents: 4, framework: 'GDPR' },
        { id: 'c-3', code: 'DPDP-Sec6', title: 'Data Fiduciary Purpose Limitation', category: 'Governance', status: 'COMPLIANT', mappedAgents: 14, framework: 'DPDP' },
        { id: 'c-4', code: 'DPDP-Sec8', title: 'Consent Revocation Hook Enforcement', category: 'Consent Manager', status: 'NEEDS_REVIEW', mappedAgents: 6, framework: 'DPDP' },
        { id: 'c-5', code: 'HIPAA-164.312', title: 'PHI Detection in LLM Prompt Streams', category: 'Technical Safeguards', status: 'NON_COMPLIANT', mappedAgents: 8, framework: 'HIPAA' },
        { id: 'c-6', code: 'PCI-Req3.4', title: 'PAN Tokenization before Model Context Injection', category: 'Data Protection', status: 'COMPLIANT', mappedAgents: 22, framework: 'PCI-DSS' },
        { id: 'c-7', code: 'NIST-GOVERN-1', title: 'AI Risk Governance Policy & Accountability', category: 'Governance', status: 'COMPLIANT', mappedAgents: 24, framework: 'NIST AI RMF' },
        { id: 'c-8', code: 'NIST-MEASURE-2', title: 'Continuous Bias & Drift Monitoring', category: 'Measurement', status: 'NEEDS_REVIEW', mappedAgents: 12, framework: 'NIST AI RMF' }
      ];

      setControls(mockControls);

    } catch (err: any) {
      console.error('Error loading compliance:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComplianceData();
  }, [loadComplianceData]);

  const currentFw = frameworks.find(f => f.id === activeTab) || frameworks[0];
  const currentControls = controls.filter(c => c.framework === activeTab);

  const controlColumns: Column<ControlItem>[] = [
    {
      header: 'Control Code',
      accessorKey: 'code',
      sortable: true,
      cell: (item) => (
        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
          {item.code}
        </span>
      )
    },
    {
      header: 'Control Requirement Title',
      accessorKey: 'title',
      sortable: true,
      cell: (item) => (
        <div>
          <span className="font-bold text-xs text-slate-900 dark:text-white block">{item.title}</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">{item.category}</span>
        </div>
      )
    },
    {
      header: 'Mapped Agents',
      accessorKey: 'mappedAgents',
      sortable: true,
      cell: (item) => (
        <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-white">
          {item.mappedAgents} Agents
        </span>
      )
    },
    {
      header: 'Audit Status',
      accessorKey: 'status',
      sortable: true,
      cell: (item) => <StatusBadge status={item.status} />
    },
    {
      header: 'Action',
      cell: (item) => (
        <button
          onClick={() => addToast({ message: `Viewing evidence mapping for ${item.code}`, type: 'info' })}
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
            onClick={() => addToast({ message: 'Generating audit-ready compliance export bundle...', type: 'success' })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            Export Compliance Audit
          </button>
          <button
            onClick={loadComplianceData}
            className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-300 dark:border-slate-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      }
    >
      {/* 5 Framework Tabs */}
      <TabBar
        tabs={[
          { id: 'GDPR', label: 'GDPR', count: '92%', icon: Lock },
          { id: 'DPDP', label: 'DPDP', count: '85%', icon: ShieldCheck },
          { id: 'HIPAA', label: 'HIPAA', count: '78%', icon: AlertTriangle },
          { id: 'PCI-DSS', label: 'PCI-DSS', count: '94%', icon: CheckCircle2 },
          { id: 'NIST AI RMF', label: 'NIST AI RMF', count: '81%', icon: ClipboardCheck },
          { id: 'GOVERNANCE_OS', label: 'GovernanceOS Matrix', icon: Layers }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Render active framework tab or GovernanceOS matrix */}
      {activeTab !== 'GOVERNANCE_OS' ? (
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
                <StatusBadge status={currentFw.readinessScore >= 85 ? 'compliant' : 'warning'} size="md" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                label="Total Mapped Controls"
                value={currentFw.totalControls}
                status="primary"
                icon={FileText}
              />
              <MetricCard
                label="Passed Controls"
                value={currentFw.passedControls}
                status="success"
                icon={CheckCircle2}
              />
              <MetricCard
                label="Open Findings & Obligations"
                value={currentFw.openFindings}
                status={currentFw.openFindings > 3 ? 'danger' : 'warning'}
                icon={AlertTriangle}
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
              emptyMessage={`No custom controls registered yet for ${currentFw.id}.`}
            />
          </div>
        </div>
      ) : (
        /* GovernanceOS Cross-Framework Matrix (Option A Reworked for 5 Frameworks) */
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
                  { obj: 'Prompt PII Masking & Tokenization', gdpr: 'Art. 6', dpdp: 'Sec. 6', hipaa: '164.312', pci: 'Req 3.4', nist: 'MEASURE-2' },
                  { obj: 'Automated Data Subject Erasure Hook', gdpr: 'Art. 17', dpdp: 'Sec. 12', hipaa: 'N/A', pci: 'N/A', nist: 'MANAGE-1' },
                  { obj: 'Agent Access Control & Auth Tokens', gdpr: 'Art. 32', dpdp: 'Sec. 8', hipaa: '164.308', pci: 'Req 7.1', nist: 'GOVERN-1' },
                  { obj: 'Model Drift & Hallucination Audit Logs', gdpr: 'Art. 35', dpdp: 'Sec. 10', hipaa: '164.312', pci: 'Req 10.2', nist: 'MEASURE-1' }
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
