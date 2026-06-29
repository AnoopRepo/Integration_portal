import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Bot,
  User,
  Settings,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Sparkles,
  Mail,
  Receipt,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Conversation } from '../../types';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const featuresNav = [
  { icon: Mail,    label: 'PDF Extractor',  to: '/company-agent/pdf-extractor' },
  { icon: Receipt, label: 'Bill Extractor', to: '/company-agent/bill-extractor' },
  { icon: Bot,     label: 'Agents',         to: '/company-agent/agents' },
  { icon: User,    label: 'Profile',        to: '/company-agent/profile' },
  { icon: Settings,label: 'Settings',       to: '/company-agent/settings' },
];

// ─── Sidebar Inner Content (stable component, NOT inline function) ──────────

interface SidebarInnerProps {
  collapsed: boolean;
  onToggle: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onCloseMobile: () => void;
}

const SidebarInner: React.FC<SidebarInnerProps> = ({
  collapsed,
  onToggle,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onCloseMobile,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const navigate = useNavigate();

  const filteredConvs = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleNewChat = () => {
    onNewChat();
    navigate('/company-agent/chat');
    onCloseMobile();
  };

  return (
    <div className="flex flex-col h-full relative">

      {/* ── Logo Header ── */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 h-[60px] border-b border-border flex-shrink-0',
          collapsed && 'justify-center px-2',
        )}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Sparkles size={15} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <span className="font-bold text-sm bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent tracking-tight whitespace-nowrap">
              Company Agent
            </span>
            <p className="text-[10px] text-text-muted leading-none whitespace-nowrap">AI Assistant</p>
          </div>
        )}
      </div>

      {/* ── New Chat + Search ── */}
      <div className={cn('px-3 pt-3 pb-2 space-y-2 flex-shrink-0', collapsed && 'px-2')}>
        <button
          onClick={handleNewChat}
          title="New Chat"
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl',
            'bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-medium text-sm',
            'hover:opacity-90 hover:shadow-lg hover:shadow-indigo-500/25',
            'transition-all duration-200 active:scale-95',
            collapsed && 'justify-center px-0',
          )}
        >
          <Plus size={16} strokeWidth={2.5} />
          {!collapsed && <span className="truncate">New Chat</span>}
        </button>

        {!collapsed && (
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search history…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'w-full pl-8 pr-3 py-1.5 rounded-lg text-xs',
                'bg-surface-2 border border-border text-text-primary placeholder:text-text-muted',
                'focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/25',
                'transition-colors duration-150',
              )}
            />
          </div>
        )}
      </div>

      {/* ── Chat History ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin py-2 px-2 space-y-0.5 min-h-0">
        {!collapsed && (
          <p className="px-2 text-[9px] font-bold uppercase tracking-widest text-text-muted mb-2">
            Chat History
          </p>
        )}

        {filteredConvs.map((conv) => (
          <div
            key={conv.id}
            onClick={() => {
              onSelectConversation(conv.id);
              navigate('/company-agent/chat');
              onCloseMobile();
            }}
            title={collapsed ? conv.title : undefined}
            className={cn(
              'flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer group transition-all duration-150',
              activeConversationId === conv.id
                ? 'bg-indigo-500/12 text-indigo-500'
                : 'hover:bg-surface-2 text-text-secondary hover:text-text-primary',
              collapsed && 'justify-center',
            )}
          >
            {collapsed ? (
              <MessageSquare size={15} />
            ) : (
              <>
                <div className="flex-1 min-w-0 pr-1">
                  <p className="text-xs truncate font-medium leading-snug">{conv.title}</p>
                  <p className="text-[9px] text-text-muted mt-0.5">{conv.timestamp}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 rounded-md hover:bg-rose-500/15 text-text-muted hover:text-rose-500 transition-all"
                >
                  <Trash2 size={11} />
                </button>
              </>
            )}
          </div>
        ))}

        {filteredConvs.length === 0 && !collapsed && (
          <div className="text-center py-8">
            <MessageSquare size={20} className="text-text-muted mx-auto mb-2 opacity-40" />
            <p className="text-xs text-text-muted">No chats yet</p>
          </div>
        )}
      </div>

      {/* ── Features Nav ── */}
      <div className="border-t border-border pt-2 pb-3 px-2 space-y-0.5 flex-shrink-0">
        {!collapsed && (
          <p className="px-2 text-[9px] font-bold uppercase tracking-widest text-text-muted mb-1.5">
            Features
          </p>
        )}
        {featuresNav.map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} onCloseMobile={onCloseMobile} />
        ))}
      </div>

      {/* ── Collapse Toggle ──
          IMPORTANT: placed OUTSIDE overflow-hidden parent to prevent clipping.
          This button sits at the bottom of the sidebar, always visible. */}
      <div
        className={cn(
          'border-t border-border flex-shrink-0',
          collapsed ? 'flex justify-center py-2' : 'flex justify-end px-3 py-2',
        )}
      >
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'p-2 rounded-lg transition-all duration-150',
            'text-text-muted hover:text-indigo-500 hover:bg-indigo-500/10',
          )}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>
    </div>
  );
};

// ─── Sidebar Shell ──────────────────────────────────────────────────────────

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggle,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  mobileOpen,
  onCloseMobile,
}) => {
  const innerProps: SidebarInnerProps = {
    collapsed,
    onToggle,
    conversations,
    activeConversationId,
    onSelectConversation,
    onNewChat,
    onDeleteConversation,
    onCloseMobile,
  };

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <motion.aside
        animate={{ width: collapsed ? 60 : 256 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="hidden md:flex flex-col relative flex-shrink-0 bg-surface-1 border-r border-border overflow-hidden"
        style={{ boxShadow: '1px 0 0 0 var(--border-primary-val)' }}
      >
        <SidebarInner {...innerProps} />
      </motion.aside>

      {/* ── Mobile Drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
            />
            {/* Drawer Panel */}
            <motion.aside
              initial={{ x: -264 }}
              animate={{ x: 0 }}
              exit={{ x: -264 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-surface-1 border-r border-border z-50 md:hidden flex flex-col"
            >
              <SidebarInner {...innerProps} collapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

// ─── Nav Item ───────────────────────────────────────────────────────────────

interface NavItemProps {
  item: { icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; label: string; to: string };
  collapsed: boolean;
  onCloseMobile: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ item, collapsed, onCloseMobile }) => {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      onClick={onCloseMobile}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150 relative group',
          isActive
            ? 'bg-indigo-500/12 text-indigo-500 font-medium'
            : 'text-text-secondary hover:text-text-primary hover:bg-surface-2',
          collapsed && 'justify-center',
        )
      }
    >
      <Icon size={15} strokeWidth={1.75} />
      {!collapsed && <span className="truncate text-xs font-medium">{item.label}</span>}

      {/* Tooltip when collapsed */}
      {collapsed && (
        <div className="absolute left-full ml-2.5 px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
          {item.label}
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-900 border-l border-b border-slate-700/80 rotate-45" />
        </div>
      )}
    </NavLink>
  );
};
