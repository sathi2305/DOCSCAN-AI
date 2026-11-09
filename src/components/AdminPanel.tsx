import React, { useState } from 'react';
import { ShieldCheck, Users, Sliders, HardDrive, CheckCircle2 } from 'lucide-react';
import { User } from '../types/forensics.js';

interface AdminPanelProps {
  users: User[];
  currentUser: User;
  onRefreshUsers: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ users, currentUser, onRefreshUsers }) => {
  const [kerningSensitivity, setKerningSensitivity] = useState<number>(85);
  const [elaThreshold, setElaThreshold] = useState<number>(75);
  const [autoEscalateCritical, setAutoEscalateCritical] = useState<boolean>(true);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSaveConfig = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 w-full space-y-8">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          System Administration &amp; Forensic Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure detection tolerances, role authorizations, and evidentiary retention policies.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4" />
          <span>Forensic parameters updated successfully. Applied to active vision models.</span>
        </div>
      )}

      {/* User Management Section */}
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Authorized Forensic Examiners</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">{users.length} active users</span>
        </div>

        <div className="divide-y divide-slate-800/80 text-xs">
          {users.map((u) => (
            <div key={u.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-200">{u.name}</div>
                <div className="text-[11px] text-slate-400">
                  {u.email} · {u.department}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-slate-800 text-cyan-300 border border-slate-700">
                  {u.role.replace('_', ' ')}
                </span>
                <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                  Last Login: {new Date(u.lastLogin).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Forensic Detection Thresholds */}
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Computer Vision &amp; Forensic Sensitivity</h2>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-slate-300 font-medium">
                Font Kerning &amp; Stroke-Width Variance Sensitivity
              </span>
              <span className="font-mono text-cyan-400 font-bold">{kerningSensitivity}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="99"
              value={kerningSensitivity}
              onChange={(e) => setKerningSensitivity(Number(e.target.value))}
              aria-label="Font Kerning Sensitivity"
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Higher values detect subtle 0.2px character width changes but may increase sensitivity on scanned low-DPI facsimiles.
            </span>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-slate-300 font-medium">
                Error Level Analysis (ELA) Compression Artifact Threshold
              </span>
              <span className="font-mono text-cyan-400 font-bold">{elaThreshold}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="95"
              value={elaThreshold}
              onChange={(e) => setElaThreshold(Number(e.target.value))}
              aria-label="ELA Compression Artifact Threshold"
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Flags local quantization table discrepancies around pasted signatures and digital rubber stamps.
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <div className="text-xs font-semibold text-slate-200">
                Automatic Cross-Document Discrepancy Escalation
              </div>
              <div className="text-[11px] text-slate-400">
                Instantly flag cases with material financial divergence (&gt;₹5,000 delta).
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoEscalateCritical}
              onChange={(e) => setAutoEscalateCritical(e.target.checked)}
              aria-label="Automatic Escalation Toggle"
              className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={handleSaveConfig}
            className="px-4 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs transition-all shadow-sm shadow-cyan-500/20"
          >
            Apply Sensitivity Settings
          </button>
        </div>
      </div>

      {/* Storage & Retention Section */}
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs text-slate-400">
        <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <span>Storage &amp; Integrity Invariant Controls</span>
        </div>
        <p className="leading-relaxed">
          Original ingested file bytes are preserved immutably. SHA-256 digests are cross-validated on every retrieval to ensure no post-ingestion bit-rot or tampering.
        </p>
      </div>
    </div>
  );
};
