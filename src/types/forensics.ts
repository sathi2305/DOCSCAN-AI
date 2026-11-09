export type UserRole = 'investigator' | 'senior_reviewer' | 'administrator';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  department: string;
  lastLogin: string;
}

export type InvestigationCategory =
  | 'Financial Fraud'
  | 'Loan & Mortgage Screening'
  | 'Identity Verification'
  | 'Contract & Legal Tampering'
  | 'Vendor Invoice Audit'
  | 'Healthcare & Insurance Claims';

export type CaseStatus =
  | 'Draft'
  | 'Under Analysis'
  | 'Pending Review'
  | 'Discrepancies Flagged'
  | 'Approved / Cleared'
  | 'Escalated to Forensics';

export type CasePriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type DocumentClassification =
  | 'Salary Slip'
  | 'Bank Account Statement'
  | 'Loan Application Form'
  | 'Tax Return (ITR/W2)'
  | 'Government ID / Passport'
  | 'Commercial Invoice'
  | 'Employment Verification Letter'
  | 'Legal Contract'
  | 'Other Document';

export type ProcessingStatus =
  | 'Pending'
  | 'Processing OCR'
  | 'Analyzing Forensics'
  | 'Correlating Context'
  | 'Completed'
  | 'Failed';

export interface DocumentItem {
  id: string;
  investigationId: string;
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  sha256Hash: string;
  uploadedAt: string;
  uploadedBy: string;
  classification: DocumentClassification;
  pageCount: number;
  processingStatus: ProcessingStatus;
  processingProgress: number;
  thumbnailUrl?: string;
  fileUrl: string;
  previewImageUrl?: string;
  metadata?: {
    author?: string;
    creationDate?: string;
    modificationDate?: string;
    producerSoftware?: string;
    creatorTool?: string;
    pdfVersion?: string;
    colorSpace?: string;
    resolutionDpi?: number;
    linearized?: boolean;
    incrementalUpdateCount?: number;
    digitalSignatureStatus?: 'Present & Valid' | 'Tampered / Invalid' | 'Stripped / Absent' | 'Self-Signed Untrusted';
    securityTags?: string[];
    compressionRatio?: string;
    suspiciousMetadataFlags?: string[];
    exifData?: Record<string, string>;
    editHistory?: {
      timestamp: string;
      action: string;
      tool: string;
      details: string;
    }[];
  };
}

export interface ExtractedField {
  id: string;
  documentId: string;
  fieldName: string;
  label: string;
  extractedValue: string;
  normalizedValue?: string | number;
  fieldType: 'text' | 'currency' | 'date' | 'identifier' | 'name' | 'percentage';
  confidence: number; // 0 to 1
  page: number;
  boundingBox: {
    x: number; // percentage 0 - 100
    y: number;
    width: number;
    height: number;
  };
  verifiedByHuman?: boolean;
  notes?: string;
}

export interface TableRowData {
  [columnKey: string]: string | number;
}

export interface ExtractedTable {
  id: string;
  documentId: string;
  title: string;
  page: number;
  columns: string[];
  rows: TableRowData[];
}

export type ForensicDetectionMethod =
  | 'Font Kerning & Weight Variance'
  | 'Error Level Analysis (ELA)'
  | 'Tabular Grid & Baseline Misalignment'
  | 'Digital Splice & Edge Gradient Artifact'
  | 'Metadata Inconsistency'
  | 'Signature Cut-and-Paste Boundary'
  | 'Duplicate Image / Pattern Cloning';

export type FindingReviewStatus =
  | 'Pending Review'
  | 'Verified Anomaly'
  | 'Benign Artifact'
  | 'Inconclusive';

export interface VisualFinding {
  id: string;
  investigationId: string;
  documentId: string;
  documentName: string;
  page: number;
  boundingBox: {
    x: number; // percentage 0 - 100
    y: number;
    width: number;
    height: number;
  };
  observation: string;
  detectionMethod: ForensicDetectionMethod;
  confidenceScore: number; // 0.0 - 1.0
  severity: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
  suggestedVerification: string;
  reviewStatus: FindingReviewStatus;
  reviewedBy?: string;
  reviewNotes?: string;
  reviewedAt?: string;
}

