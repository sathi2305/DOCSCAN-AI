import React, { useState, useEffect } from 'react';
import {
  Layers,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileText,
  Download,
  Filter,
  Eye,
  ScanEye,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  Investigation,
  BatchComparisonReport,
  BatchFieldComparisonRow,
  BatchLayoutCrossReference,
  User,
} from '../types/forensics.js';
import { api } from '../services/api.js';

interface BatchComparisonToolProps {
  investigation: Investigation;
  currentUser: User;
  onRefreshCase: () => void;
  onOpenFindingDetails?: (findingId: string) => void;
}

export const BatchComparisonTool: React.FC<BatchComparisonToolProps> = ({
  investigation,
  currentUser,
  onRefreshCase,
  onOpenFindingDetails,
}) => {
  const [report, setReport] = useState<BatchComparisonReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterMode, setFilterMode] = useState<'all' | 'contradictions' | 'matches' | 'missing'>('all');
  const [selectedRow, setSelectedRow] = useState<BatchFieldComparisonRow | null>(null);

  // Batch upload state
  const [isUploadingBatch, setIsUploadingBatch] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(
    investigation.documents.map((d) => d.id)
  );

  const loadBatchReport = async () => {
    if (investigation.documents.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.runBatchComparison(investigation.id, selectedDocIds);
      setReport(data);
    } catch (err) {
      console.error('Failed to run batch comparison:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBatchReport();
  }, [investigation.id, selectedDocIds]);

  const handleBatchFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    setIsUploadingBatch(true);
    setUploadProgress(`Ingesting ${files.length} documents concurrently...`);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Processing ${i + 1}/${files.length}: ${file.name}...`);

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const res = reader.result as string;
            resolve(res.split(',')[1] || res);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        const base64Data = await base64Promise;

        // Auto classify
        let classification = 'Other Document';
        const lower = file.name.toLowerCase();
        if (lower.includes('salary') || lower.includes('payslip')) classification = 'Salary Slip';
        else if (lower.includes('bank') || lower.includes('statement')) classification = 'Bank Account Statement';
        else if (lower.includes('loan') || lower.includes('app')) classification = 'Loan Application Form';
        else if (lower.includes('invoice')) classification = 'Commercial Invoice';

        await api.uploadDocument(investigation.id, {
          originalName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/pdf',
          base64Data,
          classification,
          userName: currentUser.name,
          userRole: currentUser.role,
        });
      }

      setUploadProgress('Batch ingestion complete. Cross-referencing records...');
      onRefreshCase();
      await loadBatchReport();
    } catch (err: any) {
      console.error('Batch upload error:', err);
      alert('Batch upload error: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUploadingBatch(false);
      setUploadProgress('');
    }
  };

  const filteredRows = (report?.fieldMatrix || []).filter((row) => {
    if (filterMode === 'all') return true;
    if (filterMode === 'contradictions') return row.status === 'CONTRADICTION';
    if (filterMode === 'matches') return row.status === 'MATCH';
    if (filterMode === 'missing') return row.status === 'MISSING';
    return true;
  });

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-8 max-w-7xl mx-auto w-full">
      {/* Top Banner & Control Deck */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              Multi-Document Matrix Diff
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-mono text-slate-400">
              {investigation.documents.length} Portfolios Enrolled
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Batch Document Comparison &amp; Cross-Reference Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Simultaneously compares extracted field values, dates, and layout micro-geometry across all case documents to identify contradictory statements.
          </p>
        </div>

        {/* Batch Upload & Trigger Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-2">
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Upload Batch Files</span>
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleBatchFileUpload}
              className="hidden"
              disabled={isUploadingBatch}
            />
          </label>

          <button
            onClick={loadBatchReport}
            disabled={isLoading || isUploadingBatch}
            className="px-3.5 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-cyan-500/20 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Re-Run Cross-Reference</span>
          </button>
        </div>
      </div>

      {/* Batch Processing Indicator */}
      {isUploadingBatch && (
        <div className="p-4 rounded-xl bg-slate-900 border border-cyan-500/50 flex items-center gap-3 shadow-lg shadow-cyan-500/10 animate-pulse">
          <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
          <div className="text-xs">
            <div className="font-semibold text-white">Batch Document Ingestion Active</div>
            <div className="text-slate-400 font-mono text-[11px]">{uploadProgress}</div>
          </div>
        </div>
      )}

      {/* Summary KPI Ribbon */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs text-slate-400">Total Fields Tested</span>
            <div className="mt-1 text-2xl font-bold font-mono text-white tabular-nums">
              {report.summary.totalFieldsCompared}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Across {report.documentCount} Documents</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs text-slate-400">Matching Records</span>
            <div className="mt-1 text-2xl font-bold font-mono text-emerald-400 tabular-nums flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5" />
              {report.summary.matchingCount}
            </div>
            <span className="text-[10px] text-emerald-400/80 mt-0.5 block">Reconciled Cleanly</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs text-slate-400">Contradictions Flagged</span>
            <div className="mt-1 text-2xl font-bold font-mono text-red-400 tabular-nums flex items-center gap-1.5">
              <AlertTriangle className="w-5 h-5" />
              {report.summary.contradictionCount}
            </div>
            <span className="text-[10px] text-red-400/80 mt-0.5 block">Requires Escalation</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs text-slate-400">Missing / Single Sourced</span>
            <div className="mt-1 text-2xl font-bold font-mono text-amber-400 tabular-nums">
              {report.summary.missingCount}
            </div>
            <span className="text-[10px] text-amber-400/80 mt-0.5 block">Uncorroborated</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs text-slate-400">Portfolio Consistency</span>
            <div className="mt-1 text-2xl font-bold font-mono text-cyan-400 tabular-nums">
              {report.summary.overallConsistencyScore}%
            </div>
            <span className="text-[10px] text-cyan-400/80 mt-0.5 block">Integrity Rating</span>
          </div>
        </div>
      )}

      {/* Filter Tabs for Matrix Rows */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              filterMode === 'all'
                ? 'bg-cyan-400 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Fields ({report?.fieldMatrix.length || 0})
          </button>
          <button
            onClick={() => setFilterMode('contradictions')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
              filterMode === 'contradictions'
                ? 'bg-red-500 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            Contradictions Only ({report?.summary.contradictionCount || 0})
          </button>
          <button
            onClick={() => setFilterMode('matches')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              filterMode === 'matches'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Matching ({report?.summary.matchingCount || 0})
          </button>
          <button
            onClick={() => setFilterMode('missing')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              filterMode === 'missing'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Missing / Partial ({report?.summary.missingCount || 0})
          </button>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Click any row to inspect bounding box &amp; optical alignment
        </div>
      </div>

      {/* Multi-Document Cross-Reference Matrix Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px]">
                <th className="py-3 px-4 min-w-[200px]">Field / Attribute</th>
                {report?.documents.map((doc) => (
                  <th key={doc.id} className="py-3 px-4 min-w-[220px]">
                    <div className="text-slate-200 font-bold font-sans text-xs truncate">
                      {doc.name}
                    </div>
                    <div className="text-[10px] text-cyan-400 font-mono">{doc.classification}</div>
                  </th>
                ))}
                <th className="py-3 px-4 min-w-[130px]">Status</th>
                <th className="py-3 px-4 min-w-[280px]">Cross-Reference Analysis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 font-sans">
              {filteredRows.map((row, idx) => {
                const isContradiction = row.status === 'CONTRADICTION';
                const isMatch = row.status === 'MATCH';
                const isMissing = row.status === 'MISSING';

                return (
                  <tr
                    key={idx}
                    onClick={() => setSelectedRow(row)}
                    className={`hover:bg-slate-850/60 transition-colors cursor-pointer ${
                      isContradiction ? 'bg-red-500/5' : ''
                    }`}
                  >
                    {/* Attribute Column */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{row.fieldLabel}</div>
                      <div className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">
                        {row.category}
                      </div>
                    </td>

                    {/* Per-Document Value Cells */}
                    {report?.documents.map((doc) => {
                      const docVal = row.values.find((v) => v.documentId === doc.id);

                      return (
                        <td key={doc.id} className="py-3.5 px-4 font-mono text-xs">
                          {docVal ? (
                            <div>
                              <div
                                className={`font-bold ${
                                  isContradiction
                                    ? 'text-red-300 font-black'
                                    : 'text-slate-200'
                                }`}
                              >
                                {docVal.value}
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <span>P.{docVal.page}</span>
                                <span>·</span>
                                <span className="text-emerald-400">
                                  {Math.round(docVal.confidence * 100)}% Conf
                                </span>
                              </div>
                              {docVal.layoutAnomaly && (
                                <div className="mt-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 text-[9px] font-sans">
                                  ⚠️ {docVal.layoutAnomaly}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600 italic">Not extracted</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase inline-flex items-center gap-1 ${
                          isContradiction
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                            : isMatch
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {isContradiction && <AlertTriangle className="w-3 h-3" />}
                        {isMatch && <CheckCircle2 className="w-3 h-3" />}
                        {isMissing && <HelpCircle className="w-3 h-3" />}
                        {row.status}
                      </span>
                    </td>

                    {/* Forensic Analysis Rationale */}
                    <td className="py-3.5 px-4 text-xs text-slate-300 leading-relaxed">
                      {row.discrepancyNote || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Layout & Micro-Geometry Cross-Reference Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScanEye className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Layout &amp; Optical Geometry Cross-References
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">3 Invariants Verified</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {report?.layoutCrossReferences.map((layout) => (
            <div
              key={layout.id}
              className={`p-5 rounded-xl bg-slate-900 border space-y-3 ${
                layout.status === 'suspicious'
                  ? 'border-red-500/40 shadow-lg shadow-red-500/5'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-cyan-400">{layout.id}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    layout.status === 'suspicious'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {layout.status}
                </span>
              </div>

              <h4 className="text-sm font-bold text-white">{layout.metric}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{layout.description}</p>

              <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs">
                <span className="text-[10px] font-mono text-slate-500 uppercase">
                  Document Measurements:
                </span>
                {layout.observations.map((obs, oIdx) => (
                  <div key={oIdx} className="p-2 rounded bg-slate-950 border border-slate-800">
                    <div className="text-[11px] font-semibold text-slate-300 truncate">
                      {obs.documentName}:
                    </div>
                    <div className="text-[11px] text-cyan-300 font-mono mt-0.5">
                      {obs.measurement}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-[11px] text-slate-400 italic">
                {layout.explanation}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row Detail Modal */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono uppercase text-cyan-400">
                  Detailed Field Discrepancy
                </span>
                <h3 className="text-base font-bold text-white">{selectedRow.fieldLabel}</h3>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
              <span className="font-semibold text-cyan-400">Forensic Context: </span>
              {selectedRow.discrepancyNote}
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300">
                Values Across Examined Documents:
              </span>
              {selectedRow.values.map((v, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-white">{v.documentName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">Page {v.page}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-bold text-cyan-300">{v.value}</div>
                    {v.layoutAnomaly && (
                      <div className="text-[10px] text-red-400 mt-0.5 font-sans">
                        {v.layoutAnomaly}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedRow(null)}
                className="px-4 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
