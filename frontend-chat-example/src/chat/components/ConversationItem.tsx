/**
 * ConversationItem Component
 * Item trong danh sách conversation
 */

import React from 'react';
import { Conversation } from '../types/chat.types';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isSelected,
  onClick,
}) => {
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: vi,
      });
    } catch {
      return '';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const shopName = conversation.shop?.name || conversation.title || 'Cuộc trò chuyện';
  const shopLogo = conversation.shop?.logoUrl;

  return (
    <div
      onClick={onClick}
      className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
        isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : ''
      }`}
    >
      <div className="flex items-start space-x-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {shopLogo ? (
            <img
              src={shopLogo}
              alt={shopName}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
              {getInitials(shopName)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {shopName}
            </h3>
            {conversation.lastMessageAt && (
              <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                {formatTime(conversation.lastMessageAt)}
              </span>
            )}
          </div>

          {conversation.subject && (
            <p className="text-xs text-gray-600 mb-1">
              {conversation.subject}
            </p>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 truncate">
              {conversation.lastMessageText || 'Chưa có tin nhắn'}
            </p>
            {conversation.unreadCount > 0 && (
              <span className="flex-shrink-0 ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </span>
            )}
          </div>

          {/* Status badge */}
          <div className="mt-2 flex items-center space-x-2">
            {conversation.status === 'CLOSED' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                Đã đóng
              </span>
            )}
            {conversation.status === 'RESOLVED' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Đã giải quyết
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
