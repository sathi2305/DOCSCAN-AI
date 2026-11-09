import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { forensicStore } from './server/store.js';
import {
  analyzeDocument,
  calculateSha256,
  correlateCrossDocumentContext,
  askInvestigationAssistant,
  runBatchDocumentComparison,
} from './server/forensicEngine.js';
import { DocumentItem } from './src/types/forensics.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// -------------------------------------------------------------
// REST API ENDPOINTS
// -------------------------------------------------------------

// Auth & Users
app.get('/api/auth/users', (_req, res) => {
  res.json(forensicStore.getUsers());
});

app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  const user = forensicStore.getUserByEmail(email) || forensicStore.getUsers()[0];
  forensicStore.addAuditLog({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'User Authentication',
    category: 'AUTH',
    details: `${user.name} logged in with role [${user.role}].`,
  });
  res.json({ user, token: `jwt-sim-${user.id}-${Date.now()}` });
});

// Dashboard Statistics
app.get('/api/stats', (_req, res) => {
  const stats = forensicStore.getDashboardStats();
  res.json(stats);
});

// Investigations CRUD
app.get('/api/investigations', (_req, res) => {
  res.json(forensicStore.getInvestigations());
});

app.post('/api/investigations', (req, res) => {
  const { title, description, category, priority, assignedInvestigator, seniorReviewer, userName, userRole } = req.body;

  if (!title || !category) {
    return res.status(400).json({ error: 'Title and category are required' });
  }

  const newInv = forensicStore.createInvestigation({
    title,
    description: description || '',
    category,
    priority: priority || 'Medium',
    status: 'Draft',
    assignedInvestigator: assignedInvestigator || 'Unassigned',
    seniorReviewer: seniorReviewer || undefined,
  });

  forensicStore.addAuditLog({
    investigationId: newInv.id,
    userId: 'usr-current',
    userName: userName || 'Investigator',
    userRole: userRole || 'investigator',
    action: 'Investigation Created',
    category: 'ANALYSIS',
    details: `Created new case ${newInv.id}: "${newInv.title}" (${newInv.category})`,
  });

  res.status(201).json(newInv);
});

app.get('/api/investigations/:id', (req, res) => {
  const inv = forensicStore.getInvestigationById(req.params.id);
  if (!inv) {
    return res.status(404).json({ error: 'Investigation not found' });
  }
  res.json(inv);
});

app.patch('/api/investigations/:id', (req, res) => {
  const updated = forensicStore.updateInvestigation(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Investigation not found' });
  }
  res.json(updated);
});

app.delete('/api/investigations/:id', (req, res) => {
  const ok = forensicStore.deleteInvestigation(req.params.id);
  if (!ok) {
    return res.status(404).json({ error: 'Investigation not found' });
  }
  res.json({ success: true });
});

