import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import { PromptInput } from './PromptInput';
import { WelcomeScreen } from './WelcomeScreen';
import type { Conversation } from '../../types';

interface ChatWindowProps {
  conversation: Conversation | null;
  isTyping: boolean;
  onSend: (message: string, documentContext?: string) => void;
}

// ─── Typing Indicator ───────────────────────────────────────────────────────

const TypingIndicator: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -4 }}
    transition={{ duration: 0.2 }}
    className="flex items-start gap-3"
  >
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-md mt-5"
      style={{ background: 'linear-gradient(135deg,#6366f1,#06b6d4)' }}
    >
      ✦
    </div>
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
        Company Agent
      </p>
      <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-surface-1 border border-border shadow-sm flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ y: ['0px', '-5px', '0px'], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.75, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
            className="w-2 h-2 rounded-full bg-indigo-400"
          />
        ))}
        <span className="text-xs text-text-muted ml-1.5">Thinking…</span>
      </div>
    </div>
  </motion.div>
);

// ─── Chat Window ─────────────────────────────────────────────────────────────

export const ChatWindow: React.FC<ChatWindowProps> = ({ conversation, isTyping, onSend }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
    return () => clearTimeout(t);
  }, [conversation?.messages.length, isTyping]);

  return (
    /*
      Use absolute positioning within the parent (which must be position:relative
      or have overflow:hidden). This guarantees the input is always at the bottom
      and the messages scroll area takes all remaining space — regardless of
      whatever flex/grid context the parent uses.
    */
    <div className="absolute inset-0 flex flex-col">

      {/* ── Scrollable area (messages or welcome screen) ── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
        {!conversation ? (
          <WelcomeScreen onPromptSelect={onSend} />
        ) : (
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-5">
            <AnimatePresence initial={false}>
              {conversation.messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <MessageBubble message={message} />
                </motion.div>
              ))}
            </AnimatePresence>

            <AnimatePresence>{isTyping && <TypingIndicator />}</AnimatePresence>

            {/* Scroll anchor */}
            <div ref={bottomRef} className="h-1" />
          </div>
        )}
      </div>

      {/* ── Input — always pinned at bottom ── */}
      <div className="flex-shrink-0">
        <PromptInput onSend={onSend} disabled={isTyping} />
      </div>
    </div>
  );
};
