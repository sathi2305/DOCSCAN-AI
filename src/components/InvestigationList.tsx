import React, { useState, useMemo } from 'react';
import {
  FolderOpen,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Trash2,
  Calendar,
  User as UserIcon,
  Archive,
  ArchiveRestore,
  X,
  Clock,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
  Upload,
  Files,
} from 'lucide-react';
import { Investigation, InvestigationCategory, CasePriority, User } from '../types/forensics.js';
import { api } from '../services/api.js';

interface InvestigationListProps {
  investigations: Investigation[];
  currentUser: User;
  onSelectInvestigation: (id: string) => void;
  onRefresh: () => void;
  onUploadDocument?: () => void;
  onOpenDocumentManagement?: () => void;
}

const CATEGORIES: InvestigationCategory[] = [
  'Financial Fraud',
  'Loan & Mortgage Screening',
  'Identity Verification',
  'Contract & Legal Tampering',
  'Vendor Invoice Audit',
  'Healthcare & Insurance Claims',
];

type ScopeTab = 'all' | 'active' | 'archived';
type DateRange = 'all' | 'today' | '7days' | '30days' | 'custom';
type SortOption = 'newest' | 'oldest' | 'title' | 'priority';

/**
 * Checks if a query string matches the investigation's creation date in various formats.
 */
function matchesCreationDate(createdAtStr: string, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  const createdDate = new Date(createdAtStr);
  if (isNaN(createdDate.getTime())) return false;

  // 1. Direct ISO match (e.g. "2026-11-01", "2026-11", "11-01")
  if (createdAtStr.toLowerCase().includes(q)) return true;

  // 2. Comprehensive human-readable date formats
  const formats = [
    createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), // "Nov 1, 2026"
    createdDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), // "November 1, 2026"
    createdDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), // "Nov 2026"
    createdDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), // "November 2026"
    createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), // "Nov 1"
    createdDate.toLocaleDateString('en-US', { month: 'long' }), // "November"
    createdDate.toLocaleDateString('en-US', { month: 'short' }), // "Nov"
    createdDate.toLocaleDateString('en-US', { year: 'numeric' }), // "2026"
    `${createdDate.getMonth() + 1}/${createdDate.getDate()}/${createdDate.getFullYear()}`, // "11/1/2026"
    `${String(createdDate.getMonth() + 1).padStart(2, '0')}/${String(createdDate.getDate()).padStart(2, '0')}/${createdDate.getFullYear()}`, // "11/01/2026"
    createdDate.toISOString().split('T')[0], // "2026-11-01"
  ];

  return formats.some((f) => f.toLowerCase().includes(q));
}