// Document Upload & Analysis
app.post('/api/investigations/:id/documents', async (req, res) => {
  const inv = forensicStore.getInvestigationById(req.params.id);
  if (!inv) {
    return res.status(404).json({ error: 'Investigation not found' });
  }

  const { filename, originalName, fileSize, mimeType, base64Data, classification, userName, userRole } = req.body;

  if (!originalName || !mimeType) {
    return res.status(400).json({ error: 'Document originalName and mimeType are required' });
  }

  // Calculate cryptographic SHA-256 hash for document integrity
  const fileBuffer = base64Data ? Buffer.from(base64Data, 'base64') : Buffer.from(originalName + Date.now());
  const sha256Hash = calculateSha256(fileBuffer);
  const docId = `DOC-${inv.id.slice(-4)}-${Date.now().toString().slice(-4)}`;

  const newDoc: DocumentItem = {
    id: docId,
    investigationId: inv.id,
    filename: filename || `${docId}_${originalName}`,
    originalName,
    fileSize: fileSize || fileBuffer.length,
    mimeType,
    sha256Hash,
    uploadedAt: new Date().toISOString(),
    uploadedBy: userName || 'Investigator',
    classification: classification || 'Other Document',
    pageCount: 1,
    processingStatus: 'Completed',
    processingProgress: 100,
    fileUrl: `/api/documents/preview/${docId}`,
    previewImageUrl: mimeType.startsWith('image/') && base64Data ? `data:${mimeType};base64,${base64Data}` : undefined,
  };

  // Run AI Document Intelligence and Forensic Analysis
  try {
    const analysis = await analyzeDocument(inv.id, docId, originalName, base64Data, mimeType);
    if (classification && classification !== 'Other Document') {
      newDoc.classification = classification;
    } else {
      newDoc.classification = analysis.classification;
    }

    forensicStore.addDocument(inv.id, newDoc, analysis.fields, analysis.tables, analysis.findings);

    // Run Context Correlation across all documents in this case
    const allDocs = inv.documents.map((d) => ({
      id: d.id,
      originalName: d.originalName,
      classification: d.classification,
      fields: forensicStore.getDocumentFields(d.id),
    }));

    const updatedDiscrepancies = correlateCrossDocumentContext(inv.id, allDocs);
    forensicStore.setDiscrepancies(inv.id, updatedDiscrepancies);

    // Update status if discrepancies or critical findings found
    if (updatedDiscrepancies.length > 0 || analysis.findings.some((f) => f.severity === 'critical' || f.severity === 'high')) {
      forensicStore.updateInvestigation(inv.id, { status: 'Discrepancies Flagged' });
    } else if (inv.status === 'Draft') {
      forensicStore.updateInvestigation(inv.id, { status: 'Pending Review' });
    }

    forensicStore.addAuditLog({
      investigationId: inv.id,
      userId: 'usr-current',
      userName: userName || 'Investigator',
      userRole: userRole || 'investigator',
      action: 'Document Ingestion & Forensics',
      category: 'UPLOAD',
      details: `Ingested ${originalName} (SHA-256: ${sha256Hash.slice(0, 10)}...). Extracted ${analysis.fields.length} fields, flagged ${analysis.findings.length} visual findings.`,
    });

    res.status(201).json({
      document: newDoc,
      analysis,
      discrepancies: updatedDiscrepancies,
    });
  } catch (err: any) {
    console.error('Error during document analysis:', err);
    res.status(500).json({ error: 'Forensic analysis failed', details: err.message });
  }
});

// Delete Document from Investigation
app.delete('/api/investigations/:id/documents/:docId', (req, res) => {
  const { userName, userRole } = req.body || {};
  const ok = forensicStore.deleteDocument(req.params.id, req.params.docId, userName, userRole);
  if (!ok) {
    return res.status(404).json({ error: 'Document or investigation not found' });
  }
  res.json({ success: true, message: 'Document and associated findings removed successfully' });
});

