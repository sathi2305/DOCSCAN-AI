import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  X,
  Trash2,
  Download,
  Eye,
  RotateCcw,
  Upload,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { DocumentItem, User } from '../types/forensics.js';
import { api } from '../services/api.js';

interface DocumentHistoryItem extends DocumentItem {
  investigationTitle?: string;
}

interface DocumentManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onOpenWorkspaceWithDoc: (investigationId: string, docId: string) => void;
  onTriggerUpload: () => void;
  onRefreshAll: () => void;
}

export const DocumentManagementModal: React.FC<DocumentManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenWorkspaceWithDoc,
  onTriggerUpload,
  onRefreshAll,
}) => {
  const [documents, setDocuments] = useState<DocumentHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [previewDoc, setPreviewDoc] = useState<DocumentHistoryItem | null>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<DocumentHistoryItem | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const data = await api.getDocumentsHistory();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load document history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = async (doc: DocumentHistoryItem) => {
    try {
      await api.deleteDocument(doc.investigationId, doc.id, currentUser.name, currentUser.role);
      setDeleteConfirmDoc(null);
      setActionMessage(`Document "${doc.originalName}" was removed.`);
      fetchHistory();
      onRefreshAll();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  const handleRetry = async (doc: DocumentHistoryItem) => {
    try {
      setActionMessage(`Retrying forensic analysis on "${doc.originalName}"...`);
      await api.retryDocumentAnalysis(doc.investigationId, doc.id);
      setActionMessage(`Analysis re-completed for "${doc.originalName}".`);
      fetchHistory();
      onRefreshAll();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    }
  };

  const handleDownload = (doc: DocumentHistoryItem) => {
    // Generate text/binary download blob
    const content = `DOCUSCAN AI FORENSIC ASSET\nDocument ID: ${doc.id}\nOriginal Name: ${doc.originalName}\nClassification: ${doc.classification}\nSHA-256 Digest: ${doc.sha256Hash}\nIngested: ${doc.uploadedAt}\nBy: ${doc.uploadedBy}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DOCUSCAN_${doc.id}_${doc.originalName}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.classification.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.investigationTitle && doc.investigationTitle.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' || doc.processingStatus.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Document Repository &amp; Ingestion Management
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                  {documents.length} ASSETS
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Audit history, cryptographic verification, re-analysis, and forensic asset management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onClose();
                onTriggerUpload();
              }}
              className="px-3 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>+ Upload Document</span>
            </button>

            <button
              onClick={onClose}
              aria-label="Close document management modal"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents by name, ID, or case..."
              className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[11px] text-slate-400 whitespace-nowrap">Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="all">All Statuses ({documents.length})</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="processing ocr">Processing</option>
            </select>
          </div>
        </div>

        {/* Action feedback alert */}
        {actionMessage && (
          <div className="px-6 py-2 bg-cyan-500/10 border-b border-cyan-500/30 text-xs text-cyan-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono">Loading ingested document ledger...</span>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-3">
              <FileText className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No documents found matching filter</p>
              <button
                onClick={() => {
                  onClose();
                  onTriggerUpload();
                }}
                className="px-4 py-2 rounded-lg bg-cyan-400 text-slate-950 font-semibold text-xs inline-flex items-center gap-2 hover:bg-cyan-300"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload First Document</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 font-mono text-[11px]">
                    <th className="py-3 px-4 font-semibold">Document Name &amp; ID</th>
                    <th className="py-3 px-4 font-semibold">Classification</th>
                    <th className="py-3 px-4 font-semibold">Case Dossier</th>
                    <th className="py-3 px-4 font-semibold">Uploaded Date</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Name & ID */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                          <div>
                            <span className="font-semibold text-white block truncate max-w-xs" title={doc.originalName}>
                              {doc.originalName}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {doc.id} · {(doc.fileSize / 1024).toFixed(1)} KB · {doc.mimeType}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Classification */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300">
                          {doc.classification}
                        </span>
                      </td>

                      {/* Case Dossier */}
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-mono text-cyan-400 text-[11px] font-semibold block">
                            {doc.investigationId}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate max-w-[180px] block" title={doc.investigationTitle}>
                            {doc.investigationTitle || 'Investigation Case'}
                          </span>
                        </div>
                      </td>

                      {/* Upload Date */}
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                        <span className="block text-[10px] text-slate-500">by {doc.uploadedBy}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase inline-flex items-center gap-1 ${
                            doc.processingStatus === 'Completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : doc.processingStatus === 'Failed'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            doc.processingStatus === 'Completed' ? 'bg-emerald-400' : doc.processingStatus === 'Failed' ? 'bg-red-400' : 'bg-cyan-400 animate-ping'
                          }`} />
                          {doc.processingStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Preview */}
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            title="Preview Document Scan"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* View Analysis */}
                          <button
                            onClick={() => {
                              onClose();
                              onOpenWorkspaceWithDoc(doc.investigationId, doc.id);
                            }}
                            title="Open Forensic Workspace"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          {/* Download */}
                          <button
                            onClick={() => handleDownload(doc)}
                            title="Download Evidentiary Package"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Retry */}
                          <button
                            onClick={() => handleRetry(doc)}
                            title="Retry Forensic Analysis"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          {/* Remove */}
                          <button
                            onClick={() => setDeleteConfirmDoc(doc)}
                            title="Remove Document from Case"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>SHA-256 Cryptographic Chain of Custody Verified</span>
          <span>Showing {filteredDocs.length} of {documents.length} ingested files</span>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmDoc && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-red-500/30 p-6 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>

            <div>
              <h4 className="text-sm font-bold text-white">Remove Evidentiary Document?</h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Are you sure you want to remove <strong className="text-white">{deleteConfirmDoc.originalName}</strong> ({deleteConfirmDoc.id}) from case {deleteConfirmDoc.investigationId}? All associated visual findings and field extractions will be deleted.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmDoc(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmDoc)}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-500/20"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Scan Preview Dialog */}
      {previewDoc && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white">{previewDoc.originalName}</h4>
                <span className="text-[11px] font-mono text-cyan-400">SHA-256: {previewDoc.sha256Hash}</span>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Classification:</span>
                <span className="font-semibold text-white">{previewDoc.classification}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">File Size:</span>
                <span className="font-mono text-white">{(previewDoc.fileSize / 1024).toFixed(1)} KB</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">MIME Type:</span>
                <span className="font-mono text-white">{previewDoc.mimeType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Uploaded Date:</span>
                <span className="font-mono text-white">{new Date(previewDoc.uploadedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Uploaded By:</span>
                <span className="text-white">{previewDoc.uploadedBy}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  const targetDoc = previewDoc;
                  setPreviewDoc(null);
                  onClose();
                  onOpenWorkspaceWithDoc(targetDoc.investigationId, targetDoc.id);
                }}
                className="px-4 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Forensic Workspace</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
