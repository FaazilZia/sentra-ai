import { NodePulseLoader } from '@/components/ui/NodePulseLoader';
import { useState, useEffect } from 'react';
import { apiRequest, apiBaseUrl } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { 
  Folder, FileText, UploadCloud, Trash2, 
  ExternalLink, Eye, Info, X, ShieldAlert 
} from 'lucide-react';

interface EvidenceFile {
  id: string;
  original_name: string;
  mime_type: string;
  size: number;
  storage_path: string;
  control_type: string;
  control_id: string;
  uploaded_by: string;
  created_at: string;
}

const FRAMEWORK_FOLDERS = [
  { key: 'GDPR', label: 'GDPR Compliance', desc: 'Evidence for GDPR data protection obligations, DPIAs, and consent management.' },
  { key: 'DPDP', label: 'DPDP Act Compliance', desc: 'Evidence for Digital Personal Data Protection Act obligations.' },
  { key: 'HIPAA', label: 'HIPAA Compliance', desc: 'Evidence for PHI safeguards, security rules, and breach notification.' },
  { key: 'PCI_DSS', label: 'PCI-DSS Security', desc: 'Evidence for payment card data security standards and access controls.' },
  { key: 'NIST_AI_RMF', label: 'NIST AI Risk Management', desc: 'Evidence for NIST AI RMF framework profiles, risk maps, and tests.' }
];

