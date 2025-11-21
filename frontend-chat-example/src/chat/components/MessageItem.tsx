/**
 * MessageItem Component
 * Item tin nhắn với actions (edit, delete)
 */

import React, { useState } from 'react';
import { Message } from '../types/chat.types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface MessageItemProps {
  message: Message;
  isOwnMessage: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isOwnMessage,
  isFirstInGroup,
  isLastInGroup,
  onEdit,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [showActions, setShowActions] = useState(false);

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'HH:mm', { locale: vi });
    } catch {
      return '';
    }
  };

  const handleEdit = async () => {
    if (!editText.trim() || editText === message.content) {
      setIsEditing(false);
      return;
    }

    try {
      await onEdit(message.id, editText);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Bạn có chắc muốn xóa tin nhắn này?')) {
      try {
        await onDelete(message.id);
      } catch (error) {
        console.error('Failed to delete message:', error);
      }
    }
  };

  const getSenderName = () => {
    if (!message.sender) return 'Unknown';
    const { firstName, lastName } = message.sender;
    return [firstName, lastName].filter(Boolean).join(' ') || message.sender.email;
  };

  const getSenderAvatar = () => {
    return message.sender?.avatarUrl;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (message.isDeleted) {
    return (
      <div
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
      >
        <div className="max-w-md px-4 py-2 rounded-lg bg-gray-100">
          <p className="text-sm text-gray-500 italic">Tin nhắn đã bị xóa</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2 max-w-2xl`}>
        {/* Avatar */}
        {!isOwnMessage && isLastInGroup && (
          <div className="flex-shrink-0 mb-1">
            {getSenderAvatar() ? (
              <img
                src={getSenderAvatar()}
                alt={getSenderName()}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-semibold">
                {getInitials(getSenderName())}
              </div>
            )}
          </div>
        )}

        {!isOwnMessage && !isLastInGroup && <div className="w-8" />}

        <div className={`flex-1 ${isOwnMessage ? 'mr-2' : 'ml-2'}`}>
          {/* Sender name */}
          {!isOwnMessage && isFirstInGroup && (
            <div className="mb-1 px-2">
              <span className="text-xs font-medium text-gray-700">
                {getSenderName()}
              </span>
            </div>
          )}

          {/* Message bubble */}
          <div className="relative group">
            <div
              className={`px-4 py-2 rounded-2xl ${
                isOwnMessage
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md'
              }`}
            >
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className={`w-full px-2 py-1 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isOwnMessage ? 'bg-blue-500 text-white' : 'bg-white text-gray-900'
                    }`}
                    rows={3}
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleEdit}
                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                    >
                      Lưu
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditText(message.content);
                      }}
                      className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <div className="flex items-center justify-end space-x-2 mt-1">
                    <span
                      className={`text-xs ${
                        isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {formatTime(message.sentAt)}
                    </span>
                    {message.editedAt && (
                      <span
                        className={`text-xs ${
                          isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        (đã sửa)
                      </span>
                    )}
                    {isOwnMessage && (
                      <span className="text-xs text-blue-100">
                        {message.isRead ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Action buttons */}
            {isOwnMessage && !isEditing && showActions && (
              <div className="absolute right-0 top-0 transform translate-x-full ml-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 bg-white border border-gray-300 rounded-full hover:bg-gray-50 text-gray-600 shadow-sm"
                  title="Sửa"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1.5 bg-white border border-gray-300 rounded-full hover:bg-red-50 text-red-600 shadow-sm"
                  title="Xóa"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