export const InvestigationList: React.FC<InvestigationListProps> = ({
  investigations,
  currentUser,
  onSelectInvestigation,
  onRefresh,
  onUploadDocument,
  onOpenDocumentManagement,
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [scopeTab, setScopeTab] = useState<ScopeTab>('active');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Modal & Notification State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // New Case Form State
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newCategory, setNewCategory] = useState<InvestigationCategory>('Loan & Mortgage Screening');
  const [newPriority, setNewPriority] = useState<CasePriority>('Medium');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Compute counts for active and archived
  const activeCount = useMemo(() => investigations.filter((i) => !i.isArchived).length, [investigations]);
  const archivedCount = useMemo(() => investigations.filter((i) => Boolean(i.isArchived)).length, [investigations]);
  const totalCount = investigations.length;

  // Filtered investigations based on Search Bar (Title, ID, Creation Date) + Scope + Category + Date Range
  const filtered = useMemo(() => {
    return investigations.filter((inv) => {
      const isArchived = Boolean(inv.isArchived);

      // 1. Scope filter: active vs archived vs all
      if (scopeTab === 'active' && isArchived) return false;
      if (scopeTab === 'archived' && !isArchived) return false;

      // 2. Category filter
      if (selectedCategory !== 'All' && inv.category !== selectedCategory) {
        return false;
      }

      // 3. Date range filter
      if (dateRange !== 'all') {
        const createdTime = new Date(inv.createdAt).getTime();
        const now = Date.now();
        if (dateRange === 'today') {
          const isToday = new Date(inv.createdAt).toDateString() === new Date().toDateString();
          if (!isToday) return false;
        } else if (dateRange === '7days') {
          if (now - createdTime > 7 * 24 * 60 * 60 * 1000) return false;
        } else if (dateRange === '30days') {
          if (now - createdTime > 30 * 24 * 60 * 60 * 1000) return false;
        } else if (dateRange === 'custom' && customDate) {
          const invDateStr = new Date(inv.createdAt).toISOString().split('T')[0];
          if (invDateStr !== customDate) return false;
        }
      }

      // 4. Robust Search Query: Title, ID, Creation Date, or Assigned Investigator
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = inv.title.toLowerCase().includes(q);
        const matchesId = inv.id.toLowerCase().includes(q);
        const matchesDate = matchesCreationDate(inv.createdAt, q);
        const matchesInvestigator = inv.assignedInvestigator.toLowerCase().includes(q);

        if (!matchesTitle && !matchesId && !matchesDate && !matchesInvestigator) {
          return false;
        }
      }

      return true;
    });
  }, [investigations, scopeTab, selectedCategory, dateRange, customDate, searchQuery]);

  // Sorted list
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'priority') {
        const pWeight: Record<CasePriority, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        return (pWeight[b.priority] || 0) - (pWeight[a.priority] || 0);
      }
      return 0;
    });
  }, [filtered, sortBy]);

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  const handleToggleArchive = async (inv: Investigation, e: React.MouseEvent) => {
    e.stopPropagation();
    const willArchive = !inv.isArchived;
    try {
      await api.toggleArchive(inv.id, willArchive);
      showNotification(
        willArchive
          ? `Investigation ${inv.id} has been moved to the Archive.`
          : `Investigation ${inv.id} has been restored to Active.`
      );
      onRefresh();
    } catch (err) {
      console.error('Failed to update archive status:', err);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await api.createInvestigation({
        title: newTitle,
        description: newDescription,
        category: newCategory,
        priority: newPriority,
        assignedInvestigator: currentUser.name,
        userName: currentUser.name,
        userRole: currentUser.role,
      });

      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      showNotification('New investigation successfully initiated.');
      onRefresh();
    } catch (err) {
      console.error('Failed to create case:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCase = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to permanently delete case ${id}?`)) {
      try {
        await api.deleteInvestigation(id);
        showNotification(`Investigation ${id} deleted.`);
        onRefresh();
      } catch (err) {
        console.error('Failed to delete case:', err);
      }
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setDateRange('all');
    setCustomDate('');
    setScopeTab('active');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'All' ||
    dateRange !== 'all' ||
    scopeTab !== 'active';

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 w-full space-y-6">
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="p-3 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>{notificationMsg}</span>
          </div>
          <button onClick={() => setNotificationMsg(null)} className="text-cyan-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Investigation Case Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Search, filter, inspect, and archive multi-document forensic investigation portfolios.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {onUploadDocument && (
            <button
              onClick={onUploadDocument}
              className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 text-slate-950 font-semibold text-xs transition-all shadow-sm shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer"
              title="Upload forensic documents to an investigation"
            >
              <Upload className="w-4 h-4 text-slate-950" />
              <span>+ Upload Document</span>
            </button>
          )}

          {onOpenDocumentManagement && (
            <button
              onClick={onOpenDocumentManagement}
              className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-slate-200 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Open Document Library and Ingestion History"
            >
              <Files className="w-4 h-4 text-cyan-400" />
              <span>Document Library</span>
            </button>
          )}

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>New Investigation</span>
          </button>
        </div>
      </div>

      {/* Scope Segmented Control (Active vs Archived vs All) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => setScopeTab('active')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${
              scopeTab === 'active'
                ? 'bg-cyan-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Active Cases</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                scopeTab === 'active' ? 'bg-slate-950 text-cyan-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {activeCount}
            </span>
          </button>

          <button
            onClick={() => setScopeTab('archived')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${
              scopeTab === 'archived'
                ? 'bg-cyan-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archived</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                scopeTab === 'archived' ? 'bg-slate-950 text-cyan-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {archivedCount}
            </span>
          </button>

          <button
            onClick={() => setScopeTab('all')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${
              scopeTab === 'all'
                ? 'bg-cyan-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>All Cases</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                scopeTab === 'all' ? 'bg-slate-950 text-cyan-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {totalCount}
            </span>
          </button>
        </div>

        {/* Results Counter */}
        <div className="text-xs text-slate-400 font-mono">
          Showing <span className="text-cyan-400 font-semibold">{sorted.length}</span> of{' '}
          <span className="text-slate-200">{totalCount}</span> cases
        </div>
      </div>

      {/* Robust Search & Filter Control Bar */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
        {/* Main Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search investigations by title, ID (e.g. INV-2026-0841), or creation date (e.g. 2026-11-01, Nov 2026)..."
            className="w-full pl-10 pr-9 py-2.5 rounded-lg bg-slate-950 border border-slate-700/80 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Clear search query"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Secondary Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Filter by Category"
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-1 text-xs"
              >
                <option value="All" className="bg-slate-900 text-slate-200">
                  All Categories
                </option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-slate-900 text-slate-200">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Creation Date Range Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                aria-label="Filter by Creation Date Range"
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-1 text-xs"
              >
                <option value="all" className="bg-slate-900 text-slate-200">
                  All Creation Dates
                </option>
                <option value="today" className="bg-slate-900 text-slate-200">
                  Created Today
                </option>
                <option value="7days" className="bg-slate-900 text-slate-200">
                  Past 7 Days
                </option>
                <option value="30days" className="bg-slate-900 text-slate-200">
                  Past 30 Days
                </option>
                <option value="custom" className="bg-slate-900 text-slate-200">
                  Specific Date...
                </option>
              </select>
            </div>

            {/* Custom Date Picker (when Specific Date is selected) */}
            {dateRange === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                aria-label="Specific Date Picker"
                className="bg-slate-950 px-2.5 py-1.5 rounded-lg border border-cyan-500/50 text-xs text-slate-200 focus:outline-none"
              />
            )}
          </div>

          {/* Sort By Controls */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort investigations"
              className="bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="newest" className="bg-slate-900">
                Created: Newest First
              </option>
              <option value="oldest" className="bg-slate-900">
                Created: Oldest First
              </option>
              <option value="title" className="bg-slate-900">
                Title: A-Z
              </option>
              <option value="priority" className="bg-slate-900">
                Priority: Critical First
              </option>
            </select>
          </div>
        </div>

        {/* Active Filter Tags */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
            <span className="text-slate-400 font-medium">Active Filters:</span>

            {searchQuery.trim() && (
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 flex items-center gap-1 font-mono">
                Query: "{searchQuery}"
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Remove search query filter"
                  className="hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {scopeTab !== 'all' && (
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1 capitalize">
                Scope: {scopeTab}
                <button
                  onClick={() => setScopeTab('all')}
                  aria-label="Reset scope filter"
                  className="hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedCategory !== 'All' && (
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1">
                Category: {selectedCategory}
                <button
                  onClick={() => setSelectedCategory('All')}
                  aria-label="Remove category filter"
                  className="hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {dateRange !== 'all' && (
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1">
                Date: {dateRange === 'custom' && customDate ? customDate : dateRange}
                <button
                  onClick={() => {
                    setDateRange('all');
                    setCustomDate('');
                  }}
                  aria-label="Remove date filter"
                  className="hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              onClick={handleResetFilters}
              className="text-cyan-400 hover:text-cyan-300 underline font-medium ml-1 cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Investigations Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sorted.map((inv) => (
          <div
            key={inv.id}
            onClick={() => onSelectInvestigation(inv.id)}
            className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group relative ${
              inv.isArchived
                ? 'bg-slate-900/40 border-slate-800/80 opacity-80 hover:opacity-100 hover:border-slate-600'
                : 'bg-slate-900/70 border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/90 shadow-lg'
            }`}
          >
            <div>
              {/* Header: ID, Date & Status */}
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-mono font-bold text-cyan-400">{inv.id}</span>
                <div className="flex items-center gap-2">
                  {inv.isArchived && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                      Archived
                    </span>
                  )}
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
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                {inv.title}
              </h3>
              <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {inv.description || 'No description provided.'}
              </p>

              {/* Creation Date Badge */}
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  Created: {new Date(inv.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                {inv.archivedAt && (
                  <span className="text-slate-500">
                    · Archived: {new Date(inv.archivedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            </div>

            {/* Footer Metadata & Card Actions */}
            <div className="mt-5 pt-3 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate max-w-[160px]">{inv.category}</span>
                <span className="font-mono text-slate-300 shrink-0">
                  {inv.documents.length} Docs · {inv.findings.length} Findings
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                  <UserIcon className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{inv.assignedInvestigator}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Archive / Restore Button */}
                  <button
                    onClick={(e) => handleToggleArchive(inv, e)}
                    className="p-1 text-slate-500 hover:text-cyan-300 transition-colors rounded"
                    title={inv.isArchived ? 'Restore to Active Cases' : 'Move to Archive'}
                  >
                    {inv.isArchived ? (
                      <ArchiveRestore className="w-3.5 h-3.5" />
                    ) : (
                      <Archive className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Admin Delete */}
                  {currentUser.role === 'administrator' && (
                    <button
                      onClick={(e) => handleDeleteCase(inv.id, e)}
                      className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                      title="Permanently Delete Case"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <span className="text-cyan-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 font-semibold text-xs ml-1">
                    Inspect <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State when no investigations match */}
      {sorted.length === 0 && (
        <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
          <FolderOpen className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-200">No matching investigations found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchQuery
              ? `No results matched "${searchQuery}" in ${scopeTab} cases. Check spelling or try searching by title keyword, case ID (e.g. INV-2026), or month (e.g. Nov 2026).`
              : `There are currently no ${scopeTab} investigations for the selected criteria.`}
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="mt-2 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 transition-colors inline-block"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Create Case Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Create New Investigation Case</h3>
            <p className="text-xs text-slate-400 mb-5">
              Initiates an immutable investigation workspace with forensic tracking.
            </p>

            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Investigation Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. SME Loan Screening - Apex Capital vs Sharma Ent."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Investigation Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as InvestigationCategory)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as CasePriority)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Case Scope &amp; Target Description
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe the context, suspect submissions, or background for this inquiry..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim()}
                  className="px-4 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs shadow-sm shadow-cyan-500/20"
                >
                  {isSubmitting ? 'Creating Case...' : 'Initiate Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
