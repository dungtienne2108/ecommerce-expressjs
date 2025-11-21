/**
 * useChat Hook
 * Quản lý chat state và operations cho một conversation
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { chatService } from '../services/chatService';
import { Message, TypingIndicator } from '../types/chat.types';

interface UseChatProps {
  conversationId: string;
  currentUserId: string;
  autoLoad?: boolean;
  autoJoin?: boolean;
}

export const useChat = ({
  conversationId,
  currentUserId,
  autoLoad = true,
  autoJoin = true,
}: UseChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(true);

  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const isJoinedRef = useRef(false);

  // Load messages
  const loadMessages = useCallback(
    async (offset = 0, limit = 50) => {
      try {
        setLoading(true);
        setError(null);
        const msgs = await chatService.getMessages(conversationId, limit, offset);

        if (offset === 0) {
          setMessages(msgs);
        } else {
          setMessages((prev) => [...msgs, ...prev]);
        }

        setHasMore(msgs.length === limit);
      } catch (err: any) {
        setError(err.message || 'Failed to load messages');
        console.error('Failed to load messages:', err);
      } finally {
        setLoading(false);
      }
    },
    [conversationId]
  );

  // Send message
  const sendMessage = useCallback(
    async (content: string, type: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT') => {
      try {
        const message = await chatService.sendMessage({
          conversationId,
          content,
          type,
        });

        // Stop typing indicator
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        chatService.stopTyping(conversationId);

        return message;
      } catch (err: any) {
        setError(err.message || 'Failed to send message');
        throw err;
      }
    },
    [conversationId]
  );

  // Edit message
  const editMessage = useCallback(async (messageId: string, content: string) => {
    try {
      await chatService.editMessage({ messageId, content });
    } catch (err: any) {
      setError(err.message || 'Failed to edit message');
      throw err;
    }
  }, []);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await chatService.deleteMessage({ messageId });
    } catch (err: any) {
      setError(err.message || 'Failed to delete message');
      throw err;
    }
  }, []);

  // Mark as read
  const markAsRead = useCallback(
    async (messageId?: string) => {
      try {
        await chatService.markAsRead({ conversationId, messageId });
      } catch (err: any) {
        console.error('Failed to mark as read:', err);
      }
    },
    [conversationId]
  );

  // Typing indicators
  const startTyping = useCallback(() => {
    chatService.startTyping(conversationId);

    // Auto stop after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      chatService.stopTyping(conversationId);
    }, 3000);
  }, [conversationId]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    chatService.stopTyping(conversationId);
  }, [conversationId]);

  // Join conversation và setup listeners
  useEffect(() => {
    if (!autoJoin || isJoinedRef.current) return;

    // Join conversation room
    chatService
      .joinConversation(conversationId)
      .then(() => {
        console.log('✅ Joined conversation:', conversationId);
        isJoinedRef.current = true;
      })
      .catch((err) => {
        console.error('Failed to join conversation:', err);
      });

    // Setup event listeners
    const handleNewMessage = (message: Message) => {
      if (message.conversationId === conversationId) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.find((m) => m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });

        // Auto mark as read if not sender
        if (message.senderId !== currentUserId) {
          markAsRead(message.id);
        }
      }
    };

    const handleMessageUpdated = (message: Message) => {
      if (message.conversationId === conversationId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === message.id ? message : m))
        );
      }
    };

    const handleMessageDeleted = (data: {
      messageId: string;
      conversationId: string;
    }) => {
      if (data.conversationId === conversationId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.messageId ? { ...m, isDeleted: true } : m
          )
        );
      }
    };

    const handleUserTyping = (data: TypingIndicator) => {
      if (
        data.conversationId === conversationId &&
        data.user?.id !== currentUserId
      ) {
        setTypingUsers((prev) => new Set(prev).add(data.user!.id));
      }
    };

    const handleUserStoppedTyping = (data: TypingIndicator) => {
      if (data.conversationId === conversationId && data.userId) {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.userId!);
          return newSet;
        });
      }
    };

    // Register listeners
    chatService.onNewMessage(handleNewMessage);
    chatService.onMessageUpdated(handleMessageUpdated);
    chatService.onMessageDeleted(handleMessageDeleted);
    chatService.onUserTyping(handleUserTyping);
    chatService.onUserStoppedTyping(handleUserStoppedTyping);

    // Load initial messages
    if (autoLoad) {
      loadMessages();
    }

    // Cleanup
    return () => {
      chatService.leaveConversation(conversationId);
      chatService.offNewMessage(handleNewMessage);
      chatService.offMessageUpdated(handleMessageUpdated);
      chatService.offMessageDeleted(handleMessageDeleted);
      chatService.offUserTyping(handleUserTyping);
      chatService.offUserStoppedTyping(handleUserStoppedTyping);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      isJoinedRef.current = false;
    };
  }, [conversationId, currentUserId, autoJoin, autoLoad, loadMessages, markAsRead]);

  return {
    messages,
    loading,
    error,
    typingUsers,
    hasMore,
    loadMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    startTyping,
    stopTyping,
  };
};
