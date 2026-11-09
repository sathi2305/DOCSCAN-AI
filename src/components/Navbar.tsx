import React from 'react';
import { UserCheck, Shield, Menu, FileCheck2, Upload } from 'lucide-react';
import { User } from '../types/forensics.js';
import { ThreeLogo } from './ThreeLogo.js';

interface NavbarProps {
  currentView: 'landing' | 'dashboard' | 'investigations' | 'audit' | 'admin';
  setCurrentView: (view: 'landing' | 'dashboard' | 'investigations' | 'audit' | 'admin') => void;
  currentUser: User;
  allUsers: User[];
  onSwitchUser: (user: User) => void;
  onNewInvestigationClick: () => void;
  onToggleSidebar?: () => void;
  onExportDossierClick?: () => void;
  onUploadClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  currentUser,
  allUsers,
  onSwitchUser,
  onNewInvestigationClick,
  onToggleSidebar,
  onExportDossierClick,
  onUploadClick,
}) => {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 h-14 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 shrink-0">
      {/* Zone 1: Hamburger Menu (Mobile/Desktop) & 3D Brand Emblem */}
      <div className="flex items-center gap-3 shrink-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            aria-label="Toggle navigation drawer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => setCurrentView('landing')}
          className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
        >
          <div className="relative w-9 h-9 rounded-lg bg-slate-900/80 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10 group-hover:border-cyan-400 transition-all overflow-hidden">
            <ThreeLogo size="compact" interactive={true} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-200 to-cyan-400 group-hover:to-cyan-300 transition-colors whitespace-nowrap">
                DOCUSCAN AI
              </span>
              <span className="px-1.5 py-0.2 text-[9px] font-mono font-semibold rounded bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
                PRO
              </span>
            </div>
            <p className="text-[9px] font-mono tracking-widest text-slate-400 uppercase hidden sm:block">
              INTELLIGENCE BEYOND DOCUMENTS
            </p>
          </div>
        </button>
      </div>

      {/* Zone 2: 4 concise single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
        <button
          onClick={() => setCurrentView('dashboard')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            currentView === 'dashboard' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setCurrentView('investigations')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            currentView === 'investigations' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Investigations
        </button>
        <button
          onClick={() => setCurrentView('audit')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            currentView === 'audit' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Audit Trail
        </button>
        {currentUser.role === 'administrator' && (
          <button
            onClick={() => setCurrentView('admin')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              currentView === 'admin' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Administration
          </button>
        )}
      </nav>

      {/* Zone 3: User Role Switcher & Primary Action */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Role Switcher Menu */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
          <UserCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-200 leading-tight whitespace-nowrap">
              {currentUser.name}
            </span>
            <span className="text-[10px] text-slate-400 leading-tight capitalize whitespace-nowrap">
              {currentUser.role.replace('_', ' ')}
            </span>
          </div>

          <select
            value={currentUser.id}
            onChange={(e) => {
              const u = allUsers.find((x) => x.id === e.target.value);
              if (u) onSwitchUser(u);
            }}
            aria-label="Switch User Role"
            className="ml-1 bg-transparent text-xs text-slate-400 hover:text-cyan-300 focus:outline-none cursor-pointer"
          >
            {allUsers.map((u) => (
              <option key={u.id} value={u.id} className="bg-slate-900 text-slate-200">
                Switch: {u.role === 'senior_reviewer' ? 'Senior Reviewer' : u.role === 'investigator' ? 'Investigator' : 'Admin'} ({u.name})
              </option>
            ))}
          </select>
        </div>

        {/* Quick Export Dossier Action */}
        {onExportDossierClick && (
          <button
            onClick={onExportDossierClick}
            className="hidden sm:flex px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-all whitespace-nowrap shrink-0 items-center gap-1.5 cursor-pointer"
            title="Download automated forensic dossier PDF"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Dossier PDF</span>
          </button>
        )}

        {/* Prominent Upload Document Action */}
        {onUploadClick && (
          <button
            onClick={onUploadClick}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 rounded-lg shadow-sm shadow-cyan-500/20 transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
            title="Upload and ingest forensic document"
          >
            <Upload className="w-3.5 h-3.5 text-slate-950" />
            <span>+ Upload Document</span>
          </button>
        )}

        {/* Primary CTA */}
        <button
          onClick={onNewInvestigationClick}
          className="px-3.5 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg shadow-sm transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span>New Case</span>
        </button>
      </div>
    </header>
  );
};