export type DiscrepancySeverity = 'informational' | 'suspicious' | 'critical';

export interface ContextDiscrepancy {
  id: string;
  investigationId: string;
  title: string;
  severity: DiscrepancySeverity;
  category: 'Salary Mismatch' | 'Date Sequence Inconsistency' | 'Identifier Discrepancy' | 'Missing Information' | 'Name/Entity Variance';
  description: string;
  involvedDocuments: {
    documentId: string;
    documentName: string;
    classification: DocumentClassification;
    fieldLabel: string;
    extractedValue: string;
    page: number;
  }[];
  explanation: string;
  suggestedAction: string;
  status: 'Open' | 'Reviewed' | 'Dismissed';
}

export interface EvidenceItem {
  id: string;
  investigationId: string;
  evidenceType: 'visual_splice' | 'document_file' | 'contextual_conflict' | 'metadata_anomaly';
  documentId: string;
  documentName: string;
  page?: number;
  hash: string;
  title: string;
  description: string;
  capturedAt: string;
  capturedBy: string;
  sourceReference: string;
}

export interface AuditLog {
  id: string;
  investigationId?: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  category: 'UPLOAD' | 'ANALYSIS' | 'REVIEW' | 'DECISION' | 'AUTH' | 'EXPORT' | 'USER_MGMT';
  details: string;
  ipAddress?: string;
}

export interface ReviewDecision {
  investigationId: string;
  verdict: 'Approved' | 'Escalated for Physical Inspection' | 'Rejected - Tampering Suspected' | 'Under Investigation';
  summaryNotes: string;
  riskScore: number; // 0 - 100
  decidedBy: string;
  decidedByRole: UserRole;
  decidedAt: string;
  checklist: {
    visualForensicsReviewed: boolean;
    crossDocDiscrepanciesAudited: boolean;
    evidenceIntegrityChecked: boolean;
    humanVerificationComplete: boolean;
  };
}

export interface Investigation {
  id: string; // e.g., INV-2026-0841
  title: string;
  description: string;
  category: InvestigationCategory;
  priority: CasePriority;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
  assignedInvestigator: string;
  seniorReviewer?: string;
  documents: DocumentItem[];
  findings: VisualFinding[];
  discrepancies: ContextDiscrepancy[];
  evidence: EvidenceItem[];
  reviewDecision?: ReviewDecision;
  isArchived?: boolean;
  archivedAt?: string;
}

export interface DashboardStats {
  totalInvestigations: number;
  totalDocuments: number;
  pendingReviews: number;
  flaggedAnomalies: number;
  clearedCases: number;
  recentActivity: AuditLog[];
  categoryDistribution: { category: string; count: number }[];
  anomalyDistribution: { type: string; count: number; severity: string }[];
}

export type FieldMatchStatus = 'MATCH' | 'CONTRADICTION' | 'MISSING' | 'INCONCLUSIVE';

export interface BatchFieldComparisonRow {
  fieldKey: string;
  fieldLabel: string;
  category: 'financial' | 'identity' | 'dates' | 'identifiers' | 'entity' | 'layout';
  status: FieldMatchStatus;
  discrepancyNote?: string;
  severity?: 'critical' | 'warning' | 'nominal';
  values: {
    documentId: string;
    documentName: string;
    value: string;
    normalized?: string | number;
    confidence: number;
    page: number;
    layoutAnomaly?: string;
  }[];
}

export interface BatchLayoutCrossReference {
  id: string;
  metric: string;
  description: string;
  status: 'consistent' | 'divergent' | 'suspicious';
  observations: {
    documentId: string;
    documentName: string;
    measurement: string;
  }[];
  explanation: string;
}

export interface BatchComparisonReport {
  investigationId: string;
  comparedAt: string;
  documentCount: number;
  documents: { id: string; name: string; classification: string }[];
  fieldMatrix: BatchFieldComparisonRow[];
  layoutCrossReferences: BatchLayoutCrossReference[];
  summary: {
    totalFieldsCompared: number;
    matchingCount: number;
    contradictionCount: number;
    missingCount: number;
    overallConsistencyScore: number; // 0 - 100
  };
}

