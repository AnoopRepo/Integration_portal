import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ThumbsUp,
  ThumbsDown,
  Copy,
  RefreshCw,
  Share2,
  Check,
  Sparkles,
  User,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Message } from '../../types';
import { stripThinkBlocks } from '../../lib/ollama';

interface MessageBubbleProps {
  message: Message;
}

// ─── Markdown Renderer ─────────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <CodeBlock key={`code-${i}`} code={codeLines.join('\n')} lang={lang} />,
      );
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={i} className="text-sm font-bold text-text-primary mt-4 mb-1.5 tracking-tight">
          {renderInline(line.slice(3))}
        </h3>,
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h2 key={i} className="text-base font-bold text-text-primary mt-4 mb-2 tracking-tight">
          {renderInline(line.slice(2))}
        </h2>,
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h4 key={i} className="text-xs font-bold text-text-primary mt-3 mb-1 uppercase tracking-wider opacity-80">
          {renderInline(line.slice(4))}
        </h4>,
      );
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={i}
          className="border-l-2 border-indigo-400 pl-3 my-2 text-text-muted text-sm italic bg-indigo-500/5 py-1.5 rounded-r-lg"
        >
          {renderInline(line.slice(2))}
        </blockquote>,
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [line.slice(2)];
      while (
        i + 1 < lines.length &&
        (lines[i + 1].startsWith('- ') || lines[i + 1].startsWith('* '))
      ) {
        i++;
        items.push(lines[i].slice(2));
      }
      elements.push(
        <ul key={i} className="space-y-1 my-2 text-text-secondary text-sm pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              <span className="leading-relaxed">{renderInline(item)}</span>
            </li>
          ))}
        </ul>,
      );
    } else if (line.match(/^\d+\. /)) {
      const items: string[] = [line.replace(/^\d+\. /, '')];
      while (i + 1 < lines.length && lines[i + 1].match(/^\d+\. /)) {
        i++;
        items.push(lines[i].replace(/^\d+\. /, ''));
      }
      elements.push(
        <ol key={i} className="space-y-1 my-2 text-text-secondary text-sm pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-500 text-[10px] font-bold flex items-center justify-center mt-0.5">
                {j + 1}
              </span>
              <span className="leading-relaxed">{renderInline(item)}</span>
            </li>
          ))}
        </ol>,
      );
    } else if (line.startsWith('|')) {
      const tableLines: string[] = [line];
      while (i + 1 < lines.length && lines[i + 1].startsWith('|')) {
        i++;
        tableLines.push(lines[i]);
      }
      const rows = tableLines.filter((l) => !l.match(/^\|[-| ]+\|$/));
      elements.push(
        <div key={i} className="overflow-x-auto my-3 rounded-xl border border-border">
          <table className="text-xs w-full">
            {rows.map((row, ri) => {
              const cells = row.split('|').filter((c) => c.trim());
              return (
                <tr
                  key={ri}
                  className={cn(
                    'border-b border-border last:border-0',
                    ri === 0 ? 'bg-surface-2' : 'hover:bg-surface-2/50 transition-colors',
                  )}
                >
                  {cells.map((cell, ci) => (
                    <td
                      key={ci}
                      className={cn(
                        'px-3 py-2',
                        ri === 0 ? 'font-semibold text-text-primary' : 'text-text-secondary',
                      )}
                    >
                      {renderInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </table>
        </div>,
      );
    } else if (line.startsWith('---') || line.startsWith('***')) {
      elements.push(<hr key={i} className="border-border my-3" />);
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-1.5" />);
    } else {
      elements.push(
        <p key={i} className="text-sm text-text-secondary leading-relaxed">
          {renderInline(line)}
        </p>,
      );
    }
    i++;
  }
  return elements;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(
    /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|✅|⚠️|✓|❌)/g,
  );
  return parts.map((part, i) => {
    if (part.startsWith('[') && part.endsWith(')') && part.includes('](')) {
      const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        const [, linkText, url] = match;
        return (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 hover:text-indigo-400 hover:underline font-medium transition-colors"
          >
            {linkText}
          </a>
        );
      }
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={i} className="italic text-text-secondary">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded-md bg-indigo-500/12 text-indigo-400 text-[11px] font-mono border border-indigo-500/20"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part === '✅') return <span key={i} className="text-emerald-400">{part}</span>;
    if (part === '⚠️') return <span key={i} className="text-amber-400">{part}</span>;
    if (part === '❌') return <span key={i} className="text-rose-400">{part}</span>;
    if (part === '✓') return <span key={i} className="text-emerald-400 font-bold">{part}</span>;
    return part;
  });
}

// ─── Code Block ────────────────────────────────────────────────────────────

const CodeBlock: React.FC<{ code: string; lang: string }> = ({ code, lang }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-700/80 shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
          </div>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider ml-1">
            {lang || 'code'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-slate-700"
        >
          {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto bg-slate-950">
        <code className="text-xs font-mono text-slate-300 leading-relaxed">{code}</code>
      </pre>
    </div>
  );
};

// ─── Message Bubble ─────────────────────────────────────────────────────────

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── User Bubble ── */
  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-end gap-3 justify-end"
      >
        <div className="flex flex-col items-end max-w-[78%]">
          <div
            className="px-4 py-3 rounded-2xl rounded-tr-sm text-white text-sm leading-relaxed shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
              boxShadow: '0 4px 20px rgba(99,102,241,0.25)',
            }}
          >
            {message.content}
          </div>
          <span className="text-[10px] text-text-muted mt-1 mr-0.5">{message.timestamp}</span>
        </div>

        {/* User avatar */}
        <div className="flex-shrink-0 mb-4">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-md"
            style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}
          >
            <User size={14} />
          </div>
        </div>
      </motion.div>
    );
  }

  /* ── Assistant Bubble ── */
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-start gap-3 group"
    >
      {/* AI Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            boxShadow: '0 2px 12px rgba(99,102,241,0.25)',
          }}
        >
          <Sparkles size={14} className="text-white" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {/* Sender label */}
        <p className="text-[10px] font-semibold text-indigo-500 mb-1.5 uppercase tracking-wider">
          Company Agent
        </p>

        {/* Message content card */}
        <div className="max-w-[88%] px-4 py-3.5 rounded-2xl rounded-tl-sm bg-surface-1 border border-border shadow-sm transition-colors duration-200">
          <div className="space-y-0.5">{renderMarkdown(stripThinkBlocks(message.content))}</div>

          {/* Token count */}
          {!!message.tokens && message.tokens > 0 && (
            <div className="mt-3 pt-2.5 border-t border-border flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/60" />
              <span className="text-[10px] text-text-muted font-mono">
                {message.tokens.toLocaleString()} tokens
              </span>
            </div>
          )}
        </div>

        {/* Action buttons — visible on hover */}
        <div className="flex items-center gap-0.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <span className="text-[10px] text-text-muted mr-2">{message.timestamp}</span>

          {/* Like */}
          <button
            onClick={() => setLiked(liked === true ? null : true)}
            title="Helpful"
            className={cn(
              'p-1.5 rounded-lg transition-all duration-150',
              liked === true
                ? 'text-emerald-500 bg-emerald-500/12 hover:bg-emerald-500/20'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-2',
            )}
          >
            <ThumbsUp size={12} />
          </button>

          {/* Dislike */}
          <button
            onClick={() => setLiked(liked === false ? null : false)}
            title="Not helpful"
            className={cn(
              'p-1.5 rounded-lg transition-all duration-150',
              liked === false
                ? 'text-rose-500 bg-rose-500/12 hover:bg-rose-500/20'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-2',
            )}
          >
            <ThumbsDown size={12} />
          </button>

          {/* Copy */}
          <button
            onClick={handleCopy}
            title="Copy message"
            className={cn(
              'p-1.5 rounded-lg transition-all duration-150',
              copied
                ? 'text-indigo-500 bg-indigo-500/12'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-2',
            )}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>

          {/* Regenerate */}
          <button
            title="Regenerate"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-all duration-150"
          >
            <RefreshCw size={12} />
          </button>

          {/* Share */}
          <button
            title="Share"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-all duration-150"
          >
            <Share2 size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
