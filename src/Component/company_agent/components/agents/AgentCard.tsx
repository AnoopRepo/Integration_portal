import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Tag, Settings2, Zap, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Agent } from '../../types';

interface AgentCardProps {
  agent: Agent;
  featured?: boolean;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, featured = false }) => {
  const isActive = agent.status === 'active';

  if (featured) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative rounded-2xl p-6 border border-indigo-500/20 overflow-hidden bg-surface-1"
        style={{
          boxShadow: '0 4px 24px rgba(99,102,241,0.04)',
        }}
      >
        {/* Subtle gradient overlay */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.04), rgba(14,165,233,0.02))',
          }}
        />

        {/* Floating orb */}
        <div
          className="absolute -right-16 -top-16 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.06), transparent 70%)' }}
        />

        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                }}
              >
                Q
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-text-primary">{agent.name}</h2>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-mono">
                    v{agent.version}
                  </span>
                </div>
                <p className="text-sm text-text-secondary mt-0.5">{agent.provider}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-emerald-500"
              />
              <span className="text-xs font-semibold text-emerald-500">Active</span>
            </div>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed mb-5">{agent.description}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-5">
            {agent.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
              >
                <Tag size={9} />
                {tag}
              </span>
            ))}
          </div>

          {/* Metrics */}
          {agent.metrics && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Uptime', value: agent.metrics.uptime, icon: CheckCircle2, color: 'text-emerald-500' },
                { label: 'Queries', value: agent.metrics.totalQueries.toLocaleString(), icon: Zap, color: 'text-cyan-500' },
                { label: 'Avg Speed', value: agent.metrics.avgResponseTime, icon: Clock, color: 'text-indigo-500' },
              ].map((m) => {
                const MIcon = m.icon;
                return (
                  <div
                    key={m.label}
                    className="bg-surface-2 rounded-xl p-3 border border-border"
                  >
                    <MIcon size={14} className={cn('mb-1.5', m.color)} />
                    <p className="text-sm font-bold text-text-primary">{m.value}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">{m.label}</p>
                  </div>
                );
              })}
            </div>
          )}

          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              boxShadow: '0 4px 16px rgba(99,102,241,0.25)',
            }}
          >
            <Settings2 size={15} />
            Configure Agent
          </button>
        </div>
      </motion.div>
    );
  }

  // Coming soon card
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative rounded-2xl p-5 border border-border overflow-hidden group bg-surface-1 hover:border-text-muted/30 hover:shadow-sm transition-all duration-200"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold text-white opacity-80"
          style={{ background: `linear-gradient(135deg, ${agent.color}90, ${agent.color}50)` }}
        >
          {agent.name[0]}
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 flex items-center gap-1">
          <Clock size={8} />
          Coming Soon
        </span>
      </div>

      <h3 className="font-semibold text-text-primary opacity-75 mb-0.5">
        {agent.name}{' '}
        <span className="text-[11px] font-normal text-text-muted">{agent.version}</span>
      </h3>
      <p className="text-[11px] text-text-muted mb-1">{agent.provider}</p>
      <p className="text-xs text-text-secondary leading-relaxed mb-4 line-clamp-2">
        {agent.description}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {agent.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 text-text-secondary border border-border"
          >
            {tag}
          </span>
        ))}
      </div>

      <button
        disabled
        className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-border text-xs font-semibold text-text-muted cursor-not-allowed"
      >
        <Lock size={11} />
        Notify Me
      </button>
    </motion.div>
  );
};
