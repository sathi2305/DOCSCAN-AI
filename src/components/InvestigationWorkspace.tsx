import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  ArrowLeft,
  FileText,
  ScanEye,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  FileCheck2,
  Download,
  Upload,
  Eye,
  RefreshCw,
  Send,
  Split,
  Edit2,
  Check,
  X,
  ExternalLink,
  Shield,
  HelpCircle,
  Cpu,
} from 'lucide-react';
import {
  Investigation,
  DocumentItem,
  VisualFinding,
  ExtractedField,
  ExtractedTable,
  ContextDiscrepancy,
  User,
  ForensicDetectionMethod,
} from '../types/forensics.js';
import { api } from '../services/api.js';
import { generateInvestigationDossierPDF } from '../services/pdfReportGenerator.js';
import { DocumentUploadModal } from './DocumentUploadModal.js';
import { BatchComparisonTool } from './BatchComparisonTool.js';
import { ThreeForensicCore } from './ThreeForensicCore.js';
import { DossierExportModal } from './DossierExportModal.js';
import { ExtendedMetadataPanel } from './ExtendedMetadataPanel.js';

interface InvestigationWorkspaceProps {
  investigationId: string;
  currentUser: User;
  onBack: () => void;
  onInvestigationUpdated: () => void;
}

export const InvestigationWorkspace: React.FC<InvestigationWorkspaceProps> = ({
  investigationId,
  currentUser,
  onBack,
  onInvestigationUpdated,
}) => {
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<
    'visual' | 'batch' | 'ocr' | 'metadata' | 'context' | 'assistant' | 'evidence' | 'dossier'
  >('visual');

  // Document selection
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [comparisonDocId, setComparisonDocId] = useState<string>('');
  const [isSideBySide, setIsSideBySide] = useState<boolean>(false);

  // Visual Forensic Controls
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [visualSidebarTab, setVisualSidebarTab] = useState<'findings' | 'metadata'>('findings');

  // Fields and Tables state
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [tables, setTables] = useState<ExtractedTable[]>([]);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editFieldValue, setEditFieldValue] = useState<string>('');

  // Finding review modal / drawer
  const [reviewFinding, setReviewFinding] = useState<VisualFinding | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');

  // AI Assistant Chat State
  const [chatMessages, setChatMessages] = useState<
    { sender: 'user' | 'assistant'; text: string; citations?: any[] }[]
  >([
    {
      sender: 'assistant',
      text: 'Hello, I am your DOCUSCAN Forensic Assistant. I have indexed this case\'s documents, optical character extractions, visual anomalies, and cross-document correlation matrix. How can I assist your investigation?',
    },
  ]);
  const [assistantInput, setAssistantInput] = useState<string>('');
  const [isAssistantLoading, setIsAssistantLoading] = useState<boolean>(false);

  // Final Review Sign-off state
  const [verdict, setVerdict] = useState<
    'Approved' | 'Escalated for Physical Inspection' | 'Rejected - Tampering Suspected'
  >('Escalated for Physical Inspection');
  const [riskScore, setRiskScore] = useState<number>(84);
  const [verdictNotes, setVerdictNotes] = useState<string>('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState<boolean>(false);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState<boolean>(false);

  // Load investigation data
  const loadCaseData = async () => {
    try {
      setIsLoading(true);
      const data = await api.getInvestigation(investigationId);
      setInvestigation(data);

      if (data.documents.length > 0 && !selectedDocId) {
        // Prefer salary slip if available for benchmark showcase
        const salaryDoc = data.documents.find((d) => d.classification === 'Salary Slip');
        const defaultDoc = salaryDoc ? salaryDoc.id : data.documents[0].id;
        setSelectedDocId(defaultDoc);

        // Second doc for comparison
        const bankDoc = data.documents.find((d) => d.classification === 'Bank Account Statement');
        if (bankDoc) {
          setComparisonDocId(bankDoc.id);
        } else if (data.documents.length > 1) {
          setComparisonDocId(data.documents[1].id);
        }
      }

      if (data.reviewDecision) {
        setVerdict(data.reviewDecision.verdict as any);
        setRiskScore(data.reviewDecision.riskScore);
        setVerdictNotes(data.reviewDecision.summaryNotes);
      }
    } catch (err) {
      console.error('Failed to load investigation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCaseData();
  }, [investigationId]);

  // Load fields & tables when document changes
  useEffect(() => {
    if (selectedDocId && investigation) {
      api.getFields(investigation.id, selectedDocId).then(setFields).catch(console.error);
      api.getTables(investigation.id, selectedDocId).then(setTables).catch(console.error);
    }
  }, [selectedDocId, investigation]);

  if (isLoading || !investigation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] text-center">
        <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mb-3" />
        <span className="text-xs text-slate-400 font-mono">LOADING FORENSIC WORKSPACE...</span>
      </div>
    );
  }

  const selectedDoc = investigation.documents.find((d) => d.id === selectedDocId) || investigation.documents[0];
  const compDoc = investigation.documents.find((d) => d.id === comparisonDocId);

  // Filter findings for currently selected document
  const activeFindings = investigation.findings.filter((f) => {
    const docMatch = f.documentId === selectedDoc?.id;
    if (!docMatch) return false;
    if (filterMethod === 'all') return true;
    return f.detectionMethod.toLowerCase().includes(filterMethod.toLowerCase());
  });

  const handleFieldSave = async (fieldId: string) => {
    if (!selectedDoc) return;
    try {
      const updated = await api.updateField(
        investigation.id,
        selectedDoc.id,
        fieldId,
        editFieldValue,
        undefined,
        currentUser.name,
        currentUser.role
      );
      setFields((prev) => prev.map((f) => (f.id === fieldId ? updated : f)));
      setEditingFieldId(null);
    } catch (err) {
      console.error('Failed to update field:', err);
    }
  };

  const handleReviewFindingSubmit = async (status: string) => {
    if (!reviewFinding) return;
    try {
      const updated = await api.updateFindingReview(investigation.id, reviewFinding.id, {
        status,
        reviewNotes,
        reviewerName: currentUser.name,
        userRole: currentUser.role,
      });

      setInvestigation((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          findings: prev.findings.map((f) => (f.id === updated.id ? updated : f)),
        };
      });

      setReviewFinding(null);
      setReviewNotes('');
      onInvestigationUpdated();
    } catch (err) {
      console.error('Failed to review finding:', err);
    }
  };

  const handleAssistantSend = async (questionText?: string) => {
    const q = questionText || assistantInput;
    if (!q.trim() || isAssistantLoading) return;

    setChatMessages((prev) => [...prev, { sender: 'user', text: q }]);
    setAssistantInput('');
    setIsAssistantLoading(true);

    try {
      const response = await api.askAssistant(investigation.id, q);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: response.answer,
          citations: response.citations,
        },
      ]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `Error analyzing query: ${err.message}. Please verify server connection.`,
        },
      ]);
    } finally {
      setIsAssistantLoading(false);
    }
  };

  const handleFinalDecisionSubmit = async () => {
    setIsSubmittingDecision(true);
    try {
      const decision = await api.recordDecision(investigation.id, {
        verdict,
        summaryNotes: verdictNotes || 'Comprehensive multi-document forensic inspection completed.',
        riskScore,
        decidedBy: currentUser.name,
        decidedByRole: currentUser.role,
        checklist: {
          visualForensicsReviewed: true,
          crossDocDiscrepanciesAudited: true,
          evidenceIntegrityChecked: true,
          humanVerificationComplete: true,
        },
      });

      setInvestigation((prev) => (prev ? { ...prev, reviewDecision: decision } : null));
      onInvestigationUpdated();
    } catch (err) {
      console.error('Failed to record decision:', err);
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const handleRerunCorrelation = async () => {
    try {
      const result = await api.rerunCorrelation(investigation.id);
      setInvestigation((prev) => (prev ? { ...prev, discrepancies: result.discrepancies } : null));
    } catch (err) {
      console.error('Correlation error:', err);
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-slate-950 text-slate-100">
      {/* Investigation Header Bar */}
      <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Back to Cases"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-cyan-400">
                {investigation.id}
              </span>
              <span className="text-slate-600">·</span>
              <h1 className="text-sm font-bold text-white tracking-tight">
                {investigation.title}
              </h1>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  investigation.status === 'Discrepancies Flagged'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : investigation.status === 'Pending Review'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {investigation.status}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span>{investigation.category}</span>
              <span>·</span>
              <span>Lead: {investigation.assignedInvestigator}</span>
              <span>·</span>
              <span>{investigation.documents.length} Files Ingested</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 font-medium transition-colors flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upload Document</span>
          </button>

          <button
            onClick={() => setIsDossierModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-semibold shadow-sm shadow-cyan-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF Dossier</span>
          </button>
        </div>
      </div>

      {/* Primary Workspace Navigation Tabs */}
      <div className="px-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between overflow-x-auto">
        <div className="flex items-center gap-1 py-1">
          <button
            onClick={() => setActiveTab('visual')}
            className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'visual'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ScanEye className="w-3.5 h-3.5" />
            Visual Forensics ({investigation.findings.length})
          </button>

          <button
            onClick={() => setActiveTab('ocr')}
            className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'ocr'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            OCR &amp; Structured Fields
          </button>

          <button
            onClick={() => setActiveTab('batch')}
            className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'batch'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            Batch Comparison ({investigation.documents.length} Docs)
          </button>

          <button
            onClick={() => setActiveTab('metadata')}
            className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'metadata'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Extended Metadata
          </button>

          <button
            onClick={() => setActiveTab('context')}
            className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'context'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Context Reconciliation ({investigation.discrepancies.length})
          </button>

          <button
            onClick={() => setActiveTab('assistant')}
            className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'assistant'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            AI Assistant
          </button>

          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'evidence'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Chain of Custody ({investigation.evidence.length})
          </button>

          <button
            onClick={() => setActiveTab('dossier')}
            className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'dossier'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            Dossier &amp; Sign-Off
          </button>
        </div>

        {/* Active Document Selector Pill Strip */}
        <div className="flex items-center gap-2 py-1">
          <span className="text-[11px] text-slate-400 hidden sm:inline">Active File:</span>
          <select
            value={selectedDocId}
            onChange={(e) => {
              setSelectedDocId(e.target.value);
              setSelectedFindingId(null);
            }}
            aria-label="Select Active Document"
            className="px-2.5 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            {investigation.documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.originalName} ({d.classification})
              </option>
            ))}
          </select>

          <button
            onClick={() => setActiveTab('metadata')}
            className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors flex items-center gap-1 border cursor-pointer ${
              activeTab === 'metadata'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
            }`}
            title="Inspect technical document properties & EXIF"
          >
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span className="hidden md:inline">Tech Metadata</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 w-full flex overflow-hidden">
        {/* ========================================================= */}
        {/* TAB 1: VISUAL FORENSIC STUDIO */}
        {/* ========================================================= */}
        {activeTab === 'visual' && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left: Interactive Document Inspection Viewport */}
            <div className="flex-1 flex flex-col bg-slate-950 border-r border-slate-800 relative">
              {/* Inspection Toolbar */}
              <div className="p-3 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Layer Filters */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px] mr-1">Layer:</span>
                  <button
                    onClick={() => setFilterMethod('all')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      filterMethod === 'all'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All Anomaly Types
                  </button>
                  <button
                    onClick={() => setFilterMethod('Font Kerning')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      filterMethod === 'Font Kerning'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Font &amp; Kerning
                  </button>
                  <button
                    onClick={() => setFilterMethod('Error Level Analysis')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      filterMethod === 'Error Level Analysis'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ELA Compression
                  </button>
                  <button
                    onClick={() => setFilterMethod('Tabular Grid')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      filterMethod === 'Tabular Grid'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Alignment Skew
                  </button>
                </div>

                {/* Zoom & Side-by-Side Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsSideBySide(!isSideBySide)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 border ${
                      isSideBySide
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    <Split className="w-3.5 h-3.5" />
                    <span>Side-by-Side</span>
                  </button>

                  <div className="flex items-center gap-1 bg-slate-800 rounded p-0.5 border border-slate-700">
                    <button
                      onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
                      aria-label="Zoom out"
                      className="p-1 hover:text-white text-slate-400"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-[10px] px-1 text-slate-300">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.15))}
                      aria-label="Zoom in"
                      className="p-1 hover:text-white text-slate-400"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setZoomLevel(1)}
                      aria-label="Reset zoom"
                      className="p-1 hover:text-white text-slate-400 text-[10px] font-mono px-1.5"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              {/* Viewport Canvas */}
              <div className="flex-1 overflow-auto p-6 flex items-start justify-center bg-slate-950/70">
                <div className={`flex gap-6 items-start ${isSideBySide ? 'w-full max-w-6xl' : ''}`}>
                  {/* Primary Target Document */}
                  <div
                    className="relative bg-white rounded-lg shadow-2xl border border-slate-700 overflow-hidden transition-transform duration-200 origin-top"
                    style={{
                      transform: `scale(${zoomLevel})`,
                      width: isSideBySide ? '480px' : '640px',
                    }}
                  >
                    {/* Rendered Document Image / High-Res Simulation */}
                    <img
                      src={selectedDoc?.fileUrl || `/api/documents/preview/${selectedDoc?.id}`}
                      alt={selectedDoc?.originalName}
                      className="w-full h-auto block select-none pointer-events-none"
                    />

                    {/* Interactive Forensic Bounding Box Overlays */}
                    {activeFindings.map((finding) => {
                      const isSelected = selectedFindingId === finding.id;
                      const severityColors =
                        finding.severity === 'critical'
                          ? 'border-red-500 bg-red-500/15 text-red-300'
                          : finding.severity === 'high'
                          ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                          : 'border-cyan-400 bg-cyan-400/15 text-cyan-300';

                      return (
                        <div
                          key={finding.id}
                          onClick={() => setSelectedFindingId(finding.id)}
                          className={`absolute border-2 cursor-pointer transition-all duration-150 rounded ${severityColors} ${
                            isSelected
                              ? 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 z-30 shadow-lg'
                              : 'hover:border-white z-20'
                          }`}
                          style={{
                            left: `${finding.boundingBox.x}%`,
                            top: `${finding.boundingBox.y}%`,
                            width: `${finding.boundingBox.width}%`,
                            height: `${finding.boundingBox.height}%`,
                          }}
                          title={`${finding.id}: ${finding.observation}`}
                        >
                          {/* Pulsing indicator tag */}
                          <div className="absolute -top-4 left-0 px-1 py-0.2 rounded bg-slate-950/90 text-[8px] font-mono font-bold border border-slate-700 flex items-center gap-1 whitespace-nowrap shadow">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                            <span>{finding.id}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Side-by-Side Comparison Document */}
                  {isSideBySide && compDoc && (
                    <div
                      className="relative bg-white rounded-lg shadow-2xl border border-slate-700 overflow-hidden transition-transform duration-200 origin-top"
                      style={{
                        transform: `scale(${zoomLevel})`,
                        width: '480px',
                      }}
                    >
                      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-slate-950/90 text-cyan-400 text-[10px] font-mono font-semibold border border-slate-700">
                        COMPARISON: {compDoc.originalName}
                      </div>
                      <img
                        src={compDoc.fileUrl || `/api/documents/preview/${compDoc.id}`}
                        alt={compDoc.originalName}
                        className="w-full h-auto block select-none pointer-events-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Status Bar */}
              <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                <span>
                  DOCUMENT: {selectedDoc?.originalName} ({selectedDoc?.classification})
                </span>
                <span>
                  SHA-256: {selectedDoc?.sha256Hash?.slice(0, 16)}...
                </span>
                <span>
                  {activeFindings.length} ACTIVE FINDINGS HIGHLIGHTED
                </span>
              </div>
            </div>

            {/* Right: Forensic Finding Detail & Technical Metadata Panel */}
            <div className="w-full lg:w-96 bg-slate-900/70 border-l border-slate-800 flex flex-col p-4 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setVisualSidebarTab('findings')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                      visualSidebarTab === 'findings'
                        ? 'bg-slate-800 text-cyan-400 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ScanEye className="w-3.5 h-3.5" />
                    <span>Findings ({activeFindings.length})</span>
                  </button>
                  <button
                    onClick={() => setVisualSidebarTab('metadata')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                      visualSidebarTab === 'metadata'
                        ? 'bg-slate-800 text-cyan-400 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Metadata</span>
                  </button>
                </div>

                <button
                  onClick={() => setActiveTab('metadata')}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono transition-colors cursor-pointer"
                  title="Expand to dedicated Full-Width Technical Metadata tab"
                >
                  Full View ↗
                </button>
              </div>

              {visualSidebarTab === 'metadata' ? (
                selectedDoc ? (
                  <ExtendedMetadataPanel document={selectedDoc} />
                ) : (
                  <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                    No active document selected for metadata.
                  </div>
                )
              ) : activeFindings.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                  No visual anomalies detected for the selected filter on this document.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeFindings.map((finding) => {
                    const isSelected = selectedFindingId === finding.id;

                    return (
                      <div
                        key={finding.id}
                        onClick={() => setSelectedFindingId(finding.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800/90 border-cyan-500 shadow-md ring-1 ring-cyan-500/40'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-mono font-semibold text-cyan-400">
                            {finding.id}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                              finding.severity === 'critical'
                                ? 'bg-red-500/20 text-red-300'
                                : finding.severity === 'high'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-blue-500/20 text-blue-300'
                            }`}
                          >
                            {finding.severity}
                          </span>
                        </div>

                        <h4 className="text-xs font-medium text-slate-200 leading-snug">
                          {finding.observation}
                        </h4>

                        <div className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                          {finding.explanation}
                        </div>

                        {/* Metadata Details */}
                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                          <span>{finding.detectionMethod}</span>
                          <span className="font-mono text-cyan-400">
                            {Math.round(finding.confidenceScore * 100)}% Conf
                          </span>
                        </div>

                        {/* Review Status & Actions */}
                        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                          <span
                            className={`text-[10px] font-semibold ${
                              finding.reviewStatus === 'Verified Anomaly'
                                ? 'text-red-400'
                                : finding.reviewStatus === 'Benign Artifact'
                                ? 'text-emerald-400'
                                : 'text-slate-400'
                            }`}
                          >
                            Status: {finding.reviewStatus}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setReviewFinding(finding);
                              setReviewNotes(finding.reviewNotes || '');
                            }}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold border border-slate-700"
                          >
                            Review Action
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: AI DOCUMENT INTELLIGENCE & OCR */}
        {/* ========================================================= */}
        {activeTab === 'ocr' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-6 max-w-6xl mx-auto w-full">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white">
                  Structured OCR Extraction &amp; Field Verification
                </h2>
                <p className="text-xs text-slate-400">
                  Extracted values, field confidence scores, and source location references for {selectedDoc?.originalName}.
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {fields.length} Fields · {tables.length} Tables
              </span>
            </div>

            {/* Extracted Key-Value Fields Grid */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 text-xs font-semibold text-slate-300">
                Key-Value Fields &amp; Confidence Scores
              </div>

              <div className="divide-y divide-slate-800/70 text-xs">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-850/40"
                  >
                    <div className="space-y-0.5 max-w-xs">
                      <div className="font-semibold text-slate-200">{field.label}</div>
                      <div className="text-[10px] font-mono text-slate-500 uppercase">
                        {field.fieldName} · Page {field.page}
                      </div>
                    </div>

                    {/* Value Field (with inline edit) */}
                    <div className="flex-1 sm:max-w-md">
                      {editingFieldId === field.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editFieldValue}
                            onChange={(e) => setEditFieldValue(e.target.value)}
                            aria-label={`Edit value for ${field.label}`}
                            className="w-full px-2.5 py-1 text-xs rounded bg-slate-950 border border-cyan-400 text-white focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleFieldSave(field.id)}
                            className="p-1 rounded bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingFieldId(null)}
                            className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between group">
                          <span className="font-mono text-slate-200 font-medium">
                            {field.extractedValue}
                          </span>
                          <button
                            onClick={() => {
                              setEditingFieldId(field.id);
                              setEditFieldValue(field.extractedValue);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-cyan-300 transition-opacity"
                            title="Edit Extracted Field"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      {field.notes && (
                        <div className="text-[10px] text-amber-400/90 mt-1">
                          Notice: {field.notes}
                        </div>
                      )}
                    </div>

                    {/* Confidence & Coordinates */}
                    <div className="flex items-center gap-4 text-[11px] shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">OCR:</span>
                        <span className="font-mono font-semibold text-emerald-400">
                          {Math.round(field.confidence * 100)}%
                        </span>
                      </div>
                      <div className="text-slate-500 font-mono text-[10px]">
                        x:{Math.round(field.boundingBox.x)}% y:{Math.round(field.boundingBox.y)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Extracted Tables Section */}
            {tables.map((tbl) => (
              <div key={tbl.id} className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
                <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{tbl.title}</span>
                  <span className="text-[10px] font-mono text-slate-400">Page {tbl.page}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[10px] uppercase font-mono">
                        {tbl.columns.map((c, i) => (
                          <th key={i} className="py-2.5 px-3">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {tbl.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-800/30">
                          {tbl.columns.map((col, cIdx) => (
                            <td key={cIdx} className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">
                              {String(row[col] ?? '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2.5: BATCH DOCUMENT COMPARISON & MATRIX DIFF */}
        {/* ========================================================= */}
        {activeTab === 'batch' && (
          <div className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
            <BatchComparisonTool
              investigation={investigation}
              currentUser={currentUser}
              onRefreshCase={loadCaseData}
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2.8: EXTENDED TECHNICAL METADATA & FORENSIC EXIF */}
        {/* ========================================================= */}
        {activeTab === 'metadata' && (
          <div className="flex-1 p-6 overflow-y-auto max-w-6xl mx-auto w-full">
            {selectedDoc ? (
              <ExtendedMetadataPanel document={selectedDoc} />
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-900 rounded-xl border border-slate-800">
                No active document selected for technical metadata inspection.
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: CONTEXTUAL RECONCILIATION */}
        {/* ========================================================= */}
        {activeTab === 'context' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-6 max-w-5xl mx-auto w-full">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white">
                  Cross-Document Context Reconciliation Engine
                </h2>
                <p className="text-xs text-slate-400">
                  Identifies contradictory declared vs credited amounts, mismatched identities, and chronological anomalies across files.
                </p>
              </div>

              <button
                onClick={handleRerunCorrelation}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Re-run Correlation</span>
              </button>
            </div>

            {/* 3D Holographic AI Forensic Core & Contradiction Synapse Visualization */}
            <ThreeForensicCore className="mb-2" />

            {investigation.discrepancies.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                No cross-document conflicts currently detected.
              </div>
            ) : (
              <div className="space-y-4">
                {investigation.discrepancies.map((disc) => (
                  <div
                    key={disc.id}
                    className="p-5 rounded-xl bg-slate-900 border border-amber-500/30 space-y-4 shadow-lg shadow-amber-500/5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                        <span className="font-mono text-xs font-semibold text-amber-400">
                          {disc.id} · {disc.category}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                        {disc.severity} Discrepancy
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white">{disc.title}</h3>
                      <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                        {disc.description}
                      </p>
                    </div>

                    {/* Involved Documents Comparison Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {disc.involvedDocuments.map((invDoc, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1"
                        >
                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <span className="font-semibold text-cyan-400">{invDoc.documentName}</span>
                            <span>{invDoc.classification}</span>
                          </div>
                          <div className="text-xs text-slate-300 flex justify-between items-center pt-1">
                            <span>{invDoc.fieldLabel}:</span>
                            <span className="font-mono font-bold text-white text-sm">
                              {invDoc.extractedValue}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Grounded Evidence Explanation */}
                    <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-400 leading-relaxed">
                      <span className="font-semibold text-slate-200">Forensic Context: </span>
                      {disc.explanation}
                    </div>

                    {/* Recommended Action */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 text-amber-300">
                      <span>Action: {disc.suggestedAction}</span>
                      <span className="font-mono text-[10px] text-slate-500">Status: {disc.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: AI INVESTIGATION ASSISTANT */}
        {/* ========================================================= */}
        {activeTab === 'assistant' && (
          <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-6">
            <div className="pb-4 border-b border-slate-800 mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                AI Forensic Intelligence Assistant
              </h2>
              <p className="text-xs text-slate-400">
                Grounded strictly in this case's extracted documents, OCR fields, and visual findings. Powered by Gemini 3.8 Flash.
              </p>
            </div>

            {/* Quick Prompts */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => handleAssistantSend('Summarize all suspicious findings in this case')}
                className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 text-xs transition-colors"
              >
                Summarize suspicious findings
              </button>
              <button
                onClick={() => handleAssistantSend('Which documents contain conflicting salary information?')}
                className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 text-xs transition-colors"
              >
                Compare salary figures across files
              </button>
              <button
                onClick={() => handleAssistantSend('Explain the visual kerning evidence for finding VIS-FIND-841-01')}
                className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 text-xs transition-colors"
              >
                Explain finding VIS-FIND-841-01
              </button>
              <button
                onClick={() => handleAssistantSend('Which fields require urgent human verification?')}
                className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 text-xs transition-colors"
              >
                Verification priorities
              </button>
            </div>

            {/* Chat Message Scroll */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`p-3.5 rounded-xl max-w-2xl text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-500/40 rounded-br-none'
                        : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none whitespace-pre-wrap'
                    }`}
                  >
                    {msg.text}

                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1">
                        <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider block">
                          Verified Case Citations:
                        </span>
                        {msg.citations.map((c, cIdx) => (
                          <div key={cIdx} className="text-[10px] text-slate-400 font-mono">
                            • [{c.type}] {c.id}: {c.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isAssistantLoading && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono max-w-sm">
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  <span>Synthesizing evidence &amp; citations...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAssistantSend();
              }}
              className="flex items-center gap-2 pt-2 border-t border-slate-800"
            >
              <input
                type="text"
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                placeholder="Ask questions about this investigation's evidence, numbers, or visual anomalies..."
                className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={!assistantInput.trim() || isAssistantLoading}
                aria-label="Send query"
                className="px-4 py-2.5 rounded-lg bg-cyan-400 text-slate-950 hover:bg-cyan-300 disabled:opacity-40 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm shadow-cyan-500/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: EVIDENCE & CHAIN OF CUSTODY */}
        {/* ========================================================= */}
        {activeTab === 'evidence' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-6 max-w-5xl mx-auto w-full">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white">
                  Evidence Repository &amp; Cryptographic Chain of Custody
                </h2>
                <p className="text-xs text-slate-400">
                  Immutable fingerprint hashes, optical measurement records, and audit traceability for court presentation.
                </p>
              </div>
              <span className="font-mono text-xs text-cyan-400">
                {investigation.evidence.length} Records Registered
              </span>
            </div>

            <div className="space-y-3">
              {investigation.evidence.map((ev) => (
                <div
                  key={ev.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-cyan-400">{ev.id}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(ev.capturedAt).toLocaleString()}
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-white">{ev.title}</h4>
                  <p className="text-xs text-slate-300">{ev.description}</p>

                  <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
                    <span>Source: {ev.sourceReference}</span>
                    <span>Hash: {ev.hash}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: INVESTIGATION DOSSIER & FINAL SIGN-OFF */}
        {/* ========================================================= */}
        {activeTab === 'dossier' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-8 max-w-4xl mx-auto w-full">
            {/* Header / Export Action */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white">
                  Investigation Dossier &amp; Senior Sign-Off
                </h2>
                <p className="text-xs text-slate-400">
                  Compile comprehensive findings into an official PDF report or record the final administrative determination.
                </p>
              </div>

              <button
                onClick={() => setIsDossierModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Configure &amp; Download PDF Dossier</span>
              </button>
            </div>

            {/* Senior Reviewer Determination Panel */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">
                    Lead Reviewer Final Determination
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Current User Role: [{currentUser.role}]
                </span>
              </div>

              {/* Verdict Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Official Case Verdict
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setVerdict('Approved')}
                    className={`p-3 rounded-lg border text-left text-xs font-medium transition-all ${
                      verdict === 'Approved'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 mb-1 text-emerald-400" />
                    <div className="font-semibold">Approved / Cleared</div>
                    <div className="text-[10px] text-slate-500">Document authenticated</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVerdict('Escalated for Physical Inspection')}
                    className={`p-3 rounded-lg border text-left text-xs font-medium transition-all ${
                      verdict === 'Escalated for Physical Inspection'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 mb-1 text-amber-400" />
                    <div className="font-semibold">Escalate for Audit</div>
                    <div className="text-[10px] text-slate-500">Physical inspection required</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVerdict('Rejected - Tampering Suspected')}
                    className={`p-3 rounded-lg border text-left text-xs font-medium transition-all ${
                      verdict === 'Rejected - Tampering Suspected'
                        ? 'bg-red-500/20 border-red-500 text-red-300 ring-1 ring-red-500/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4 mb-1 text-red-400" />
                    <div className="font-semibold">Reject Application</div>
                    <div className="text-[10px] text-slate-500">Evidence of manipulation</div>
                  </button>
                </div>
              </div>

              {/* Risk Score Slider */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <label className="font-semibold text-slate-300">
                    Forensic Risk Rating (0 - 100)
                  </label>
                  <span className="font-mono font-bold text-amber-400">{riskScore}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={riskScore}
                  onChange={(e) => setRiskScore(Number(e.target.value))}
                  aria-label="Forensic Risk Rating"
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Summary Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Reviewer Rationale &amp; Audit Notes
                </label>
                <textarea
                  rows={4}
                  value={verdictNotes}
                  onChange={(e) => setVerdictNotes(e.target.value)}
                  placeholder="Record detailed explanation, corroborating verification checks performed, and instructions for underwriting committee..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Record Decision Button */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleFinalDecisionSubmit}
                  disabled={isSubmittingDecision}
                  className="px-5 py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-cyan-500/20"
                >
                  {isSubmittingDecision ? 'Recording Decision...' : 'Save & Certify Case Verdict'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Review Finding Modal Drawer */}
      {reviewFinding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-cyan-400">
                {reviewFinding.id}
              </span>
              <button
                onClick={() => setReviewFinding(null)}
                aria-label="Close review finding modal"
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-sm font-bold text-white">{reviewFinding.observation}</h3>

            <p className="text-xs text-slate-400 leading-relaxed">
              {reviewFinding.explanation}
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Reviewer Evaluation Notes
              </label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Confirm or refute visual anomaly observations..."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => handleReviewFindingSubmit('Benign Artifact')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold"
              >
                Mark Benign / False Positive
              </button>
              <button
                onClick={() => handleReviewFindingSubmit('Verified Anomaly')}
                className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-semibold"
              >
                Confirm Verified Anomaly
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      <DocumentUploadModal
        investigationId={investigation.id}
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        userName={currentUser.name}
        userRole={currentUser.role}
        onUploadSuccess={(_newDoc) => {
          loadCaseData();
          onInvestigationUpdated();
        }}
      />

      {/* Automated Forensic Dossier PDF Export Modal */}
      <DossierExportModal
        isOpen={isDossierModalOpen}
        onClose={() => setIsDossierModalOpen(false)}
        investigation={investigation}
        extractedFieldsMap={{ [selectedDoc?.id || '']: fields }}
      />
    </div>
  );
};