// Retry Forensic Analysis on Document
app.post('/api/investigations/:id/documents/:docId/retry', async (req, res) => {
  const inv = forensicStore.getInvestigationById(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Investigation not found' });
  const doc = inv.documents.find((d) => d.id === req.params.docId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  try {
    forensicStore.updateDocument(inv.id, doc.id, {
      processingStatus: 'Processing OCR',
      processingProgress: 35,
    });

    const analysis = await analyzeDocument(inv.id, doc.id, doc.originalName, undefined, doc.mimeType);

    forensicStore.updateDocument(inv.id, doc.id, {
      processingStatus: 'Completed',
      processingProgress: 100,
    });

    // Re-correlate
    const allDocs = inv.documents.map((d) => ({
      id: d.id,
      originalName: d.originalName,
      classification: d.classification,
      fields: forensicStore.getDocumentFields(d.id),
    }));
    const updatedDiscrepancies = correlateCrossDocumentContext(inv.id, allDocs);
    forensicStore.setDiscrepancies(inv.id, updatedDiscrepancies);

    res.json({ success: true, document: doc, analysis });
  } catch (err: any) {
    forensicStore.updateDocument(inv.id, doc.id, {
      processingStatus: 'Failed',
    });
    res.status(500).json({ error: 'Retry analysis failed', details: err.message });
  }
});

// Document Upload History across all investigations
app.get('/api/documents/history', (_req, res) => {
  const history = forensicStore.getAllDocumentsHistory();
  res.json(history);
});

// Document Fields & Tables
app.get('/api/investigations/:id/documents/:docId/fields', (req, res) => {
  const fields = forensicStore.getDocumentFields(req.params.docId);
  res.json(fields);
});

app.patch('/api/investigations/:id/documents/:docId/fields/:fieldId', (req, res) => {
  const { newValue, notes, userName, userRole } = req.body;
  const updated = forensicStore.updateDocumentField(req.params.docId, req.params.fieldId, newValue, notes);
  if (!updated) {
    return res.status(404).json({ error: 'Field not found' });
  }

  forensicStore.addAuditLog({
    investigationId: req.params.id,
    userId: 'usr-current',
    userName: userName || 'Reviewer',
    userRole: userRole || 'senior_reviewer',
    action: 'Extracted Field Edited',
    category: 'REVIEW',
    details: `Field "${updated.label}" adjusted to "${newValue}".`,
  });

  res.json(updated);
});

app.get('/api/investigations/:id/documents/:docId/tables', (req, res) => {
  const tables = forensicStore.getDocumentTables(req.params.docId);
  res.json(tables);
});

// Finding Review Action (Senior Reviewer & Investigator)
app.patch('/api/investigations/:id/findings/:findingId', (req, res) => {
  const { status, reviewNotes, reviewerName, userRole } = req.body;
  const finding = forensicStore.updateFindingReview(
    req.params.id,
    req.params.findingId,
    status,
    reviewerName || 'Senior Reviewer',
    reviewNotes
  );

  if (!finding) {
    return res.status(404).json({ error: 'Finding not found' });
  }

  forensicStore.addAuditLog({
    investigationId: req.params.id,
    userId: 'usr-current',
    userName: reviewerName || 'Senior Reviewer',
    userRole: userRole || 'senior_reviewer',
    action: 'Visual Finding Review',
    category: 'REVIEW',
    details: `Finding ${finding.id} marked as [${status}]. Notes: ${reviewNotes || 'None'}`,
  });

  res.json(finding);
});

// Cross Document Correlation Manual Re-run
app.post('/api/investigations/:id/correlate', (req, res) => {
  const inv = forensicStore.getInvestigationById(req.params.id);
  if (!inv) {
    return res.status(404).json({ error: 'Investigation not found' });
  }

  const allDocs = inv.documents.map((d) => ({
    id: d.id,
    originalName: d.originalName,
    classification: d.classification,
    fields: forensicStore.getDocumentFields(d.id),
  }));

  const updatedDiscrepancies = correlateCrossDocumentContext(inv.id, allDocs);
  forensicStore.setDiscrepancies(inv.id, updatedDiscrepancies);

  res.json({ discrepancies: updatedDiscrepancies });
});

// Batch Document Comparison & Cross-Referencing
app.post('/api/investigations/:id/batch-compare', (req, res) => {
  const inv = forensicStore.getInvestigationById(req.params.id);
  if (!inv) {
    return res.status(404).json({ error: 'Investigation not found' });
  }

  const { documentIds } = req.body;
  let targetDocs = inv.documents;
  if (Array.isArray(documentIds) && documentIds.length > 0) {
    targetDocs = inv.documents.filter((d) => documentIds.includes(d.id));
  }

  if (targetDocs.length === 0) {
    return res.status(400).json({ error: 'No documents available for comparison' });
  }

  const comparisonData = targetDocs.map((d) => ({
    id: d.id,
    originalName: d.originalName,
    classification: d.classification,
    fields: forensicStore.getDocumentFields(d.id),
    findings: inv.findings.filter((f) => f.documentId === d.id),
  }));

  const report = runBatchDocumentComparison(inv.id, comparisonData);
  res.json(report);
});

// Final Review Decision (Senior Reviewer / Administrator)
app.post('/api/investigations/:id/decision', (req, res) => {
  const { verdict, summaryNotes, riskScore, decidedBy, decidedByRole, checklist } = req.body;

  if (!verdict) {
    return res.status(400).json({ error: 'Verdict is required' });
  }

  const decision = {
    investigationId: req.params.id,
    verdict,
    summaryNotes: summaryNotes || '',
    riskScore: riskScore ?? 50,
    decidedBy: decidedBy || 'Senior Reviewer',
    decidedByRole: decidedByRole || 'senior_reviewer',
    decidedAt: new Date().toISOString(),
    checklist: checklist || {
      visualForensicsReviewed: true,
      crossDocDiscrepanciesAudited: true,
      evidenceIntegrityChecked: true,
      humanVerificationComplete: true,
    },
  };

  forensicStore.recordDecision(req.params.id, decision);

  forensicStore.addAuditLog({
    investigationId: req.params.id,
    userId: 'usr-current',
    userName: decidedBy || 'Senior Reviewer',
    userRole: decidedByRole || 'senior_reviewer',
    action: 'Final Case Determination',
    category: 'DECISION',
    details: `Official verdict registered: "${verdict}". Risk Score: ${riskScore}%.`,
  });

  res.json(decision);
});

// AI Investigation Assistant
app.post('/api/investigations/:id/assistant', async (req, res) => {
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const inv = forensicStore.getInvestigationById(req.params.id);
  if (!inv) {
    return res.status(404).json({ error: 'Investigation not found' });
  }

  try {
    const result = await askInvestigationAssistant(question, {
      title: inv.title,
      category: inv.category,
      status: inv.status,
      documents: inv.documents,
      findings: inv.findings,
      discrepancies: inv.discrepancies,
      evidence: inv.evidence,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Assistant processing error', details: err.message });
  }
});

// Audit Logs
app.get('/api/audit-logs', (req, res) => {
  const invId = req.query.investigationId as string | undefined;
  const logs = forensicStore.getAuditLogs(invId);
  res.json(logs);
});

// Dynamic Document Rendering Endpoint for realistic visual forensic inspection
app.get('/api/documents/preview/:docId', (req, res) => {
  const docId = req.params.docId;

  // Render high-res SVG document simulation for forensic canvas
  if (docId.includes('841-02')) {
    // Salary slip with visual splice on numeral 4
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1100" width="800" height="1100" style="background:#ffffff; font-family:'Courier New', monospace, sans-serif;">
        <!-- Header -->
        <rect width="800" height="1100" fill="#fcfcfc"/>
        <rect x="40" y="40" width="720" height="1020" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
        
        <!-- Company Header -->
        <rect x="40" y="40" width="720" height="110" fill="#0f172a"/>
        <text x="70" y="85" fill="#38bdf8" font-size="24" font-weight="bold" font-family="'Plus Jakarta Sans', sans-serif">APEX TECHNOLOGIES PRIVATE LIMITED</text>
        <text x="70" y="115" fill="#94a3b8" font-size="12" font-family="'Plus Jakarta Sans', sans-serif">CIN: U72200MH2021PTC384910 · Cyber City, Bandra Kurla Complex, Mumbai 400051</text>
        <text x="70" y="135" fill="#e2e8f0" font-size="14" font-weight="600" font-family="'Plus Jakarta Sans', sans-serif">CONFIDENTIAL EMPLOYEE PAYSLIP — OCTOBER 2026</text>

        <!-- Employee Info Grid -->
        <rect x="60" y="170" width="680" height="110" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
        <text x="80" y="200" fill="#64748b" font-size="12">EMPLOYEE NAME:</text>
        <text x="210" y="200" fill="#0f172a" font-size="14" font-weight="bold">RAHUL SHARMA</text>
        <text x="430" y="200" fill="#64748b" font-size="12">EMPLOYEE ID:</text>
        <text x="560" y="200" fill="#0f172a" font-size="14" font-weight="bold">EMP-9481</text>

        <text x="80" y="235" fill="#64748b" font-size="12">DESIGNATION:</text>
        <text x="210" y="235" fill="#0f172a" font-size="13">SR. SYSTEMS ARCHITECT</text>
        <text x="430" y="235" fill="#64748b" font-size="12">PAN / TAX ID:</text>
        <text x="560" y="235" fill="#0f172a" font-size="13">ABCP8491K</text>

        <text x="80" y="265" fill="#64748b" font-size="12">DISBURSEMENT DATE:</text>
        <text x="210" y="265" fill="#0f172a" font-size="13">31-OCT-2026</text>
        <text x="430" y="265" fill="#64748b" font-size="12">DISBURSEMENT BANK:</text>
        <text x="560" y="265" fill="#0f172a" font-size="13">HDFC BANK (A/C ...4920)</text>

        <!-- Earnings and Deductions Table -->
        <rect x="60" y="300" width="335" height="30" fill="#0284c7"/>
        <text x="80" y="320" fill="#ffffff" font-size="13" font-weight="bold">EARNINGS BREAKDOWN</text>
        <text x="310" y="320" fill="#ffffff" font-size="13" font-weight="bold" text-anchor="end">INR (₹)</text>

        <rect x="405" y="300" width="335" height="30" fill="#475569"/>
        <text x="425" y="320" fill="#ffffff" font-size="13" font-weight="bold">DEDUCTIONS</text>
        <text x="655" y="320" fill="#ffffff" font-size="13" font-weight="bold" text-anchor="end">INR (₹)</text>

        <line x1="60" y1="370" x2="395" y2="370" stroke="#f1f5f9"/>
        <text x="80" y="360" fill="#334155" font-size="13">Basic Pay</text>
        <text x="370" y="360" fill="#0f172a" font-size="13" text-anchor="end">32,000.00</text>
        <text x="425" y="360" fill="#334155" font-size="13">Provident Fund (PF)</text>
        <text x="715" y="360" fill="#0f172a" font-size="13" text-anchor="end">1,800.00</text>

        <line x1="60" y1="410" x2="395" y2="410" stroke="#f1f5f9"/>
        <text x="80" y="400" fill="#334155" font-size="13">House Rent Allowance (HRA)</text>
        <text x="370" y="400" fill="#0f172a" font-size="13" text-anchor="end">11,000.00</text>
        <text x="425" y="400" fill="#334155" font-size="13">Professional Tax</text>
        <text x="715" y="400" fill="#0f172a" font-size="13" text-anchor="end">200.00</text>

        <line x1="60" y1="450" x2="395" y2="450" stroke="#f1f5f9"/>
        <text x="80" y="440" fill="#334155" font-size="13">Special Executive Allowance</text>
        <text x="370" y="440" fill="#0f172a" font-size="13" text-anchor="end">5,000.00</text>
        <text x="425" y="440" fill="#334155" font-size="13">TDS (Income Tax)</text>
        <text x="715" y="440" fill="#0f172a" font-size="13" text-anchor="end">1,000.00</text>

        <!-- Total Box -->
        <rect x="60" y="490" width="680" height="90" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
        <text x="80" y="525" fill="#334155" font-size="14" font-weight="bold">TOTAL GROSS EARNINGS: ₹48,000.00</text>
        <text x="430" y="525" fill="#334155" font-size="14" font-weight="bold">TOTAL DEDUCTIONS: ₹3,000.00</text>

        <!-- Net Pay Box With Suspicious Font Splice on 4 -->
        <rect x="60" y="600" width="680" height="110" fill="#eff6ff" stroke="#93c5fd" stroke-width="2"/>
        <text x="90" y="645" fill="#1e3a8a" font-size="15" font-weight="bold">NET TAKE-HOME PAYABLE:</text>
        
        <!-- Forensically simulated altered text block: "4" has thicker stroke and slightly lowered baseline compared to "5,000.00" -->
        <g id="forensic_target_splice">
          <text x="470" y="655" fill="#0284c7" font-size="28" font-weight="900" letter-spacing="-1">₹</text>
          <!-- Thicker spliced '4' with visible kerning gap and optical weight mismatch -->
          <text x="495" y="657" fill="#0f172a" font-size="30" font-weight="900" font-family="Arial, sans-serif" stroke="#0f172a" stroke-width="0.8">4</text>
          <!-- Standard font 5,000.00 -->
          <text x="517" y="655" fill="#0f172a" font-size="28" font-weight="700" font-family="'Courier New', monospace">5,000.00</text>
        </g>
        <text x="90" y="685" fill="#475569" font-size="12">RUPEES FORTY FIVE THOUSAND ONLY</text>

        <!-- Authorization and Seals -->
        <g transform="translate(480, 840)">
          <!-- Circular seal artifact -->
          <circle cx="90" cy="70" r="55" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="3 2" opacity="0.85"/>
          <circle cx="90" cy="70" r="45" fill="none" stroke="#2563eb" stroke-width="1.2" opacity="0.85"/>
          <text x="90" y="50" fill="#2563eb" font-size="9" text-anchor="middle" font-weight="bold" opacity="0.85">APEX TECHNOLOGIES</text>
          <text x="90" y="75" fill="#2563eb" font-size="11" text-anchor="middle" font-weight="bold" opacity="0.85">AUTHORIZED</text>
          <text x="90" y="95" fill="#2563eb" font-size="8" text-anchor="middle" font-weight="bold" opacity="0.85">PAYROLL DIVISION</text>
          
          <!-- Signature stroke -->
          <path d="M 40,85 Q 70,30 95,75 T 140,65 Q 160,80 135,100" fill="none" stroke="#1d4ed8" stroke-width="2.5" opacity="0.9"/>
          <text x="90" y="145" fill="#64748b" font-size="11" text-anchor="middle">Authorized Signatory</text>
        </g>

        <!-- Security footer -->
        <text x="70" y="1030" fill="#94a3b8" font-size="10">System Generated Document · Security Checksum: 3a41c9b84178df9108b341f021e82713f01b98a3c48197e8201a4e98f029b471</text>
      </svg>
    `;
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(svg);
  }

  if (docId.includes('841-03')) {
    // Bank statement showing 25,000 credit
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1100" width="800" height="1100" style="background:#ffffff; font-family:'Plus Jakarta Sans', Arial, sans-serif;">
        <rect width="800" height="1100" fill="#ffffff"/>
        <rect x="40" y="40" width="720" height="1020" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>
        
        <!-- Bank Banner -->
        <rect x="40" y="40" width="720" height="90" fill="#004c8f"/>
        <text x="70" y="80" fill="#ffffff" font-size="22" font-weight="bold">HDFC BANK LIMITED</text>
        <text x="70" y="105" fill="#bae6fd" font-size="12">We Understand Your World · Bandra West Branch, Mumbai · IFSC: HDFC0000124</text>

        <!-- Statement Header -->
        <text x="70" y="165" fill="#0f172a" font-size="16" font-weight="bold">STATEMENT OF ACCOUNT (SAVINGS)</text>
        <rect x="60" y="185" width="680" height="95" fill="#f8fafc" stroke="#e2e8f0"/>
        
        <text x="80" y="215" fill="#64748b" font-size="12">ACCOUNT NAME:</text>
        <text x="200" y="215" fill="#0f172a" font-size="13" font-weight="bold">MR. RAHUL SHARMA</text>
        <text x="450" y="215" fill="#64748b" font-size="12">ACCOUNT NUMBER:</text>
        <text x="580" y="215" fill="#0f172a" font-size="13" font-weight="bold">50100482914920</text>

        <text x="80" y="245" fill="#64748b" font-size="12">STATEMENT PERIOD:</text>
        <text x="200" y="245" fill="#0f172a" font-size="13">01-OCT-2026 TO 31-OCT-2026</text>
        <text x="450" y="245" fill="#64748b" font-size="12">CURRENCY:</text>
        <text x="580" y="245" fill="#0f172a" font-size="13">INR (₹)</text>

        <!-- Transaction Table -->
        <rect x="60" y="300" width="680" height="30" fill="#f1f5f9" stroke="#cbd5e1"/>
        <text x="75" y="320" fill="#334155" font-size="11" font-weight="bold">DATE</text>
        <text x="170" y="320" fill="#334155" font-size="11" font-weight="bold">TRANSACTION NARRATION</text>
        <text x="450" y="320" fill="#334155" font-size="11" font-weight="bold">WITHDRAWAL (DR)</text>
        <text x="560" y="320" fill="#334155" font-size="11" font-weight="bold">DEPOSIT (CR)</text>
        <text x="660" y="320" fill="#334155" font-size="11" font-weight="bold">BALANCE</text>

        <!-- Rows -->
        <line x1="60" y1="365" x2="740" y2="365" stroke="#f1f5f9"/>
        <text x="75" y="355" fill="#64748b" font-size="12">01-OCT-2026</text>
        <text x="170" y="355" fill="#0f172a" font-size="12">B/F OPENING BALANCE</text>
        <text x="450" y="355" fill="#64748b" font-size="12">-</text>
        <text x="560" y="355" fill="#64748b" font-size="12">-</text>
        <text x="660" y="355" fill="#0f172a" font-size="12" font-weight="600">14,230.50</text>

        <line x1="60" y1="415" x2="740" y2="415" stroke="#f1f5f9"/>
        <text x="75" y="405" fill="#64748b" font-size="12">14-OCT-2026</text>
        <text x="170" y="405" fill="#0f172a" font-size="12">UPI/482910/SWIGGY FOOD ORDER</text>
        <text x="450" y="405" fill="#dc2626" font-size="12">450.00</text>
        <text x="560" y="405" fill="#64748b" font-size="12">-</text>
        <text x="660" y="405" fill="#0f172a" font-size="12" font-weight="600">13,780.50</text>

        <!-- SALARY ROW (CRITICAL AUDIT ITEM) -->
        <rect x="62" y="430" width="676" height="50" fill="#f0fdf4" stroke="#86efac" stroke-width="1.5"/>
        <text x="75" y="460" fill="#15803d" font-size="12" font-weight="bold">31-OCT-2026</text>
        <text x="170" y="452" fill="#166534" font-size="12" font-weight="bold">CMS/SALARY/APEX TECHNOLOGIES PVT LTD</text>
        <text x="170" y="470" fill="#4ade80" font-size="10">REF NO: CMS9481023910 · ACH CR</text>
        <text x="450" y="460" fill="#64748b" font-size="12">-</text>
        <!-- Actual deposit is 25,000.00! -->
        <text x="560" y="460" fill="#16a34a" font-size="14" font-weight="bold">25,000.00</text>
        <text x="660" y="460" fill="#0f172a" font-size="13" font-weight="bold">38,780.50</text>

        <line x1="60" y1="520" x2="740" y2="520" stroke="#f1f5f9"/>
        <text x="75" y="510" fill="#64748b" font-size="12">02-NOV-2026</text>
        <text x="170" y="510" fill="#0f172a" font-size="12">ATM CASH WDL / BANDRA BR</text>
        <text x="450" y="510" fill="#dc2626" font-size="12">5,000.00</text>
        <text x="560" y="510" fill="#64748b" font-size="12">-</text>
        <text x="660" y="510" fill="#0f172a" font-size="12" font-weight="600">33,780.50</text>

        <!-- Summary Footer -->
        <rect x="60" y="600" width="680" height="90" fill="#f8fafc" stroke="#e2e8f0"/>
        <text x="80" y="635" fill="#64748b" font-size="12">Total Deposits: <tspan fill="#16a34a" font-weight="bold">₹25,000.00</tspan></text>
        <text x="300" y="635" fill="#64748b" font-size="12">Total Withdrawals: <tspan fill="#dc2626" font-weight="bold">₹5,450.00</tspan></text>
        <text x="540" y="635" fill="#64748b" font-size="12">Closing Balance: <tspan fill="#0f172a" font-weight="bold">₹33,780.50</tspan></text>
        <text x="80" y="665" fill="#94a3b8" font-size="11">Generated electronically via HDFC Core Banking Engine · Digitally Signed PKI SHA-256</text>
      </svg>
    `;
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(svg);
  }

  // Default clean document simulation
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1100" width="800" height="1100" style="background:#ffffff; font-family:'Plus Jakarta Sans', Arial, sans-serif;">
      <rect width="800" height="1100" fill="#ffffff"/>
      <rect x="40" y="40" width="720" height="1020" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>
      <rect x="40" y="40" width="720" height="80" fill="#1e293b"/>
      <text x="70" y="85" fill="#ffffff" font-size="20" font-weight="bold">OFFICIAL DOCUMENT FILE: ${docId}</text>
      <text x="70" y="105" fill="#94a3b8" font-size="12">Forensic Ingestion Verified · Integrity Checksum Valid</text>
      
      <rect x="60" y="160" width="680" height="120" fill="#f8fafc" stroke="#e2e8f0"/>
      <text x="80" y="195" fill="#64748b" font-size="13">Document ID: <tspan fill="#0f172a" font-weight="bold">${docId}</tspan></text>
      <text x="80" y="225" fill="#64748b" font-size="13">Status: <tspan fill="#10b981" font-weight="bold">Verified Forensic Record</tspan></text>
      <text x="80" y="255" fill="#64748b" font-size="13">Ingestion Timestamp: <tspan fill="#0f172a">${new Date().toISOString()}</tspan></text>

      <rect x="60" y="320" width="680" height="400" fill="#ffffff" stroke="#e2e8f0"/>
      <text x="80" y="360" fill="#0f172a" font-size="16" font-weight="bold">DOCUMENT CONTENT INSPECTION VIEW</text>
      <text x="80" y="400" fill="#475569" font-size="13">This digital document has been parsed and indexed by DOCUSCAN AI.</text>
      <text x="80" y="430" fill="#475569" font-size="13">OCR character recognition and visual bounding box coordinates are mapped in the forensic viewport.</text>
      
      <rect x="80" y="470" width="640" height="80" fill="#f1f5f9" stroke="#cbd5e1"/>
      <text x="100" y="505" fill="#334155" font-size="13" font-weight="600">Parsed Key Figures &amp; Entity References</text>
      <text x="100" y="530" fill="#64748b" font-size="12">Values match registered forensic ledger entries.</text>

      <text x="70" y="1030" fill="#94a3b8" font-size="11">DOCUSCAN AI Security Watermark · Not for unauthorized reproduction</text>
    </svg>
  `;
  res.setHeader('Content-Type', 'image/svg+xml');
  return res.send(svg);
});

// -------------------------------------------------------------
// VITE DEV SERVER OR STATIC PRODUCTION SERVE
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // In dev, mount Vite middlewares
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 DOCUSCAN AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
