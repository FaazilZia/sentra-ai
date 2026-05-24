import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderOpen, Plus, Trash2, Download, FileText, 
  FileSpreadsheet, FileImage, File, UploadCloud, X, LoaderCircle
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

interface EvidenceSectionProps {
  entityType: 'risk' | 'policy' | 'compliance' | 'incident' | 'guardrail';
  entityId: string;
}

function formatBytes(bytes: number, decimals = 2) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getFileIcon(mimeType: string) {
  const mime = mimeType.toLowerCase();
  if (mime.includes('pdf')) return FileText;
  if (mime.includes('csv') || mime.includes('sheet') || mime.includes('excel')) return FileSpreadsheet;
  if (mime.includes('image/') || mime.includes('png') || mime.includes('jpeg') || mime.includes('jpg')) return FileImage;
  return File;
}

export function EvidenceSection({ entityType, entityId }: EvidenceSectionProps) {
  const addToast = useStore(state => state.addToast);
  
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<any[]>(`/evidence?entityType=${entityType}&entityId=${entityId}`);
      setFiles(data);
    } catch (err) {
      console.error('Failed to load evidence for entity:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (entityId) {
      loadFiles();
    }
  }, [entityType, entityId]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      addToast({ message: 'PLEASE SELECT A FILE', type: 'warning' });
      return;
    }
    if (!title.trim()) {
      addToast({ message: 'TITLE IS REQUIRED', type: 'warning' });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);
      formData.append('tags', tags);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api/v1'}/evidence`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Upload failed');

      addToast({ message: 'EVIDENCE RECORD ADDED SUCCESSFULLY', type: 'success' });
      
      // Reset form
      setTitle('');
      setDescription('');
      setTags('');
      setSelectedFile(null);
      setIsFormOpen(false);
      
      // Reload
      loadFiles();
    } catch (err) {
      console.error('File upload failed:', err);
      addToast({ message: 'UPLOAD FAILED', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this evidence record?')) return;
    try {
      await apiRequest(`/evidence/${id}`, { method: 'DELETE' });
      addToast({ message: 'EVIDENCE REMOVED', type: 'success' });
      loadFiles();
    } catch (err) {
      console.error(err);
      addToast({ message: 'DELETE FAILED', type: 'error' });
    }
  };

  const handleView = (url: string) => {
    const fullUrl = url.startsWith('/') 
      ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:10000'}${url}`
      : url;
    window.open(fullUrl, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Title & Actions */}
      <div className="flex items-center justify-between border-b border-[var(--border-default)]/60 pb-3">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-[var(--royal-indigo)]" />
          <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-primary)]">Attached Evidence ({files.length})</h4>
        </div>
        <button
          onClick={() => setIsFormOpen(prev => !prev)}
          className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white bg-[var(--royal-indigo)] hover:bg-[var(--mid-indigo)] rounded flex items-center gap-1 transition-all"
        >
          {isFormOpen ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          <span>{isFormOpen ? 'Cancel' : 'Add File'}</span>
        </button>
      </div>

      {/* Upload Form Box */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="p-4 bg-[var(--bg-page)]/40 border border-[var(--border-default)] rounded-[var(--radius)] space-y-3 animate-fade-in text-left">
          <div 
            role="button"
            tabIndex={0}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
            className={cn(
              "border border-dashed rounded-[var(--radius)] p-4 text-center cursor-pointer min-h-[80px] flex flex-col justify-center items-center transition-all",
              isDragging ? "border-[var(--royal-indigo)] bg-[var(--ghost-violet)]/10" : "border-[var(--border-strong)] bg-white hover:border-[var(--royal-indigo)]"
            )}
          >
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
            {selectedFile ? (
              <div>
                <FileText className="h-6 w-6 text-[var(--royal-indigo)] mx-auto mb-1 animate-bounce" />
                <div className="text-[10px] font-bold text-[var(--text-primary)] truncate max-w-[200px]">{selectedFile.name}</div>
                <div className="text-[8px] text-[var(--text-muted)] font-bold">{formatBytes(selectedFile.size)}</div>
              </div>
            ) : (
              <div>
                <UploadCloud className="h-6 w-6 text-[var(--text-muted)] mx-auto mb-1" />
                <div className="text-[9px] font-bold text-[var(--text-primary)] uppercase">Drag & Drop or Click to browse</div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <input 
              type="text"
              placeholder="Evidence Title *"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-white border border-[var(--border-default)] rounded px-2.5 py-1 text-[var(--text-xs)] focus:outline-none focus:border-[var(--violet-blue)]"
            />
            <input 
              type="text"
              placeholder="Description (Optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-white border border-[var(--border-default)] rounded px-2.5 py-1 text-[var(--text-xs)] focus:outline-none focus:border-[var(--violet-blue)]"
            />
            <input 
              type="text"
              placeholder="Tags (comma-separated, e.g. compliance, audit)"
              value={tags}
              onChange={e => setTags(e.target.value)}
              className="w-full bg-white border border-[var(--border-default)] rounded px-2.5 py-1 text-[var(--text-xs)] focus:outline-none focus:border-[var(--violet-blue)]"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isUploading}
              className="btn-primary h-7 !px-4 !py-0 !text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5"
            >
              {isUploading ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              <span>{isUploading ? 'Uploading...' : 'Save Evidence'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Files List Dashboard */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6 gap-2">
          <LoaderCircle className="h-4.5 w-4.5 animate-spin text-[var(--royal-indigo)]" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Retrieving files...</span>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-[var(--border-default)] rounded-[var(--radius)]">
          <File className="h-8 w-8 text-[var(--text-muted)] opacity-55 mx-auto mb-1.5" />
          <p className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider">No attached evidence found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {files.map(item => {
            const FileIcon = getFileIcon(item.mimeType);
            return (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-2.5 bg-[var(--bg-page)]/20 border border-[var(--border-default)] rounded-[var(--radius)] hover:bg-[var(--bg-hover)]/30 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded bg-[var(--ghost-violet)] text-[var(--royal-indigo)] flex items-center justify-center shrink-0">
                    <FileIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[var(--text-xs)] font-bold text-[var(--text-primary)] truncate max-w-[180px]">{item.title}</div>
                    <div className="text-[8px] text-[var(--text-muted)] font-semibold uppercase mt-0.5">
                      {formatBytes(item.fileSize)} • {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleView(item.fileUrl)}
                    className="p-1 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all hover:text-[var(--royal-indigo)]"
                    title="Download File"
                  >
                    <Download className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 rounded text-[var(--text-secondary)] hover:bg-rose-50 transition-all hover:text-rose-600"
                    title="Remove File"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
