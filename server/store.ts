import fs from 'fs';
import path from 'path';
import {
  User,
  Investigation,
  DocumentItem,
  ExtractedField,
  ExtractedTable,
  VisualFinding,
  ContextDiscrepancy,
  EvidenceItem,
  AuditLog,
  DashboardStats,
} from '../src/types/forensics.js';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const STORE_FILE = path.join(DATA_DIR, 'docuscan_store.json');

export interface AppStoreData {
  users: User[];
  investigations: Investigation[];
  extractedFields: Record<string, ExtractedField[]>; // docId -> fields
  extractedTables: Record<string, ExtractedTable[]>; // docId -> tables
  auditLogs: AuditLog[];
}

export class ForensicStore {
  private data: AppStoreData;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): AppStoreData {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to load existing store file, initializing default seed data:', e);
    }
    const seed = this.getInitialSeedData();
    this.saveData(seed);
    return seed;
  }

  public saveData(dataToSave?: AppStoreData): void {
    if (dataToSave) {
      this.data = dataToSave;
    }
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORE_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error writing store file:', e);
    }
  }

  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public getInvestigations(): Investigation[] {
    return this.data.investigations;
  }

  public getInvestigationById(id: string): Investigation | undefined {
    return this.data.investigations.find((inv) => inv.id === id);
  }

  public createInvestigation(inv: Omit<Investigation, 'id' | 'createdAt' | 'updatedAt' | 'documents' | 'findings' | 'discrepancies' | 'evidence'>): Investigation {
    const newId = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();
    const newInv: Investigation = {
      ...inv,
      id: newId,
      createdAt: now,
      updatedAt: now,
      documents: [],
      findings: [],
      discrepancies: [],
      evidence: [],
    };
    this.data.investigations.unshift(newInv);
    this.saveData();
    return newInv;
  }

  public updateInvestigation(id: string, updates: Partial<Investigation>): Investigation | null {
    const idx = this.data.investigations.findIndex((inv) => inv.id === id);
    if (idx === -1) return null;
    this.data.investigations[idx] = {
      ...this.data.investigations[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveData();
    return this.data.investigations[idx];
  }

  public deleteInvestigation(id: string): boolean {
    const idx = this.data.investigations.findIndex((inv) => inv.id === id);
    if (idx === -1) return false;
    this.data.investigations.splice(idx, 1);
    this.saveData();
    return true;
  }

  public toggleArchiveInvestigation(id: string, isArchived: boolean): Investigation | null {
    const inv = this.getInvestigationById(id);
    if (!inv) return null;
    inv.isArchived = isArchived;
    inv.archivedAt = isArchived ? new Date().toISOString() : undefined;
    inv.updatedAt = new Date().toISOString();
    this.saveData();
    return inv;
  }

  public addDocument(investigationId: string, doc: DocumentItem, fields: ExtractedField[], tables: ExtractedTable[] = [], findings: VisualFinding[] = []): DocumentItem | null {
    const inv = this.getInvestigationById(investigationId);
    if (!inv) return null;

    inv.documents.push(doc);
    inv.findings.push(...findings);
    this.data.extractedFields[doc.id] = fields;
    this.data.extractedTables[doc.id] = tables;

    // Create evidence entries for pristine original document upload
    inv.evidence.push({
      id: `EVID-${doc.id.slice(-6)}-PRISTINE`,
      investigationId,
      evidenceType: 'document_file',
      documentId: doc.id,
      documentName: doc.originalName,
      hash: doc.sha256Hash,
      title: `Pristine Ingestion Hash: ${doc.originalName}`,
      description: `Cryptographic SHA-256 integrity hash calculated upon upload: ${doc.sha256Hash}`,
      capturedAt: doc.uploadedAt,
      capturedBy: doc.uploadedBy,
      sourceReference: `Storage Bucket / Object: ${doc.filename}`,
    });

    findings.forEach((f) => {
      inv.evidence.push({
        id: `EVID-${f.id}`,
        investigationId,
        evidenceType: 'visual_splice',
        documentId: doc.id,
        documentName: doc.originalName,
        page: f.page,
        hash: doc.sha256Hash,
        title: `Visual Anomaly Evidence: ${f.observation}`,
        description: `Detection Method: ${f.detectionMethod}. Coordinates: x=${f.boundingBox.x}%, y=${f.boundingBox.y}%, w=${f.boundingBox.width}%, h=${f.boundingBox.height}%. Confidence: ${Math.round(f.confidenceScore * 100)}%`,
        capturedAt: new Date().toISOString(),
        capturedBy: 'DOCUSCAN AI Vision Core',
        sourceReference: `${doc.originalName} (P.${f.page}) [${f.id}]`,
      });
    });

    inv.updatedAt = new Date().toISOString();
    this.saveData();
    return doc;
  }

  public deleteDocument(investigationId: string, docId: string, userName?: string, userRole?: string): boolean {
    const inv = this.getInvestigationById(investigationId);
    if (!inv) return false;

    const docIndex = inv.documents.findIndex((d) => d.id === docId);
    if (docIndex === -1) return false;

    const removed = inv.documents[docIndex];
    inv.documents.splice(docIndex, 1);

    // Remove findings associated with this doc
    inv.findings = inv.findings.filter((f) => f.documentId !== docId);

    // Remove evidence associated with this doc
    inv.evidence = inv.evidence.filter((e) => e.documentId !== docId);

    // Clean up extracted fields & tables
    delete this.data.extractedFields[docId];
    delete this.data.extractedTables[docId];

    inv.updatedAt = new Date().toISOString();

    this.addAuditLog({
      investigationId,
      userId: 'usr-current',
      userName: userName || 'Investigator',
      userRole: (userRole as any) || 'investigator',
      action: 'Document Removed',
      category: 'UPLOAD',
      details: `Removed document "${removed.originalName}" (${docId}) from investigation ${investigationId}.`,
    });

    this.saveData();
    return true;
  }

  public updateDocument(investigationId: string, docId: string, updates: Partial<DocumentItem>): DocumentItem | null {
    const inv = this.getInvestigationById(investigationId);
    if (!inv) return null;
    const doc = inv.documents.find((d) => d.id === docId);
    if (!doc) return null;
    Object.assign(doc, updates);
    inv.updatedAt = new Date().toISOString();
    this.saveData();
    return doc;
  }

  public getAllDocumentsHistory(): Array<DocumentItem & { investigationTitle: string }> {
    const list: Array<DocumentItem & { investigationTitle: string }> = [];
    for (const inv of this.data.investigations) {
      for (const doc of inv.documents) {
        list.push({
          ...doc,
          investigationTitle: inv.title,
        });
      }
    }
    return list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }

  public updateFindingReview(investigationId: string, findingId: string, status: any, reviewer: string, notes?: string): VisualFinding | null {
    const inv = this.getInvestigationById(investigationId);
    if (!inv) return null;
    const finding = inv.findings.find((f) => f.id === findingId);
    if (!finding) return null;

    finding.reviewStatus = status;
    finding.reviewedBy = reviewer;
    finding.reviewNotes = notes;
    finding.reviewedAt = new Date().toISOString();
    inv.updatedAt = new Date().toISOString();
    this.saveData();
    return finding;
  }

  public setDiscrepancies(investigationId: string, discrepancies: ContextDiscrepancy[]): void {
    const inv = this.getInvestigationById(investigationId);
    if (!inv) return;
    inv.discrepancies = discrepancies;
    inv.updatedAt = new Date().toISOString();
    this.saveData();
  }

  public recordDecision(investigationId: string, decision: any): void {
    const inv = this.getInvestigationById(investigationId);
    if (!inv) return;
    inv.reviewDecision = decision;
    if (decision.verdict === 'Approved') {
      inv.status = 'Approved / Cleared';
    } else if (decision.verdict === 'Rejected - Tampering Suspected' || decision.verdict === 'Escalated for Physical Inspection') {
      inv.status = 'Escalated to Forensics';
    }
    inv.updatedAt = new Date().toISOString();
    this.saveData();
  }

  public getDocumentFields(docId: string): ExtractedField[] {
    return this.data.extractedFields[docId] || [];
  }

  public updateDocumentField(docId: string, fieldId: string, newValue: string, notes?: string): ExtractedField | null {
    const fields = this.data.extractedFields[docId];
    if (!fields) return null;
    const fld = fields.find((f) => f.id === fieldId);
    if (!fld) return null;
    fld.extractedValue = newValue;
    fld.verifiedByHuman = true;
    if (notes) fld.notes = notes;
    this.saveData();
    return fld;
  }

  public getDocumentTables(docId: string): ExtractedTable[] {
    return this.data.extractedTables[docId] || [];
  }

  public addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const newLog: AuditLog = {
      ...log,
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(newLog);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.saveData();
    return newLog;
  }

  public getAuditLogs(investigationId?: string): AuditLog[] {
    if (investigationId) {
      return this.data.auditLogs.filter((l) => l.investigationId === investigationId);
    }
    return this.data.auditLogs;
  }

  public getDashboardStats(): DashboardStats {
    const totalInvestigations = this.data.investigations.length;
    let totalDocuments = 0;
    let flaggedAnomalies = 0;
    let pendingReviews = 0;
    let clearedCases = 0;

    const categoryMap: Record<string, number> = {};
    const anomalyMap: Record<string, { count: number; severity: string }> = {};

    for (const inv of this.data.investigations) {
      totalDocuments += inv.documents.length;
      flaggedAnomalies += inv.findings.length;

      if (inv.status === 'Pending Review' || inv.status === 'Discrepancies Flagged' || inv.status === 'Under Analysis') {
        pendingReviews++;
      } else if (inv.status === 'Approved / Cleared') {
        clearedCases++;
      }

      categoryMap[inv.category] = (categoryMap[inv.category] || 0) + 1;

      for (const f of inv.findings) {
        if (!anomalyMap[f.detectionMethod]) {
          anomalyMap[f.detectionMethod] = { count: 0, severity: f.severity };
        }
        anomalyMap[f.detectionMethod].count++;
      }
    }

    return {
      totalInvestigations,
      totalDocuments,
      pendingReviews,
      flaggedAnomalies,
      clearedCases,
      recentActivity: this.data.auditLogs.slice(0, 10),
      categoryDistribution: Object.entries(categoryMap).map(([category, count]) => ({ category, count })),
      anomalyDistribution: Object.entries(anomalyMap).map(([type, data]) => ({
        type,
        count: data.count,
        severity: data.severity,
      })),
    };
  }

  private getInitialSeedData(): AppStoreData {
    const users: User[] = [
      {
        id: 'usr-analyst-01',
        name: 'Dr. Sarah Jenkins',
        email: 'sarah.jenkins@docuscan.ai',
        role: 'senior_reviewer',
        avatarUrl: '/src/assets/images/investigator_avatar_senior_1793725545285.jpg',
        department: 'Forensic Document Examination Unit',
        lastLogin: '2026-11-03T08:45:00Z',
      },
      {
        id: 'usr-investigator-02',
        name: 'Marcus Vance',
        email: 'marcus.vance@docuscan.ai',
        role: 'investigator',
        department: 'Commercial Credit & Underwriting Fraud',
        lastLogin: '2026-11-03T07:15:00Z',
      },
      {
        id: 'usr-admin-01',
        name: 'Elena Rostova',
        email: 'admin@docuscan.ai',
        role: 'administrator',
        department: 'Information Security & Compliance',
        lastLogin: '2026-11-02T19:30:00Z',
      },
    ];

    const case1Id = 'INV-2026-0841';
    const case1Docs: DocumentItem[] = [
      {
        id: 'DOC-841-01',
        investigationId: case1Id,
        filename: 'Apex_Capital_Loan_Application_Form.pdf',
        originalName: 'Loan_Application_Signed.pdf',
        fileSize: 428190,
        mimeType: 'application/pdf',
        sha256Hash: '9e7b23f81e3a4798c8942b0821d3f5e3a890471b0928d3ef71893c52a08912e1',
        uploadedAt: '2026-11-01T10:14:00Z',
        uploadedBy: 'Marcus Vance',
        classification: 'Loan Application Form',
        pageCount: 2,
        processingStatus: 'Completed',
        processingProgress: 100,
        fileUrl: '/api/documents/preview/DOC-841-01',
        metadata: {
          author: 'Apex Enterprise Loan Appraisal System',
          creationDate: '2026-10-28T14:20:00Z',
          modificationDate: '2026-10-28T14:20:00Z',
          producerSoftware: 'Apex Loan Portal PDF Gen v3.2',
          creatorTool: 'Acrobat PDFMaker 21 for Windows',
          pdfVersion: 'PDF 1.7 (ISO 32000-1)',
          colorSpace: 'sRGB (IEC 61966-2.1)',
          resolutionDpi: 300,
          linearized: true,
          incrementalUpdateCount: 1,
          digitalSignatureStatus: 'Present & Valid (Apex CA Root)',
          securityTags: ['Certified Secure Digest', 'Linearized Fast Web View', 'Standard sRGB Profile', '300 DPI Optical Invariant'],
          editHistory: [
            { timestamp: '2026-10-28T14:20:00Z', action: 'Initial PDF Compilation', tool: 'Apex Loan Portal PDF Gen v3.2', details: 'Client application form synthesized and cryptographically locked.' },
            { timestamp: '2026-11-01T10:14:00Z', action: 'DOCUSCAN Ingestion', tool: 'DOCUSCAN AI Security Core', details: 'Ingested into INV-2026-0841 portfolio.' },
          ],
        },
      },
      {
        id: 'DOC-841-02',
        investigationId: case1Id,
        filename: 'Salary_Slip_Oct2026_ApexTech.png',
        originalName: 'Salary_Slip_Oct2026.png',
        fileSize: 914280,
        mimeType: 'image/png',
        sha256Hash: '3a41c9b84178df9108b341f021e82713f01b98a3c48197e8201a4e98f029b471',
        uploadedAt: '2026-11-01T10:15:30Z',
        uploadedBy: 'Marcus Vance',
        classification: 'Salary Slip',
        pageCount: 1,
        processingStatus: 'Completed',
        processingProgress: 100,
        fileUrl: '/api/documents/preview/DOC-841-02',
        metadata: {
          author: 'Apex Technologies Pvt Ltd Payroll System',
          creationDate: '2026-10-31T09:12:00Z',
          modificationDate: '2026-10-31T18:44:22Z',
          producerSoftware: 'GIMP 2.10.34 (Linux)',
          creatorTool: 'GNU Image Manipulation Program',
          pdfVersion: 'PNG 1.2 / EXIF 2.32',
          colorSpace: 'DeviceRGB (Untagged Gamma Variance)',
          resolutionDpi: 150,
          linearized: false,
          incrementalUpdateCount: 3,
          digitalSignatureStatus: 'Stripped / Absent',
          securityTags: ['GIMP/Photoshop EXIF Signature', 'Stripped Digital Signature', 'DPI Variance (150 DPI vs 300 DPI Baseline)', 'Leading Digit Glyph Splice'],
          suspiciousMetadataFlags: [
            'Non-standard producer for enterprise payroll (GIMP 2.10.34)',
            'Photoshop/GIMP editing signature detected in EXIF chunk',
            'Missing corporate PKI digital signature token',
            'Modification timestamp post-dates declared payroll generation',
          ],
          editHistory: [
            { timestamp: '2026-10-31T09:12:00Z', action: 'Original Payroll Generation', tool: 'Apex ERP Payroll Engine v4.1', details: 'Standard net pay ₹72,500 generated for Employee ID APX-4910.' },
            { timestamp: '2026-10-31T18:44:22Z', action: 'Raster Layer Export & Splice', tool: 'GIMP 2.10.34 (Linux)', details: 'Leading glyph bounding box altered to ₹1,72,500 with font substitution.' },
            { timestamp: '2026-11-01T10:15:30Z', action: 'DOCUSCAN Ingestion & Integrity Hashing', tool: 'DOCUSCAN AI Security Core', details: 'Cryptographic SHA-256 registered (3a41c9b8...). Alterations flagged.' },
          ],
        },
      },
      {
        id: 'DOC-841-03',
        investigationId: case1Id,
        filename: 'HDFC_Bank_Statement_Oct2026_Verified.pdf',
        originalName: 'Bank_Statement_Oct_2026.pdf',
        fileSize: 681020,
        mimeType: 'application/pdf',
        sha256Hash: 'e5f2a1b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1',
        uploadedAt: '2026-11-01T10:17:15Z',
        uploadedBy: 'Marcus Vance',
        classification: 'Bank Account Statement',
        pageCount: 3,
        processingStatus: 'Completed',
        processingProgress: 100,
        fileUrl: '/api/documents/preview/DOC-841-03',
        metadata: {
          author: 'HDFC Bank Core Banking E-Statement Engine',
          creationDate: '2026-11-01T02:00:00Z',
          modificationDate: '2026-11-01T02:00:00Z',
          producerSoftware: 'Oracle Financial Reports Server',
          creatorTool: 'Oracle BI Publisher 12.2.1.4',
          pdfVersion: 'PDF 1.6 (Acrobat 7.x)',
          colorSpace: 'DeviceGray / sRGB',
          resolutionDpi: 600,
          linearized: true,
          incrementalUpdateCount: 1,
          digitalSignatureStatus: 'Present & Valid (HDFC Bank Enterprise CA)',
          securityTags: ['Certified Banking E-Statement', 'Verified CA Certificate', 'Encrypted Object Stream', '600 DPI Vector Invariant'],
          editHistory: [
            { timestamp: '2026-11-01T02:00:00Z', action: 'Automated E-Statement Generation', tool: 'Oracle Financial Reports Server', details: 'Official monthly ledger compiled and signed.' },
            { timestamp: '2026-11-01T10:17:15Z', action: 'DOCUSCAN Ingestion', tool: 'DOCUSCAN AI Security Core', details: 'Ingested into INV-2026-0841 portfolio.' },
          ],
        },
      },
    ];

    const case1Findings: VisualFinding[] = [
      {
        id: 'VIS-FIND-841-01',
        investigationId: case1Id,
        documentId: 'DOC-841-02',
        documentName: 'Salary_Slip_Oct2026.png',
        page: 1,
        boundingBox: { x: 57.5, y: 46.2, width: 26.5, height: 6.8 },
        observation: 'Digital character splice & glyph weight anomaly on leading digit "4" in Net Pay ₹45,000.00',
        detectionMethod: 'Font Kerning & Weight Variance',
        confidenceScore: 0.94,
        severity: 'critical',
        explanation:
          'High-resolution stroke-width analysis indicates digit "4" has a 2.4px stroke width compared to 1.8px on "5,000.00". Negative kerning spacing (-0.14em) and vertical baseline misalignment (+1.8px) demonstrate digit replacement over an original "2" digit.',
        suggestedVerification:
          'Audit against authentic banking payroll deposit record and request direct HR verification from Apex Technologies Pvt Ltd.',
        reviewStatus: 'Verified Anomaly',
        reviewedBy: 'Dr. Sarah Jenkins',
        reviewNotes: 'Confirmed optical variance. Cross-verified with bank statement showing only ₹25,000 credit.',
        reviewedAt: '2026-11-02T11:20:00Z',
      },
      {
        id: 'VIS-FIND-841-02',
        investigationId: case1Id,
        documentId: 'DOC-841-02',
        documentName: 'Salary_Slip_Oct2026.png',
        page: 1,
        boundingBox: { x: 54.0, y: 81.5, width: 35.0, height: 11.5 },
        observation: 'Compression artifact disparity & alpha channel halo around company rubber stamp',
        detectionMethod: 'Error Level Analysis (ELA)',
        confidenceScore: 0.88,
        severity: 'high',
        explanation:
          'ELA luminance heatmap highlights high error frequency boundaries around the circular authorization stamp. Surrounding document canvas exhibits Q92 compression, while stamp bounding box demonstrates Q78 pre-compressed bitmap paste.',
        suggestedVerification:
          'Check for duplicate digital rubber stamp assets in prior fraud submissions.',
        reviewStatus: 'Pending Review',
      },
      {
        id: 'VIS-FIND-841-03',
        investigationId: case1Id,
        documentId: 'DOC-841-01',
        documentName: 'Loan_Application_Signed.pdf',
        page: 2,
        boundingBox: { x: 62.0, y: 78.0, width: 28.0, height: 7.5 },
        observation: 'Pixelated raster signature superimposed on vector PDF background',
        detectionMethod: 'Signature Cut-and-Paste Boundary',
        confidenceScore: 0.81,
        severity: 'medium',
        explanation:
          'Signature stroke consists of 150 DPI raster scan inserted into a 600 DPI vector PDF document. Border exhibits faint edge gradient threshold clipping.',
        suggestedVerification:
          'Contact applicant to verify electronic consent or request in-person biometric signing.',
        reviewStatus: 'Pending Review',
      },
    ];

    const case1Discrepancies: ContextDiscrepancy[] = [
      {
        id: 'DISC-841-01',
        investigationId: case1Id,
        title: 'Material Net Salary Divergence (Declared ₹45,000 vs Bank Inflow ₹25,000)',
        severity: 'critical',
        category: 'Salary Mismatch',
        description:
          'Loan Application Form declares monthly salary of ₹45,000.00 and submitted Salary Slip states ₹45,000.00. However, the audited Bank Account Statement shows actual monthly salary credit of ₹25,000.00 from Apex Technologies Pvt Ltd on 31-Oct-2026.',
        involvedDocuments: [
          {
            documentId: 'DOC-841-01',
            documentName: 'Loan_Application_Signed.pdf',
            classification: 'Loan Application Form',
            fieldLabel: 'Declared Monthly Income',
            extractedValue: '₹45,000.00',
            page: 1,
          },
          {
            documentId: 'DOC-841-02',
            documentName: 'Salary_Slip_Oct2026.png',
            classification: 'Salary Slip',
            fieldLabel: 'Net Pay',
            extractedValue: '₹45,000.00',
            page: 1,
          },
          {
            documentId: 'DOC-841-03',
            documentName: 'Bank_Statement_Oct_2026.pdf',
            classification: 'Bank Account Statement',
            fieldLabel: 'Salary Credit (CMS/APEX TECH)',
            extractedValue: '₹25,000.00',
            page: 1,
          },
        ],
        explanation:
          'The ₹20,000 disparity perfectly correlates with the visual forensic finding VIS-FIND-841-01 where the digit "4" was identified as an overwritten glyph over an original digit "2". Both visual forensics and cross-document reconciliation provide corroborating evidence.',
        suggestedAction:
          'Reject commercial loan credit enhancement. Escalate to fraud investigation unit and notify underwriting committee.',
        status: 'Open',
      },
    ];

    const case1Evidence: EvidenceItem[] = [
      {
        id: 'EVID-841-01',
        investigationId: case1Id,
        evidenceType: 'visual_splice',
        documentId: 'DOC-841-02',
        documentName: 'Salary_Slip_Oct2026.png',
        page: 1,
        hash: '3a41c9b84178df9108b341f021e82713f01b98a3c48197e8201a4e98f029b471',
        title: 'Stroke Width & Kerning Splice on Net Pay Digit "4"',
        description: 'Microscopic optical measurement: Stroke width 2.4px vs 1.8px standard. Baseline shift +1.8px.',
        capturedAt: '2026-11-01T10:20:00Z',
        capturedBy: 'DOCUSCAN AI Vision Forensics',
        sourceReference: 'Salary_Slip_Oct2026.png (Page 1) [Region: x=57.5%, y=46.2%]',
      },
      {
        id: 'EVID-841-02',
        evidenceType: 'contextual_conflict',
        investigationId: case1Id,
        documentId: 'DOC-841-03',
        documentName: 'Bank_Statement_Oct_2026.pdf',
        page: 1,
        hash: 'e5f2a1b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1',
        title: 'Bank Statement Remittance Inflow Record (₹25,000)',
        description: 'Line 28: Transaction CMS9481023 CR SALARY APEX TECH PVT LTD INR 25,000.00',
        capturedAt: '2026-11-01T10:22:15Z',
        capturedBy: 'DOCUSCAN AI Context Engine',
        sourceReference: 'Bank_Statement_Oct_2026.pdf (Page 1) [Line 28]',
      },
    ];

    const case1: Investigation = {
      id: case1Id,
      title: 'Commercial SME Credit Appraisal - Sharma Enterprises',
      description: 'Comprehensive forensic inspection of loan application packet including declared salary slip, audited bank statement, and employment credentials.',
      category: 'Loan & Mortgage Screening',
      priority: 'High',
      status: 'Discrepancies Flagged',
      createdAt: '2026-11-01T10:10:00Z',
      updatedAt: '2026-11-02T11:25:00Z',
      assignedInvestigator: 'Marcus Vance',
      seniorReviewer: 'Dr. Sarah Jenkins',
      documents: case1Docs,
      findings: case1Findings,
      discrepancies: case1Discrepancies,
      evidence: case1Evidence,
      reviewDecision: {
        investigationId: case1Id,
        verdict: 'Escalated for Physical Inspection',
        summaryNotes: 'Clear correlation between visual font tampering on pay slip and actual bank statement credit of ₹25,000 vs declared ₹45,000. Escalating for official verification.',
        riskScore: 84,
        decidedBy: 'Dr. Sarah Jenkins',
        decidedByRole: 'senior_reviewer',
        decidedAt: '2026-11-02T11:25:00Z',
        checklist: {
          visualForensicsReviewed: true,
          crossDocDiscrepanciesAudited: true,
          evidenceIntegrityChecked: true,
          humanVerificationComplete: true,
        },
      },
    };

    const case2Id = 'INV-2026-0912';
    const case2: Investigation = {
      id: case2Id,
      title: 'Global Logistics Overseas Vendor Invoice Verification',
      description: 'Verification of high-value freight invoice and bill of lading for customs clearance and accounts payable release.',
      category: 'Vendor Invoice Audit',
      priority: 'Medium',
      status: 'Pending Review',
      createdAt: '2026-11-02T15:30:00Z',
      updatedAt: '2026-11-02T16:00:00Z',
      assignedInvestigator: 'Marcus Vance',
      documents: [
        {
          id: 'DOC-912-01',
          investigationId: case2Id,
          filename: 'Freight_Forwarding_Invoice_7419.pdf',
          originalName: 'Invoice_7419_PacificFreight.pdf',
          fileSize: 312040,
          mimeType: 'application/pdf',
          sha256Hash: '4c81a9f0e1d2c3b4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8',
          uploadedAt: '2026-11-02T15:35:00Z',
          uploadedBy: 'Marcus Vance',
          classification: 'Commercial Invoice',
          pageCount: 1,
          processingStatus: 'Completed',
          processingProgress: 100,
          fileUrl: '/api/documents/preview/DOC-912-01',
          metadata: {
            author: 'Pacific Maritime Freight Systems Billing Core',
            creationDate: '2026-11-02T14:10:00Z',
            modificationDate: '2026-11-02T15:20:00Z',
            producerSoftware: 'SAP Crystal Reports 2020',
            creatorTool: 'Crystal Reports Print Engine',
            pdfVersion: 'PDF 1.7 (ISO 32000-1)',
            colorSpace: 'DeviceRGB',
            resolutionDpi: 300,
            linearized: true,
            incrementalUpdateCount: 2,
            digitalSignatureStatus: 'Unsigned Standard Billing PDF',
            securityTags: ['Standard Vendor Invoice', 'Multi-Layer Object Stream', 'OCR Searchable Stream', '300 DPI Grid'],
            suspiciousMetadataFlags: ['Modification post-dates export by 70 minutes', 'Font table delta detected on banking credentials block'],
            editHistory: [
              { timestamp: '2026-11-02T14:10:00Z', action: 'Invoice Generation', tool: 'SAP Crystal Reports 2020', details: 'Initial freight invoice compiled.' },
              { timestamp: '2026-11-02T15:20:00Z', action: 'Secondary Modification', tool: 'Acrobat PDF Editor', details: 'IBAN routing numbers modified.' },
              { timestamp: '2026-11-02T15:35:00Z', action: 'DOCUSCAN Ingestion', tool: 'DOCUSCAN AI Security Core', details: 'Ingested into INV-2026-0912 portfolio.' },
            ],
          },
        },
      ],
      findings: [
        {
          id: 'VIS-FIND-912-01',
          investigationId: case2Id,
          documentId: 'DOC-912-01',
          documentName: 'Invoice_7419_PacificFreight.pdf',
          page: 1,
          boundingBox: { x: 62.0, y: 64.0, width: 28.0, height: 6.0 },
          observation: 'Inter-line spacing anomaly and misaligned font baseline on Swift/IBAN routing field',
          detectionMethod: 'Tabular Grid & Baseline Misalignment',
          confidenceScore: 0.86,
          severity: 'high',
          explanation: 'The beneficiary bank account routing string is shifted down by 3.2px relative to neighboring grid lines.',
          suggestedVerification: 'Confirm wire instructions via out-of-band telephone call to verified vendor contacts.',
          reviewStatus: 'Pending Review',
        },
      ],
      discrepancies: [],
      evidence: [],
      isArchived: false,
    };

    const case3Id = 'INV-2026-0734';
    const case3: Investigation = {
      id: case3Id,
      title: 'Meridian Health Medicare Claims Batch Audit - Form CMS-1500',
      description: 'Retrospective forensic review of digitized Medicare claim invoices and practitioner physician billing stamps.',
      category: 'Healthcare & Insurance Claims',
      priority: 'Low',
      status: 'Approved / Cleared',
      createdAt: '2026-10-18T09:20:00Z',
      updatedAt: '2026-10-24T14:15:00Z',
      assignedInvestigator: 'Dr. Sarah Jenkins',
      seniorReviewer: 'Dr. Sarah Jenkins',
      isArchived: true,
      archivedAt: '2026-10-25T11:00:00Z',
      documents: [
        {
          id: 'DOC-734-01',
          investigationId: case3Id,
          filename: 'CMS1500_Claim_Batch_481.pdf',
          originalName: 'CMS1500_Claim_Batch_481.pdf',
          fileSize: 512940,
          mimeType: 'application/pdf',
          sha256Hash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
          uploadedAt: '2026-10-18T09:25:00Z',
          uploadedBy: 'Dr. Sarah Jenkins',
          classification: 'Other Document',
          pageCount: 2,
          processingStatus: 'Completed',
          processingProgress: 100,
          fileUrl: '/api/documents/preview/DOC-734-01',
        },
      ],
      findings: [],
      discrepancies: [],
      evidence: [],
      reviewDecision: {
        investigationId: case3Id,
        verdict: 'Approved',
        summaryNotes: 'No signs of font alteration, raster signature pasting, or billing item inflation. Certified compliant.',
        riskScore: 12,
        decidedBy: 'Dr. Sarah Jenkins',
        decidedByRole: 'senior_reviewer',
        decidedAt: '2026-10-24T14:15:00Z',
        checklist: {
          visualForensicsReviewed: true,
          crossDocDiscrepanciesAudited: true,
          evidenceIntegrityChecked: true,
          humanVerificationComplete: true,
        },
      },
    };

    const extractedFields: Record<string, ExtractedField[]> = {
      'DOC-841-01': [
        {
          id: 'FLD-DOC-841-01-1',
          documentId: 'DOC-841-01',
          fieldName: 'applicant_name',
          label: 'Applicant Full Name',
          extractedValue: 'Rahul Sharma',
          fieldType: 'name',
          confidence: 0.99,
          page: 1,
          boundingBox: { x: 25, y: 22, width: 35, height: 4 },
        },
        {
          id: 'FLD-DOC-841-01-2',
          documentId: 'DOC-841-01',
          fieldName: 'declared_income',
          label: 'Declared Monthly Income',
          extractedValue: '₹45,000.00',
          normalizedValue: 45000,
          fieldType: 'currency',
          confidence: 0.98,
          page: 1,
          boundingBox: { x: 25, y: 32, width: 28, height: 4 },
        },
        {
          id: 'FLD-DOC-841-01-3',
          documentId: 'DOC-841-01',
          fieldName: 'employer',
          label: 'Current Employer',
          extractedValue: 'Apex Technologies Pvt Ltd',
          fieldType: 'text',
          confidence: 0.97,
          page: 1,
          boundingBox: { x: 25, y: 42, width: 45, height: 4 },
        },
      ],
      'DOC-841-02': [
        {
          id: 'FLD-DOC-841-02-1',
          documentId: 'DOC-841-02',
          fieldName: 'employee_name',
          label: 'Employee Name',
          extractedValue: 'Rahul Sharma',
          fieldType: 'name',
          confidence: 0.99,
          page: 1,
          boundingBox: { x: 26, y: 20, width: 32, height: 3.8 },
        },
        {
          id: 'FLD-DOC-841-02-2',
          documentId: 'DOC-841-02',
          fieldName: 'net_salary',
          label: 'Net Pay',
          extractedValue: '₹45,000.00',
          normalizedValue: 45000,
          fieldType: 'currency',
          confidence: 0.88,
          page: 1,
          boundingBox: { x: 58, y: 46.5, width: 25, height: 5.5 },
          notes: 'Visual tampering flag active on this bounding region.',
        },
        {
          id: 'FLD-DOC-841-02-3',
          documentId: 'DOC-841-02',
          fieldName: 'pay_period',
          label: 'Pay Period',
          extractedValue: 'October 2026',
          fieldType: 'date',
          confidence: 0.98,
          page: 1,
          boundingBox: { x: 62, y: 20, width: 26, height: 3.5 },
        },
      ],
      'DOC-841-03': [
        {
          id: 'FLD-DOC-841-03-1',
          documentId: 'DOC-841-03',
          fieldName: 'account_holder',
          label: 'Account Holder',
          extractedValue: 'Rahul Sharma',
          fieldType: 'name',
          confidence: 0.99,
          page: 1,
          boundingBox: { x: 20, y: 16, width: 32, height: 3.5 },
        },
        {
          id: 'FLD-DOC-841-03-2',
          documentId: 'DOC-841-03',
          fieldName: 'salary_credit',
          label: 'Salary Credit (CMS/APEX TECH)',
          extractedValue: '₹25,000.00',
          normalizedValue: 25000,
          fieldType: 'currency',
          confidence: 0.99,
          page: 1,
          boundingBox: { x: 60, y: 52, width: 24, height: 4 },
        },
      ],
    };

    const extractedTables: Record<string, ExtractedTable[]> = {
      'DOC-841-02': [
        {
          id: 'TBL-841-02-1',
          documentId: 'DOC-841-02',
          title: 'Earnings & Deductions Schedule',
          page: 1,
          columns: ['Component', 'Earnings (INR)', 'Deductions', 'Amount (INR)'],
          rows: [
            { Component: 'Basic Pay', 'Earnings (INR)': '₹32,000.00', Deductions: 'Provident Fund', 'Amount (INR)': '₹1,800.00' },
            { Component: 'HRA', 'Earnings (INR)': '₹11,000.00', Deductions: 'Professional Tax', 'Amount (INR)': '₹200.00' },
            { Component: 'Special Allowance', 'Earnings (INR)': '₹5,000.00', Deductions: 'Tax (TDS)', 'Amount (INR)': '₹1,000.00' },
          ],
        },
      ],
      'DOC-841-03': [
        {
          id: 'TBL-841-03-1',
          documentId: 'DOC-841-03',
          title: 'Account Ledger - October 2026',
          page: 1,
          columns: ['Date', 'Description', 'Withdrawal (DR)', 'Deposit (CR)', 'Balance'],
          rows: [
            { Date: '01-Oct-2026', Description: 'OPENING BALANCE', 'Withdrawal (DR)': '-', 'Deposit (CR)': '-', Balance: '₹14,230.50' },
            { Date: '14-Oct-2026', Description: 'POS UTILITY BILL', 'Withdrawal (DR)': '₹1,450.00', 'Deposit (CR)': '-', Balance: '₹12,780.50' },
            { Date: '31-Oct-2026', Description: 'CMS SALARY APEX TECH', 'Withdrawal (DR)': '-', 'Deposit (CR)': '₹25,000.00', Balance: '₹37,780.50' },
          ],
        },
      ],
    };

    const auditLogs: AuditLog[] = [
      {
        id: 'AUD-001',
        investigationId: case1Id,
        timestamp: '2026-11-01T10:10:00Z',
        userId: 'usr-investigator-02',
        userName: 'Marcus Vance',
        userRole: 'investigator',
        action: 'Case Created',
        category: 'ANALYSIS',
        details: 'Investigation INV-2026-0841 initiated for SME credit appraisal.',
      },
      {
        id: 'AUD-002',
        investigationId: case1Id,
        timestamp: '2026-11-01T10:18:00Z',
        userId: 'usr-investigator-02',
        userName: 'Marcus Vance',
        userRole: 'investigator',
        action: 'Documents Ingested',
        category: 'UPLOAD',
        details: 'Uploaded 3 files: Loan Application, Pay Slip, and Bank Statement. SHA-256 hashes generated.',
      },
      {
        id: 'AUD-003',
        investigationId: case1Id,
        timestamp: '2026-11-01T10:20:00Z',
        userId: 'system',
        userName: 'DOCUSCAN AI Vision Core',
        userRole: 'administrator',
        action: 'Forensic Detection',
        category: 'ANALYSIS',
        details: 'Visual anomaly VIS-FIND-841-01 identified: font kerning & baseline variance on Salary Slip Net Pay.',
      },
      {
        id: 'AUD-004',
        investigationId: case1Id,
        timestamp: '2026-11-01T10:22:00Z',
        userId: 'system',
        userName: 'DOCUSCAN AI Context Engine',
        userRole: 'administrator',
        action: 'Context Discrepancy Flagged',
        category: 'ANALYSIS',
        details: 'Cross-document discrepancy DISC-841-01 flagged: Net pay ₹45,000 vs Bank credit ₹25,000.',
      },
      {
        id: 'AUD-005',
        investigationId: case1Id,
        timestamp: '2026-11-02T11:20:00Z',
        userId: 'usr-analyst-01',
        userName: 'Dr. Sarah Jenkins',
        userRole: 'senior_reviewer',
        action: 'Finding Reviewed',
        category: 'REVIEW',
        details: 'Finding VIS-FIND-841-01 validated as Verified Anomaly. Added forensic corroboration notes.',
      },
      {
        id: 'AUD-006',
        investigationId: case1Id,
        timestamp: '2026-11-02T11:25:00Z',
        userId: 'usr-analyst-01',
        userName: 'Dr. Sarah Jenkins',
        userRole: 'senior_reviewer',
        action: 'Review Decision Recorded',
        category: 'DECISION',
        details: 'Verdict set to "Escalated for Physical Inspection". Risk score calculated at 84/100.',
      },
    ];

    return {
      users,
      investigations: [case1, case2, case3],
      extractedFields,
      extractedTables,
      auditLogs,
    };
  }
}

export const forensicStore = new ForensicStore();
