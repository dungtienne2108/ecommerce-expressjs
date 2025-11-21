/**
 * useConversations Hook
 * Quản lý danh sách conversations
 */

import { useEffect, useState, useCallback } from 'react';
import { chatService } from '../services/chatService';
import { Conversation } from '../types/chat.types';

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load conversations
  const loadConversations = useCallback(async (limit = 20, offset = 0) => {
    try {
      setLoading(true);
      setError(null);
      const convs = await chatService.getConversations(limit, offset);
      setConversations(convs);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversations');
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create conversation
  const createConversation = useCallback(
    async (shopId: string, title?: string) => {
      try {
        const conversation = await chatService.createConversation({
          shopId,
          title,
        });
        setConversations((prev) => [conversation, ...prev]);
        return conversation;
      } catch (err: any) {
        setError(err.message || 'Failed to create conversation');
        throw err;
      }
    },
    []
  );

  // Update conversation in list
  const updateConversation = useCallback((updatedConv: Conversation) => {
    setConversations((prev) =>
      prev.map((conv) => (conv.id === updatedConv.id ? updatedConv : conv))
    );
  }, []);

  // Setup listeners
  useEffect(() => {
    // Load initial conversations
    loadConversations();

    // Listen for new conversations
    const handleConversationCreated = (conversation: Conversation) => {
      setConversations((prev) => {
        // Avoid duplicates
        if (prev.find((c) => c.id === conversation.id)) {
          return prev;
        }
        return [conversation, ...prev];
      });
    };

    const handleConversationClosed = (conversation: Conversation) => {
      updateConversation(conversation);
    };

    chatService.onConversationCreated(handleConversationCreated);
    chatService.onConversationClosed(handleConversationClosed);

    return () => {
      chatService.offConversationCreated(handleConversationCreated);
      chatService.offConversationClosed(handleConversationClosed);
    };
  }, [loadConversations, updateConversation]);

  return {
    conversations,
    loading,
    error,
    loadConversations,
    createConversation,
    updateConversation,
  };
};