export default function FileManager() {
  const addToast = useStore((state) => state.addToast);
  const [activeFolder, setActiveFolder] = useState<string>('GDPR');
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [folderStats, setFolderStats] = useState<Record<string, { count: number; lastUploaded: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Selected file for preview drawer
  const [selectedFile, setSelectedFile] = useState<EvidenceFile | null>(null);

  useEffect(() => {
    loadFiles();
  }, [activeFolder]);

  const loadFolderStats = async () => {
    try {
      const stats: Record<string, { count: number; lastUploaded: string | null }> = {};
      await Promise.all(
        FRAMEWORK_FOLDERS.map(async (folder) => {
          try {
            const data = await apiRequest<EvidenceFile[]>(`/file-ingestion/${folder.key}/general`);
            const count = data?.length || 0;
            const lastUploaded = data && data.length > 0
              ? new Date(Math.max(...data.map(d => new Date(d.created_at).getTime()))).toISOString()
              : null;
            stats[folder.key] = { count, lastUploaded };
          } catch (e) {
            stats[folder.key] = { count: 0, lastUploaded: null };
          }
        })
      );
      setFolderStats(stats);
    } catch (err) {
      console.error('Failed to load folder stats:', err);
    }
  };

  const loadFiles = async () => {
    setLoading(true);
    try {
      // Endpoint is GET /file-ingestion/:controlType/:controlId
      const data = await apiRequest<EvidenceFile[]>(`/file-ingestion/${activeFolder}/general`);
      setFiles(data || []);
      loadFolderStats();
    } catch (err) {
      console.error('Failed to load files:', err);
      addToast({ message: 'Failed to load evidence files', type: 'error' });
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFile = async (file: File) => {
    if (!file) return;
    
    // Check file size (10 MB max)
    if (file.size > 10 * 1024 * 1024) {
      addToast({ message: 'File exceeds 10MB limit', type: 'error' });
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('controlType', activeFolder);
      formData.append('controlId', 'general');

      // Use fetch with credentials: 'include' for FormData upload
      const response = await fetch(`${apiBaseUrl}/file-ingestion/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'File upload failed');
      }

      addToast({ message: `Successfully uploaded ${file.name}`, type: 'success' });
      loadFiles();
    } catch (err: any) {
      console.error('Upload error:', err);
      addToast({ message: err.message || 'Failed to upload file', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to permanently delete this evidence file?')) return;
    try {
      await apiRequest(`/file-ingestion/${fileId}`, { method: 'DELETE' });
      addToast({ message: 'File deleted successfully', type: 'success' });
      if (selectedFile?.id === fileId) {
        setSelectedFile(null);
      }
      loadFiles();
    } catch (err: any) {
      console.error('Failed to delete file:', err);
      addToast({ message: err.message || 'Failed to delete file', type: 'error' });
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getFileUrl = (file: EvidenceFile) => {
    const origin = apiBaseUrl.replace('/api/v1', '');
    // Ensure we handle absolute/relative path correctly
    const storagePath = file.storage_path.startsWith('/') ? file.storage_path : `/${file.storage_path}`;
    return `${origin}${storagePath}`;
  };

  const isPreviewable = (mimeType: string) => {
    const previewable = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'text/plain',
      'application/json'
    ];
    return previewable.includes(mimeType);
  };

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in text-[var(--text-secondary)] h-screen overflow-hidden">
      <PageHeader 
        title="Evidence File Manager"
        description="Ingest audit documents, compliance logs, and policy execution evidence for model validation audits."
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden pb-6">
        
        {/* Left Panel: Folders Tree */}
        <div className="lg:col-span-4 flex flex-col gap-4 bg-[var(--bg-page)] border border-[var(--border-default)]/80 rounded-2xl p-4 overflow-y-auto">
          <span className="text-[9px] font-semibold text-[var(--royal-indigo)] uppercase tracking-widest block mb-2 px-1">
            Framework Directories
          </span>
          <div className="space-y-2">
            {FRAMEWORK_FOLDERS.map((folder) => {
              const isActive = activeFolder === folder.key;
              const stats = folderStats[folder.key] || { count: 0, lastUploaded: null };
              return (
                <button
                  key={folder.key}
                  onClick={() => {
                    setActiveFolder(folder.key);
                    setSelectedFile(null);
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 group ${
                    isActive 
                      ? 'bg-indigo-50 border-indigo-200 text-[var(--text-primary)] shadow-sm' 
                      : 'bg-white border-[var(--border-default)] hover:border-slate-350 text-[var(--text-secondary)]'
                  }`}
                >
                  <Folder className={`h-5 w-5 shrink-0 mt-0.5 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-[var(--royal-indigo)]' : 'text-[var(--text-muted)]'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-xs uppercase tracking-wider truncate">{folder.label}</h4>
                      <span className="badge-pill bg-indigo-50 text-[var(--royal-indigo)] border border-indigo-150 font-bold shrink-0 text-[10px] px-2 py-0.5">
                        {stats.count} files
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] leading-normal mt-1">{folder.desc}</p>
                    {stats.lastUploaded && (
                      <span className="text-[8px] text-[var(--text-muted)] font-mono block mt-2">
                        Last uploaded: {new Date(stats.lastUploaded).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Panel: File List & Upload Area */}
        <div className="lg:col-span-8 flex flex-col gap-4 bg-[var(--bg-card)] border border-[var(--border-default)]/80 rounded-2xl p-6 min-h-0 overflow-hidden">
          
          {/* Drag and drop Uploader */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 transition-all relative ${
              dragActive 
                ? 'border-indigo-500 bg-indigo-50' 
                : 'border-[var(--border-default)] bg-slate-50 hover:border-[var(--border-default)]'
            }`}
          >
            <input 
              id="file-upload-input"
              type="file" 
              className="hidden" 
              onChange={handleFileChange}
              disabled={uploading}
            />
            <UploadCloud className={`h-8 w-8 ${uploading ? 'animate-bounce text-[var(--royal-indigo)]' : 'text-[var(--text-muted)]'}`} />
            
            <div className="text-center">
              <p className="text-xs font-bold text-[var(--text-primary)]">
                {uploading ? 'Uploading file...' : 'Drag and drop evidence files here, or'}
              </p>
              {!uploading && (
                <label 
                  htmlFor="file-upload-input"
                  className="text-xs text-[var(--royal-indigo)] font-bold hover:underline cursor-pointer block mt-1"
                >
                  browse local files
                </label>
              )}
            </div>
            <p className="text-[9px] text-[var(--text-muted)] uppercase font-semibold">
              PDF, PNG, JPG, CSV, DOCX, XLSX, TXT, JSON (MAX 10MB)
            </p>
          </div>

          <div className="h-px bg-gray-800/60 my-2" />

          {/* Files Queue List */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <span className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest block mb-3">
              Evidence Files In Directory
            </span>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <NodePulseLoader label="Indexing stored evidence files..." />
              </div>
            ) : files.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState 
                  icon={FileText}
                  title="Directory Empty"
                  description="Upload compliance verification document proofs to this directory."
                />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-default)] text-[9px] font-semibold uppercase tracking-widest text-[var(--text-muted)] pb-2">
                        <th className="pb-3 font-bold">File Details</th>
                        <th className="pb-3 font-bold">Size</th>
                        <th className="pb-3 font-bold">Uploaded At</th>
                        <th className="pb-3 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-default)]">
                      {files.map((file) => (
                        <tr 
                          key={file.id} 
                          className={`hover:hover:bg-[var(--bg-hover)] transition-colors cursor-pointer group ${
                            selectedFile?.id === file.id ? 'bg-[var(--bg-hover)]' : ''
                          }`}
                          onClick={() => setSelectedFile(file)}
                        >
                          <td className="py-3.5 pr-4 flex items-center gap-3">
                            <div className="rounded-lg bg-indigo-50 p-2 border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
                              <FileText className="h-4 w-4 text-[var(--royal-indigo)]" />
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="font-bold text-[var(--text-primary)] text-xs truncate group-hover:text-[var(--royal-indigo)] transition-colors">
                                {file.original_name}
                              </span>
                              <span className="text-[9px] text-[var(--text-muted)] uppercase font-semibold font-mono">
                                {file.mime_type}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 text-[var(--text-secondary)] font-medium">
                            {formatBytes(file.size)}
                          </td>
                          <td className="py-3.5 text-[var(--text-secondary)] font-medium">
                            {new Date(file.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedFile(file)}
                                className="p-1.5 hover:text-[var(--royal-indigo)] text-[var(--text-muted)] transition-colors"
                                title="Preview details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <a
                                href={getFileUrl(file)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 hover:text-[var(--royal-indigo)] text-[var(--text-muted)] transition-colors"
                                title="Open in new window"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                              <button
                                onClick={() => handleDeleteFile(file.id)}
                                className="p-1.5 hover:text-red-500 text-[var(--text-muted)] transition-colors"
                                title="Delete evidence file"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selected File Details & Preview Side Drawer */}
        {selectedFile && (
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[var(--bg-page)] border-l border-[var(--border-default)] shadow-2xl flex flex-col animate-slide-in text-xs">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-default)] p-5 bg-white">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-[var(--royal-indigo)]" />
                <h3 className="font-bold text-[var(--text-primary)] text-sm">Evidence Preview</h3>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="rounded-lg p-1 hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
              {/* Metadata Panel */}
              <div className="bg-slate-50 border border-[var(--border-default)] p-4 rounded-xl space-y-3.5">
                <div>
                  <span className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block mb-0.5">File Name</span>
                  <p className="font-bold text-[var(--text-primary)] leading-normal break-all">{selectedFile.original_name}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block mb-0.5">File Size</span>
                    <p className="font-bold text-[var(--text-secondary)]">{formatBytes(selectedFile.size)}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block mb-0.5">Mime Type</span>
                    <p className="font-bold text-[var(--text-secondary)] font-mono break-all">{selectedFile.mime_type}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block mb-0.5">Framework</span>
                    <p className="font-bold text-[var(--royal-indigo)] font-mono">{selectedFile.control_type}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block mb-0.5">Uploaded</span>
                    <p className="font-bold text-[var(--text-secondary)]">{new Date(selectedFile.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Rendering Panel */}
              <div className="flex-1 flex flex-col gap-2 min-h-[300px]">
                <span className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block">Document Rendering</span>
                {isPreviewable(selectedFile.mime_type) ? (
                  <div className="flex-1 bg-slate-100 border border-[var(--border-default)] rounded-xl overflow-hidden relative">
                    <iframe 
                      src={getFileUrl(selectedFile)}
                      title="evidence-preview"
                      className="w-full h-full border-0 bg-white"
                    />
                  </div>
                ) : (
                  <div className="flex-1 bg-slate-50 border border-[var(--border-default)] rounded-xl flex flex-col items-center justify-center p-6 text-center gap-2">
                    <ShieldAlert className="h-8 w-8 text-amber-500/80" />
                    <p className="font-bold text-[var(--text-primary)]">No Inline Preview Available</p>
                    <p className="text-[10px] text-[var(--text-muted)] leading-normal max-w-[200px]">
                      This file format cannot be rendered inside the dashboard. Click below to download the file directly.
                    </p>
                    <a
                      href={getFileUrl(selectedFile)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-[var(--text-primary)] rounded-lg font-bold transition-all shadow-md shadow-indigo-600/10 hover:scale-105 active:scale-95"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Download File
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
