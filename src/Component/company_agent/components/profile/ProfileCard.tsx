import React from 'react';
import { motion } from 'framer-motion';
import { Edit2, MessageSquare, Cpu, MessageCircle, User as UserIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { User } from '../../types';

interface ProfileCardProps {
  user: User;
  onEdit: () => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ user, onEdit }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-border overflow-hidden bg-surface-1 shadow-card transition-colors duration-200"
    >
      {/* Banner */}
      <div
        className="h-24 relative"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.5) 0%, rgba(79,70,229,0.4) 50%, rgba(14,165,233,0.3) 100%)',
        }}
      >
        <div className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(99,102,241,0.3), transparent 60%)',
          }}
        />
      </div>

      <div className="px-6 pb-6">
        {/* Avatar */}
        <div className="relative -mt-8 mb-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-xl border-2 border-surface-1 transition-colors duration-200"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
            }}
          >
            {user.avatarInitials ? user.avatarInitials : <UserIcon size={24} />}
          </motion.div>
        </div>

        {/* Name & role */}
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-text-primary">{user.name || 'No Name Set'}</h2>
            {user.role && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 uppercase tracking-wide">
                {user.role}
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary">{user.email || 'No Email Set'}</p>
          <p className="text-[11px] text-text-muted mt-1">Member since {user.joinedAt || 'Just Now'}</p>
        </div>

        {/* Edit button */}
        <button 
          onClick={onEdit}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-all mb-5"
        >
          <Edit2 size={13} />
          Edit Profile
        </button>

        {/* Usage stats */}
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Usage This Month
          </p>
          {[
            {
              icon: MessageSquare,
              label: 'Queries',
              value: user.queriesThisMonth.toLocaleString(),
              color: 'text-indigo-500',
            },
            {
              icon: Cpu,
              label: 'Tokens Used',
              value: `${(user.tokensUsed / 1_000_000).toFixed(2)}M`,
              color: 'text-cyan-500',
            },
            {
              icon: MessageCircle,
              label: 'Conversations',
              value: user.totalConversations.toString(),
              color: 'text-emerald-500',
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center justify-between py-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Icon size={13} className={cn(stat.color)} />
                  <span className="text-xs text-text-secondary">{stat.label}</span>
                </div>
                <span className="text-xs font-semibold text-text-primary">{stat.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
