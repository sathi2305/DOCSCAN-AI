import React, { useState } from 'react';
import {
  FileText,
  Download,
  X,
  CheckCircle2,
  Shield,
  Layers,
  ScanEye,
  AlertTriangle,
  Lock,
  Cpu,
  FileCheck2,
} from 'lucide-react';
import { Investigation, ExtractedField } from '../types/forensics.js';
import { generateInvestigationDossierPDF, DossierGenerationOptions } from '../services/pdfReportGenerator.js';

interface DossierExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  investigation: Investigation;
  extractedFieldsMap?: Record<string, ExtractedField[]>;
}

export const DossierExportModal: React.FC<DossierExportModalProps> = ({
  isOpen,
  onClose,
  investigation,
  extractedFieldsMap = {},
}) => {
  const [includeCoverPage, setIncludeCoverPage] = useState<boolean>(true);
  const [includeMetadata, setIncludeMetadata] = useState<boolean>(true);
  const [includeVisualSchematics, setIncludeVisualSchematics] = useState<boolean>(true);
  const [includeDiscrepancies, setIncludeDiscrepancies] = useState<boolean>(true);
  const [includeOcrFields, setIncludeOcrFields] = useState<boolean>(true);
  const [includeAiReasoning, setIncludeAiReasoning] = useState<boolean>(true);
  const [includeReviewSignoff, setIncludeReviewSignoff] = useState<boolean>(true);

  const [confidentialityLabel, setConfidentialityLabel] = useState<string>(
    'CONFIDENTIAL · LAW ENFORCEMENT & UNDERWRITING USE ONLY'
  );
  const [customNotes, setCustomNotes] = useState<string>('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(
    investigation.documents.map((d) => d.id)
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDocToggle = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSelectAllDocs = () => {
    if (selectedDocIds.length === investigation.documents.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(investigation.documents.map((d) => d.id));
    }
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setSuccessMessage(null);

    const options: DossierGenerationOptions = {
      includeCoverPage,
      includeMetadata,
      includeVisualSchematics,
      includeDiscrepancies,
      includeOcrFields,
      includeAiReasoning,
      includeReviewSignoff,
      confidentialityLabel,
      customNotes: customNotes.trim() || undefined,
      selectedDocIds: selectedDocIds.length > 0 ? selectedDocIds : undefined,
    };

    setTimeout(() => {
      try {
        generateInvestigationDossierPDF(investigation, extractedFieldsMap, options);
        setIsGenerating(false);
        setSuccessMessage('Forensic Dossier compiled and downloaded successfully!');
        setTimeout(() => {
          onClose();
        }, 1800);
      } catch (err) {
        console.error('PDF compilation failed:', err);
        setIsGenerating(false);
      }
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Automated Forensic Dossier Generator
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                  PDF EXPORT
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Case {investigation.id} · {investigation.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close dossier generator modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Quick Stats Pill Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Ingested Files</span>
              <span className="text-sm font-bold text-white font-mono">{selectedDocIds.length} / {investigation.documents.length}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Visual Findings</span>
              <span className="text-sm font-bold text-red-400 font-mono">{investigation.findings.length} Anomalies</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Context Conflicts</span>
              <span className="text-sm font-bold text-amber-400 font-mono">{investigation.discrepancies.length} Flagged</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Risk Rating</span>
              <span className="text-sm font-bold text-cyan-400 font-mono">
                {investigation.reviewDecision?.riskScore ?? (investigation.findings.length > 0 ? 88 : 15)}%
              </span>
            </div>
          </div>

          {/* Target Documents Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Select Ingested Assets to Include ({selectedDocIds.length} selected)
              </label>
              <button
                type="button"
                onClick={handleSelectAllDocs}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {selectedDocIds.length === investigation.documents.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="space-y-1.5">
              {investigation.documents.map((docItem) => (
                <label
                  key={docItem.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                    selectedDocIds.includes(docItem.id)
                      ? 'bg-slate-950 border-cyan-500/40 text-slate-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={selectedDocIds.includes(docItem.id)}
                      onChange={() => handleDocToggle(docItem.id)}
                      className="rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-0 focus:ring-offset-0"
                    />
                    <div>
                      <span className="font-medium text-white block">{docItem.originalName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {docItem.classification} · {(docItem.fileSize / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                    {docItem.sha256Hash.slice(0, 16)}...
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Dossier Sections Checklist */}
          <div>
            <label className="font-semibold text-slate-200 block mb-2">
              Dossier Content Modules
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCoverPage}
                  onChange={(e) => setIncludeCoverPage(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-0"
                />
                <div>
                  <span className="font-medium text-white">Cover &amp; Executive Summary</span>
                  <p className="text-[10px] text-slate-500">Case header, lead reviewer, risk meter</p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-0"
                />
                <div>
                  <span className="font-medium text-white">Document Metadata &amp; SHA-256</span>
                  <p className="text-[10px] text-slate-500">Cryptographic hashes, file sizes, mime types</p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeVisualSchematics}
                  onChange={(e) => setIncludeVisualSchematics(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-0"
                />
                <div>
                  <span className="font-medium text-white">Visual Evidence Schematics</span>
                  <p className="text-[10px] text-slate-500">Coordinate bounding boxes &amp; kerning deltas</p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDiscrepancies}
                  onChange={(e) => setIncludeDiscrepancies(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-0"
                />
                <div>
                  <span className="font-medium text-white">Contextual Cross-Doc Matrix</span>
                  <p className="text-[10px] text-slate-500">Side-by-side reconciliation of figures</p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeOcrFields}
                  onChange={(e) => setIncludeOcrFields(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-0"
                />
                <div>
                  <span className="font-medium text-white">OCR Field Extraction Ledger</span>
                  <p className="text-[10px] text-slate-500">Structured values &amp; confidence scores</p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAiReasoning}
                  onChange={(e) => setIncludeAiReasoning(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-0"
                />
                <div>
                  <span className="font-medium text-white">AI Multimodal Reasoning</span>
                  <p className="text-[10px] text-slate-500">Grounded forensic correlation synthesis</p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer sm:col-span-2">
                <input
                  type="checkbox"
                  checked={includeReviewSignoff}
                  onChange={(e) => setIncludeReviewSignoff(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-0"
                />
                <div>
                  <span className="font-medium text-white">Human Review Verdict &amp; Signature Block</span>
                  <p className="text-[10px] text-slate-500">Official stamped determination, reviewer rationale, and authorized signature line</p>
                </div>
              </label>
            </div>
          </div>

          {/* Security & Confidentiality Mark */}
          <div>
            <label className="font-semibold text-slate-200 block mb-1">
              Security Classification &amp; Header Stamp
            </label>
            <select
              value={confidentialityLabel}
              onChange={(e) => setConfidentialityLabel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="CONFIDENTIAL · LAW ENFORCEMENT & UNDERWRITING USE ONLY">
                CONFIDENTIAL · LAW ENFORCEMENT &amp; UNDERWRITING USE ONLY
              </option>
              <option value="RESTRICTED AUDIT DOSSIER · INTERNAL COMPLIANCE">
                RESTRICTED AUDIT DOSSIER · INTERNAL COMPLIANCE
              </option>
              <option value="CONFIDENTIAL FORENSIC REPORT · COURT-ADMISSIBLE RECORD">
                CONFIDENTIAL FORENSIC REPORT · COURT-ADMISSIBLE RECORD
              </option>
              <option value="PRIVILEGED & PROPRIETARY · STRICT EMBARGO">
                PRIVILEGED &amp; PROPRIETARY · STRICT EMBARGO
              </option>
            </select>
          </div>

          {/* Additional Forensic Notes */}
          <div>
            <label className="font-semibold text-slate-200 block mb-1">
              Custom Lead Examiner Remarks (Optional)
            </label>
            <textarea
              rows={2}
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Inject custom examiner observations, corroborating phone verification details, or committee instructions into the synthesis..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <div className="text-[11px] text-slate-500 font-mono">
            Output: ISO A4 Portrait · High-DPI Vector
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || selectedDocIds.length === 0}
              className="px-5 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs shadow-md shadow-cyan-500/20 transition-all flex items-center gap-2 disabled:opacity-40 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Compiling Dossier...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Compile &amp; Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
