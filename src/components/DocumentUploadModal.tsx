import React, { useState, useRef } from 'react';
import {
  Upload,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Layers,
  Sparkles,
  FileCheck,
  Trash2,
} from 'lucide-react';
import { DocumentClassification, Investigation } from '../types/forensics.js';

interface DocumentUploadModalProps {
  investigationId?: string;
  investigations?: Investigation[];
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newDoc?: any) => void;
  userName: string;
  userRole: string;
}

interface QueuedFile {
  id: string;
  file: File;
  classification: DocumentClassification;
  status: 'Queued' | 'Uploading' | 'Processing OCR' | 'Completed' | 'Completed with warnings' | 'Failed';
  progress: number;
  errorMessage?: string;
}

const CLASSIFICATIONS: DocumentClassification[] = [
  'Salary Slip',
  'Bank Account Statement',
  'Loan Application Form',
  'Commercial Invoice',
  'Tax Return (ITR/W2)',
  'Government ID / Passport',
  'Employment Verification Letter',
  'Legal Contract',
  'Other Document',
];

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  investigationId: initialCaseId,
  investigations = [],
  isOpen,
  onClose,
  onUploadSuccess,
  userName,
  userRole,
}) => {
  const [targetCaseId, setTargetCaseId] = useState<string>(() => {
    return initialCaseId || (investigations.length > 0 ? investigations[0].id : 'INV-2026-0841');
  });

  const [filesQueue, setFilesQueue] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const inferClassification = (fileName: string): DocumentClassification => {
    const lower = fileName.toLowerCase();
    if (lower.includes('bank') || lower.includes('statement')) return 'Bank Account Statement';
    if (lower.includes('salary') || lower.includes('slip') || lower.includes('pay')) return 'Salary Slip';
    if (lower.includes('loan') || lower.includes('app')) return 'Loan Application Form';
    if (lower.includes('invoice') || lower.includes('bill')) return 'Commercial Invoice';
    if (lower.includes('tax') || lower.includes('w2') || lower.includes('form16') || lower.includes('itr')) return 'Tax Return (ITR/W2)';
    if (lower.includes('id') || lower.includes('passport') || lower.includes('license')) return 'Government ID / Passport';
    return 'Other Document';
  };

  const handleFilesSelected = (filesList: FileList | File[]) => {
    setGlobalError(null);
    setGlobalSuccess(null);

    const allowedMime = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    const maxSizeBytes = 25 * 1024 * 1024; // 25MB

    const newQueued: QueuedFile[] = [];

    Array.from(filesList).forEach((f) => {
      // Validate format
      if (!allowedMime.includes(f.type)) {
        setGlobalError(`File "${f.name}" was skipped: Only PDF, PNG, JPG, and JPEG are supported.`);
        return;
      }
      // Validate size
      if (f.size > maxSizeBytes) {
        setGlobalError(`File "${f.name}" was skipped: Exceeds 25MB forensic processing limit.`);
        return;
      }

      newQueued.push({
        id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file: f,
        classification: inferClassification(f.name),
        status: 'Queued',
        progress: 0,
      });
    });

    setFilesQueue((prev) => [...prev, ...newQueued]);
  };

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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const handleRemoveQueued = (id: string) => {
    setFilesQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClassificationChange = (id: string, newClass: DocumentClassification) => {
    setFilesQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, classification: newClass } : item))
    );
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const uploadSingleFile = async (item: QueuedFile, caseId: string) => {
    // Step 1: Uploading
    setFilesQueue((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, status: 'Uploading', progress: 25 } : f))
    );

    const base64Data = await convertFileToBase64(item.file);

    // Step 2: Processing OCR & Forensics
    setFilesQueue((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, status: 'Processing OCR', progress: 65 } : f))
    );

    const response = await fetch(`/api/investigations/${caseId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalName: item.file.name,
        fileSize: item.file.size,
        mimeType: item.file.type,
        base64Data,
        classification: item.classification,
        userName,
        userRole,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Server rejected file');
    }

    const result = await response.json();

    // Check if any critical findings
    const hasWarnings = result.analysis?.findings?.some(
      (f: any) => f.severity === 'critical' || f.severity === 'high'
    );

    setFilesQueue((prev) =>
      prev.map((f) =>
        f.id === item.id
          ? {
              ...f,
              status: hasWarnings ? 'Completed with warnings' : 'Completed',
              progress: 100,
            }
          : f
      )
    );

    return result.document;
  };

  const handleStartBatchUpload = async () => {
    if (filesQueue.length === 0) return;

    setIsProcessingBatch(true);
    setGlobalError(null);
    setGlobalSuccess(null);

    const caseId = initialCaseId || targetCaseId;
    let successCount = 0;
    let lastUploadedDoc: any = null;

    for (const item of filesQueue) {
      if (item.status === 'Completed' || item.status === 'Completed with warnings') {
        successCount++;
        continue;
      }

      try {
        const doc = await uploadSingleFile(item, caseId);
        lastUploadedDoc = doc;
        successCount++;
      } catch (err: any) {
        setFilesQueue((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  status: 'Failed',
                  progress: 0,
                  errorMessage: err.message || 'Processing error',
                }
              : f
          )
        );
      }
    }

    setIsProcessingBatch(false);

    if (successCount > 0) {
      setGlobalSuccess(
        `Successfully ingested ${successCount} document${successCount > 1 ? 's' : ''} into case ${caseId}!`
      );
      onUploadSuccess(lastUploadedDoc);
      setTimeout(() => {
        onClose();
      }, 1600);
    }
  };

  const handleRetryFailed = (id: string) => {
    setFilesQueue((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'Queued', errorMessage: undefined } : f))
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Ingest Forensic Evidence &amp; Documents
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                  MULTI-FILE UPLOAD
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Supports PDF, PNG, JPG, JPEG with real-time SHA-256 integrity verification
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessingBatch}
            aria-label="Close upload modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Target Investigation Selector (if not pre-locked) */}
          {!initialCaseId && investigations.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Select Target Case Dossier:
              </label>
              <select
                value={targetCaseId}
                onChange={(e) => setTargetCaseId(e.target.value)}
                disabled={isProcessingBatch}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                {investigations.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    [{inv.id}] {inv.title} ({inv.documents.length} existing files)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-7 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
              isDragging
                ? 'border-cyan-400 bg-cyan-500/10 scale-[0.99]'
                : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => {
                if (e.target.files) handleFilesSelected(e.target.files);
              }}
              className="hidden"
            />

            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 mb-3 shadow-md">
              <Upload className="w-6 h-6 animate-bounce" />
            </div>

            <p className="text-sm font-semibold text-white">
              Drag &amp; drop evidentiary files here, or <span className="text-cyan-400 underline">Browse Files</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1 font-mono">
              Multiple file selection enabled · Max 25MB per file (PDF, PNG, JPG, JPEG)
            </p>
          </div>

          {/* Error / Success Notifications */}
          {globalError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 flex items-start gap-2 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{globalError}</span>
            </div>
          )}

          {globalSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{globalSuccess}</span>
            </div>
          )}

          {/* Selected Files Queue */}
          {filesQueue.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                <span className="flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Files Ingestion Queue ({filesQueue.length} files)
                </span>
                {!isProcessingBatch && (
                  <button
                    onClick={() => setFilesQueue([])}
                    className="text-[11px] text-slate-400 hover:text-red-400 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {filesQueue.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 truncate">
                        <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div className="truncate">
                          <span className="font-semibold text-white truncate block">
                            {item.file.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {formatFileSize(item.file.size)} · {item.file.type}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Classification Dropdown */}
                        <select
                          value={item.classification}
                          onChange={(e) =>
                            handleClassificationChange(
                              item.id,
                              e.target.value as DocumentClassification
                            )
                          }
                          disabled={isProcessingBatch}
                          className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                        >
                          {CLASSIFICATIONS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>

                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            item.status === 'Completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : item.status === 'Completed with warnings'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : item.status === 'Failed'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : item.status === 'Uploading' || item.status === 'Processing OCR'
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.status}
                        </span>

                        {/* Retry button for failed item */}
                        {item.status === 'Failed' && (
                          <button
                            onClick={() => handleRetryFailed(item.id)}
                            title="Retry ingestion"
                            className="p-1 rounded text-cyan-400 hover:text-cyan-300 hover:bg-slate-800"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete from queue */}
                        {!isProcessingBatch && (
                          <button
                            onClick={() => handleRemoveQueued(item.id)}
                            title="Remove file"
                            className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {(item.status === 'Uploading' || item.status === 'Processing OCR') && (
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}

                    {item.errorMessage && (
                      <p className="text-[10px] text-red-400 font-mono">
                        Error: {item.errorMessage}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <div className="text-[11px] text-slate-500 font-mono">
            {filesQueue.length} file{filesQueue.length !== 1 ? 's' : ''} queued
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isProcessingBatch}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleStartBatchUpload}
              disabled={isProcessingBatch || filesQueue.length === 0}
              className="px-5 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs shadow-md shadow-cyan-500/20 transition-all flex items-center gap-2 disabled:opacity-40 cursor-pointer"
            >
              {isProcessingBatch ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Processing Forensics...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload &amp; Start Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
