import React from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Code2,
  Lightbulb,
  BarChart3,
  Sparkles,
  ArrowRight,
  Users,
  Calendar,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface WelcomeScreenProps {
  onPromptSelect: (prompt: string, documentContext?: string) => void;
}

const suggestedPrompts = [
  {
    icon: FileText,
    title: 'Summarize a document',
    subtitle: 'Extract key insights and main points',
    prompt: 'Please summarize this document and highlight the key takeaways.',
    gradient: 'from-violet-500/15 to-indigo-500/10',
    iconGradient: 'from-violet-500 to-indigo-600',
    border: 'hover:border-violet-400/40',
    glow: 'hover:shadow-violet-500/10',
  },
  {
    icon: Code2,
    title: 'Write a Python script',
    subtitle: 'Generate clean, documented code',
    prompt: 'Write a Python script that processes CSV files and generates analytics.',
    gradient: 'from-cyan-500/15 to-blue-500/10',
    iconGradient: 'from-cyan-500 to-blue-600',
    border: 'hover:border-cyan-400/40',
    glow: 'hover:shadow-cyan-500/10',
  },
  {
    icon: Users,
    title: 'HR & Employee Query',
    subtitle: 'Ask about policies, leave, attendance',
    prompt: 'What is the company leave policy and how many leaves do I have remaining?',
    gradient: 'from-emerald-500/15 to-teal-500/10',
    iconGradient: 'from-emerald-500 to-teal-600',
    border: 'hover:border-emerald-400/40',
    glow: 'hover:shadow-emerald-500/10',
  },
  {
    icon: BarChart3,
    title: 'Generate a report',
    subtitle: 'Create structured business reports',
    prompt: 'Generate a Q3 performance report with KPIs, trends, and recommendations.',
    gradient: 'from-amber-500/15 to-orange-500/10',
    iconGradient: 'from-amber-500 to-orange-600',
    border: 'hover:border-amber-400/40',
    glow: 'hover:shadow-amber-500/10',
  },
  {
    icon: Lightbulb,
    title: 'Explain a concept',
    subtitle: 'Break down complex topics simply',
    prompt: 'Explain how transformer models work in AI, step by step.',
    gradient: 'from-rose-500/15 to-pink-500/10',
    iconGradient: 'from-rose-500 to-pink-600',
    border: 'hover:border-rose-400/40',
    glow: 'hover:shadow-rose-500/10',
  },
  {
    icon: Calendar,
    title: 'Schedule & Planning',
    subtitle: 'Organize tasks and meetings',
    prompt: 'Help me plan my week and prioritize tasks for maximum productivity.',
    gradient: 'from-sky-500/15 to-indigo-500/10',
    iconGradient: 'from-sky-500 to-indigo-600',
    border: 'hover:border-sky-400/40',
    glow: 'hover:shadow-sky-500/10',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onPromptSelect }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 sm:px-6 py-10 max-w-3xl mx-auto relative overflow-hidden">

      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[320px] rounded-full blur-[80px] opacity-30"
          style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.35) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-[350px] h-[250px] rounded-full blur-[70px] opacity-20"
          style={{ background: 'radial-gradient(ellipse, rgba(14,165,233,0.4) 0%, transparent 70%)' }}
        />
      </div>

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-10"
      >
        {/* Logo badge */}
        <div className="flex items-center justify-center mb-6">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
              <Sparkles size={26} className="text-white" />
            </div>
            {/* Pulsing ring */}
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-2xl bg-indigo-400/40"
            />
          </motion.div>
        </div>

        <h1
          className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight"
          style={{ letterSpacing: '-0.025em' }}
        >
          <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 bg-clip-text text-transparent">
            What can I help
          </span>
          <br />
          <span className="text-text-primary">you with today?</span>
        </h1>

        <p className="text-text-muted text-sm max-w-md mx-auto leading-relaxed">
          Powered by{' '}
          <span className="text-indigo-500 font-semibold">Company Agent</span>
          {' · '}
          Ask me anything about HR, documents, analytics, or general knowledge.
        </p>
      </motion.div>

      {/* Prompt Cards Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full mb-8"
      >
        {suggestedPrompts.map((item) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.title}
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onPromptSelect(item.prompt)}
              className={cn(
                'group text-left p-4 rounded-2xl border border-border bg-surface-1',
                'transition-all duration-250 relative overflow-hidden',
                'hover:shadow-xl',
                item.border,
                item.glow,
              )}
            >
              {/* Card gradient background on hover */}
              <div
                className={cn(
                  'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-250 rounded-2xl',
                  item.gradient,
                )}
              />

              <div className="relative z-10">
                {/* Icon */}
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center mb-3 shadow-md',
                    'bg-gradient-to-br',
                    item.iconGradient,
                  )}
                >
                  <Icon size={16} className="text-white" />
                </div>

                <p className="text-sm font-semibold text-text-primary mb-1 group-hover:text-indigo-600 transition-colors duration-200">
                  {item.title}
                </p>
                <p className="text-xs text-text-muted leading-relaxed">{item.subtitle}</p>

                {/* Arrow hint */}
                <div className="flex items-center gap-1 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <span className="text-[10px] text-indigo-500 font-medium">Try this</span>
                  <ArrowRight size={10} className="text-indigo-500" />
                </div>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Footer hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center text-[11px] text-text-muted"
      >
        Click a suggestion or type your own message below · Supports file attachments & voice
      </motion.p>
    </div>
  );
};
