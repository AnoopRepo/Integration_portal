import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Paperclip,
  Image as ImageIcon,
  Mic,
  Send,
  X,
  Loader2,
  MicOff,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { parseDocumentText } from '../../lib/documentReader';

interface PromptInputProps {
  onSend: (message: string, documentContext?: string) => void;
  disabled?: boolean;
}

interface AttachmentPreview {
  id: string;
  name: string;
  size: string;
  content?: string;
  loading?: boolean;
  error?: boolean;
}

// Safely resolve SpeechRecognition for TypeScript
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const PromptInput: React.FC<PromptInputProps> = ({
  onSend,
  disabled = false,
}) => {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const MAX_CHARS = 4000;

  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = '44px';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= MAX_CHARS) {
      setValue(e.target.value);
      adjustHeight();
    }
  };

  const processFiles = useCallback(async (files: File[]) => {
    const freshAttachments: AttachmentPreview[] = files.map((f) => ({
      id: `att-${Date.now()}-${f.name}`,
      name: f.name,
      size: f.size < 1024 * 1024
        ? `${(f.size / 1024).toFixed(1)} KB`
        : `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
      loading: true,
    }));

    setAttachments((prev) => [...prev, ...freshAttachments].slice(0, 5));

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewId = freshAttachments[i].id;

      try {
        const textContent = await parseDocumentText(file);
        setAttachments((prev) =>
          prev.map((att) =>
            att.id === previewId
              ? { ...att, content: textContent, loading: false }
              : att,
          ),
        );
      } catch (err: any) {
        console.error('File parsing error:', err);
        setAttachments((prev) =>
          prev.map((att) =>
            att.id === previewId
              ? { ...att, loading: false, error: true }
              : att,
          ),
        );
      }
    }
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();

    // Prevent sending while files are still extracting
    const anyLoading = attachments.some((a) => a.loading);
    if (anyLoading) return;
    if (!trimmed && attachments.length === 0) return;
    if (disabled) return;

    let displayMessage = trimmed;
    let extractedContext = '';

    if (attachments.length > 0) {
      extractedContext = attachments
        .filter((a) => a.content && !a.error)
        .map((a) => `[Document Context: ${a.name}]\n---\n${a.content}\n---`)
        .join('\n\n');

      const attachmentsHeader = attachments
        .map((a) => `📎 *[${a.name}]*`)
        .join('\n');

      displayMessage = trimmed
        ? `${trimmed}\n\n${attachmentsHeader}`
        : attachmentsHeader;
    }

    onSend(displayMessage, extractedContext || undefined);
    setValue('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }
  }, [value, attachments, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) processFiles(files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newAttachments: AttachmentPreview[] = files.map((f) => ({
        id: `att-img-${Date.now()}-${f.name}`,
        name: f.name,
        size: f.size < 1024 * 1024
          ? `${(f.size / 1024).toFixed(1)} KB`
          : `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
      }));
      setAttachments((prev) => [...prev, ...newAttachments].slice(0, 5));
      e.target.value = '';
    }
  };

  const startSpeechRecognition = () => {
    if (!SpeechRecognition) {
      alert(
        'Speech Recognition is not supported in this browser. Please try Google Chrome or Microsoft Edge.',
      );
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => setIsListening(true);

    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setValue((prev) => {
        const space = prev && !prev.endsWith(' ') ? ' ' : '';
        return prev + space + transcript;
      });
      adjustHeight();
    };

    rec.onerror = (err: any) => {
      console.error('Speech recognition error:', err);
      setIsListening(false);
    };

    rec.onend = () => setIsListening(false);

    recognitionRef.current = rec;
    rec.start();
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const charPercent = (value.length / MAX_CHARS) * 100;
  const canSend =
    (value.trim().length > 0 || attachments.length > 0) &&
    !attachments.some((a) => a.loading) &&
    !disabled;

  return (
    <div className="flex-shrink-0 bg-surface-1/95 backdrop-blur-xl border-t border-border">
      <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-3">

        {/* Hidden Inputs */}
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept=".pdf,.docx,.txt,.md,.csv,.json,.js,.jsx,.ts,.tsx,.py,.html,.css"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          type="file"
          ref={imageInputRef}
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageChange}
        />

        {/* Attachment Strip */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="flex flex-wrap gap-2 overflow-hidden"
            >
              {attachments.map((att) => (
                <motion.div
                  key={att.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border transition-colors',
                    att.error
                      ? 'border-rose-400/50 text-rose-500 bg-rose-500/10'
                      : 'border-border bg-surface-2 text-text-secondary',
                  )}
                >
                  {att.loading ? (
                    <Loader2 size={11} className="text-indigo-400 animate-spin flex-shrink-0" />
                  ) : att.error ? (
                    <span className="text-rose-400 flex-shrink-0">✕</span>
                  ) : (
                    <Paperclip size={11} className="text-indigo-400 flex-shrink-0" />
                  )}
                  <span className="max-w-[110px] truncate font-medium">{att.name}</span>
                  <span className="text-text-muted text-[10px]">{att.size}</span>
                  {att.loading && (
                    <span className="text-[9px] text-indigo-400 animate-pulse">extracting…</span>
                  )}
                  {att.error && (
                    <span className="text-[9px] text-rose-400 font-medium">unsupported</span>
                  )}
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="text-text-muted hover:text-rose-400 transition-colors ml-0.5 flex-shrink-0"
                  >
                    <X size={11} />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Input Container */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative flex flex-col rounded-2xl border transition-all duration-200',
            isDragOver
              ? 'border-dashed border-indigo-400 bg-indigo-500/8 shadow-lg shadow-indigo-500/10'
              : 'border-border bg-surface-1',
            'focus-within:border-indigo-400/60 focus-within:ring-2 focus-within:ring-indigo-400/12 focus-within:shadow-lg focus-within:shadow-indigo-500/5',
          )}
        >
          {/* Drag Overlay */}
          <AnimatePresence>
            {isDragOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center bg-indigo-500/8 z-10 pointer-events-none"
              >
                <Paperclip size={20} className="text-indigo-400 mb-1.5" />
                <p className="text-indigo-500 text-sm font-medium">Drop files here</p>
                <p className="text-indigo-400/70 text-[11px] mt-0.5">PDF, DOCX, TXT, and more</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-2 px-2 py-2">
            {/* Left Toolbar */}
            <div className="flex items-center gap-0.5 pb-0.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Attach file (PDF, DOCX, TXT…)"
                disabled={disabled}
                className="p-2 rounded-xl text-text-muted hover:text-indigo-500 hover:bg-indigo-500/10 transition-all duration-150 disabled:opacity-40"
              >
                <Paperclip size={16} />
              </button>

              <button
                onClick={() => imageInputRef.current?.click()}
                title="Upload image"
                disabled={disabled}
                className="p-2 rounded-xl text-text-muted hover:text-indigo-500 hover:bg-indigo-500/10 transition-all duration-150 disabled:opacity-40"
              >
                <ImageIcon size={16} />
              </button>

              <button
                onClick={startSpeechRecognition}
                title={isListening ? 'Recording — click to stop' : 'Voice input'}
                className={cn(
                  'p-2 rounded-xl transition-all duration-150 relative',
                  isListening
                    ? 'text-rose-400 bg-rose-500/12 hover:bg-rose-500/20'
                    : 'text-text-muted hover:text-indigo-500 hover:bg-indigo-500/10',
                )}
              >
                {isListening ? (
                  <MicOff size={16} className="animate-pulse" />
                ) : (
                  <Mic size={16} />
                )}
                {isListening && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                  </span>
                )}
              </button>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={
                disabled
                  ? 'Company Agent is thinking…'
                  : 'Message Company Agent…'
              }
              rows={1}
              disabled={disabled}
              className={cn(
                'flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-muted',
                'focus:outline-none leading-relaxed py-2 min-h-[44px] max-h-[200px]',
                'scrollbar-thin disabled:cursor-not-allowed',
              )}
              style={{ height: '44px' }}
            />

            {/* Right: Character count + Send */}
            <div className="flex items-center gap-2 pb-0.5">
              <AnimatePresence>
                {value.length > 0 && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className={cn(
                      'text-[10px] font-mono tabular-nums',
                      charPercent > 90 ? 'text-rose-400' : 'text-text-muted',
                    )}
                  >
                    {value.length}/{MAX_CHARS}
                  </motion.span>
                )}
              </AnimatePresence>

              <motion.button
                whileHover={canSend ? { scale: 1.06 } : {}}
                whileTap={canSend ? { scale: 0.94 } : {}}
                onClick={handleSend}
                disabled={!canSend}
                title="Send message (Enter)"
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0',
                  canSend
                    ? 'text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40'
                    : 'bg-surface-2 text-text-muted cursor-not-allowed border border-border',
                )}
                style={
                  canSend
                    ? { background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }
                    : {}
                }
              >
                {attachments.some((a) => a.loading) ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}
              </motion.button>
            </div>
          </div>

          {/* Character progress bar */}
          <AnimatePresence>
            {value.length > MAX_CHARS * 0.7 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-0.5 mx-2 mb-2 rounded-full bg-surface-2 overflow-hidden"
              >
                <motion.div
                  animate={{ width: `${charPercent}%` }}
                  transition={{ ease: 'easeOut' }}
                  className={cn(
                    'h-full rounded-full transition-colors',
                    charPercent > 95
                      ? 'bg-rose-500'
                      : charPercent > 85
                      ? 'bg-amber-500'
                      : 'bg-gradient-to-r from-indigo-500 to-cyan-500',
                  )}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Hint text */}
        <p className="text-center text-[10px] text-text-muted mt-2 select-none">
          <kbd className="font-mono bg-surface-2 border border-border px-1 py-0.5 rounded text-[9px]">
            Enter
          </kbd>{' '}
          to send ·{' '}
          <kbd className="font-mono bg-surface-2 border border-border px-1 py-0.5 rounded text-[9px]">
            Shift+Enter
          </kbd>{' '}
          for new line · Drag &amp; drop files
        </p>
      </div>
    </div>
  );
};
