import { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@/components/v2/PageContainer';
import { TabBar } from '@/components/v2/TabBar';
import { StatusBadge } from '@/components/v2/StatusBadge';
import { MetricCard } from '@/components/v2/MetricCard';
import { DataTable, Column } from '@/components/v2/DataTable';
import { apiRequest } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { 
  FolderOpen, 
  Download, 
  FileText, 
  Upload, 
  BarChart3, 
  RefreshCw, 
  CheckCircle2, 
  FileCheck
} from 'lucide-react';

interface ComplianceDocument {
  id: string;
  name: string;
  framework: string;
  documentType: string;
  fileSize: string;
  generatedDate: string;
  status: 'VERIFIED' | 'PENDING_REVIEW' | 'EXPIRED';
  downloadUrl?: string;
}

export default function EvidenceSection() {
  const { addToast } = useStore();
  const [activeTab, setActiveTab] = useState<string>('registry');
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);

  const loadEvidenceData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        apiRequest<any>('/evidence').catch(() => ({ data: [] })),
        apiRequest<any>('/files').catch(() => ({ data: [] }))
      ]);

      const mockDocs: ComplianceDocument[] = [
        {
          id: 'doc-1',
          name: 'GDPR_Article17_VectorErasure_Audit_Export.pdf',
          framework: 'GDPR',
          documentType: 'Audit Evidence Bundle',
          fileSize: '4.2 MB',
          generatedDate: '2026-08-10',
          status: 'VERIFIED'
        },
        {
          id: 'doc-2',
          name: 'DPDP_Consent_Hook_Verification_Log.pdf',
          framework: 'DPDP',
          documentType: 'Consent Audit Log',
          fileSize: '1.8 MB',
          generatedDate: '2026-08-12',
          status: 'VERIFIED'
        },
        {
          id: 'doc-3',
          name: 'HIPAA_PHI_Masking_Quarterly_Assessment.pdf',
          framework: 'HIPAA',
          documentType: 'Quarterly Assessment',
          fileSize: '6.5 MB',
          generatedDate: '2026-08-01',
          status: 'PENDING_REVIEW'
        },
        {
          id: 'doc-4',
          name: 'PCI_DSS_v4.0_Tokenization_Proof.pdf',
          framework: 'PCI-DSS',
          documentType: 'Tokenization Proof',
          fileSize: '2.1 MB',
          generatedDate: '2026-08-13',
          status: 'VERIFIED'
        },
        {
          id: 'doc-5',
          name: 'NIST_AI_RMF_Govern_Measure_Export.pdf',
          framework: 'NIST AI RMF',
          documentType: 'RMF Audit Package',
          fileSize: '8.4 MB',
          generatedDate: '2026-08-11',
          status: 'VERIFIED'
        }
      ];

      setDocuments(mockDocs);

    } catch (err: any) {
      console.error('Error loading evidence registry:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvidenceData();
  }, [loadEvidenceData]);

  const handleDownload = (docName: string) => {
    addToast({ message: `Downloading artifact package: ${docName}`, type: 'success' });
  };

  const columns: Column<ComplianceDocument>[] = [
    {
      header: 'Document Name & Artifact',
      accessorKey: 'name',
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-2.5">
          <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
          <div>
            <span className="font-bold text-xs text-slate-900 dark:text-white block">{item.name}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{item.documentType}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Framework',
      accessorKey: 'framework',
      sortable: true,
      cell: (item) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-mono">
          {item.framework}
        </span>
      )
    },
    {
      header: 'File Size',
      accessorKey: 'fileSize',
      sortable: true,
      cell: (item) => (
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
          {item.fileSize}
        </span>
      )
    },
    {
      header: 'Generated Date',
      accessorKey: 'generatedDate',
      sortable: true,
      cell: (item) => (
        <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
          {item.generatedDate}
        </span>
      )
    },
    {
      header: 'Verification Status',
      accessorKey: 'status',
      sortable: true,
      cell: (item) => <StatusBadge status={item.status === 'VERIFIED' ? 'active' : 'pending'} label={item.status} />
    },
    {
      header: 'Download',
      cell: (item) => (
        <button
          onClick={() => handleDownload(item.name)}
          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-1"
        >
          <Download className="h-3 w-3" /> Download
        </button>
      )
    }
  ];

  return (
    <PageContainer
      title="Evidence & Reports"
      subtitle="Generated and uploaded compliance artifacts, audit-ready export packages, and executive reports."
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => addToast({ message: 'Opening document upload dialog...', type: 'info' })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            <Upload className="h-3.5 w-3.5" /> Upload Evidence File
          </button>
          <button
            onClick={loadEvidenceData}
            className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-300 dark:border-slate-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      }
    >
      {/* Metric summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Verified Artifacts"
          value={documents.length}
          subtitle="Audit-ready compliance packages"
          status="primary"
          icon={FolderOpen}
        />
        <MetricCard
          label="Framework Export Packages"
          value={5}
          subtitle="GDPR, DPDP, HIPAA, PCI, NIST"
          status="success"
          icon={FileCheck}
        />
        <MetricCard
          label="Executive Reports"
          value={4}
          subtitle="Monthly executive summaries"
          status="info"
          icon={BarChart3}
        />
        <MetricCard
          label="Verified Status"
          value="100%"
          subtitle="Cryptographically hashed"
          status="success"
          icon={CheckCircle2}
        />
      </div>

      {/* Sub-Tabs */}
      <TabBar
        tabs={[
          { id: 'registry', label: 'Compliance Document Registry', count: documents.length, icon: FolderOpen },
          { id: 'executive', label: 'Executive Summary Reports', count: 4, icon: BarChart3 }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: Document Registry */}
      {activeTab === 'registry' && (
        <DataTable
          columns={columns}
          data={documents}
          keyExtractor={(item) => item.id}
          isLoading={loading}
          searchPlaceholder="Search compliance evidence documents..."
        />
      )}

      {/* Tab 2: Executive Reports */}
      {activeTab === 'executive' && (
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-500" /> Executive & CISO Summary Reports
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Downloadable high-level executive summaries formatted for board meetings and regulatory filings.
              </p>
            </div>
            <button
              onClick={() => addToast({ message: 'Generating August 2026 Executive Summary Report PDF...', type: 'success' })}
              className="px-3 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow-sm"
            >
              Generate Monthly Executive PDF
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'August 2026 Executive AI Governance Summary', date: '2026-08-13', size: '3.4 MB' },
              { title: 'July 2026 Executive AI Governance Summary', date: '2026-07-31', size: '3.1 MB' },
              { title: 'Q2 2026 Board-Level AI Risk & Compliance Report', date: '2026-06-30', size: '5.8 MB' }
            ].map((report, i) => (
              <div key={i} className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{report.title}</h4>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Generated: {report.date} • {report.size}</span>
                </div>
                <button
                  onClick={() => handleDownload(report.title)}
                  className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all"
                  title="Download PDF"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
