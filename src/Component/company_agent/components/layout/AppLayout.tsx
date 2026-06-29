import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useChat } from '../../hooks/useChat';
import { useSidebar } from '../../hooks/useSidebar';

export const AppLayout: React.FC = () => {
  const chat = useChat();
  const sidebar = useSidebar();

  return (
    /*
      The outer App wraps every page in:
        <Navbar h-16 sticky top-0>   ← 64px tall
        <main flex-1 md:pl-20>       ← pl-20 is for the floating menu button area
          <CompanyAgent>             ← we live here

      The outer Sidebar is a slide-over DRAWER (not a persistent rail), so we
      only need to account for the top Navbar (h-16 = 4rem).

      Use fixed positioning so the AI assistant is immune to any outer
      layout padding/margin shifts — the chatbox will NEVER move.
    */
    <div
      className="fixed inset-0 top-16 left-0 flex bg-background text-text-primary z-20"
      style={{ bottom: 0 }}
    >
      {/* ── Ambient Background Glows ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10" aria-hidden="true">
        <div
          className="absolute -top-40 right-0 w-[600px] h-[600px] rounded-full opacity-60"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 65%)' }}
        />
        <div
          className="absolute bottom-0 -left-20 w-[500px] h-[500px] rounded-full opacity-60"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.05) 0%, transparent 65%)' }}
        />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />
      </div>

      {/* ── Agent Sidebar ── */}
      <Sidebar
        collapsed={sidebar.collapsed}
        onToggle={sidebar.toggle}
        conversations={chat.conversations}
        activeConversationId={chat.activeConversationId}
        onSelectConversation={chat.selectConversation}
        onNewChat={chat.startNewChat}
        onDeleteConversation={chat.deleteConversation}
        mobileOpen={sidebar.mobileOpen}
        onCloseMobile={sidebar.closeMobile}
      />

      {/* ── Main Panel ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Agent Header */}
        <Header onMenuClick={sidebar.toggleMobile} />

        {/* Page Content */}
        <main className="flex-1 min-h-0 overflow-hidden">
          <Outlet context={chat} />
        </main>
      </div>
    </div>
  );
};
