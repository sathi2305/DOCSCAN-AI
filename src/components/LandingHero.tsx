import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  ScanEye,
  Layers,
  ArrowRight,
  Fingerprint,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Lock,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { ThreeLogo } from './ThreeLogo.js';
import { ThreeDocumentScanner } from './ThreeDocumentScanner.js';

interface LandingHeroProps {
  onOpenBenchmarkCase: () => void;
  onExploreDashboard: () => void;
  onNewCase: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onOpenBenchmarkCase,
  onExploreDashboard,
  onNewCase,
}) => {
  return (
    <div className="flex flex-col w-full min-h-screen bg-slate-950/40 text-slate-100 relative">
      {/* Hero Section */}
      <section className="relative px-6 pt-12 pb-20 lg:pt-16 lg:pb-24 max-w-7xl mx-auto w-full flex flex-col items-center text-center">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

        {/* 3D Holographic Brand Emblem */}
        <div className="relative mb-6 flex flex-col items-center">
          <div className="relative p-2 rounded-2xl bg-gradient-to-b from-cyan-500/10 via-slate-900/40 to-transparent border border-cyan-500/20 shadow-2xl shadow-cyan-500/10 backdrop-blur-md">
            <ThreeLogo size="hero" interactive={true} />
          </div>
          <span className="mt-3 text-[10px] font-mono tracking-[0.25em] text-cyan-400 font-semibold uppercase">
            INTELLIGENCE BEYOND DOCUMENTS
          </span>
        </div>

        {/* Micro-badge */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300 mb-6 backdrop-blur-sm shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-medium">AI-Powered Forensic Intelligence &amp; Context Discrepancy Engine</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl text-balance leading-tight">
          SEE BEYOND THE DOCUMENT.<br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400">
            UNCOVER WHAT OTHERS MISS.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-3xl text-balance leading-relaxed">
          An intelligent document forensics platform combining computer vision, contextual intelligence, and evidence-backed AI analysis. Unmask font kerning anomalies, ELA compression splices, and cross-file financial contradictions in real time.
        </p>

        {/* Hero CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onOpenBenchmarkCase}
            className="px-6 py-3 rounded-lg bg-cyan-400 text-slate-950 font-semibold text-sm hover:bg-cyan-300 transition-all shadow-lg shadow-cyan-500/25 flex items-center gap-2 group cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Launch Benchmark Case (INV-2026-0841)</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onExploreDashboard}
            className="px-6 py-3 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-200 font-semibold text-sm hover:bg-slate-800 hover:text-white transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Open Investigation Console</span>
          </button>

          <button
            onClick={onNewCase}
            className="px-5 py-3 rounded-lg bg-violet-600/30 border border-violet-500/40 text-violet-200 font-semibold text-sm hover:bg-violet-600/50 hover:text-white transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <span>+ Create Case</span>
          </button>
        </div>

        {/* Interactive 3D Holographic Document Scanner Section */}
        <div className="mt-16 w-full max-w-5xl rounded-2xl bg-gradient-to-b from-slate-800/80 via-slate-900/60 to-slate-950/90 border border-slate-800/80 shadow-2xl p-4 sm:p-6 backdrop-blur-md">
          <div className="flex flex-col lg:flex-row gap-6 items-stretch">
            {/* 3D Real-time Laser Fan Scanner Visualizer */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center">
              <ThreeDocumentScanner height={340} />
            </div>

            {/* Simulated Micro-Audit Breakdown */}
            <div className="w-full lg:w-1/2 flex flex-col justify-between bg-slate-900/80 rounded-xl border border-slate-800 p-5 text-left">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-mono">
                  <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                    <ScanEye className="w-3.5 h-3.5" />
                    LIVE FORENSIC AUDIT
                  </span>
                  <span className="text-slate-400">SALARY_SLIP.PNG</span>
                </div>

                <div className="mt-3 space-y-2 text-xs font-mono text-slate-400">
                  <div className="flex justify-between">
                    <span>CANDIDATE:</span>
                    <span className="text-slate-200">Rahul Sharma</span>
                  </div>
                  <div className="flex justify-between">
                    <span>EMPLOYER:</span>
                    <span className="text-slate-200">Apex Technologies Pvt Ltd</span>
                  </div>

                  {/* Spliced Target Field */}
                  <div className="my-3 p-3 rounded-lg bg-slate-950 border border-red-500/50 relative">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-[11px]">DECLARED NET PAY:</span>
                      <span className="text-base font-bold text-white tracking-wide">
                        ₹<span className="text-red-400 font-black text-lg underline decoration-wavy decoration-red-500">4</span>5,000.00
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-red-400 font-bold">
                      <span>VIS-FIND-01: KERNING SPLICE</span>
                      <span>Δ 2.4px vs 1.8px standard</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>BANK CREDIT (AUDITED):</span>
                    <span className="text-emerald-400 font-bold font-mono">₹25,000.00</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>FORM 16 TDS DEPOSIT:</span>
                    <span className="text-amber-400 font-bold font-mono">₹2,100.00 (Mismatched)</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Multi-Doc Conflict</span>
                  <span className="text-amber-400 font-bold font-mono">₹20,000 Variance</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Tamper Probability</span>
                  <span className="text-red-400 font-bold font-mono">94.2%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Sign-Off Authority</span>
                  <span className="text-cyan-400 font-bold">Senior Reviewer</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Core Pillars Section */}
      <section className="px-6 py-16 max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Comprehensive Document Forensics Architecture
          </h2>
          <p className="mt-3 text-sm text-slate-400 max-w-xl mx-auto">
            From low-level pixel compression artifacts to multi-document contextual reconciliation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-4">
              <ScanEye className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Visual Forensic Analysis</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Detects typeface weight mismatches, irregular kerning, baseline jitter, copy-move cloning, and JPEG Error Level Analysis (ELA) anomalies.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Multimodal OCR &amp; Tables</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Extracts high-precision key-value pairs, transaction schedules, and tabular earnings/deductions with confidence scores and source coordinates.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Cross-Document Context</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Reconciles figures across related documents (Loan application declared salary vs Pay slip stated net pay vs Bank statement verified deposits).
            </p>
          </div>

          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Chain of Custody &amp; Dossiers</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Immutable SHA-256 integrity hashing, comprehensive audit logs, role-based reviews, and downloadable PDF forensic dossiers.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-6 py-16 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-cyan-400 tracking-wider uppercase">Workflow Pipeline</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              End-to-End Investigation Lifecycle
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 text-cyan-400 flex items-center justify-center font-bold font-mono text-sm mb-4">
                01
              </div>
              <h4 className="text-sm font-semibold text-slate-200">Secure Ingestion</h4>
              <p className="mt-2 text-xs text-slate-400">
                Upload PDF, PNG, JPG files. Cryptographic SHA-256 hash calculated immediately to guarantee evidentiary integrity.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 text-cyan-400 flex items-center justify-center font-bold font-mono text-sm mb-4">
                02
              </div>
              <h4 className="text-sm font-semibold text-slate-200">Vision &amp; OCR Inspection</h4>
              <p className="mt-2 text-xs text-slate-400">
                Computer vision runs kerning analysis, grid alignment checks, and compression artifact detection with normalized bounding coordinates.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 text-cyan-400 flex items-center justify-center font-bold font-mono text-sm mb-4">
                03
              </div>
              <h4 className="text-sm font-semibold text-slate-200">Contextual Correlation</h4>
              <p className="mt-2 text-xs text-slate-400">
                Cross-document matching engine compares stated amounts, dates, and entity identifiers across multiple submitted documents.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 text-cyan-400 flex items-center justify-center font-bold font-mono text-sm mb-4">
                04
              </div>
              <h4 className="text-sm font-semibold text-slate-200">Human Review &amp; Dossier</h4>
              <p className="mt-2 text-xs text-slate-400">
                Senior reviewers validate anomalies, record final decisions, and export an official, court-ready PDF dossier.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Target Use Cases */}
      <section className="px-6 py-16 max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Industry Applications
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Engineered for high-stakes verification environments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
            <h3 className="text-base font-semibold text-white">Mortgage &amp; Loan Underwriting</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Detect altered salary slips, inflated income declarations, fabricated tax forms, and mismatched bank statements before loan disbursal.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
            <h3 className="text-base font-semibold text-white">Vendor Invoice &amp; Procurement Audit</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Identify altered wire transfer routing numbers, manipulated unit prices, duplicate billing entities, and substituted vendor bank details.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
            <h3 className="text-base font-semibold text-white">Legal &amp; Insurance Claims</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Inspect contract revisions, pasted digital signatures, modified medical billing amounts, and backdated agreement dates.
            </p>
          </div>
        </div>
      </section>

      {/* Security & Human Authority Notice */}
      <section className="px-6 py-12 max-w-5xl mx-auto w-full">
        <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center gap-6 text-left">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Fingerprint className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Explainable AI &amp; Human-in-the-Loop Principle</h4>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              DOCUSCAN AI is strictly an evidentiary decision-support system. It identifies potential visual anomalies and contextual contradictions with transparent explanations. Final decisions, legal determinations, and fraud declarations remain exclusively with human investigators.
            </p>
          </div>
          <button
            onClick={onExploreDashboard}
            className="px-4 py-2.5 rounded-lg bg-cyan-400 text-slate-950 font-semibold text-xs hover:bg-cyan-300 transition-all whitespace-nowrap shrink-0"
          >
            Open Console
          </button>
        </div>
      </section>
    </div>
  );
};
