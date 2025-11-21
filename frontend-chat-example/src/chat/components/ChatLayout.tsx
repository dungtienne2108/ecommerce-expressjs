/**
 * ChatLayout Component
 * Layout chính cho trang chat
 */

import React, { useState } from 'react';
import { ConversationList } from './ConversationList';
import { ChatBox } from './ChatBox';
import { useConversations } from '../hooks/useConversations';

interface ChatLayoutProps {
  currentUserId: string;
  currentUserName?: string;
  currentUserAvatar?: string;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
  currentUserId,
  currentUserName,
  currentUserAvatar,
}) => {
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const { conversations, loading, createConversation } = useConversations();

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };

  const handleCreateConversation = async (shopId: string) => {
    try {
      const conversation = await createConversation(shopId);
      setSelectedConversationId(conversation.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Conversation List */}
      <div className="w-full md:w-96 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Tin nhắn</h1>
            <button
              onClick={() => {
                const shopId = prompt('Nhập Shop ID:');
                if (shopId) {
                  handleCreateConversation(shopId);
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Tạo mới
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <ConversationList
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              onSelectConversation={handleSelectConversation}
            />
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversationId && selectedConversation ? (
          <ChatBox
            conversationId={selectedConversationId}
            conversation={selectedConversation}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            currentUserAvatar={currentUserAvatar}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                Chào mừng đến với Chat
              </h2>
              <p className="text-gray-500">
                Chọn một cuộc trò chuyện hoặc tạo mới để bắt đầu
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
