import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { ChatWindow } from '../components/chat/ChatWindow';
import type { useChat } from '../hooks/useChat';

type ChatContext = ReturnType<typeof useChat>;

export const ChatPage: React.FC = () => {
  const chat = useOutletContext<ChatContext>();

  return (
    /*
      Must be position:relative + fill parent (h-full w-full).
      ChatWindow uses absolute inset-0 to position itself exactly
      within this container — guaranteeing the input is always
      at the bottom and the message list scrolls correctly.
    */
    <div className="relative h-full w-full">
      <ChatWindow
        conversation={chat.activeConversation}
        isTyping={chat.isTyping}
        onSend={chat.sendMessage}
      />
    </div>
  );
};
