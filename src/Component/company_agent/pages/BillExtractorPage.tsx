/**
 * BillExtractorPage.tsx
 *
 * Bill Extractor — completely isolated from the Resume Extractor.
 * Workflow:
 *   1. User uploads one or more bill PDFs (drag-drop or file picker).
 *   2. PDF.js extracts text per-page, per-file, in the browser.
 *   3. All bill texts are sent to POST /extract-bills on the FastAPI backend.
 *   4. Backend calls Ollama (qwen3:4b) once per bill and returns JSON records.
 *   5. Results are displayed as a table: Name | Bill Number | Date | Purpose Of Bill.
 *   6. User can download results as CSV or Excel (.xlsx).
 *
 * State variables are entirely separate from the Resume Extractor:
 *   billFiles, billResults, billLoading, billError, billProgress, billElapsed
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  FileText,
  Download,
  Receipt,
  RotateCcw,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { BillRecord, BillPayload } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import { API_URL } from '../../../context/AuthContext';

// ---------------------------------------------------------------------------
// PDF.js worker — reuse the same CDN strategy as the Resume Extractor
// ---------------------------------------------------------------------------
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BACKEND_URL = `${API_URL || 'http://localhost:8000'}/extract-bills`;
/** 10-minute timeout matching the FastAPI backend limit */
const TIMEOUT_MS = 600_000;
/** Max chars sent per bill to avoid Ollama context overflow */
const MAX_BILL_CHARS = 12_000;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const BillExtractorPage: React.FC = () => {
  // ─── Bill-specific state (completely isolated from Resume Extractor) ────
  const [billFiles, setBillFiles] = useState<File[]>([]);
  const [billResults, setBillResults] = useState<BillRecord[]>([]);
  const [billLoading, setBillLoading] = useState<{
    parsing: boolean;
    extracting: boolean;
  }>({ parsing: false, extracting: false });
  const [billError, setBillError] = useState<string | null>(null);
  const [billProgress, setBillProgress] = useState(0);
  const [billElapsed, setBillElapsed] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  /** Extracted bill text payloads — kept in state so retry works without re-upload */
  const [billPayloads, setBillPayloads] = useState<BillPayload[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Elapsed timer during Ollama extraction ──────────────────────────────
  useEffect(() => {
    if (billLoading.extracting) {
      setBillElapsed(0);
      elapsedTimerRef.current = setInterval(() => {
        setBillElapsed(s => s + 1);
      }, 1000);
    } else {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    }
    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [billLoading.extracting]);

  // ─── Drag & Drop handlers ────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!billLoading.parsing && !billLoading.extracting) setIsDragOver(true);
  }, [billLoading]);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (billLoading.parsing || billLoading.extracting) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndStart(Array.from(e.dataTransfer.files));
    }
  }, [billLoading]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndStart(Array.from(e.target.files));
      // Reset the input value so the same file can be re-selected after a reset
      e.target.value = '';
    }
  }, []);

  // ─── Validate & kick off parsing ─────────────────────────────────────────
  const validateAndStart = (selectedFiles: File[]) => {
    setBillError(null);
    setBillResults([]);
    setBillPayloads([]);
    setBillProgress(0);

    const invalid = selectedFiles.filter(
      f => f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf'),
    );

    if (invalid.length > 0) {
      setBillError(
        `Only PDF files are supported. Rejected: ${invalid.map(f => f.name).join(', ')}`,
      );
      return;
    }

    setBillFiles(selectedFiles);
    parseBillPdfs(selectedFiles);
  };

  // ─── PDF.js text extraction ───────────────────────────────────────────────
  const parseBillPdfs = async (files: File[]) => {
    setBillLoading({ parsing: true, extracting: false });
    setBillProgress(0);

    const payloads: BillPayload[] = [];
    const perFileErrors: string[] = [];

    for (let fi = 0; fi < files.length; fi++) {
      const file = files[fi];
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages;
        let fileText = '';

        for (let pi = 1; pi <= totalPages; pi++) {
          const page = await pdf.getPage(pi);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(' ');
          fileText += pageText + '\n';

          // Compute progress across all files × pages
          const progress = Math.round(((fi + pi / totalPages) / files.length) * 100);
          setBillProgress(progress);
        }

        const trimmed = fileText.trim();
        if (!trimmed) {
          perFileErrors.push(`${file.name}: No readable text found (may be a scanned image).`);
          // Still push a placeholder so the backend can report NOT_FOUND fields
          payloads.push({ filename: file.name, text: '[EMPTY_PDF]' });
        } else {
          payloads.push({ filename: file.name, text: trimmed });
        }
      } catch (err: any) {
        console.error(`[Bill PDF Parsing Error] ${file.name}:`, err);
        perFileErrors.push(`${file.name}: ${err.message || 'Failed to read PDF.'}`);
        // Push placeholder so the table still shows a row with NOT_FOUND values
        payloads.push({ filename: file.name, text: '[PARSE_ERROR]' });
      }
    }

    setBillLoading({ parsing: false, extracting: false });

    if (perFileErrors.length > 0 && payloads.every(p => p.text === '[EMPTY_PDF]' || p.text === '[PARSE_ERROR]')) {
      // All files failed — show error and bail
      setBillError(`Failed to read all uploaded PDFs:\n${perFileErrors.join('\n')}`);
      setBillFiles([]);
      return;
    }

    // Show partial-error as a warning (not fatal) — continue with valid files
    if (perFileErrors.length > 0) {
      setBillError(`Warning — some files had issues (continuing with valid ones):\n${perFileErrors.join('\n')}`);
    }

    setBillPayloads(payloads);
    submitToBackend(payloads);
  };

  // ─── POST /extract-bills ─────────────────────────────────────────────────
  const submitToBackend = async (payloads: BillPayload[]) => {
    setBillLoading({ parsing: false, extracting: true });
    // Keep any warning error visible — only clear hard errors
    setBillResults([]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ bills: payloads }),
      });

      // Read body as text first to avoid JSON parse errors on HTML error pages
      const rawText = await res.text();

      if (!res.ok) {
        let detail = `Server error (HTTP ${res.status})`;
        if (rawText) {
          try {
            const errJson = JSON.parse(rawText);
            detail = errJson.detail || errJson.message || rawText;
          } catch {
            detail = rawText;
          }
        }
        throw new Error(detail);
      }

      let data: { bills: BillRecord[] } = { bills: [] };
      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          throw new Error(`Server returned invalid JSON: ${rawText.slice(0, 200)}`);
        }
      }

      setBillResults(data.bills || []);
    } catch (err: any) {
      console.error('[Bill Backend Error]:', err);
      const isTimeout = err.name === 'AbortError';
      const msg = isTimeout
        ? 'Ollama timed out after 10 minutes. Try fewer/smaller PDFs or click "Retry" below.'
        : err.message || 'Failed to extract bill information.';
      // Append to any existing warning rather than overwriting it
      setBillError(prev => (prev ? `${prev}\n\nExtraction error: ${msg}` : msg));
    } finally {
      clearTimeout(timeoutId);
      setBillLoading({ parsing: false, extracting: false });
    }
  };

  /** Retry extraction without re-uploading / re-parsing the PDFs */
  const retryExtraction = () => {
    if (billPayloads.length > 0) {
      setBillError(null);
      submitToBackend(billPayloads);
    }
  };

  /** Full reset — clears all bill state */
  const resetAll = () => {
    setBillFiles([]);
    setBillResults([]);
    setBillPayloads([]);
    setBillLoading({ parsing: false, extracting: false });
    setBillProgress(0);
    setBillElapsed(0);
    setBillError(null);
    setIsDragOver(false);
  };

  // ─── Export helpers ───────────────────────────────────────────────────────

  /** Build row data shared between CSV and Excel */
  const buildRows = () =>
    billResults.map(r => ({
      Name: r.name,
      'Bill Number': r.bill_number,
      Date: r.date,
      'Purpose Of Bill': r.purpose_of_bill,
    }));

  const downloadCsv = () => {
    if (billResults.length === 0) return;
    const headers = ['Name', 'Bill Number', 'Date', 'Purpose Of Bill'];
    const rows = billResults.map(r => [r.name, r.bill_number, r.date, r.purpose_of_bill]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download =
      billFiles.length === 1
        ? `${billFiles[0].name.replace(/\.pdf$/i, '')}_bills.csv`
        : 'extracted_bills.csv';
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    if (billResults.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(buildRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bills');
    const filename =
      billFiles.length === 1
        ? `${billFiles[0].name.replace(/\.pdf$/i, '')}_bills.xlsx`
        : 'extracted_bills.xlsx';
    XLSX.writeFile(wb, filename);
  };

  // ─── Derived state ────────────────────────────────────────────────────────
  const isParsing = billLoading.parsing;
  const isExtracting = billLoading.extracting;
  const isIdle = billFiles.length === 0;
  const hasResults = billResults.length > 0;
  const hasHardError =
    billError &&
    !billError.startsWith('Warning') &&
    !isExtracting &&
    !isParsing;

  // ─── UI ──────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full overflow-y-auto scrollbar-thin"
    >
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-8">

        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
              <Receipt size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary tracking-tight">
                Bill Extractor
              </h1>
              <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-1.5">
                <Sparkles size={11} className="text-amber-400 animate-pulse" />
                Browser-side PDF parsing &amp; FastAPI local Qwen LLM
              </p>
            </div>
          </div>
        </div>

        {/* ── Upload Zone (visible only when idle) ─────────────────────── */}
        {isIdle && (
          <div
            id="bill-upload-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'relative group rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden',
              isDragOver
                ? 'border-amber-400 bg-amber-500/5'
                : 'border-border hover:border-amber-400/60 bg-surface-1 hover:bg-amber-500/[0.02]',
            )}
          >
            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] to-orange-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="relative flex flex-col items-center justify-center py-16 px-6 text-center">
              <motion.div
                animate={{ y: isDragOver ? -4 : 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className={cn(
                  'w-16 h-16 rounded-2xl flex items-center justify-center transition-colors mb-4',
                  isDragOver
                    ? 'bg-amber-500/15'
                    : 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 group-hover:from-amber-500/15 group-hover:to-orange-500/15',
                )}
              >
                <Upload
                  size={26}
                  className={cn(
                    'transition-colors',
                    isDragOver ? 'text-amber-500' : 'text-amber-400 group-hover:text-amber-500',
                  )}
                />
              </motion.div>

              <div>
                <p className="text-sm font-medium text-text-primary">
                  {isDragOver ? 'Drop your bill PDFs here' : 'Upload bill PDFs'}
                </p>
                <p className="text-[11px] text-text-muted mt-1.5 leading-relaxed">
                  Drag &amp; drop or click to browse. Multiple bills supported.
                </p>
              </div>

              <div className="mt-4">
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide text-rose-500 bg-rose-500/10">
                  PDF ONLY
                </span>
              </div>
            </div>

            <input
              id="bill-file-input"
              type="file"
              ref={fileInputRef}
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* ── Processing State ──────────────────────────────────────────── */}
        <AnimatePresence>
          {billFiles.length > 0 && (isParsing || isExtracting) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-panel rounded-2xl p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                    <Loader2 size={20} className="text-amber-500 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-text-primary">
                      {isParsing ? 'Reading bill PDFs...' : 'Extracting with Ollama...'}
                    </h3>
                    <p className="text-[10px] text-text-secondary mt-0.5">
                      {isParsing
                        ? 'Extracting text locally in the browser'
                        : 'Local Qwen LLM is extracting bill details — this may take 1–5 min on CPU'}
                    </p>
                    {isExtracting && (
                      <p className="text-[10px] text-amber-400 mt-1 font-mono">
                        {`⏱ Elapsed: ${Math.floor(billElapsed / 60)}m ${billElapsed % 60}s`}
                        {billElapsed >= 60 && ' — still running, please wait...'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress badge shown during PDF parsing */}
                {isParsing && (
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md">
                      {billProgress}%
                    </span>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {isParsing && (
                <div className="w-full bg-surface-2 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-orange-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${billProgress}%` }}
                  />
                </div>
              )}

              {/* File list */}
              <div className="flex flex-col gap-1.5 text-xs text-text-secondary font-medium">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-amber-400" />
                  <span>Processing {billFiles.length} file(s):</span>
                </div>
                <div className="pl-6 max-h-[100px] overflow-y-auto scrollbar-thin text-[11px] text-text-muted space-y-1">
                  {billFiles.map((f, idx) => (
                    <div key={idx} className="truncate">
                      - {f.name} ({Math.round(f.size / 1024)} KB)
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Warning / Error State ─────────────────────────────────────── */}
        <AnimatePresence>
          {billError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                'rounded-2xl border p-6',
                billError.startsWith('Warning')
                  ? 'border-amber-200 bg-amber-500/5'
                  : 'border-rose-200 bg-rose-500/5',
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    billError.startsWith('Warning') ? 'bg-amber-500/15' : 'bg-rose-500/15',
                  )}
                >
                  <AlertCircle
                    size={20}
                    className={billError.startsWith('Warning') ? 'text-amber-500' : 'text-rose-500'}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      billError.startsWith('Warning') ? 'text-amber-700' : 'text-rose-700',
                    )}
                  >
                    {billError.startsWith('Warning') ? 'Warning' : 'Error'}
                  </p>
                  <pre
                    className={cn(
                      'text-xs mt-1.5 leading-relaxed whitespace-pre-wrap font-sans',
                      billError.startsWith('Warning') ? 'text-amber-600' : 'text-rose-600',
                    )}
                  >
                    {billError}
                  </pre>

                  {/* Action buttons */}
                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    {/* Retry is available when we have payloads but extraction failed */}
                    {billPayloads.length > 0 && !isExtracting && (
                      <button
                        id="bill-retry-btn"
                        onClick={retryExtraction}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-amber-500/10 border border-amber-300 text-amber-700 hover:bg-amber-500/20 transition-colors"
                      >
                        <RotateCcw size={12} />
                        Retry Extraction
                      </button>
                    )}
                    <button
                      id="bill-upload-new-btn"
                      onClick={resetAll}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium border border-rose-200 text-rose-600 hover:bg-rose-500/10 transition-colors"
                    >
                      <X size={12} />
                      Upload New Files
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Results ───────────────────────────────────────────────────── */}
        <AnimatePresence>
          {hasResults && !isParsing && !isExtracting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Actions panel */}
              <div className="glass-panel rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-text-primary">Extraction Complete</h3>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      Extracted details from {billResults.length} bill(s)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap justify-end">
                  <button
                    id="bill-reset-btn"
                    onClick={resetAll}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-all"
                  >
                    Upload New
                  </button>
                  <button
                    id="bill-download-csv-btn"
                    onClick={downloadCsv}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-amber-300 text-amber-700 bg-amber-500/10 text-xs font-semibold hover:bg-amber-500/20 transition-all"
                  >
                    <Download size={13} />
                    Download CSV
                  </button>
                  <button
                    id="bill-download-excel-btn"
                    onClick={downloadExcel}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all"
                  >
                    <Download size={13} />
                    Download Excel
                  </button>
                </div>
              </div>

              {/* Results Table */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-text-primary">Bill Details</h2>
                <div className="w-full overflow-x-auto rounded-xl border border-border bg-surface-1 shadow-card">
                  <table className="w-full min-w-[600px] text-xs">
                    <thead>
                      <tr className="bg-surface-2/50 border-b border-border">
                        {['Name', 'Bill Number', 'Date', 'Purpose Of Bill'].map((header, i) => (
                          <th
                            key={i}
                            className="px-4 py-3 text-left font-semibold text-text-secondary text-[10px] tracking-wide uppercase"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {billResults.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className={cn(
                            'transition-colors hover:bg-surface-2/30',
                            rIdx % 2 === 0 ? 'bg-transparent' : 'bg-surface-2/10',
                          )}
                        >
                          {/* Name */}
                          <td className="px-4 py-3 border-b border-border/50 font-medium text-text-primary">
                            <NotFoundCell value={row.name} />
                          </td>
                          {/* Bill Number */}
                          <td className="px-4 py-3 border-b border-border/50 font-mono text-text-primary">
                            <NotFoundCell value={row.bill_number} highlight />
                          </td>
                          {/* Date */}
                          <td className="px-4 py-3 border-b border-border/50 text-text-primary">
                            <NotFoundCell value={row.date} />
                          </td>
                          {/* Purpose */}
                          <td className="px-4 py-3 border-b border-border/50 text-text-primary">
                            <PurposeBadge value={row.purpose_of_bill} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── How It Works panel (shown only when idle, no results) ──────── */}
        {isIdle && (
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-xs font-bold text-text-primary mb-3">How it works</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  step: '1',
                  title: 'Upload Bill PDFs',
                  desc: 'Select one or more bill PDF files. Electricity, internet, grocery — any bill.',
                  gradient: 'from-amber-500 to-orange-600',
                },
                {
                  step: '2',
                  title: 'Parse Text in Browser',
                  desc: 'PDF.js reads and extracts text page-by-page from each file locally.',
                  gradient: 'from-orange-500 to-red-500',
                },
                {
                  step: '3',
                  title: 'Extract with Ollama',
                  desc: 'FastAPI routes to local Qwen — extracts Name, Bill No., Date & Purpose.',
                  gradient: 'from-emerald-500 to-teal-600',
                },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm',
                      item.gradient,
                    )}
                  >
                    {item.step}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-primary">{item.title}</p>
                    <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// Small sub-components
// ---------------------------------------------------------------------------

/** Renders a cell value, styling NOT_FOUND values distinctly */
const NotFoundCell: React.FC<{ value: string; highlight?: boolean }> = ({ value, highlight }) => {
  if (value === 'NOT_FOUND') {
    return (
      <span className="text-[10px] font-semibold text-text-muted bg-surface-2 px-1.5 py-0.5 rounded">
        NOT_FOUND
      </span>
    );
  }
  return (
    <span className={highlight ? 'text-amber-600 font-mono' : undefined}>{value}</span>
  );
};

/** Renders the purpose of bill as a compact badge */
const PurposeBadge: React.FC<{ value: string }> = ({ value }) => {
  if (value === 'NOT_FOUND') {
    return (
      <span className="text-[10px] font-semibold text-text-muted bg-surface-2 px-1.5 py-0.5 rounded">
        NOT_FOUND
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 border border-amber-200/50">
      {value}
    </span>
  );
};
