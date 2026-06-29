import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  FileText,
  Mail,
  Copy,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '../lib/utils';
import * as pdfjsLib from 'pdfjs-dist';

import { API_URL } from '../../../context/AuthContext';
const BACKEND_URL = API_URL || 'http://localhost:8000';

// Configure PDF.js worker using jsdelivr (guaranteed to match npm package version)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface ParsedTable {
  headers: string[];
  rows: string[][];
}

export const PdfExtractorPage: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState('');
  const [resultMarkdown, setResultMarkdown] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isExtracting) {
      setElapsedSeconds(0);
      elapsedIntervalRef.current = setInterval(() => {
        setElapsedSeconds(s => s + 1);
      }, 1000);
    } else {
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
        elapsedIntervalRef.current = null;
      }
    }
    return () => {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, [isExtracting]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isParsing && !isExtracting) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isParsing || isExtracting) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFiles(Array.from(e.target.files));
    }
  };

  const validateAndProcessFiles = (selectedFiles: File[]) => {
    setError(null);
    setResultMarkdown('');
    setExtractedText('');
    setProgress(0);

    const invalidFiles = selectedFiles.filter(
      f => f.type !== 'application/pdf' && !f.name.endsWith('.pdf')
    );

    if (invalidFiles.length > 0) {
      setError(`Invalid file format in selection. Only PDF files are supported. (Failed files: ${invalidFiles.map(f => f.name).join(', ')})`);
      return;
    }

    setFiles(selectedFiles);
    parsePdfsText(selectedFiles);
  };

  const parsePdfsText = async (pdfFiles: File[]) => {
    setIsParsing(true);
    setProgress(0);
    try {
      let combinedText = '';

      for (let fileIdx = 0; fileIdx < pdfFiles.length; fileIdx++) {
        const pdfFile = pdfFiles[fileIdx];
        const arrayBuffer = await pdfFile.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;
        
        combinedText += `\n\n--- START RESUME: ${pdfFile.name} ---\n\n`;
        const totalPages = pdf.numPages;

        for (let i = 1; i <= totalPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          
          combinedText += pageText + '\n';
          
          // Compute progress across all pages of all selected files
          const currentProgress = Math.round(
            ((fileIdx + i / totalPages) / pdfFiles.length) * 100
          );
          setProgress(currentProgress);
        }
        
        combinedText += `\n\n--- END RESUME: ${pdfFile.name} ---\n\n`;
      }

      const trimmedText = combinedText.trim();
      if (!trimmedText) {
        throw new Error('No readable text could be extracted from the uploaded PDFs.');
      }

      setExtractedText(trimmedText);
      setIsParsing(false);
      
      // Auto-submit to backend once successfully parsed
      submitToBackend(trimmedText, pdfFiles);
    } catch (err: any) {
      console.error('[PDF Parsing Error]:', err);
      setError(err.message || 'Failed to parse text from the PDF files.');
      setIsParsing(false);
      setFiles([]);
    }
  };

  const retryExtraction = () => {
    if (extractedText && files.length > 0) {
      submitToBackend(extractedText, files);
    }
  };

  const submitToBackend = async (text: string, selectedFiles: File[] = files) => {
    setIsExtracting(true);
    setError(null);
    // AbortController: 10-minute timeout — matches backend 600s limit
    const TIMEOUT_MS = 600_000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const filesMetadata = selectedFiles.map(f => ({
        name: f.name,
        size: f.size
      }));
      const res = await fetch(`${BACKEND_URL}/extract-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({ 
          resume_text: text, 
          files_metadata: filesMetadata 
        }),
      });

      // Safe response reading: use .text() first so that empty bodies,
      // HTML error pages, or plain-text crash messages don't throw
      // "Unexpected end of JSON input" when we try to call .json().
      const rawText = await res.text();

      if (!res.ok) {
        let detail = `Server error (HTTP ${res.status})`;
        if (rawText) {
          try {
            const errJson = JSON.parse(rawText);
            detail = errJson.detail || errJson.message || rawText;
          } catch {
            detail = rawText; // plain-text error body
          }
        }
        throw new Error(detail);
      }

      let data: any = {};
      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          throw new Error(`Server returned invalid JSON: ${rawText.slice(0, 200)}`);
        }
      }
      setResultMarkdown(data.result || '');
    } catch (err: any) {
      console.error('[Backend Extraction Error]:', err);
      const isTimeout = err.name === 'AbortError';
      const msg = isTimeout
        ? `Ollama timed out after 10 minutes. Tips: (1) Restart Ollama, (2) Use smaller/fewer PDFs, (3) Click "Retry Extraction" below to try again without re-uploading.`
        : (err.message || 'Failed to extract candidate information from the backend.');
      setError(msg);
    } finally {
      clearTimeout(timeoutId);
      setIsExtracting(false);
    }
  };

  const resetAll = () => {
    setFiles([]);
    setIsParsing(false);
    isExtracting && setIsExtracting(false);
    setProgress(0);
    setExtractedText('');
    setResultMarkdown('');
    setError(null);
    setShowPreview(false);
  };

  // Helper to parse markdown table format — robust version
  const parseTable = (markdown: string): ParsedTable | null => {
    // Strip any leftover <think>...</think> blocks the model may have emitted
    const cleaned = markdown
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/<think>[\s\S]*/gi, '')
      .trim();

    // Filter only lines that look like table rows (start with |)
    const tableLines = cleaned
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('|') && l.endsWith('|'));

    if (tableLines.length < 1) return null;

    // Separate header, separator, and data rows
    // Separator rows look like: | --- | --- | --- |
    const isSeparator = (line: string) => /^\|[\s\-:|]+\|$/.test(line.replace(/\s/g, ''));
    const nonSeparatorLines = tableLines.filter(l => !isSeparator(l));

    if (nonSeparatorLines.length < 1) return null;

    const parseRow = (line: string): string[] =>
      line
        .split('|')
        .slice(1, -1)
        .map(cell => {
          const mailtoRegex = /\[([^\]]+)\]\(mailto:[^)]+\)/;
          const match = cell.match(mailtoRegex);
          return match ? match[1] : cell.trim();
        });

    const headers = parseRow(nonSeparatorLines[0]);
    if (headers.length === 0 || headers.every(h => h === '')) return null;

    const rows = nonSeparatorLines
      .slice(1)
      .map(parseRow)
      .filter(row => row.length > 0 && row.some(cell => cell !== ''));

    return { headers, rows };
  };

  const tableData = resultMarkdown ? parseTable(resultMarkdown) : null;

  const downloadCsv = () => {
    if (!tableData) return;
    const csvContent = [
      tableData.headers.join(','),
      ...tableData.rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const filename = files.length === 1 
      ? `${files[0].name.replace('.pdf', '')}_extracted.csv` 
      : `multiple_resumes_extracted.csv`;
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = () => {
    if (!resultMarkdown) return;
    navigator.clipboard.writeText(resultMarkdown);
  };

  const fileCount = files.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full overflow-y-auto scrollbar-thin"
    >
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
              <Mail size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary tracking-tight">
                PDF Resume Email Extractor
              </h1>
              <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-1.5">
                <Sparkles size={11} className="text-indigo-400 animate-pulse" />
                Browser-side PDF parsing & FastAPI local Qwen LLM
              </p>
            </div>
          </div>
        </div>

        {/* Upload Zone */}
        {fileCount === 0 && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'relative group rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden',
              isDragOver
                ? 'border-indigo-400 bg-indigo-500/5'
                : 'border-border hover:border-indigo-400/60 bg-surface-1 hover:bg-indigo-500/[0.02]'
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-violet-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="relative flex flex-col items-center justify-center py-16 px-6 text-center">
              <motion.div
                animate={{ y: isDragOver ? -4 : 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className={cn(
                  'w-16 h-16 rounded-2xl flex items-center justify-center transition-colors mb-4',
                  isDragOver
                    ? 'bg-indigo-500/15'
                    : 'bg-gradient-to-br from-indigo-500/10 to-violet-500/10 group-hover:from-indigo-500/15 group-hover:to-violet-500/15'
                )}
              >
                <Upload
                  size={26}
                  className={cn(
                    'transition-colors',
                    isDragOver ? 'text-indigo-500' : 'text-indigo-400 group-hover:text-indigo-500'
                  )}
                />
              </motion.div>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {isDragOver ? 'Drop your PDFs here' : 'Upload candidate resumes'}
                </p>
                <p className="text-[11px] text-text-muted mt-1.5 leading-relaxed">
                  Drag & drop or click to browse. You can select multiple PDF resumes.
                </p>
              </div>
              <div className="mt-4">
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide text-rose-500 bg-rose-500/10">
                  PDF ONLY
                </span>
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* Processing State */}
        <AnimatePresence>
          {fileCount > 0 && (isParsing || isExtracting) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-panel rounded-2xl p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                    <Loader2 size={20} className="text-indigo-500 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-text-primary">
                      {isParsing ? 'Reading PDF files...' : 'Extracting with Ollama...'}
                    </h3>
                    <p className="text-[10px] text-text-secondary mt-0.5">
                      {isParsing 
                        ? `Extracting text locally in the browser`
                        : `Local Qwen LLM is extracting Names, Emails & Skills — this can take 1-5 min on CPU`}
                    </p>
                    {isExtracting && (
                      <p className="text-[10px] text-indigo-400 mt-1 font-mono">
                        {`⏱ Elapsed: ${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`}
                        {elapsedSeconds >= 60 && ' — still running, please wait...'}
                      </p>
                    )}
                  </div>
                </div>
                {isParsing && (
                  <div className="text-right">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                      {progress}%
                    </span>
                  </div>
                )}
              </div>

              {isParsing && (
                <div className="w-full bg-surface-2 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-violet-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5 text-xs text-text-secondary font-medium">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-indigo-400" />
                  <span>Selected {fileCount} file(s):</span>
                </div>
                <div className="pl-6 max-h-[100px] overflow-y-auto scrollbar-thin text-[11px] text-text-muted space-y-1">
                  {files.map((f, idx) => (
                    <div key={idx} className="truncate">
                      - {f.name} ({Math.round(f.size / 1024)} KB)
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-2xl border border-rose-200 bg-rose-500/5 p-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={20} className="text-rose-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-rose-700">Error</p>
                  <p className="text-xs text-rose-600 mt-1.5 leading-relaxed">{error}</p>
                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    {extractedText && (
                      <button
                        onClick={retryExtraction}
                        className="px-4 py-2 rounded-xl text-xs font-medium bg-indigo-500/10 border border-indigo-300 text-indigo-600 hover:bg-indigo-500/20 transition-colors"
                      >
                        ↻ Retry Extraction
                      </button>
                    )}
                    <button
                      onClick={resetAll}
                      className="px-4 py-2 rounded-xl text-xs font-medium border border-rose-200 text-rose-600 hover:bg-rose-500/10 transition-colors"
                    >
                      Upload New Files
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Output Results */}
        <AnimatePresence>
          {fileCount > 0 && !isParsing && !isExtracting && resultMarkdown && (
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
                      Successfully parsed candidate information from {fileCount} resume(s)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={resetAll}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-all"
                  >
                    Upload New
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-all"
                  >
                    <Copy size={13} />
                    Copy MD
                  </button>
                  <button
                    onClick={downloadCsv}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
                  >
                    <Download size={13} />
                    Download CSV
                  </button>
                </div>
              </div>

              {/* Parsed Output Table */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-text-primary">Candidate Details</h2>
                {tableData ? (
                  <div className="w-full overflow-x-auto rounded-xl border border-border bg-surface-1 shadow-card">
                    <table className="w-full min-w-[500px] text-xs">
                      <thead>
                        <tr className="bg-surface-2/50 border-b border-border">
                          {tableData.headers.map((h, i) => (
                            <th
                              key={i}
                              className="px-4 py-3 text-left font-semibold text-text-secondary text-[10px] tracking-wide uppercase"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.rows.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className={cn(
                              'transition-colors hover:bg-surface-2/30',
                              rIdx % 2 === 0 ? 'bg-transparent' : 'bg-surface-2/10'
                            )}
                          >
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                className="px-4 py-3 border-b border-border/50 font-medium text-text-primary"
                              >
                                {cIdx === 1 && cell !== 'NOT_FOUND' ? (
                                  <a
                                    href={`mailto:${cell}`}
                                    className="text-indigo-500 hover:underline inline-flex items-center gap-1 font-mono"
                                  >
                                    {cell}
                                  </a>
                                ) : (
                                  cell
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <pre className="p-4 rounded-xl border border-border bg-surface-2 text-xs text-text-primary font-mono overflow-auto max-h-[300px]">
                    {resultMarkdown}
                  </pre>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text Preview */}
        <AnimatePresence>
          {extractedText && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-border rounded-2xl overflow-hidden bg-surface-1"
            >
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-surface-2/30 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <FileText size={15} className="text-text-secondary" />
                  <span className="text-xs font-semibold text-text-primary">
                    Extracted Resume Text Preview
                  </span>
                </div>
                <span className="text-[10px] text-text-secondary flex items-center gap-1">
                  {showPreview ? (
                    <>
                      <EyeOff size={12} /> Hide Text
                    </>
                  ) : (
                    <>
                      <Eye size={12} /> Show Text ({Math.round(extractedText.length / 1024)} KB)
                    </>
                  )}
                </span>
              </button>

              <AnimatePresence>
                {showPreview && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden border-t border-border"
                  >
                    <div className="p-5 bg-surface-2/40">
                      <pre className="text-[11px] text-text-secondary font-mono leading-relaxed max-h-[300px] overflow-y-auto whitespace-pre-wrap select-text scrollbar-thin">
                        {extractedText}
                      </pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Information box */}
        {fileCount === 0 && (
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-xs font-bold text-text-primary mb-3">How it works</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  step: '1',
                  title: 'Upload PDF Resumes',
                  desc: 'Select one or more PDF resume files to extract.',
                  gradient: 'from-indigo-500 to-violet-600'
                },
                {
                  step: '2',
                  title: 'Parse Text in Browser',
                  desc: 'PDF.js reads and extracts text page-by-page from all files.',
                  gradient: 'from-violet-500 to-purple-600'
                },
                {
                  step: '3',
                  title: 'Extract with Ollama',
                  desc: 'FastAPI routes to local Qwen to structure Names, Emails & Skills.',
                  gradient: 'from-emerald-500 to-teal-600'
                }
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm',
                      item.gradient
                    )}
                  >
                    {item.step}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-primary">{item.title}</p>
                    <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
                      {item.desc}
                    </p>
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
