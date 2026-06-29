import { useState, useCallback, useEffect } from 'react';
import type { Conversation, Message } from '../types';
import { mockConversations } from '../data/mockChats';

// ─── Knowledge Agent Integration ─────────────────────────────────────────────
// The FastAPI backend URL where the knowledge agent endpoint is mounted
import { API_URL } from '../../../context/AuthContext';
const BACKEND_URL = API_URL || 'http://localhost:8000';

// Calls POST /knowledge-agent/query on the FastAPI backend.
// Returns the markdown-formatted answer string for the chat bubble.
async function callKnowledgeAgent(query: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/knowledge-agent/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`Knowledge Agent returned ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  return data.answer ?? '⚠️ The knowledge agent returned an empty response.';
}
// ─────────────────────────────────────────────────────────────────────────────

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem('company_agent_conversations');
      return saved ? JSON.parse(saved) : mockConversations;
    } catch (e) {
      console.error('Failed to load conversations from localStorage', e);
      return mockConversations;
    }
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('company_agent_active_id');
    } catch (e) {
      return null;
    }
  });
  const [isTyping, setIsTyping] = useState(false);
  
  useEffect(() => {
    try {
      localStorage.setItem('company_agent_conversations', JSON.stringify(conversations));
    } catch (e) {
      console.error('Failed to save conversations to localStorage', e);
    }
  }, [conversations]);

  useEffect(() => {
    try {
      if (activeConversationId) {
        localStorage.setItem('company_agent_active_id', activeConversationId);
      } else {
        localStorage.removeItem('company_agent_active_id');
      }
    } catch (e) {
      console.error('Failed to save activeConversationId to localStorage', e);
    }
  }, [activeConversationId]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) ?? null;

  const startNewChat = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  const selectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
  }, []);

  const sendMessage = useCallback(
    async (content: string, documentContext?: string) => {
      const userMessage: Message = {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        content,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        documentContext,
      };

      // Capture activeConversationId at call-time (stable via ref pattern)
      let targetId: string;
      let isNewChat: boolean;

      setActiveConversationId((prevId) => {
        isNewChat = !prevId;
        targetId = isNewChat ? `conv-${Date.now()}` : prevId!;
        return targetId;
      });

      // Allow state to settle then run async logic
      // We use a local variable captured above via the setter
      await new Promise<void>((resolve) => {
        setConversations((prev) => {
          const _targetId = targetId;
          const existing = prev.find((c) => c.id === _targetId);
          if (!isNewChat && existing) {
            resolve();
            return prev.map((c) =>
              c.id === _targetId ? { ...c, messages: [...c.messages, userMessage] } : c,
            );
          }
          const newConv: Conversation = {
            id: _targetId,
            title: content.length > 40 ? content.slice(0, 40) + '…' : content,
            timestamp: 'Just now',
            agentId: 'company_agent',
            messages: [userMessage],
          };
          resolve();
          return [newConv, ...prev];
        });
      });

      setIsTyping(true);

      const aiMessageId = `msg-${Date.now()}-ai`;
      try {
        const agentAnswer = await callKnowledgeAgent(content);

        const agentMessage: Message = {
          id: aiMessageId,
          role: 'assistant',
          content: agentAnswer,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          tokens: 0,
        };

        setConversations((prev) =>
          prev.map((c) =>
            c.id !== targetId ? c : { ...c, messages: [...c.messages, agentMessage] },
          ),
        );
      } catch (err: any) {
        const errorMessage: Message = {
          id: aiMessageId,
          role: 'assistant',
          content: (
            `❌ **[Knowledge Agent Error]**\n\n` +
            `Could not connect to the knowledge agent backend.\n\n` +
            `**Details:** \`${err.message || String(err)}\`\n\n` +
            `**Fix:** Make sure the backend is running:\n` +
            `\`\`\`bash\npython backend/run.py\n\`\`\``
          ),
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          tokens: 0,
        };
        setConversations((prev) =>
          prev.map((c) =>
            c.id !== targetId ? c : { ...c, messages: [...c.messages, errorMessage] },
          ),
        );
      } finally {
        setIsTyping(false);
      }
    },
    // No dependency on conversations or activeConversationId — functional updates handle this
    [],
  );

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setActiveConversationId((prevId) => (prevId === id ? null : prevId));
  }, []);

  return {
    conversations,
    activeConversation,
    activeConversationId,
    isTyping,
    startNewChat,
    selectConversation,
    sendMessage,
    deleteConversation,
  };
}