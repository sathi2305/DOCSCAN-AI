import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { LandingHero } from './components/LandingHero.js';
import { DashboardView } from './components/DashboardView.js';
import { InvestigationList } from './components/InvestigationList.js';
import { InvestigationWorkspace } from './components/InvestigationWorkspace.js';
import { AuditTrailView } from './components/AuditTrailView.js';
import { AdminPanel } from './components/AdminPanel.js';
import { CinematicBackground } from './components/CinematicBackground.js';
import { Sidebar } from './components/Sidebar.js';
import { DossierExportModal } from './components/DossierExportModal.js';
import { DocumentUploadModal } from './components/DocumentUploadModal.js';
import { DocumentManagementModal } from './components/DocumentManagementModal.js';
import { api } from './services/api.js';
import { Investigation, DashboardStats, User } from './types/forensics.js';

export default function App() {
  const [currentView, setCurrentView] = useState<
    'landing' | 'dashboard' | 'investigations' | 'audit' | 'admin' | 'workspace'
  >('landing');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isGlobalDossierModalOpen, setIsGlobalDossierModalOpen] = useState<boolean>(false);
  const [isGlobalUploadModalOpen, setIsGlobalUploadModalOpen] = useState<boolean>(false);
  const [isDocHistoryModalOpen, setIsDocHistoryModalOpen] = useState<boolean>(false);
  const [uploadTargetCaseId, setUploadTargetCaseId] = useState<string | undefined>(undefined);

  // Data states
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'usr-analyst-01',
    name: 'Dr. Sarah Jenkins',
    email: 'sarah.jenkins@docuscan.ai',
    role: 'senior_reviewer',
    avatarUrl: '/src/assets/images/investigator_avatar_senior_1793725545285.jpg',
    department: 'Forensic Document Examination Unit',
    lastLogin: new Date().toISOString(),
  });

  const loadAllData = async () => {
    try {
      const [fetchedUsers, fetchedInvs, fetchedStats] = await Promise.all([
        api.getUsers().catch(() => []),
        api.getInvestigations().catch(() => []),
        api.getStats().catch(() => null),
      ]);

      if (fetchedUsers.length > 0) {
        setUsers(fetchedUsers);
        // keep current user selection if exists
        const match = fetchedUsers.find((u) => u.id === currentUser.id);
        if (match) setCurrentUser(match);
        else setCurrentUser(fetchedUsers[0]);
      }

      setInvestigations(fetchedInvs);
      setStats(fetchedStats);
    } catch (err) {
      console.error('Initialization error:', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleSelectInvestigation = (id: string) => {
    setSelectedCaseId(id);
    setCurrentView('workspace');
  };

  return (
    <div className="min-h-screen h-screen bg-[#050816] text-slate-100 flex flex-col font-sans relative selection:bg-cyan-500/30 selection:text-cyan-200 overflow-hidden">
      <CinematicBackground />
      <Navbar
        currentView={currentView === 'workspace' ? 'investigations' : currentView}
        setCurrentView={(view) => {
          setSelectedCaseId(null);
          setCurrentView(view);
        }}
        currentUser={currentUser}
        allUsers={users}
        onSwitchUser={(user) => setCurrentUser(user)}
        onNewInvestigationClick={() => {
          setCurrentView('investigations');
        }}
        onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        onExportDossierClick={() => setIsGlobalDossierModalOpen(true)}
        onUploadClick={() => {
          setUploadTargetCaseId(selectedCaseId || undefined);
          setIsGlobalUploadModalOpen(true);
        }}
      />

      {/* Main Workspace: Top Navigation Bar is at top, Sidebar directly underneath on the left, Main Content on the right */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden h-[calc(100vh-3.5rem)]">
        {/* Responsive Desktop & Mobile Collapsible Sidebar */}
        <Sidebar
          currentView={currentView}
          setCurrentView={(view) => {
            if (view !== 'workspace') setSelectedCaseId(null);
            setCurrentView(view);
          }}
          activeCaseId={selectedCaseId}
          onOpenActiveCase={() => setCurrentView('workspace')}
          onSelectBenchmarkCase={() => handleSelectInvestigation('INV-2026-0841')}
          currentUser={currentUser}
          onNewCaseClick={() => {
            setSelectedCaseId(null);
            setCurrentView('investigations');
          }}
          onExportDossierClick={() => setIsGlobalDossierModalOpen(true)}
          onUploadDocumentClick={() => {
            setUploadTargetCaseId(selectedCaseId || undefined);
            setIsGlobalUploadModalOpen(true);
          }}
          onOpenDocumentManagement={() => setIsDocHistoryModalOpen(true)}
          isMobileOpen={isMobileSidebarOpen}
          setIsMobileOpen={setIsMobileSidebarOpen}
        />

        {/* Main Content Area (Automatically adjusts to sidebar width and scrolls independently) */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto overflow-x-hidden flex flex-col">
          <div className="flex-1 flex flex-col min-h-0">
            {currentView === 'landing' && (
              <LandingHero
                onOpenBenchmarkCase={() => handleSelectInvestigation('INV-2026-0841')}
                onExploreDashboard={() => setCurrentView('dashboard')}
                onNewCase={() => setCurrentView('investigations')}
              />
            )}

            {currentView === 'dashboard' && (
              <DashboardView
                stats={stats}
                investigations={investigations}
                currentUser={currentUser}
                onSelectInvestigation={handleSelectInvestigation}
                onNewInvestigation={() => setCurrentView('investigations')}
                onUploadDocument={() => {
                  setUploadTargetCaseId(undefined);
                  setIsGlobalUploadModalOpen(true);
                }}
                onOpenDocumentManagement={() => setIsDocHistoryModalOpen(true)}
              />
            )}

            {currentView === 'investigations' && (
              <InvestigationList
                investigations={investigations}
                currentUser={currentUser}
                onSelectInvestigation={handleSelectInvestigation}
                onRefresh={loadAllData}
                onUploadDocument={() => {
                  setUploadTargetCaseId(undefined);
                  setIsGlobalUploadModalOpen(true);
                }}
                onOpenDocumentManagement={() => setIsDocHistoryModalOpen(true)}
              />
            )}

            {currentView === 'workspace' && selectedCaseId && (
              <InvestigationWorkspace
                investigationId={selectedCaseId}
                currentUser={currentUser}
                onBack={() => {
                  setSelectedCaseId(null);
                  setCurrentView('investigations');
                }}
                onInvestigationUpdated={loadAllData}
              />
            )}

            {currentView === 'audit' && <AuditTrailView />}

            {currentView === 'admin' && (
              <AdminPanel
                users={users}
                currentUser={currentUser}
                onRefreshUsers={loadAllData}
              />
            )}
          </div>

          {/* Footer (Scrolls naturally at bottom of content) */}
          <footer className="px-6 py-4 border-t border-slate-900 bg-slate-950/80 text-center text-xs text-slate-500 font-mono shrink-0">
            <span>DOCUSCAN AI Forensic Intelligence System · SHA-256 Hash Audited · Human Review Invariant Enforced</span>
          </footer>
        </main>
      </div>

      {/* Global Multi-Document Upload Modal */}
      {isGlobalUploadModalOpen && (
        <DocumentUploadModal
          isOpen={isGlobalUploadModalOpen}
          onClose={() => setIsGlobalUploadModalOpen(false)}
          investigations={investigations}
          investigationId={uploadTargetCaseId}
          userName={currentUser.name}
          userRole={currentUser.role}
          onUploadSuccess={() => {
            loadAllData();
          }}
        />
      )}

      {/* Global Document Management & Ingestion History Modal */}
      {isDocHistoryModalOpen && (
        <DocumentManagementModal
          isOpen={isDocHistoryModalOpen}
          onClose={() => setIsDocHistoryModalOpen(false)}
          currentUser={currentUser}
          onOpenWorkspaceWithDoc={(invId) => {
            handleSelectInvestigation(invId);
          }}
          onTriggerUpload={() => {
            setIsGlobalUploadModalOpen(true);
          }}
          onRefreshAll={loadAllData}
        />
      )}

      {/* Global Dossier Export Modal (accessible from Navbar or Sidebar) */}
      {isGlobalDossierModalOpen && (
        <DossierExportModal
          isOpen={isGlobalDossierModalOpen}
          onClose={() => setIsGlobalDossierModalOpen(false)}
          investigation={
            investigations.find((i) => i.id === selectedCaseId) ||
            investigations[0] || {
              id: 'INV-2026-0841',
              title: 'Commercial SME Credit Appraisal - Sharma Enterprises',
              description: 'Comprehensive forensic inspection of loan application packet.',
              category: 'Financial Fraud',
              priority: 'Critical',
              status: 'Discrepancies Flagged',
              assignedInvestigator: 'Dr. Sarah Jenkins',
              seniorReviewer: 'Marcus Vance',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              documents: [],
              findings: [],
              discrepancies: [],
              evidence: [],
            }
          }
        />
      )}
    </div>
  );
}
