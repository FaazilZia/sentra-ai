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
  { key: 'EU_AI_ACT', label: 'EU AI Act Compliance', desc: 'Evidence for high-risk AI obligations, safety logs, and auditing.' },
  { key: 'NIST', label: 'NIST AI Risk Management', desc: 'Evidence for NIST AI RMF framework profiles, risk maps, and tests.' },
  { key: 'ISO42001', label: 'ISO/IEC 42001 Standard', desc: 'Evidence for AI Management System standards, baselines, and controls.' },
  { key: 'ISO27001', label: 'ISO/IEC 27001 Security', desc: 'Evidence for Information Security Management systems and annexes.' }
];

export default function FileManager() {
  const addToast = useStore((state) => state.addToast);
  const [activeFolder, setActiveFolder] = useState<string>('EU_AI_ACT');
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Selected file for preview drawer
  const [selectedFile, setSelectedFile] = useState<EvidenceFile | null>(null);

  useEffect(() => {
    loadFiles();
  }, [activeFolder]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      // Endpoint is GET /file-ingestion/:controlType/:controlId
      const data = await apiRequest<EvidenceFile[]>(`/file-ingestion/${activeFolder}/general`);
      setFiles(data || []);
    } catch (err) {
      console.error('Failed to load files:', err);
      addToast({ message: 'Failed to load evidence files', type: 'error' });
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

      // Use fetch instead of apiRequest for FormData upload
      const impersonationToken = localStorage.getItem('sentra_impersonation_token');
      const accessToken = localStorage.getItem('sentra_access_token');
      const headers: Record<string, string> = {};
      if (impersonationToken) {
        headers['Authorization'] = `Bearer ${impersonationToken}`;
      } else if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${apiBaseUrl}/file-ingestion/upload`, {
        method: 'POST',
        headers,
        body: formData
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
    <div className="flex flex-col gap-6 p-6 animate-fade-in text-gray-200 h-screen overflow-hidden">
      <PageHeader 
        title="Evidence File Manager"
        description="Ingest audit documents, compliance logs, and policy execution evidence for model validation audits."
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden pb-6">
        
        {/* Left Panel: Folders Tree */}
        <div className="lg:col-span-4 flex flex-col gap-4 bg-[#111827]/40 border border-gray-800/80 rounded-2xl p-4 overflow-y-auto">
          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-2 px-1">
            Framework Directories
          </span>
          <div className="space-y-2">
            {FRAMEWORK_FOLDERS.map((folder) => {
              const isActive = activeFolder === folder.key;
              return (
                <button
                  key={folder.key}
                  onClick={() => {
                    setActiveFolder(folder.key);
                    setSelectedFile(null);
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 group ${
                    isActive 
                      ? 'bg-indigo-950/20 border-indigo-500/30 text-white' 
                      : 'bg-black/10 border-gray-800/60 hover:border-gray-700/80 text-gray-400'
                  }`}
                >
                  <Folder className={`h-5 w-5 shrink-0 mt-0.5 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-indigo-400' : 'text-gray-500'
                  }`} />
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider">{folder.label}</h4>
                    <p className="text-[10px] text-gray-500 leading-normal mt-1">{folder.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Panel: File List & Upload Area */}
        <div className="lg:col-span-8 flex flex-col gap-4 bg-[#111827]/30 border border-gray-800/80 rounded-2xl p-6 min-h-0 overflow-hidden">
          
          {/* Drag and drop Uploader */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 transition-all relative ${
              dragActive 
                ? 'border-indigo-500 bg-indigo-500/5' 
                : 'border-gray-800 bg-black/10 hover:border-gray-700'
            }`}
          >
            <input 
              id="file-upload-input"
              type="file" 
              className="hidden" 
              onChange={handleFileChange}
              disabled={uploading}
            />
            <UploadCloud className={`h-8 w-8 ${uploading ? 'animate-bounce text-indigo-400' : 'text-gray-500'}`} />
            
            <div className="text-center">
              <p className="text-xs font-bold text-white">
                {uploading ? 'Uploading file...' : 'Drag and drop evidence files here, or'}
              </p>
              {!uploading && (
                <label 
                  htmlFor="file-upload-input"
                  className="text-xs text-indigo-400 font-bold hover:underline cursor-pointer block mt-1"
                >
                  browse local files
                </label>
              )}
            </div>
            <p className="text-[9px] text-gray-500 uppercase font-semibold">
              PDF, PNG, JPG, CSV, DOCX, XLSX, TXT, JSON (MAX 10MB)
            </p>
          </div>

          <div className="h-px bg-gray-800/60 my-2" />

          {/* Files Queue List */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-3">
              Evidence Files In Directory
            </span>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-500" />
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
                      <tr className="border-b border-gray-800 text-[9px] font-black uppercase tracking-widest text-gray-500 pb-2">
                        <th className="pb-3 font-bold">File Details</th>
                        <th className="pb-3 font-bold">Size</th>
                        <th className="pb-3 font-bold">Uploaded At</th>
                        <th className="pb-3 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      {files.map((file) => (
                        <tr 
                          key={file.id} 
                          className={`hover:bg-white/[0.01] transition-colors cursor-pointer group ${
                            selectedFile?.id === file.id ? 'bg-white/[0.02]' : ''
                          }`}
                          onClick={() => setSelectedFile(file)}
                        >
                          <td className="py-3.5 pr-4 flex items-center gap-3">
                            <div className="rounded-lg bg-indigo-500/5 p-2 border border-indigo-500/10 group-hover:bg-indigo-500/10 transition-colors">
                              <FileText className="h-4 w-4 text-indigo-400" />
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="font-bold text-white text-xs truncate group-hover:text-indigo-300 transition-colors">
                                {file.original_name}
                              </span>
                              <span className="text-[9px] text-gray-500 uppercase font-semibold font-mono">
                                {file.mime_type}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 text-gray-400 font-medium">
                            {formatBytes(file.size)}
                          </td>
                          <td className="py-3.5 text-gray-400 font-medium">
                            {new Date(file.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedFile(file)}
                                className="p-1.5 hover:text-indigo-400 text-gray-500 transition-colors"
                                title="Preview details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <a
                                href={getFileUrl(file)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 hover:text-indigo-400 text-gray-500 transition-colors"
                                title="Open in new window"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                              <button
                                onClick={() => handleDeleteFile(file.id)}
                                className="p-1.5 hover:text-red-500 text-gray-500 transition-colors"
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
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#111827] border-l border-gray-800 shadow-2xl flex flex-col animate-slide-in text-xs">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-gray-800 p-5 bg-[#0f172a]/60">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">Evidence Preview</h3>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="rounded-lg p-1 hover:bg-gray-800 text-gray-500 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
              {/* Metadata Panel */}
              <div className="bg-black/20 border border-gray-800 p-4 rounded-xl space-y-3.5">
                <div>
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-0.5">File Name</span>
                  <p className="font-bold text-white leading-normal break-all">{selectedFile.original_name}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-0.5">File Size</span>
                    <p className="font-bold text-gray-300">{formatBytes(selectedFile.size)}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-0.5">Mime Type</span>
                    <p className="font-bold text-gray-300 font-mono break-all">{selectedFile.mime_type}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-0.5">Framework</span>
                    <p className="font-bold text-indigo-400 font-mono">{selectedFile.control_type}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-0.5">Uploaded</span>
                    <p className="font-bold text-gray-300">{new Date(selectedFile.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Rendering Panel */}
              <div className="flex-1 flex flex-col gap-2 min-h-[300px]">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Document Rendering</span>
                {isPreviewable(selectedFile.mime_type) ? (
                  <div className="flex-1 bg-black/40 border border-gray-800 rounded-xl overflow-hidden relative">
                    <iframe 
                      src={getFileUrl(selectedFile)}
                      title="evidence-preview"
                      className="w-full h-full border-0 bg-white"
                    />
                  </div>
                ) : (
                  <div className="flex-1 bg-black/20 border border-gray-800 rounded-xl flex flex-col items-center justify-center p-6 text-center gap-2">
                    <ShieldAlert className="h-8 w-8 text-amber-500/80" />
                    <p className="font-bold text-white">No Inline Preview Available</p>
                    <p className="text-[10px] text-gray-500 leading-normal max-w-[200px]">
                      This file format cannot be rendered inside the dashboard. Click below to download the file directly.
                    </p>
                    <a
                      href={getFileUrl(selectedFile)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all shadow-md shadow-indigo-600/10 hover:scale-105 active:scale-95"
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
