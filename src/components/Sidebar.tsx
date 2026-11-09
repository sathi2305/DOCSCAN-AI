import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FolderGit2,
  FileText,
  ScanEye,
  Layers,
  FileCheck2,
  History,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
  PlusCircle,
  ShieldAlert,
  Sparkles,
  Upload,
} from 'lucide-react';
import { User } from '../types/forensics.js';

interface SidebarProps {
  currentView: 'landing' | 'dashboard' | 'investigations' | 'audit' | 'admin' | 'workspace';
  setCurrentView: (view: 'landing' | 'dashboard' | 'investigations' | 'audit' | 'admin' | 'workspace') => void;
  activeCaseId: string | null;
  onOpenActiveCase: () => void;
  onSelectBenchmarkCase: () => void;
  currentUser: User;
  onNewCaseClick: () => void;
  onExportDossierClick: () => void;
  onUploadDocumentClick?: () => void;
  onOpenDocumentManagement?: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  activeCaseId,
  onOpenActiveCase,
  onSelectBenchmarkCase,
  currentUser,
  onNewCaseClick,
  onExportDossierClick,
  onUploadDocumentClick,
  onOpenDocumentManagement,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  // Persist desktop collapsed/expanded preference
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('docuscan_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('docuscan_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Escape key support to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, setIsMobileOpen]);

  const handleNavClick = (view: 'landing' | 'dashboard' | 'investigations' | 'audit' | 'admin' | 'workspace') => {
    setCurrentView(view);
    setIsMobileOpen(false);
  };

  // Canonical sidebar items matching user architecture
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Executive forensic analytics',
      action: () => handleNavClick('dashboard'),
      isActive: currentView === 'dashboard',
    },
    {
      id: 'investigate',
      label: 'Investigate',
      icon: FolderGit2,
      description: 'Case repository & search',
      action: () => handleNavClick('investigations'),
      isActive: currentView === 'investigations',
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText,
      description: 'Ingested assets & batch repository',
      action: () => {
        if (onOpenDocumentManagement) {
          onOpenDocumentManagement();
          setIsMobileOpen(false);
        } else if (!activeCaseId) {
          onSelectBenchmarkCase();
        } else {
          handleNavClick('workspace');
        }
      },
      isActive: currentView === 'workspace' && activeCaseId !== null,
    },
    {
      id: 'forensics',
      label: 'Forensics',
      icon: ScanEye,
      description: 'Optical kerning & ELA analysis',
      action: () => {
        if (!activeCaseId) onSelectBenchmarkCase();
        else handleNavClick('workspace');
      },
      isActive: currentView === 'workspace',
    },
    {
      id: 'evidence',
      label: 'Evidence',
      icon: Layers,
      description: 'Cryptographic chain of custody',
      action: () => {
        if (!activeCaseId) onSelectBenchmarkCase();
        else handleNavClick('workspace');
      },
      isActive: false,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileCheck2,
      description: 'Official PDF dossier compiler',
      action: () => {
        onExportDossierClick();
        setIsMobileOpen(false);
      },
      isActive: false,
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      icon: History,
      description: 'Immutable forensic logs',
      action: () => handleNavClick('audit'),
      isActive: currentView === 'audit',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: ShieldCheck,
      description: 'Access control & reviewer roles',
      action: () => handleNavClick('admin'),
      isActive: currentView === 'admin',
    },
  ];

  const renderContent = (isMobile: boolean = false) => {
    const collapsed = isMobile ? false : isCollapsed;

    return (
      <div className="flex flex-col h-full bg-[#0A1024] select-none">
        {/* Sidebar Controls Header */}
        <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-800/80 bg-slate-950/40 shrink-0">
          {!collapsed ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[11px] font-mono font-bold tracking-wider text-slate-300 uppercase">
                FORENSIC ENGINE
              </span>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" title="DOCUSCAN Engine Active" />
            </div>
          )}

          {isMobile ? (
            <button
              onClick={() => setIsMobileOpen(false)}
              aria-label="Close mobile sidebar"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={toggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden lg:flex p-1 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Navigation Items (Independently Scrollable) */}
        <div className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto overflow-x-hidden">
          {!collapsed && (
            <div className="px-2.5 pb-1 text-[9px] font-mono tracking-wider uppercase text-slate-500 font-semibold">
              NAVIGATION
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.isActive;

            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={item.action}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                    active
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent font-medium'
                  } ${collapsed ? 'justify-center px-2' : ''}`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      active ? 'text-cyan-400 scale-105' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>

                {/* Hover Tooltip when Collapsed */}
                {collapsed && (
                  <div className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 shadow-2xl text-xs text-white whitespace-nowrap">
                    <span className="font-semibold block">{item.label}</span>
                    <span className="text-[10px] text-slate-400">{item.description}</span>
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-700" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Quick Action Utilities */}
          <div className="pt-3 mt-2 border-t border-slate-800/80">
            {!collapsed && (
              <div className="px-2.5 pb-1 text-[9px] font-mono tracking-wider uppercase text-slate-500 font-semibold">
                QUICK ACTIONS
              </div>
            )}

            {/* Ingest New Case */}
            <div className="relative group mb-1">
              <button
                onClick={() => {
                  onNewCaseClick();
                  setIsMobileOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 transition-colors cursor-pointer ${
                  collapsed ? 'justify-center px-2' : ''
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                {!collapsed && <span>New Investigation</span>}
              </button>

              {collapsed && (
                <div className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 shadow-2xl text-xs text-white whitespace-nowrap">
                  <span>Create New Case</span>
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-700" />
                </div>
              )}
            </div>

            {/* Upload Document Primary Action */}
            {onUploadDocumentClick && (
              <div className="relative group">
                <button
                  onClick={() => {
                    onUploadDocumentClick();
                    setIsMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 shadow-sm shadow-cyan-500/20 transition-all cursor-pointer ${
                    collapsed ? 'justify-center px-2' : ''
                  }`}
                  title="Upload Forensic Document"
                >
                  <Upload className="w-3.5 h-3.5 shrink-0 text-slate-950" />
                  {!collapsed && <span>+ Upload Document</span>}
                </button>

                {collapsed && (
                  <div className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 px-3 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/40 shadow-2xl text-xs text-white whitespace-nowrap">
                    <span className="font-bold text-cyan-400 block">+ Upload Document</span>
                    <span className="text-[10px] text-slate-300">Ingest PDF/PNG/JPG</span>
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-700" />
                  </div>
                )}
              </div>
            )}

            {/* Export Official Dossier PDF */}
            <div className="relative group">
              <button
                onClick={() => {
                  onExportDossierClick();
                  setIsMobileOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer ${
                  collapsed ? 'justify-center px-2' : ''
                }`}
              >
                <FileCheck2 className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                {!collapsed && <span>Export Dossier PDF</span>}
              </button>

              {collapsed && (
                <div className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 px-3 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/40 shadow-2xl text-xs text-white whitespace-nowrap">
                  <span className="font-bold text-cyan-400 block">Export Dossier</span>
                  <span className="text-[10px] text-slate-300">Generate Official PDF</span>
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-700" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Footer Integrity Indicator */}
        <div className="p-2.5 border-t border-slate-800/80 bg-slate-950/40 shrink-0">
          {!collapsed ? (
            <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1 text-[9px] font-mono">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  SHA-256 Custody
                </span>
                <span className="text-emerald-400 font-bold">VERIFIED</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="SHA-256 Custody Verified" />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Persistent Collapsible Sidebar - Positioned immediately below navbar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 transition-all duration-300 ease-in-out border-r border-slate-800 bg-[#0A1024] select-none h-full overflow-hidden ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {renderContent(false)}
      </aside>

      {/* Mobile Drawer (Positioned immediately below top navbar at top-14) */}
      {isMobileOpen && (
        <div className="fixed top-14 inset-x-0 bottom-0 z-40 lg:hidden flex">
          {/* Backdrop overlay starting below top navbar */}
          <div
            onClick={() => setIsMobileOpen(false)}
            className="fixed top-14 inset-x-0 bottom-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
          />

          {/* Drawer content starting below top navbar */}
          <div className="relative w-72 max-w-[85vw] h-full z-10 shadow-2xl bg-[#0A1024] border-r border-slate-800 animate-in slide-in-from-left duration-250 flex flex-col overflow-hidden">
            {renderContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
