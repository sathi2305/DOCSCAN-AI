import React, { useState, useEffect } from 'react';
import { Clock, Shield, Search, Filter, RefreshCw, FileText } from 'lucide-react';
import { AuditLog } from '../types/forensics.js';
import { api } from '../services/api.js';

export const AuditTrailView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filtered = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.userName.toLowerCase().includes(search.toLowerCase()) ||
      (log.investigationId && log.investigationId.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = categoryFilter === 'All' || log.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-cyan-400" />
            Cryptographic Audit Trail
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-evident system log tracking all document uploads, forensic detections, reviewer comments, and final determinations.
          </p>
        </div>

        <button
          onClick={loadLogs}
          disabled={isLoading}
          className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Trail</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit events by action, user, or case ID..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter by Category"
          className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
        >
          <option value="All">All Event Categories</option>
          <option value="ANALYSIS">ANALYSIS</option>
          <option value="UPLOAD">UPLOAD</option>
          <option value="REVIEW">REVIEW</option>
          <option value="DECISION">DECISION</option>
          <option value="AUTH">AUTH</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 text-[10px] uppercase font-mono">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Case ID</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString([], {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        log.category === 'DECISION'
                          ? 'bg-red-500/10 text-red-400'
                          : log.category === 'REVIEW'
                          ? 'bg-amber-500/10 text-amber-400'
                          : log.category === 'UPLOAD'
                          ? 'bg-cyan-500/10 text-cyan-400'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {log.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-200 whitespace-nowrap">
                    {log.action}
                  </td>
                  <td className="py-3 px-4 text-cyan-400 whitespace-nowrap">
                    {log.investigationId || '—'}
                  </td>
                  <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                    {log.userName}
                    <span className="text-[10px] text-slate-500 ml-1">
                      ({log.userRole.slice(0, 3)})
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-sans text-xs">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
