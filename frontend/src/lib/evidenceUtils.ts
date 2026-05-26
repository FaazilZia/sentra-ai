import { FileText, FileSpreadsheet, FileImage, File } from 'lucide-react';
import React, { useState } from 'react';

/**
 * Shared evidence utilities used by both EvidenceSection and Evidence pages.
 * Eliminates cross-file duplication detected by SonarCloud.
 */

/** Format byte values into human-readable strings */
export function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/** Map MIME type strings to appropriate Lucide file icons */
export function getFileIcon(mimeType: string) {
  const mime = mimeType.toLowerCase();
  if (mime.includes('pdf')) return FileText;
  if (mime.includes('csv') || mime.includes('sheet') || mime.includes('excel')) return FileSpreadsheet;
  if (mime.includes('image/') || mime.includes('png') || mime.includes('jpeg') || mime.includes('jpg')) return FileImage;
  return File;
}

/** Reusable hook for file drag-and-drop + file input selection */
export function useFileDragDrop() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  return { selectedFile, setSelectedFile, isDragging, handleDragOver, handleDragLeave, handleDrop, handleFileSelect };
}
