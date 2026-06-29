import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Sparkles } from 'lucide-react';
import { AgentCard } from '../components/agents/AgentCard';
import { mockAgents } from '../data/mockAgents';

export const AgentsPage: React.FC = () => {
  // Safe access — no non-null assertion crash
  const activeAgent = mockAgents.find((a) => a.status === 'active') ?? null;
  const comingSoonAgents = mockAgents.filter((a) => a.status === 'coming_soon');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 sm:p-6 space-y-8 min-h-full"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent"
            style={{ letterSpacing: '-0.02em' }}
          >
            AI Agents
          </h1>
          <p className="text-sm text-text-secondary mt-1">Manage your agent fleet</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
          <Bot size={14} className="text-indigo-500" />
          <span className="text-xs text-indigo-500 font-semibold">{activeAgent ? '1 Active' : '0 Active'}</span>
        </div>
      </div>

      {/* Active Agent Section */}
      {activeAgent && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} className="text-indigo-500" />
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              Active Agent
            </h2>
          </div>
          <AgentCard agent={activeAgent} featured />
        </div>
      )}

      {/* Coming Soon Grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Coming Soon
          </h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-semibold">
            {comingSoonAgents.length} Agents
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {comingSoonAgents.map((agent, i) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
            >
              <AgentCard agent={agent} />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
