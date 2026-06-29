import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import {
  MessageSquare, Bot, Users, Activity, TrendingUp as TrendUp, Zap,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { StatCard } from '../../types';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  MessageSquare,
  Bot,
  Users,
  Activity,
  TrendingUp: TrendUp,
  Zap,
};

const colorMap: Record<string, { icon: string; glow: string; badge: string }> = {
  violet: {
    icon: 'text-violet-500 bg-violet-500/10 border border-violet-500/20',
    glow: 'hover:shadow-card-hover hover:border-violet-400/30',
    badge: 'text-emerald-500 bg-emerald-500/10',
  },
  cyan: {
    icon: 'text-cyan-500 bg-cyan-500/10 border border-cyan-500/20',
    glow: 'hover:shadow-card-hover hover:border-cyan-400/30',
    badge: 'text-emerald-500 bg-emerald-500/10',
  },
  emerald: {
    icon: 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20',
    glow: 'hover:shadow-card-hover hover:border-emerald-400/30',
    badge: 'text-emerald-500 bg-emerald-500/10',
  },
  amber: {
    icon: 'text-amber-500 bg-amber-500/10 border border-amber-500/20',
    glow: 'hover:shadow-card-hover hover:border-amber-400/30',
    badge: 'text-emerald-500 bg-emerald-500/10',
  },
  rose: {
    icon: 'text-rose-500 bg-rose-500/10 border border-rose-500/20',
    glow: 'hover:shadow-card-hover hover:border-rose-400/30',
    badge: 'text-emerald-500 bg-emerald-500/10',
  },
  sky: {
    icon: 'text-sky-500 bg-sky-500/10 border border-sky-500/20',
    glow: 'hover:shadow-card-hover hover:border-sky-400/30',
    badge: 'text-emerald-500 bg-emerald-500/10',
  },
};

interface StatsCardProps {
  card: StatCard;
  index: number;
}

export const StatsCard: React.FC<StatsCardProps> = ({ card, index }) => {
  const Icon = iconMap[card.icon] ?? MessageSquare;
  const colors = colorMap[card.color] ?? colorMap.violet;
  const isPositive = card.trend > 0;
  const isGood = card.color === 'rose' ? !isPositive : isPositive;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={cn(
        'p-5 rounded-2xl bg-surface-1 border border-border shadow-card relative overflow-hidden group transition-all duration-300',
        colors.glow
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colors.icon)}>
          <Icon size={20} />
        </div>
        <div
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border transition-colors',
            isGood
              ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
              : 'text-rose-500 bg-rose-500/10 border-rose-500/20',
          )}
        >
          {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {Math.abs(card.trend)}
          {card.color === 'rose' ? 's' : '%'}
        </div>
      </div>

      <div>
        <p className="text-2xl font-bold text-text-primary tracking-tight">{card.value}</p>
        <p className="text-xs text-text-secondary mt-1">{card.title}</p>
        <p className="text-[10px] text-text-muted mt-0.5">{card.trendLabel}</p>
      </div>
    </motion.div>
  );
};
