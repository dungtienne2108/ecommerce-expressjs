/**
 * ChatBox Component
 * Khu vực chat chính với messages và input
 */

import React, { useState, useRef, useEffect } from 'react';
import { Conversation } from '../types/chat.types';
import { useChat } from '../hooks/useChat';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';

interface ChatBoxProps {
  conversationId: string;
  conversation: Conversation;
  currentUserId: string;
  currentUserName?: string;
  currentUserAvatar?: string;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  conversationId,
  conversation,
  currentUserId,
  currentUserName,
  currentUserAvatar,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    loading,
    error,
    typingUsers,
    hasMore,
    loadMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    startTyping,
    stopTyping,
  } = useChat({
    conversationId,
    currentUserId,
    autoLoad: true,
    autoJoin: true,
  });

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isSending) return;

    try {
      setIsSending(true);
      await sendMessage(inputText);
      setInputText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (text: string) => {
    setInputText(text);
    if (text.length > 0) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadMessages(messages.length);
    }
  };

  const getConversationTitle = () => {
    return conversation.shop?.name || conversation.title || 'Cuộc trò chuyện';
  };

  const getConversationAvatar = () => {
    return conversation.shop?.logoUrl;
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Avatar */}
            {getConversationAvatar() ? (
              <img
                src={getConversationAvatar()}
                alt={getConversationTitle()}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {getConversationTitle().charAt(0).toUpperCase()}
              </div>
            )}

            {/* Title and status */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {getConversationTitle()}
              </h2>
              {conversation.subject && (
                <p className="text-sm text-gray-500">{conversation.subject}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {conversation.status === 'ACTIVE' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Đang hoạt động
              </span>
            )}
            {conversation.status === 'CLOSED' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Đã đóng
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-red-500">
              <p className="mb-2">❌ Lỗi khi tải tin nhắn</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Load More Button */}
            {hasMore && messages.length > 0 && (
              <div className="text-center py-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  {loading ? 'Đang tải...' : 'Tải tin nhắn cũ hơn'}
                </button>
              </div>
            )}

            {/* Message List */}
            <MessageList
              messages={messages}
              currentUserId={currentUserId}
              onEditMessage={editMessage}
              onDeleteMessage={deleteMessage}
            />

            {/* Typing Indicator */}
            {typingUsers.size > 0 && (
              <div className="px-6 py-2">
                <TypingIndicator />
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      {conversation.status === 'ACTIVE' && (
        <div className="border-t border-gray-200 bg-white">
          <MessageInput
            value={inputText}
            onChange={handleInputChange}
            onSend={handleSendMessage}
            disabled={isSending}
            placeholder="Nhập tin nhắn..."
          />
        </div>
      )}
    </div>
  );
};
