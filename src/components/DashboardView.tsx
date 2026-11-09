import React from 'react';
import {
  ShieldAlert,
  FileCheck2,
  AlertTriangle,
  FolderOpen,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle,
  FileText,
  Search,
  Upload,
  Files,
} from 'lucide-react';
import { DashboardStats, Investigation, User } from '../types/forensics.js';

interface DashboardViewProps {
  stats: DashboardStats | null;
  investigations: Investigation[];
  currentUser: User;
  onSelectInvestigation: (id: string) => void;
  onNewInvestigation: () => void;
  onUploadDocument?: () => void;
  onOpenDocumentManagement?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  investigations,
  currentUser,
  onSelectInvestigation,
  onNewInvestigation,
  onUploadDocument,
  onOpenDocumentManagement,
}) => {
  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-xs text-slate-400 font-mono animate-pulse">
          INITIALIZING FORENSIC TELEMETRY...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 w-full space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Forensic Command Center
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Real-time document tampering diagnostics, optical variance meters, and multi-document contextual reconciliation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onUploadDocument && (
            <button
              onClick={onUploadDocument}
              className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 text-slate-950 text-xs font-semibold transition-all shadow-sm shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-slate-950" />
              <span>+ Upload Document</span>
            </button>
          )}

          {onOpenDocumentManagement && (
            <button
              onClick={onOpenDocumentManagement}
              className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              title="View all ingested files and history across investigations"
            >
              <Files className="w-4 h-4 text-cyan-400" />
              <span>Document Library</span>
            </button>
          )}

          <button
            onClick={() => onSelectInvestigation('INV-2026-0841')}
            className="px-3.5 py-2 rounded-lg bg-slate-900 border border-cyan-500/30 text-cyan-300 hover:bg-slate-800 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <span>Benchmark Case</span>
          </button>
          <button
            onClick={onNewInvestigation}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-all cursor-pointer"
          >
            New Case
          </button>
        </div>
      </div>

      {/* KPI Cards (Tabular Figures & Strict Contrast) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <span className="text-xs text-slate-400">Total Investigations</span>
          <div className="mt-2 text-2xl font-bold font-mono text-white tabular-nums">
            {stats.totalInvestigations}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Active Case Files</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <span className="text-xs text-slate-400">Documents Processed</span>
          <div className="mt-2 text-2xl font-bold font-mono text-white tabular-nums">
            {stats.totalDocuments}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">PDFs &amp; Scans Audited</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <span className="text-xs text-slate-400">Flagged Anomalies</span>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {stats.flaggedAnomalies}
          </div>
          <span className="text-[11px] text-amber-400/80 mt-1 block">Visual / OCR Variances</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <span className="text-xs text-slate-400">Pending Review</span>
          <div className="mt-2 text-2xl font-bold font-mono text-cyan-400 tabular-nums">
            {stats.pendingReviews}
          </div>
          <span className="text-[11px] text-cyan-400/80 mt-1 block">Awaiting Lead Sign-off</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <span className="text-xs text-slate-400">Cleared / Verified</span>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {stats.clearedCases}
          </div>
          <span className="text-[11px] text-emerald-400/80 mt-1 block">Decisions Finalized</span>
        </div>
      </div>

      {/* Middle Grid: Anomaly Distribution & Case Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Anomaly Distribution Chart/List */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Detected Forensic Anomaly Categories
              </h2>
              <p className="text-xs text-slate-400">
                Visual inspection classifications mapped across active investigation files.
              </p>
            </div>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>

          <div className="mt-4 space-y-3">
            {stats.anomalyDistribution.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">{item.type}</span>
                  <span className="font-mono text-slate-400 tabular-nums">
                    {item.count} flagged
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.severity === 'critical'
                        ? 'bg-red-500'
                        : item.severity === 'high'
                        ? 'bg-amber-500'
                        : 'bg-cyan-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (item.count / Math.max(1, stats.flaggedAnomalies)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Case Category Breakdown */}
        <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-white">Investigation Categories</h2>
              <FileCheck2 className="w-4 h-4 text-cyan-400" />
            </div>

            <div className="mt-4 space-y-2.5">
              {stats.categoryDistribution.map((cat, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded bg-slate-800/40 border border-slate-800"
                >
                  <span className="text-slate-300 truncate">{cat.category}</span>
                  <span className="font-mono font-semibold text-cyan-400 tabular-nums shrink-0 ml-2">
                    {cat.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Primary Focus: Credit &amp; Commercial Fraud</span>
            <span className="font-mono text-cyan-400">100% Traceable</span>
          </div>
        </div>
      </div>

      {/* Investigations Table (Quick Case Navigator) */}
      <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-white">Active Case Files</h2>
            <p className="text-xs text-slate-400">
              Select an investigation to open the deep visual forensics studio and cross-document matrix.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                <th className="py-2.5 px-3">Case ID</th>
                <th className="py-2.5 px-3">Investigation Title</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Docs</th>
                <th className="py-2.5 px-3">Findings</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {investigations.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => onSelectInvestigation(inv.id)}
                  className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-3 font-mono font-semibold text-cyan-400 whitespace-nowrap">
                    {inv.id}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-slate-200 group-hover:text-cyan-300 transition-colors">
                      {inv.title}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-md">
                      {inv.description}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                    {inv.category}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300 tabular-nums">
                    {inv.documents.length}
                  </td>
                  <td className="py-3 px-3 font-mono tabular-nums">
                    <span
                      className={`font-semibold ${
                        inv.findings.length > 0 ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    >
                      {inv.findings.length}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        inv.status === 'Discrepancies Flagged'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : inv.status === 'Pending Review'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button className="text-cyan-400 group-hover:text-cyan-300 text-xs font-semibold inline-flex items-center gap-1">
                      Open <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Investigation Activity Feed */}
      <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Recent Activity &amp; Audit Trail</h2>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {stats.recentActivity.length} events logged
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {stats.recentActivity.map((log) => (
            <div
              key={log.id}
              className="flex items-start justify-between text-xs py-2 px-3 rounded bg-slate-800/30 border border-slate-800/60"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200">{log.action}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                    {log.category}
                  </span>
                  {log.investigationId && (
                    <span className="text-cyan-400 font-mono text-[11px]">
                      [{log.investigationId}]
                    </span>
                  )}
                </div>
                <div className="text-slate-400 text-[11px]">{log.details}</div>
              </div>
              <div className="text-right shrink-0 ml-4">
                <div className="text-slate-300 font-medium">{log.userName}</div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
