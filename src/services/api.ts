import {
  Investigation,
  DashboardStats,
  DocumentItem,
  ExtractedField,
  ExtractedTable,
  VisualFinding,
  ContextDiscrepancy,
  AuditLog,
  User,
  ReviewDecision,
  BatchComparisonReport,
} from '../types/forensics.js';

export const api = {
  // Users & Auth
  async getUsers(): Promise<User[]> {
    const res = await fetch('/api/auth/users');
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async login(email: string): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error('Failed to login');
    return res.json();
  },

  // Stats
  async getStats(): Promise<DashboardStats> {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('Failed to fetch statistics');
    return res.json();
  },

  // Investigations
  async getInvestigations(): Promise<Investigation[]> {
    const res = await fetch('/api/investigations');
    if (!res.ok) throw new Error('Failed to fetch investigations');
    return res.json();
  },

  async getInvestigation(id: string): Promise<Investigation> {
    const res = await fetch(`/api/investigations/${id}`);
    if (!res.ok) throw new Error('Failed to fetch investigation');
    return res.json();
  },

  async createInvestigation(data: {
    title: string;
    description: string;
    category: string;
    priority: string;
    assignedInvestigator: string;
    seniorReviewer?: string;
    userName: string;
    userRole: string;
  }): Promise<Investigation> {
    const res = await fetch('/api/investigations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create investigation');
    return res.json();
  },

  async updateInvestigation(id: string, updates: Partial<Investigation>): Promise<Investigation> {
    const res = await fetch(`/api/investigations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update investigation');
    return res.json();
  },

  async toggleArchive(id: string, isArchived: boolean): Promise<Investigation> {
    return this.updateInvestigation(id, {
      isArchived,
      archivedAt: isArchived ? new Date().toISOString() : undefined,
    });
  },

  async deleteInvestigation(id: string): Promise<void> {
    const res = await fetch(`/api/investigations/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete investigation');
  },

  // Documents
  async uploadDocument(
    investigationId: string,
    data: {
      originalName: string;
      filename?: string;
      fileSize: number;
      mimeType: string;
      base64Data?: string;
      classification: string;
      userName: string;
      userRole: string;
    }
  ): Promise<{ document: DocumentItem; analysis: any; discrepancies: ContextDiscrepancy[] }> {
    const res = await fetch(`/api/investigations/${investigationId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to upload document');
    return res.json();
  },

  async deleteDocument(investigationId: string, docId: string, userName?: string, userRole?: string): Promise<void> {
    const res = await fetch(`/api/investigations/${investigationId}/documents/${docId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName, userRole }),
    });
    if (!res.ok) throw new Error('Failed to delete document');
  },

  async retryDocumentAnalysis(investigationId: string, docId: string): Promise<any> {
    const res = await fetch(`/api/investigations/${investigationId}/documents/${docId}/retry`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to retry analysis');
    return res.json();
  },

  async getDocumentsHistory(): Promise<Array<DocumentItem & { investigationTitle: string }>> {
    const res = await fetch('/api/documents/history');
    if (!res.ok) throw new Error('Failed to fetch document history');
    return res.json();
  },

  async getFields(investigationId: string, docId: string): Promise<ExtractedField[]> {
    const res = await fetch(`/api/investigations/${investigationId}/documents/${docId}/fields`);
    if (!res.ok) throw new Error('Failed to fetch fields');
    return res.json();
  },

  async updateField(
    investigationId: string,
    docId: string,
    fieldId: string,
    newValue: string,
    notes?: string,
    userName?: string,
    userRole?: string
  ): Promise<ExtractedField> {
    const res = await fetch(`/api/investigations/${investigationId}/documents/${docId}/fields/${fieldId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newValue, notes, userName, userRole }),
    });
    if (!res.ok) throw new Error('Failed to update field');
    return res.json();
  },

  async getTables(investigationId: string, docId: string): Promise<ExtractedTable[]> {
    const res = await fetch(`/api/investigations/${investigationId}/documents/${docId}/tables`);
    if (!res.ok) throw new Error('Failed to fetch tables');
    return res.json();
  },

  // Findings
  async updateFindingReview(
    investigationId: string,
    findingId: string,
    data: {
      status: string;
      reviewNotes?: string;
      reviewerName: string;
      userRole: string;
    }
  ): Promise<VisualFinding> {
    const res = await fetch(`/api/investigations/${investigationId}/findings/${findingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update finding');
    return res.json();
  },

  // Cross Document Correlation
  async rerunCorrelation(investigationId: string): Promise<{ discrepancies: ContextDiscrepancy[] }> {
    const res = await fetch(`/api/investigations/${investigationId}/correlate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to rerun correlation');
    return res.json();
  },

  // Batch Document Comparison
  async runBatchComparison(investigationId: string, documentIds?: string[]): Promise<BatchComparisonReport> {
    const res = await fetch(`/api/investigations/${investigationId}/batch-compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentIds }),
    });
    if (!res.ok) throw new Error('Failed to run batch document comparison');
    return res.json();
  },

  // Final Review Decision
  async recordDecision(
    investigationId: string,
    data: {
      verdict: string;
      summaryNotes: string;
      riskScore: number;
      decidedBy: string;
      decidedByRole: string;
      checklist: any;
    }
  ): Promise<ReviewDecision> {
    const res = await fetch(`/api/investigations/${investigationId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to record review decision');
    return res.json();
  },

  // AI Assistant
  async askAssistant(
    investigationId: string,
    question: string
  ): Promise<{ answer: string; citations: { type: string; id: string; title: string }[] }> {
    const res = await fetch(`/api/investigations/${investigationId}/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) throw new Error('Assistant query failed');
    return res.json();
  },

  // Audit Logs
  async getAuditLogs(investigationId?: string): Promise<AuditLog[]> {
    const url = investigationId ? `/api/audit-logs?investigationId=${investigationId}` : '/api/audit-logs';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },
};
