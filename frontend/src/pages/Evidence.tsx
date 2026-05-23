import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderOpen, Plus, Search, Trash2, Download, Eye, FileText, 
  FileSpreadsheet, FileImage, File, UploadCloud, X, Calendar, User, Tag
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

// File size formatter
function formatBytes(bytes: number, decimals = 2) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Map MIME types to Lucide Icons
function getFileIcon(mimeType: string) {
  const mime = mimeType.toLowerCase();
  if (mime.includes('pdf')) return FileText;
  if (mime.includes('csv') || mime.includes('sheet') || mime.includes('excel')) return FileSpreadsheet;
  if (mime.includes('image/') || mime.includes('png') || mime.includes('jpeg') || mime.includes('jpg')) return FileImage;
  return File;
}

export default function Evidence() {
  const addToast = useStore(state => state.addToast);

  // States
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterEntityId, setFilterEntityId] = useState('');

  // Upload Form State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadEntityType, setUploadEntityType] = useState('policy');
  const [uploadEntityId, setUploadEntityId] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all evidence records
  const loadEvidence = async () => {
    setIsLoading(true);
    try {
      // Build query string
      const params = new URLSearchParams();
      if (filterType) params.append('entityType', filterType);
      if (filterEntityId) params.append('entityId', filterEntityId);
      
      const query = params.toString() ? `?${params.toString()}` : '';
      const list = await apiRequest<any[]>(`/evidence${query}`);
      setEvidenceList(list);
    } catch (err) {
      console.error('Failed to load evidence records:', err);
      addToast({ message: 'FAILED TO LOAD EVIDENCE RECORDS', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvidence();
  }, [filterType, filterEntityId]);

  // Handle Drag & Drop Events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Submit file upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      addToast({ message: 'PLEASE SELECT A FILE TO UPLOAD', type: 'warning' });
      return;
    }
    if (!uploadTitle.trim()) {
      addToast({ message: 'TITLE IS REQUIRED', type: 'warning' });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', uploadTitle);
      formData.append('description', uploadDescription);
      formData.append('entityType', uploadEntityType);
      formData.append('entityId', uploadEntityId);
      formData.append('tags', uploadTags);

      // Perform multipart upload
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api/v1'}/evidence`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      addToast({ message: 'EVIDENCE RECORD UPLOADED SUCCESSFULLY', type: 'success' });
      
      // Reset form & close modal
      setUploadTitle('');
      setUploadDescription('');
      setUploadEntityType('policy');
      setUploadEntityId('');
      setUploadTags('');
      setSelectedFile(null);
      setIsUploadOpen(false);
      
      // Reload evidence records
      loadEvidence();
    } catch (err) {
      console.error('File upload failed:', err);
      addToast({ message: 'FILE UPLOAD FAILED', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  // Delete evidence record
  const handleDeleteEvidence = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this evidence file?')) return;
    
    try {
      await apiRequest(`/evidence/${id}`, { method: 'DELETE' });
      addToast({ message: 'EVIDENCE FILE DELETED', type: 'success' });
      loadEvidence();
    } catch (err) {
      console.error('Delete failed:', err);
      addToast({ message: 'FAILED TO DELETE EVIDENCE RECORD', type: 'error' });
    }
  };

  // View / Download File
  const handleViewFile = (url: string) => {
    const fullUrl = url.startsWith('/') 
      ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:10000'}${url}`
      : url;
    window.open(fullUrl, '_blank');
  };

  // Filtered lists (client-side text matches)
  const filteredEvidence = evidenceList.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.tags.some((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header and Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-black uppercase tracking-widest text-[var(--royal-indigo)]">Evidence Hub</h1>
          <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mt-0.5">Central repository for compliance filings, model cards, and remediation proof</p>
        </div>
        <button 
          onClick={() => setIsUploadOpen(true)}
          className="btn-primary flex items-center justify-center gap-2 h-9 !text-[10px] uppercase tracking-widest self-start sm:self-center"
        >
          <Plus className="h-4 w-4" />
          <span>Upload Evidence</span>
        </button>
      </div>

      {/* Filter panel */}
      <div className="card-base p-4 flex flex-col md:flex-row md:items-center gap-4 bg-white shadow-sm border border-[var(--border-default)]">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
          <input 
            type="text" 
            placeholder="Search by Title or Tags..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded py-1.5 pl-9 pr-4 text-[var(--text-xs)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--violet-blue)]"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 shrink-0">
          {/* Entity Type Selector */}
          <select 
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-[var(--bg-page)] border border-[var(--border-default)] text-[var(--text-xs)] rounded py-1.5 px-3 focus:outline-none focus:border-[var(--violet-blue)] font-bold text-[var(--text-secondary)] h-8 outline-none"
          >
            <option value="">ALL ENTITIES</option>
            <option value="policy">POLICIES</option>
            <option value="risk">RISKS</option>
            <option value="compliance">COMPLIANCE</option>
            <option value="incident">INCIDENTS</option>
            <option value="guardrail">GUARDRAILS</option>
          </select>

          {/* Entity ID Filter */}
          <input 
            type="text" 
            placeholder="Filter by Entity ID..." 
            value={filterEntityId}
            onChange={e => setFilterEntityId(e.target.value)}
            className="bg-[var(--bg-page)] border border-[var(--border-default)] text-[var(--text-xs)] rounded py-1.5 px-3 focus:outline-none focus:border-[var(--violet-blue)] h-8"
          />
        </div>
      </div>

      {/* Main Evidence Table */}
      <div className="card-base overflow-hidden border border-[var(--border-default)] bg-white shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <LoaderCircle className="h-8 w-8 animate-spin text-[var(--royal-indigo)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Retrieving Artifacts...</span>
          </div>
        ) : filteredEvidence.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FolderOpen className="h-12 w-12 text-[var(--text-muted)] opacity-60 mb-3" />
            <h3 className="text-[13px] font-bold text-[var(--text-primary)] uppercase tracking-wider">No Evidence Found</h3>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1 max-w-sm uppercase leading-normal">
              No files are uploaded matching this criteria. Click the upload button above to add compliance documents.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[var(--bg-page)]/70 text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] border-b border-[var(--border-default)]">
                  <th className="py-3.5 px-4">Title</th>
                  <th className="py-3.5 px-4">Entity Context</th>
                  <th className="py-3.5 px-4">Uploaded By</th>
                  <th className="py-3.5 px-4">Upload Date</th>
                  <th className="py-3.5 px-4">Size</th>
                  <th className="py-3.5 px-4">Tags</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {filteredEvidence.map((item) => {
                  const FileIcon = getFileIcon(item.mimeType);
                  return (
                    <tr key={item.id} className="hover:bg-[var(--bg-hover)]/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded bg-[var(--ghost-violet)] text-[var(--royal-indigo)] flex items-center justify-center">
                            <FileIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-[var(--text-xs)] font-bold text-[var(--text-primary)] leading-tight">{item.title}</div>
                            <div className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate max-w-[200px]" title={item.fileName}>
                              {item.fileName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="badge-pill bg-[var(--ghost-violet)] text-[var(--royal-indigo)] font-bold uppercase tracking-wider mr-2 text-[9px]">
                          {item.entityType}
                        </span>
                        {item.entityId && (
                          <span className="text-[10px] font-mono text-[var(--text-secondary)]">{item.entityId.slice(0, 8)}...</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-[var(--text-xs)] font-medium text-[var(--text-primary)]">
                          <User className="h-3 w-3 text-[var(--text-muted)]" />
                          <span>{item.user?.full_name || 'Admin'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--text-secondary)]">
                          <Calendar className="h-3 w-3 text-[var(--text-muted)]" />
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-xs)] text-[var(--text-secondary)] font-medium">
                        {formatBytes(item.fileSize)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {item.tags.length === 0 ? (
                            <span className="text-[9px] text-[var(--text-muted)] uppercase">—</span>
                          ) : (
                            item.tags.map((tag: string) => (
                              <span key={tag} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-semibold border-none">
                                <Tag className="h-2 w-2 opacity-50" />
                                <span>{tag}</span>
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewFile(item.fileUrl)}
                            className="p-1.5 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all hover:text-[var(--royal-indigo)]"
                            title="View/Download File"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvidence(item.id)}
                            className="p-1.5 rounded text-[var(--text-secondary)] hover:bg-rose-50 transition-all hover:text-rose-600"
                            title="Delete Record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reusable Upload Modal Dialog */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/55 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-[var(--border-default)] rounded-[var(--radius)] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between bg-[var(--bg-page)]/40">
              <div className="flex items-center gap-2">
                <UploadCloud className="h-4.5 w-4.5 text-[var(--royal-indigo)]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">Upload Evidence Record</span>
              </div>
              <button 
                onClick={() => setIsUploadOpen(false)}
                className="p-1 rounded hover:bg-[var(--bg-hover)] transition-all outline-none"
              >
                <X className="h-4 w-4 text-[var(--text-secondary)]" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[80vh] text-left">
              
              {/* Drag and Drop Zone */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border border-dashed rounded-[var(--radius)] p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[120px]",
                  isDragging ? "border-[var(--royal-indigo)] bg-[var(--ghost-violet)]/10" : "border-[var(--border-strong)] bg-[var(--bg-page)]/30 hover:border-[var(--royal-indigo)]"
                )}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                />
                
                {selectedFile ? (
                  <div className="space-y-1">
                    <FileText className="h-8 w-8 text-[var(--royal-indigo)] mx-auto animate-bounce" />
                    <div className="text-[var(--text-xs)] font-bold text-[var(--text-primary)]">{selectedFile.name}</div>
                    <div className="text-[9px] text-[var(--text-secondary)] uppercase">{formatBytes(selectedFile.size)}</div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <UploadCloud className="h-8 w-8 text-[var(--text-muted)] mx-auto opacity-70" />
                    <div className="text-[var(--text-xs)] font-bold text-[var(--text-primary)] uppercase tracking-wider">Drag & drop files or click to browse</div>
                    <div className="text-[9px] text-[var(--text-muted)] font-semibold uppercase">PDF, CSV, JPEG, PNG formats supported</div>
                  </div>
                )}
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Document Title *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. GDPR Audit Assessment Checklist" 
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-1.5 text-[var(--text-xs)] focus:outline-none focus:border-[var(--violet-blue)]"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Description</label>
                <textarea 
                  placeholder="Provide detailed compliance context..." 
                  value={uploadDescription}
                  onChange={e => setUploadDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-1.5 text-[var(--text-xs)] focus:outline-none focus:border-[var(--violet-blue)] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Entity Type Select */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Entity Context *</label>
                  <select 
                    value={uploadEntityType}
                    onChange={e => setUploadEntityType(e.target.value)}
                    className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-1.5 text-[var(--text-xs)] focus:outline-none focus:border-[var(--violet-blue)] font-bold text-[var(--text-secondary)] h-8 outline-none"
                  >
                    <option value="policy">POLICY</option>
                    <option value="risk">RISK</option>
                    <option value="compliance">COMPLIANCE</option>
                    <option value="incident">INCIDENT</option>
                    <option value="guardrail">GUARDRAIL</option>
                  </select>
                </div>

                {/* Entity ID */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Entity ID (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="UUID or key identifier" 
                    value={uploadEntityId}
                    onChange={e => setUploadEntityId(e.target.value)}
                    className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-1.5 text-[var(--text-xs)] focus:outline-none focus:border-[var(--violet-blue)] h-8"
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Tags (Comma-separated)</label>
                <input 
                  type="text" 
                  placeholder="e.g. gdpr, audit-2026, verification" 
                  value={uploadTags}
                  onChange={e => setUploadTags(e.target.value)}
                  className="w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded px-3 py-1.5 text-[var(--text-xs)] focus:outline-none focus:border-[var(--violet-blue)]"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-default)]">
                <button 
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-1.5 rounded text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all border-none bg-transparent"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isUploading}
                  className="btn-primary h-8 flex items-center justify-center gap-2 !px-5 !py-0 !text-[10px] uppercase tracking-widest shadow-lg shadow-[var(--royal-indigo)]/10"
                >
                  {isUploading ? (
                    <>
                      <LoaderCircle className="h-4.5 w-4.5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Add Evidence</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
