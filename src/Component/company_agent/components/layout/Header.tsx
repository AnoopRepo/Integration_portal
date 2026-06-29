import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Bell, Menu, ChevronDown, User, Settings, LogOut, Cpu, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { checkConnection, OllamaStatus } from '../../lib/ollama';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();

  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [showStatusHelp, setShowStatusHelp] = useState(false);

  const hasModels = ollamaStatus?.connected === true && ollamaStatus.models.length > 0;
  const hasNoModels = ollamaStatus?.connected === true && ollamaStatus.models.length === 0;
  const activeModel = ollamaStatus?.connected === true 
    ? (ollamaStatus.hasQwen ? ollamaStatus.qwenModelName : (ollamaStatus.models[0] || null))
    : null;

  useEffect(() => {
    const checkOllama = async () => {
      const status = await checkConnection();
      setOllamaStatus(status);
      
      // Dispatch event to keep other hooks aligned (e.g. useChat.ts)
      window.dispatchEvent(new CustomEvent('ollama-status-updated', { detail: status }));
    };

    checkOllama();
    const interval = setInterval(checkOllama, 10000); // poll every 10 seconds

    // Add manual refresh listener
    const handleManualRefresh = () => checkOllama();
    window.addEventListener('ollama-refresh-status', handleManualRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('ollama-refresh-status', handleManualRefresh);
    };
  }, []);

  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('company_agent_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          name: parsed.name || 'User',
          email: parsed.email || 'user@company.com',
          avatarInitials: parsed.avatarInitials || 'U',
        };
      }
    } catch (e) {
      console.error(e);
    }
    return {
      name: 'User',
      email: 'user@company.com',
      avatarInitials: 'U',
    };
  });

  useEffect(() => {
    const handleProfileUpdate = () => {
      try {
        const saved = localStorage.getItem('company_agent_user_profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          setProfile({
            name: parsed.name || 'User',
            email: parsed.email || 'user@company.com',
            avatarInitials: parsed.avatarInitials || 'U',
          });
        }
      } catch (e) {
        console.error(e);
      }
    };

    window.addEventListener('profile-updated', handleProfileUpdate);
    handleProfileUpdate();

    return () => window.removeEventListener('profile-updated', handleProfileUpdate);
  }, []);

  const notifications = [
    { id: 1, text: 'Company Agent response completed', time: '2m ago', read: false },
    { id: 2, text: 'Token limit at 80% for today', time: '15m ago', read: false },
    { id: 3, text: 'New agent "DeepSeek" coming soon', time: '1h ago', read: true },
  ];

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header
      className="h-[60px] flex items-center justify-between px-4 md:px-6 border-b border-border flex-shrink-0 relative z-30 bg-surface-1/85 backdrop-blur-xl transition-colors duration-200"
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-text-primary">My Workspace</h1>
          <p className="text-[10px] text-text-muted hidden sm:block">AI Agent Orchestrator</p>
        </div>
      </div>

      {/* Center — Agent Status Badge */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden sm:block">
        <div className="relative">
          <button
            onClick={() => setShowStatusHelp(prev => !prev)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all duration-200 hover:bg-surface-2",
              ollamaStatus === null && "bg-surface-2 border-border text-text-muted",
              ollamaStatus?.connected === false && "bg-rose-500/10 border-rose-500/30 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.05)]",
              hasNoModels && "bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.05)]",
              hasModels && "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
            )}
          >
            <div className="relative">
              <div className={cn(
                "w-2 h-2 rounded-full",
                ollamaStatus === null && "bg-text-muted animate-pulse",
                ollamaStatus?.connected === false && "bg-rose-500",
                hasNoModels && "bg-amber-500 animate-pulse",
                hasModels && "bg-emerald-500"
              )} />
              {ollamaStatus?.connected && (
                <motion.div
                  animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={cn(
                    "absolute inset-0 rounded-full",
                    hasModels ? "bg-emerald-400" : "bg-amber-400"
                  )}
                />
              )}
            </div>
            
            <Cpu size={13} className={cn(
              hasModels ? "text-emerald-500 animate-pulse" : "text-text-muted"
            )} />
            
            <span className="text-xs font-semibold select-none">
              {ollamaStatus === null && 'Checking Ollama...'}
              {ollamaStatus?.connected === false && 'Ollama: Offline'}
              {hasNoModels && 'Ollama: No Models'}
              {hasModels && `Ollama: Active (${activeModel})`}
            </span>
          </button>

          {/* Status Dropdown Help Info */}
          <AnimatePresence>
            {showStatusHelp && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowStatusHelp(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-surface-1 border border-border rounded-2xl shadow-xl p-4 z-50 text-text-secondary animate-in fade-in slide-in-from-top-2"
                >
                  <div className="flex items-start gap-2.5 mb-2.5">
                    {ollamaStatus?.connected === false && (
                      <>
                        <AlertCircle className="text-rose-500 flex-shrink-0 mt-0.5 animate-pulse" size={16} />
                        <div>
                          <h4 className="text-xs font-bold text-rose-500">Ollama is Not Running</h4>
                          <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
                            Your workspace is ready to connect, but the local Ollama backend is offline or unreachable.
                          </p>
                        </div>
                      </>
                    )}
                    {hasNoModels && (
                      <>
                        <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5 animate-bounce" size={16} />
                        <div>
                          <h4 className="text-xs font-bold text-amber-500">No Models Found</h4>
                          <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
                            Ollama is connected, but no models are downloaded. You need to pull a model to power the Company Agent.
                          </p>
                        </div>
                      </>
                    )}
                    {hasModels && (
                      <>
                        <Cpu className="text-emerald-500 flex-shrink-0 mt-0.5 animate-pulse" size={16} />
                        <div>
                          <h4 className="text-xs font-bold text-emerald-500">Ollama Active</h4>
                          <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
                            Successfully integrated local model <strong>{activeModel}</strong>. Ready to answer queries.
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-border space-y-2">
                    {ollamaStatus?.connected === false && (
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-semibold text-text-muted uppercase tracking-wider">How to resolve:</p>
                        <ol className="list-decimal list-inside text-[9px] text-text-secondary space-y-1 leading-relaxed">
                          <li>Open your command prompt / terminal</li>
                          <li>Run <code className="bg-rose-500/10 px-1 py-0.5 rounded text-rose-500 font-mono">ollama serve</code></li>
                          <li>Refresh settings or wait a moment!</li>
                        </ol>
                      </div>
                    )}

                    {hasNoModels && (
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-semibold text-text-muted uppercase tracking-wider">How to resolve:</p>
                        <ol className="list-decimal list-inside text-[9px] text-text-secondary space-y-1 leading-relaxed">
                          <li>Open your terminal</li>
                          <li>Run <code className="bg-amber-500/10 px-1 py-0.5 rounded text-amber-500 font-mono">ollama run qwen</code></li>
                          <li>This downloads the state-of-the-art Qwen model locally!</li>
                        </ol>
                      </div>
                    )}

                    {hasModels && (
                      <div className="flex items-center justify-between text-[9px] text-text-muted font-mono">
                        <span>Port: 11434 (Proxied)</span>
                        <span>Model: {activeModel}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen((v) => !v); setAvatarOpen(false); }}
            className="relative p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-indigo-500 text-[9px] font-bold text-white flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-72 bg-surface-1 border border-border rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2"
              >
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-primary">Notifications</span>
                  <span className="text-xs text-indigo-500 cursor-pointer hover:text-indigo-600">
                    Mark all read
                  </span>
                </div>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      'px-4 py-3 flex gap-3 hover:bg-surface-2 transition-colors cursor-pointer',
                      !n.read && 'border-l-2 border-indigo-500',
                    )}
                  >
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                        n.read ? 'bg-text-muted/40' : 'bg-indigo-400',
                      )}
                    />
                    <div>
                      <p className="text-xs text-text-secondary">{n.text}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Avatar Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setAvatarOpen((v) => !v); setNotifOpen(false); }}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-surface-2 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold font-mono">
              {profile.avatarInitials}
            </div>
            <ChevronDown
              size={14}
              className={cn(
                'text-text-muted transition-transform duration-200',
                avatarOpen && 'rotate-180',
              )}
            />
          </button>

          <AnimatePresence>
            {avatarOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-48 bg-surface-1 border border-border rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2"
              >
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-text-primary">{profile.name}</p>
                  <p className="text-[10px] text-text-muted">{profile.email}</p>
                </div>
                {[
                  { icon: User, label: 'Profile', to: '/company-agent/profile' },
                  { icon: Settings, label: 'Settings', to: '/company-agent/settings' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={() => { navigate(item.to); setAvatarOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
                    >
                      <Icon size={14} />
                      {item.label}
                    </button>
                  );
                })}
                <div className="border-t border-border">
                  <button
                    onClick={() => { navigate('/'); setAvatarOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut size={14} />
                    Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Click outside handler */}
      {(avatarOpen || notifOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setAvatarOpen(false); setNotifOpen(false); }}
        />
      )}
    </header>
  );
};
