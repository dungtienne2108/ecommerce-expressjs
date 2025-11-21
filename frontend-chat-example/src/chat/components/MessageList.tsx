/**
 * MessageList Component
 * Danh sách tin nhắn
 */

import React from 'react';
import { Message } from '../types/chat.types';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  onEditMessage: (messageId: string, content: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onEditMessage,
  onDeleteMessage,
}) => {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <div className="text-5xl mb-4">💬</div>
          <p>Chưa có tin nhắn nào</p>
          <p className="text-sm mt-2">Hãy bắt đầu cuộc trò chuyện!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 space-y-4">
      {messages.map((message, index) => {
        const isFirstInGroup =
          index === 0 || messages[index - 1].senderId !== message.senderId;
        const isLastInGroup =
          index === messages.length - 1 ||
          messages[index + 1].senderId !== message.senderId;

        return (
          <MessageItem
            key={message.id}
            message={message}
            isOwnMessage={message.senderId === currentUserId}
            isFirstInGroup={isFirstInGroup}
            isLastInGroup={isLastInGroup}
            onEdit={onEditMessage}
            onDelete={onDeleteMessage}
          />
        );
      })}
    </div>
  );
};
