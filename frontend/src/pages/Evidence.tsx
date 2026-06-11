import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderOpen, Plus, Trash2, Download, FileText, 
  UploadCloud, X, Calendar, User, LoaderCircle,
  ShieldCheck, Info
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { formatBytes, getFileIcon, useFileDragDrop } from '@/lib/evidenceUtils';

export default function Evidence() {
  const addToast = useStore(state => state.addToast);

  // Selector States
  const [selectedFramework, setSelectedFramework] = useState<'EU_AI_ACT' | 'NIST' | 'ISO42001' | 'ISO27001'>('EU_AI_ACT');
  const [selectedControlId, setSelectedControlId] = useState('EU-AIA-15-1');

  // List States
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Upload Form State
  const [isUploading, setIsUploading] = useState(false);
  const { selectedFile, setSelectedFile, isDragging, handleDragOver, handleDragLeave, handleDrop, handleFileSelect } = useFileDragDrop();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const FRAMEWORK_CONTROLS = {
    EU_AI_ACT: ['EU-AIA-15-1', 'EU-AIA-15-2', 'EU-AIA-15-3', 'EU-AIA-27-1', 'EU-AIA-72-1', 'EU-AIA-72-2'],
    NIST: ['NIST-GOVERN-1', 'NIST-MEASURE-2.5', 'NIST-MAP-1.1', 'NIST-PR-AT-1'],
    ISO42001: ['ISO-42001-A5.1', 'ISO-42001-A6.1', 'ISO-42001-A7.2', 'ISO-42001-A8.1'],
    ISO27001: ['ISO-27001-A5.1', 'ISO-27001-A6.1', 'ISO-27001-A7.1', 'ISO-27001-A8.1']
  };

  // Reset control selection when framework changes
  useEffect(() => {
    setSelectedControlId(FRAMEWORK_CONTROLS[selectedFramework]?.[0] || '');
  }, [selectedFramework]);

  // Fetch all evidence records
  const loadEvidence = async () => {
    setIsLoading(true);
    try {
      const list = await apiRequest<any[]>(`/evidence-files/${selectedFramework}/${selectedControlId}`);
      setEvidenceList(list || []);
    } catch (err) {
      console.error('Failed to load evidence records:', err);
      addToast({ message: 'FAILED TO LOAD EVIDENCE RECORDS', type: 'error' });
      setEvidenceList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvidence();
  }, [selectedFramework, selectedControlId]);

  // Submit file upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      addToast({ message: 'PLEASE SELECT A FILE TO UPLOAD', type: 'warning' });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('controlType', selectedFramework);
      formData.append('controlId', selectedControlId);

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api/v1';
      const impersonationToken = localStorage.getItem('sentra_impersonation_token');
      const accessToken = localStorage.getItem('sentra_access_token');
      const headers: Record<string, string> = {};
      if (impersonationToken) {
        headers['Authorization'] = `Bearer ${impersonationToken}`;
      } else if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${apiBaseUrl}/evidence-files/upload`, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Upload failed');
      }

      addToast({ message: 'EVIDENCE FILE UPLOADED SUCCESSFULLY', type: 'success' });
      setSelectedFile(null);
      setIsUploadOpen(false);
      loadEvidence();
    } catch (err: any) {
      console.error('File upload failed:', err);
      addToast({ message: err.message || 'FILE UPLOAD FAILED', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  // Delete evidence record
  const handleDeleteEvidence = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this evidence file?')) return;
    
    try {
      await apiRequest(`/evidence-files/${id}`, { method: 'DELETE' });
      addToast({ message: 'EVIDENCE FILE DELETED', type: 'success' });
      loadEvidence();
    } catch (err) {
      console.error('Delete failed:', err);
      addToast({ message: 'FAILED TO DELETE EVIDENCE RECORD', type: 'error' });
    }
  };

  // View / Download File
  const handleViewFile = (storagePath: string) => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api/v1';
    const baseUrl = apiBaseUrl.replace('/api/v1', '');
    const cleanPath = storagePath.replace(/\\/g, '/');
    const fullUrl = `${baseUrl}/${cleanPath}`;
    window.open(fullUrl, '_blank');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in text-gray-200">
      
      {/* Header and Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-black uppercase tracking-widest text-indigo-400">Evidence Hub</h1>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
            Central secure repository for compliance filings, model cards, and continuous remediation proof
          </p>
        </div>
        <button 
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all hover:scale-105 active:scale-95 animate-pulse-subtle"
        >
          <Plus className="h-4 w-4" />
          <span>Upload Control Evidence</span>
        </button>
      </div>

      {/* Selector panel */}
      <div className="card-base p-5 flex flex-col md:flex-row md:items-center gap-4 bg-[#111827]/40 border border-gray-800 rounded-2xl shadow-xl backdrop-blur-md">
        
        <div className="flex flex-col gap-1.5 flex-1">
          <label htmlFor="framework-select" className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Compliance Framework</label>
          <select 
            id="framework-select"
            value={selectedFramework}
            onChange={e => setSelectedFramework(e.target.value as any)}
            className="w-full bg-black/30 border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 text-xs font-bold"
          >
            <option value="EU_AI_ACT">EU AI Act Obligations</option>
            <option value="NIST">NIST AI RMF 1.0 Dashboard</option>
            <option value="ISO42001">ISO/IEC 42001:2023 AIMS</option>
            <option value="ISO27001">ISO/IEC 27001:2022 ISMS</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          <label htmlFor="control-select" className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Associated Control ID</label>
          <select 
            id="control-select"
            value={selectedControlId}
            onChange={e => setSelectedControlId(e.target.value)}
            className="w-full bg-black/30 border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 text-xs font-bold font-mono"
          >
            {FRAMEWORK_CONTROLS[selectedFramework]?.map(code => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Main Evidence Table */}
      <div className="card-base overflow-hidden border border-gray-800 bg-[#111827]/20 shadow-2xl rounded-2xl backdrop-blur-md">
        
        <div className="p-5 border-b border-gray-800 bg-gray-900/10 flex items-center justify-between">
          <span className="text-[10px] font-black tracking-wider text-indigo-400 uppercase flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Control Registry: {selectedControlId}
          </span>
          <span className="text-xs text-gray-500">{evidenceList.length} files attached</span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <LoaderCircle className="h-8 w-8 animate-spin text-indigo-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Retrieving Secure Ledger...</span>
          </div>
        ) : evidenceList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FolderOpen className="h-12 w-12 text-gray-600 opacity-60 mb-3" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">No Evidence Uploaded</h3>
            <p className="text-[10px] text-gray-400 mt-1 max-w-sm uppercase leading-normal">
              No evidentiary files are attached to control {selectedControlId}. Upload a file to verify compliance.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-gray-950/20 text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-800">
                  <th className="py-3.5 px-4 pl-6">Title / Filename</th>
                  <th className="py-3.5 px-4">Framework</th>
                  <th className="py-3.5 px-4">Uploaded By</th>
                  <th className="py-3.5 px-4">Upload Date</th>
                  <th className="py-3.5 px-4">Size</th>
                  <th className="py-3.5 px-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40 text-gray-300">
                {evidenceList.map((item) => {
                  const FileIcon = getFileIcon(item.mime_type);
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-4 px-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 flex items-center justify-center shadow-md">
                            <FileIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white leading-tight">{item.original_name}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5 font-mono truncate max-w-[240px]" title={item.id}>
                              ID: {item.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 rounded-full">
                          {item.control_type}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <User className="h-3.5 w-3.5 text-gray-500" />
                          <span>{item.uploaded_by || 'Admin'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Calendar className="h-3.5 w-3.5 text-gray-500" />
                          <span>{new Date(item.created_at).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs font-mono text-gray-400">
                        {formatBytes(item.size)}
                      </td>
                      <td className="py-4 px-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewFile(item.storage_path)}
                            className="p-1.5 rounded-xl border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800 transition-all shadow-md"
                            title="Download/View Evidence"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvidence(item.id)}
                            className="p-1.5 rounded-xl border border-gray-800 text-gray-500 hover:text-red-400 hover:bg-red-500/5 hover:border-red-500/20 transition-all shadow-md"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-scale-in">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/10">
              <div className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">Upload Compliance Evidence</span>
              </div>
              <button 
                onClick={() => setIsUploadOpen(false)}
                className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-white transition-all outline-none"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-5 text-xs text-left">
              
              {/* Drag and Drop Zone */}
              <div 
                role="button"
                tabIndex={0}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
                className={cn(
                  "border border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px]",
                  isDragging ? "border-indigo-500 bg-indigo-950/20" : "border-gray-800 bg-black/20 hover:border-indigo-500"
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
                    <FileText className="h-8 w-8 text-indigo-400 mx-auto animate-bounce" />
                    <div className="text-xs font-bold text-white">{selectedFile.name}</div>
                    <div className="text-[10px] text-gray-500 uppercase font-mono">{formatBytes(selectedFile.size)}</div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <UploadCloud className="h-8 w-8 text-gray-600 mx-auto opacity-70" />
                    <div className="text-xs font-bold text-gray-300 uppercase tracking-wider">Drag & drop files or click to browse</div>
                    <div className="text-[10px] text-gray-500 font-semibold uppercase">PDF, CSV, JPEG, PNG formats supported</div>
                  </div>
                )}
              </div>

              <div className="bg-indigo-950/10 border border-indigo-900/30 rounded-xl p-3 text-indigo-300 leading-relaxed text-[10px] flex gap-2">
                <Info className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
                <span>
                  This file will be cryptographically associated with control <span className="font-bold text-white font-mono">{selectedControlId}</span> under the <span className="font-bold text-white">{selectedFramework}</span> framework.
                </span>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-850">
                <button 
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-gray-800 hover:text-white transition-all border-none bg-transparent"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isUploading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all animate-pulse-subtle"
                >
                  {isUploading ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Upload File</span>
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
