import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  Activity,
  Cpu,
  Zap,
  MemoryStick,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { LiveActivity } from '../../types';

const initialActivities: LiveActivity[] = [
  {
    id: 'live-1',
    timestamp: '14:52:01',
    status: 'completed',
    description: 'Response completed',
    detail: '"Explain neural networks..."',
  },
  {
    id: 'live-2',
    timestamp: '14:51:34',
    status: 'processing',
    description: 'Processing request',
    detail: '"Write a React component..."',
  },
  {
    id: 'live-3',
    timestamp: '14:50:22',
    status: 'generating',
    description: 'Generating response',
    detail: 'Streaming tokens...',
  },
  {
    id: 'live-4',
    timestamp: '14:49:18',
    status: 'completed',
    description: 'Response completed',
    detail: '"Summarize this PDF..."',
  },
  {
    id: 'live-5',
    timestamp: '14:48:55',
    status: 'completed',
    description: 'Response completed',
    detail: '"Translate to Spanish..."',
  },
];

const newActivityPool: Omit<LiveActivity, 'id' | 'timestamp'>[] = [
  { status: 'processing', description: 'Processing request', detail: '"Analyze this dataset..."' },
  { status: 'generating', description: 'Generating response', detail: 'Streaming tokens...' },
  { status: 'completed', description: 'Response completed', detail: '"Write SQL query..."' },
  { status: 'completed', description: 'Response completed', detail: '"Explain this error..."' },
  { status: 'processing', description: 'Processing request', detail: '"Draft email template..."' },
];

const MetricBar: React.FC<{
  label: string;
  value: number;
  displayValue: string;
  color?: string;
  warning?: boolean;
}> = ({ label, value, displayValue, color = 'violet', warning = false }) => {
  const colorMap: Record<string, string> = {
    violet: 'from-violet-500 to-indigo-500',
    cyan: 'from-cyan-500 to-blue-500',
    emerald: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-500 to-orange-500',
  };
  const barColor = warning && value > 80 ? colorMap.amber : (colorMap[color] ?? colorMap.violet);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-500">{label}</span>
        <span className={cn('text-[11px] font-semibold', warning && value > 80 ? 'text-amber-400' : 'text-slate-200')}>
          {displayValue}
        </span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value, 100)}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={cn('h-full rounded-full bg-gradient-to-r', barColor)}
        />
      </div>
    </div>
  );
};

export const QwenMonitorPanel: React.FC = () => {
  const [activities, setActivities] = useState<LiveActivity[]>(initialActivities);
  const activityRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef(6);

  useEffect(() => {
    const interval = setInterval(() => {
      const pool = newActivityPool[Math.floor(Math.random() * newActivityPool.length)];
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      const newActivity: LiveActivity = {
        ...pool,
        id: `live-${counterRef.current++}`,
        timestamp: timeStr,
      };
      setActivities((prev) => [newActivity, ...prev].slice(0, 12));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    completed: {
      icon: CheckCircle2,
      color: 'text-emerald-400',
      border: 'border-emerald-500/40',
      bg: 'bg-emerald-500/10',
    },
    processing: {
      icon: Loader2,
      color: 'text-blue-400',
      border: 'border-blue-500/40',
      bg: 'bg-blue-500/10',
    },
    generating: {
      icon: RefreshCw,
      color: 'text-violet-400',
      border: 'border-violet-500/40',
      bg: 'bg-violet-500/10',
    },
  };

  return (
    <div
      className="w-[320px] flex flex-col h-full border-l border-white/10 overflow-y-auto scrollbar-thin"
      style={{
        background: 'rgba(22, 22, 42, 0.7)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-violet-400" />
          <span className="font-semibold text-sm text-slate-200">Agent Monitor</span>
        </div>
      </div>

      {/* Agent Status Card */}
      <div className="p-4 border-b border-white/10 space-y-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-100">Qwen 2.5</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-violet-500/20 text-violet-300 font-medium border border-violet-500/20">
                72B
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Alibaba Cloud</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
            />
            <span className="text-[10px] font-semibold text-emerald-400">Online</span>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="space-y-2.5">
          <MetricBar label="Confidence" value={94.2} displayValue="94.2%" color="cyan" />
          <MetricBar label="Response Time" value={62} displayValue="1.24s" color="violet" />
          <MetricBar label="Tokens Used" value={78} displayValue="12,847" color="violet" />
          <MetricBar label="Memory" value={68} displayValue="68%" warning color="amber" />
          <MetricBar label="Uptime" value={99.97} displayValue="99.97%" color="emerald" />
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Requests', value: '1,204', icon: Activity },
            { label: 'Avg Speed', value: '1.24s', icon: Zap },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white/5 rounded-xl p-3 border border-white/5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} className="text-slate-500" />
                  <span className="text-[10px] text-slate-500">{stat.label}</span>
                </div>
                <span className="text-sm font-semibold text-slate-200">{stat.value}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="flex-1 p-4 space-y-3">
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-300">Live Activity</span>
          </div>
          <div className="flex items-center gap-1.5">
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-rose-500"
            />
            <span className="text-[10px] text-rose-400 font-medium">LIVE</span>
          </div>
        </div>

        <div ref={activityRef} className="space-y-2">
          <AnimatePresence initial={false}>
            {activities.map((activity) => {
              const config = statusConfig[activity.status];
              const Icon = config.icon;
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    'p-2.5 rounded-lg border-l-2 bg-white/3',
                    config.border,
                    config.bg,
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Icon
                      size={12}
                      className={cn(
                        config.color,
                        activity.status === 'processing' && 'animate-spin',
                        activity.status === 'generating' && 'animate-spin',
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-slate-300">{activity.description}</p>
                      {activity.detail && (
                        <p className="text-[10px] text-slate-600 truncate mt-0.5">{activity.detail}</p>
                      )}
                      <p className="text-[10px] text-slate-700 mt-0.5 font-mono">{activity.timestamp}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Model Info */}
      <div className="p-4 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-slate-500" />
          <span className="text-xs font-semibold text-slate-400">Model Info</span>
        </div>
        <div className="space-y-1.5">
          {[
            { label: 'Model', value: 'Qwen 2.5-72B' },
            { label: 'Context', value: '128K tokens' },
            { label: 'Max Output', value: '4096 tokens' },
            { label: 'Temperature', value: '0.7' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-[11px] text-slate-600">{item.label}</span>
              <span className="text-[11px] text-slate-400 font-mono">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
