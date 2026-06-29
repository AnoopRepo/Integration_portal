import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, BookMarked, Trophy, Settings,
  Calendar, MessageSquare, ExternalLink,
  Check, Lock, X, Save
} from 'lucide-react';
import { ProfileCard } from '../components/profile/ProfileCard';
import { mockUser } from '../data/mockUser';
import { cn } from '../lib/utils';
import type { User } from '../types';

const tabs = [
  { id: 'timeline', label: 'Activity', icon: Clock },
  { id: 'saved', label: 'Saved', icon: BookMarked },
  { id: 'achievements', label: 'Achievements', icon: Trophy },
  { id: 'preferences', label: 'Preferences', icon: Settings },
];

const typeConfig = {
  chat: { color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', dot: 'bg-indigo-500' },
  setting: { color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20', dot: 'bg-cyan-500' },
  agent: { color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-500' },
  system: { color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-500' },
};

export const ProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('timeline');
  const [isEditing, setIsEditing] = useState(false);

  // Load from local storage, fallback to empty fields (so user can fill their own)
  const [userProfile, setUserProfile] = useState<User>(() => {
    try {
      const saved = localStorage.getItem('company_agent_user_profile');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load user profile', e);
    }
    return {
      ...mockUser,
      name: '',
      email: '',
      role: '',
      avatarInitials: '',
    };
  });

  // Edit form state
  const [editName, setEditName] = useState(userProfile.name);
  const [editEmail, setEditEmail] = useState(userProfile.email);
  const [editRole, setEditRole] = useState(userProfile.role);
  const [editInitials, setEditInitials] = useState(userProfile.avatarInitials);

  const handleEditClick = () => {
    setEditName(userProfile.name);
    setEditEmail(userProfile.email);
    setEditRole(userProfile.role);
    setEditInitials(userProfile.avatarInitials);
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: User = {
      ...userProfile,
      name: editName,
      email: editEmail,
      role: editRole,
      avatarInitials: editInitials,
    };
    setUserProfile(updated);
    localStorage.setItem('company_agent_user_profile', JSON.stringify(updated));
    window.dispatchEvent(new Event('profile-updated'));
    setIsEditing(false);
  };

  const tabContent: Record<string, React.ReactNode> = {
    timeline: (
      <div className="space-y-3">
        {userProfile.timeline.map((event, i) => {
          const cfg = typeConfig[event.type];
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex gap-4"
            >
              <div className="flex flex-col items-center">
                <div className={cn('w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0', cfg.dot)} />
                {i < userProfile.timeline.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-1.5" />
                )}
              </div>
              <div className="pb-5 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wide',
                      cfg.color,
                    )}
                  >
                    {event.type}
                  </span>
                  <span className="text-[11px] text-text-muted flex items-center gap-1">
                    <Calendar size={9} />
                    {event.date}
                  </span>
                </div>
                <p className="text-sm font-medium text-text-primary">{event.title}</p>
                <p className="text-xs text-text-secondary mt-0.5">{event.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    ),

    saved: (
      <div className="space-y-3">
        {userProfile.savedConversations.map((conv, i) => (
          <motion.div
            key={conv.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-center justify-between p-4 rounded-xl bg-surface-2 border border-border hover:bg-surface-1 hover:border-text-muted/20 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <MessageSquare size={14} className="text-indigo-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">{conv.title}</p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  {conv.date} · {conv.messageCount} messages · {conv.agent}
                </p>
              </div>
            </div>
            <button className="p-2 rounded-lg text-text-muted hover:text-indigo-500 hover:bg-indigo-500/10 transition-all opacity-0 group-hover:opacity-100">
              <ExternalLink size={13} />
            </button>
          </motion.div>
        ))}
      </div>
    ),

    achievements: (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {userProfile.achievements.map((ach, i) => (
          <motion.div
            key={ach.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              'p-4 rounded-2xl border text-center transition-all',
              ach.unlocked
                ? 'bg-gradient-to-br from-indigo-500/5 to-violet-500/5 border-indigo-500/20 hover:border-indigo-500/40'
                : 'bg-surface-2 border-border opacity-50 grayscale',
            )}
          >
            <div className="text-3xl mb-2">{ach.icon}</div>
            <p
              className={cn(
                'text-xs font-semibold mb-1',
                ach.unlocked ? 'text-text-primary' : 'text-text-secondary',
              )}
            >
              {ach.title}
            </p>
            <p className="text-[10px] text-text-secondary leading-tight">{ach.description}</p>
            {ach.unlocked ? (
              <div className="mt-2 flex items-center justify-center gap-1 text-emerald-500">
                <Check size={10} />
                <span className="text-[10px]">{ach.unlockedAt}</span>
              </div>
            ) : (
              <div className="mt-2 flex items-center justify-center gap-1 text-text-muted">
                <Lock size={10} />
                <span className="text-[10px]">Locked</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    ),

    preferences: (
      <div className="space-y-3">
        {Object.entries(userProfile.preferences).map(([key, value], i) => {
          const labels: Record<string, string> = {
            language: 'Language',
            timezone: 'Timezone',
            notificationFrequency: 'Notification Frequency',
            fontSize: 'Font Size',
            density: 'Interface Density',
          };
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center justify-between py-3 border-b border-border"
            >
              <span className="text-sm text-text-secondary">{labels[key] ?? key}</span>
              <select
                defaultValue={value}
                className="bg-surface-1 border border-border text-text-primary text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-400 cursor-pointer"
              >
                <option>{value}</option>
              </select>
            </motion.div>
          );
        })}
      </div>
    ),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 sm:p-6 min-h-full relative"
    >
      <div className="mb-6">
        <h1
          className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent"
          style={{ letterSpacing: '-0.02em' }}
        >
          Profile
        </h1>
        <p className="text-sm text-text-secondary mt-1">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Left: Profile Card */}
        <div>
          <ProfileCard user={userProfile} onEdit={handleEditClick} />
        </div>

        {/* Right: Tabs */}
        <div className="rounded-2xl border border-border overflow-hidden bg-surface-1 shadow-sm transition-colors duration-200">
          {/* Tab bar */}
          <div className="flex border-b border-border overflow-x-auto scrollbar-thin">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2',
                    isActive
                      ? 'text-indigo-500 border-indigo-500 bg-indigo-500/10'
                      : 'text-text-secondary border-transparent hover:text-text-primary hover:bg-surface-2',
                  )}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="p-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {tabContent[activeTab]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-surface-1 p-6 shadow-2xl z-10 transition-colors duration-200"
            >
              {/* Top Banner Accent */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500" />

              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-text-primary">Edit Profile</h3>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-surface-2 border border-border text-text-primary text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-400 focus:bg-surface-1 transition-all placeholder:text-text-muted"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full bg-surface-2 border border-border text-text-primary text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-400 focus:bg-surface-1 transition-all placeholder:text-text-muted"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                      Role
                    </label>
                    <input
                      type="text"
                      required
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      placeholder="e.g. Admin, Developer"
                      className="w-full bg-surface-2 border border-border text-text-primary text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-400 focus:bg-surface-1 transition-all placeholder:text-text-muted"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                      Initials
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={2}
                      value={editInitials}
                      onChange={(e) => setEditInitials(e.target.value.toUpperCase())}
                      placeholder="e.g. AJ"
                      className="w-full bg-surface-2 border border-border text-text-primary text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-400 focus:bg-surface-1 transition-all text-center tracking-widest uppercase placeholder:text-text-muted"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all"
                  >
                    <Save size={15} />
                    Save Profile
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
