# 🍃 CHAT REALTIME - VUE 3 INTEGRATION EXAMPLE

## I. SETUP VUE 3 PROJECT

### 1. Cài đặt dependencies

```bash
npm install vue@latest
npm install socket.io-client axios pinia
npm install -D typescript @types/node vite
```

### 2. Cấu trúc project

```
src/
├── composables/
│   ├── useChat.ts           # Chat composable
│   ├── useSocket.ts         # Socket composable
│   └── useAuth.ts           # Auth composable
├── stores/
│   ├── chat.ts              # Pinia chat store
│   └── auth.ts              # Auth store
├── services/
│   ├── socketService.ts     # Socket service
│   ├── chatAPI.ts           # Chat API service
│   └── authAPI.ts           # Auth API
├── types/
│   └── chat.ts              # TypeScript types
├── components/
│   ├── ChatWindow.vue       # Chat window component
│   ├── ConversationList.vue # List conversations
│   ├── MessageItem.vue      # Single message
│   └── TypingIndicator.vue  # Typing animation
├── views/
│   └── ChatPage.vue         # Main chat page
├── utils/
│   └── eventEmitter.ts      # Event emitter
├── App.vue
└── main.ts
```

---

## II. SOCKET SERVICE (Vue 3)

```typescript
// src/services/socketService.ts
import io, { Socket } from 'socket.io-client';
import type { DefaultEventsMap } from 'socket.io/dist/typed-events';

class SocketService {
  private socket: Socket<DefaultEventsMap, DefaultEventsMap> | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(token: string, url: string = 'http://localhost:3000'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      try {
        this.socket = io(url, {
          auth: { token },
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
          transports: ['websocket', 'polling'],
        });

        this.socket.on('connect', () => {
          console.log('✅ Socket connected:', this.socket?.id);
          this.emit('onConnected');
          resolve();
        });

        this.socket.on('disconnect', () => {
          console.log('❌ Socket disconnected');
          this.emit('onDisconnected');
        });

        this.socket.on('error', (error: any) => {
          console.error('Socket error:', error);
          this.emit('onError', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());

      this.socket?.on(event, (data: any) => {
        this.listeners.get(event)?.forEach((cb) => cb(data));
      });
    }

    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, data?: any): void {
    this.socket?.emit(event, data);
  }

  emitWithAck(event: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit(event, data, (response: any) => {
        if (response?.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Unknown error'));
        }
      });
    });
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getId(): string | undefined {
    return this.socket?.id;
  }
}

export const socketService = new SocketService();
```

---

## III. PINIA STORE

```typescript
// src/stores/chat.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Conversation, Message, User } from '@/types/chat';

export const useChatStore = defineStore('chat', () => {
  // State
  const conversations = ref<Conversation[]>([]);
  const currentConversation = ref<Conversation | null>(null);
  const messages = ref<Message[]>([]);
  const typingUsers = ref<User[]>([]);
  const isConnected = ref(false);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Computed
  const unreadCount = computed(() => {
    return conversations.value.reduce((sum, conv) => sum + conv.unreadCount, 0);
  });

  const currentMessages = computed(() => {
    return messages.value.filter(
      (msg) => msg.conversationId === currentConversation.value?.id
    );
  });

  const isTyping = computed(() => typingUsers.value.length > 0);

  const typingText = computed(() => {
    if (typingUsers.value.length === 0) return '';
    if (typingUsers.value.length === 1) {
      return `${typingUsers.value[0].firstName} is typing...`;
    }
    return `${typingUsers.value.map((u) => u.firstName).join(', ')} are typing...`;
  });

  // Actions
  const setConversations = (convs: Conversation[]) => {
    conversations.value = convs;
  };

  const addConversation = (conv: Conversation) => {
    conversations.value.unshift(conv);
  };

  const updateConversation = (conv: Conversation) => {
    const index = conversations.value.findIndex((c) => c.id === conv.id);
    if (index >= 0) {
      conversations.value[index] = conv;
    }
  };

  const removeConversation = (conversationId: string) => {
    conversations.value = conversations.value.filter(
      (c) => c.id !== conversationId
    );
  };

  const setCurrentConversation = (conv: Conversation | null) => {
    currentConversation.value = conv;
    if (conv) {
      messages.value = [];
    }
  };

  const setMessages = (msgs: Message[]) => {
    messages.value = msgs;
  };

  const addMessage = (msg: Message) => {
    messages.value.push(msg);
  };

  const updateMessage = (msg: Message) => {
    const index = messages.value.findIndex((m) => m.id === msg.id);
    if (index >= 0) {
      messages.value[index] = msg;
    }
  };

  const deleteMessage = (messageId: string) => {
    messages.value = messages.value.filter((m) => m.id !== messageId);
  };

  const addTypingUser = (user: User) => {
    if (!typingUsers.value.find((u) => u.id === user.id)) {
      typingUsers.value.push(user);
    }
  };

  const removeTypingUser = (userId: string) => {
    typingUsers.value = typingUsers.value.filter((u) => u.id !== userId);
  };

  const clearTypingUsers = () => {
    typingUsers.value = [];
  };

  const setConnected = (connected: boolean) => {
    isConnected.value = connected;
  };

  const setLoading = (loading: boolean) => {
    isLoading.value = loading;
  };

  const setError = (err: string | null) => {
    error.value = err;
  };

  const clearError = () => {
    error.value = null;
  };

  const reset = () => {
    conversations.value = [];
    currentConversation.value = null;
    messages.value = [];
    typingUsers.value = [];
    isConnected.value = false;
    error.value = null;
  };

  return {
    // State
    conversations,
    currentConversation,
    messages,
    typingUsers,
    isConnected,
    isLoading,
    error,

    // Computed
    unreadCount,
    currentMessages,
    isTyping,
    typingText,

    // Actions
    setConversations,
    addConversation,
    updateConversation,
    removeConversation,
    setCurrentConversation,
    setMessages,
    addMessage,
    updateMessage,
    deleteMessage,
    addTypingUser,
    removeTypingUser,
    clearTypingUsers,
    setConnected,
    setLoading,
    setError,
    clearError,
    reset,
  };
});
```

---

## IV. COMPOSABLES

### useChat Composable

```typescript
// src/composables/useChat.ts
import { onMounted, onUnmounted, ref } from 'vue';
import { useChatStore } from '@/stores/chat';
import { socketService } from '@/services/socketService';
import { CHAT_EVENTS, CHAT_EVENTS_EMIT } from '@/constants/socketEvents';
import type { Message, Conversation } from '@/types/chat';

export const useChat = () => {
  const chatStore = useChatStore();
  const typingTimeoutRef = ref<NodeJS.Timeout>();

  const setupSocketListeners = () => {
    // Lắng nghe tin nhắn mới
    socketService.on(CHAT_EVENTS_EMIT.NEW_MESSAGE, (message: Message) => {
      if (message.conversationId === chatStore.currentConversation?.id) {
        chatStore.addMessage(message);
      }

      // Cập nhật conversation
      const conv = chatStore.conversations.find(
        (c) => c.id === message.conversationId
      );
      if (conv) {
        conv.lastMessage = message.content;
        conv.lastMessageAt = new Date(message.sentAt);
        chatStore.updateConversation(conv);
      }
    });

    // Lắng nghe message updated
    socketService.on(CHAT_EVENTS_EMIT.MESSAGE_UPDATED, (message: Message) => {
      if (message.conversationId === chatStore.currentConversation?.id) {
        chatStore.updateMessage(message);
      }
    });

    // Lắng nghe message deleted
    socketService.on(CHAT_EVENTS_EMIT.MESSAGE_DELETED, (data: any) => {
      if (data.conversationId === chatStore.currentConversation?.id) {
        chatStore.deleteMessage(data.messageId);
      }
    });

    // Lắng nghe typing
    socketService.on(CHAT_EVENTS_EMIT.USER_TYPING, (data: any) => {
      if (data.conversationId === chatStore.currentConversation?.id) {
        chatStore.addTypingUser(data.user);
      }
    });

    // Lắng nghe stopped typing
    socketService.on(CHAT_EVENTS_EMIT.USER_STOPPED_TYPING, (data: any) => {
      if (data.conversationId === chatStore.currentConversation?.id) {
        chatStore.removeTypingUser(data.userId);
      }
    });

    // Lắng nghe trạng thái user
    socketService.on(CHAT_EVENTS_EMIT.USER_STATUS_CHANGED, (data: any) => {
      console.log(`User ${data.userId} is ${data.status}`);
    });

    // Connection events
    socketService.on('onConnected', () => {
      chatStore.setConnected(true);
      console.log('✅ Chat connected');
    });

    socketService.on('onDisconnected', () => {
      chatStore.setConnected(false);
      console.log('❌ Chat disconnected');
    });

    socketService.on('onError', (error: any) => {
      chatStore.setError(error.message);
      console.error('Socket error:', error);
    });
  };

  const removeSocketListeners = () => {
    socketService.off(CHAT_EVENTS_EMIT.NEW_MESSAGE, () => {});
    socketService.off(CHAT_EVENTS_EMIT.MESSAGE_UPDATED, () => {});
    socketService.off(CHAT_EVENTS_EMIT.MESSAGE_DELETED, () => {});
    socketService.off(CHAT_EVENTS_EMIT.USER_TYPING, () => {});
    socketService.off(CHAT_EVENTS_EMIT.USER_STOPPED_TYPING, () => {});
  };

  // Actions
  const joinConversation = async (conversationId: string) => {
    try {
      chatStore.setLoading(true);
      await socketService.emitWithAck(CHAT_EVENTS.JOIN_CONVERSATION, {
        conversationId,
      });
      console.log('✅ Joined conversation:', conversationId);
    } catch (error: any) {
      chatStore.setError(error.message);
      console.error('Error joining conversation:', error);
    } finally {
      chatStore.setLoading(false);
    }
  };

  const sendMessage = async (content: string, options?: any) => {
    if (!chatStore.currentConversation?.id || !content.trim()) return;

    try {
      const message = await socketService.emitWithAck(
        CHAT_EVENTS.SEND_MESSAGE,
        {
          conversationId: chatStore.currentConversation.id,
          content: content.trim(),
          type: 'TEXT',
          ...options,
        }
      );

      chatStore.addMessage(message);
      return message;
    } catch (error: any) {
      chatStore.setError(error.message);
      throw error;
    }
  };

  const markAsRead = async (messageId?: string) => {
    if (!chatStore.currentConversation?.id) return;

    try {
      await socketService.emitWithAck(CHAT_EVENTS.MARK_AS_READ, {
        conversationId: chatStore.currentConversation.id,
        messageId,
      });
    } catch (error: any) {
      console.error('Error marking as read:', error);
    }
  };

  const notifyTyping = () => {
    if (!chatStore.currentConversation?.id || !chatStore.isConnected) return;

    socketService.emit(CHAT_EVENTS.TYPING_START, {
      conversationId: chatStore.currentConversation.id,
    });

    clearTimeout(typingTimeoutRef.value);
    typingTimeoutRef.value = setTimeout(() => {
      socketService.emit(CHAT_EVENTS.TYPING_STOP, {
        conversationId: chatStore.currentConversation.id,
      });
    }, 2000);
  };

  const editMessage = async (messageId: string, content: string) => {
    try {
      const message = await socketService.emitWithAck(
        CHAT_EVENTS.EDIT_MESSAGE,
        { messageId, content }
      );
      chatStore.updateMessage(message);
      return message;
    } catch (error: any) {
      chatStore.setError(error.message);
      throw error;
    }
  };

  const deleteMsg = async (messageId: string) => {
    try {
      await socketService.emitWithAck(CHAT_EVENTS.DELETE_MESSAGE, {
        messageId,
      });
      chatStore.deleteMessage(messageId);
    } catch (error: any) {
      chatStore.setError(error.message);
      throw error;
    }
  };

  onMounted(() => {
    setupSocketListeners();
  });

  onUnmounted(() => {
    removeSocketListeners();
  });

  return {
    joinConversation,
    sendMessage,
    markAsRead,
    notifyTyping,
    editMessage,
    deleteMsg,
  };
};
```

---

## V. VUE COMPONENTS

### ChatWindow.vue

```vue
<!-- src/components/ChatWindow.vue -->
<template>
  <div class="chat-window">
    <!-- Header -->
    <div class="chat-header">
      <h2>{{ chatStore.currentConversation?.title || 'Select a conversation' }}</h2>
      <button
        v-if="chatStore.currentConversation?.status === 'ACTIVE'"
        @click="handleCloseConversation"
        class="close-btn"
      >
        Close
      </button>
    </div>

    <!-- Messages -->
    <div
      id="messages-container"
      ref="messagesContainer"
      class="messages-container"
      @scroll="handleScroll"
    >
      <div
        v-for="message in chatStore.currentMessages"
        :key="message.id"
        class="message"
        :class="{ own: isOwnMessage(message) }"
      >
        <div class="message-header">
          <span class="sender-name">{{ message.sender?.firstName }}</span>
          <span class="message-time">{{ formatTime(message.sentAt) }}</span>
        </div>
        <div class="message-content">{{ message.content }}</div>
        <div v-if="message.editedAt" class="edited-tag">(edited)</div>

        <!-- Message actions -->
        <div v-if="isOwnMessage(message)" class="message-actions">
          <button @click="handleEditMessage(message)" class="action-btn">
            Edit
          </button>
          <button @click="handleDeleteMessage(message.id)" class="action-btn">
            Delete
          </button>
        </div>

        <!-- Read receipt -->
        <div v-if="isOwnMessage(message) && message.isRead" class="read-receipt">
          ✓✓
        </div>
      </div>

      <!-- Typing indicator -->
      <div v-if="chatStore.isTyping" class="typing-container">
        <TypingIndicator />
        <span class="typing-text">{{ chatStore.typingText }}</span>
      </div>

      <div ref="messagesEndRef"></div>
    </div>

    <!-- Input area -->
    <div v-if="chatStore.currentConversation" class="chat-input">
      <input
        v-model="messageInput"
        type="text"
        placeholder="Type a message..."
        @input="handleInput"
        @keydown.enter="handleSendMessage"
      />
      <button @click="handleSendMessage" :disabled="isSending || !messageInput.trim()">
        {{ isSending ? 'Sending...' : 'Send' }}
      </button>
    </div>

    <!-- Error notification -->
    <div v-if="chatStore.error" class="error-notification">
      {{ chatStore.error }}
      <button @click="chatStore.clearError">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useChatStore } from '@/stores/chat';
import { useChat } from '@/composables/useChat';
import { useAuth } from '@/composables/useAuth';
import TypingIndicator from './TypingIndicator.vue';
import type { Message } from '@/types/chat';

const chatStore = useChatStore();
const { user } = useAuth();
const { sendMessage, markAsRead, notifyTyping, editMessage, deleteMsg } = useChat();

const messageInput = ref('');
const isSending = ref(false);
const messagesContainer = ref<HTMLDivElement>();
const messagesEndRef = ref<HTMLDivElement>();

// Watch currentConversation changes
watch(
  () => chatStore.currentConversation?.id,
  async (newConvId) => {
    if (newConvId) {
      await nextTick();
      scrollToBottom();
    }
  }
);

// Watch messages and auto-scroll
watch(
  () => chatStore.currentMessages.length,
  async () => {
    await nextTick();
    scrollToBottom();
  }
);

const isOwnMessage = (message: Message): boolean => {
  return message.senderId === user?.id;
};

const formatTime = (date: Date | string): string => {
  return new Date(date).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const scrollToBottom = () => {
  messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' });
};

const handleScroll = () => {
  if (!messagesContainer.value) return;
  const { scrollHeight, scrollTop, clientHeight } = messagesContainer.value;

  // If scrolled to bottom, mark as read
  if (scrollHeight - scrollTop < 100) {
    markAsRead();
  }
};

const handleInput = () => {
  notifyTyping();
};

const handleSendMessage = async () => {
  if (!messageInput.value.trim()) return;

  try {
    isSending.value = true;
    await sendMessage(messageInput.value);
    messageInput.value = '';
  } catch (error) {
    console.error('Failed to send message:', error);
  } finally {
    isSending.value = false;
  }
};

const handleEditMessage = async (message: Message) => {
  const newContent = prompt('Edit message:', message.content);
  if (newContent && newContent !== message.content) {
    try {
      await editMessage(message.id, newContent);
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  }
};

const handleDeleteMessage = async (messageId: string) => {
  if (confirm('Are you sure?')) {
    try {
      await deleteMsg(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  }
};

const handleCloseConversation = async () => {
  if (confirm('Close this conversation?')) {
    try {
      // TODO: Implement close conversation
    } catch (error) {
      console.error('Failed to close conversation:', error);
    }
  }
};
</script>

<style scoped>
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.chat-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  padding: 8px 16px;
  background: #ff4444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #cc0000;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 10px;
  background: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.3s ease-in-out;
  position: relative;
}

.message.own {
  align-self: flex-end;
  background: #007bff;
  color: white;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 12px;
  opacity: 0.7;
}

.sender-name {
  font-weight: 600;
}

.message-content {
  word-wrap: break-word;
  line-height: 1.4;
}

.edited-tag {
  font-size: 11px;
  opacity: 0.6;
  margin-top: 4px;
  font-style: italic;
}

.message-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 4px 8px;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.1);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.2);
}

.read-receipt {
  font-size: 12px;
  text-align: right;
  margin-top: 4px;
  opacity: 0.7;
}

.typing-container {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f0f0f0;
  border-radius: 10px;
  max-width: 70%;
}

.typing-text {
  font-size: 13px;
  color: #666;
}

.chat-input {
  padding: 15px 20px;
  background: white;
  display: flex;
  gap: 10px;
  border-top: 1px solid #e0e0e0;
}

.chat-input input {
  flex: 1;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 20px;
  outline: none;
  font-size: 14px;
  font-family: inherit;
}

.chat-input input:focus {
  border-color: #007bff;
}

.chat-input button {
  padding: 10px 25px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.chat-input button:hover:not(:disabled) {
  background: #0056b3;
}

.chat-input button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-notification {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: #ffebee;
  color: #c62828;
  border-top: 1px solid #ef5350;
}

.error-notification button {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  opacity: 0.7;
}

.error-notification button:hover {
  opacity: 1;
}
</style>
```

### ConversationList.vue

```vue
<!-- src/components/ConversationList.vue -->
<template>
  <div class="conversation-list">
    <div class="list-header">
      <h3>Messages</h3>
      <span class="unread-badge" v-if="chatStore.unreadCount > 0">
        {{ chatStore.unreadCount }}
      </span>
    </div>

    <div class="search-box">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search conversations..."
      />
    </div>

    <div class="conversations">
      <div
        v-for="conv in filteredConversations"
        :key="conv.id"
        class="conversation-item"
        :class="{ active: chatStore.currentConversation?.id === conv.id }"
        @click="selectConversation(conv)"
      >
        <div class="conversation-content">
          <div class="conversation-title">
            {{ conv.title }}
            <span v-if="conv.status !== 'ACTIVE'" class="status-badge">
              {{ conv.status }}
            </span>
          </div>
          <div class="conversation-preview">{{ conv.lastMessage }}</div>
        </div>

        <div class="conversation-meta">
          <div class="conversation-time">
            {{ formatDate(conv.lastMessageAt) }}
          </div>
          <span v-if="conv.unreadCount > 0" class="unread-indicator">
            {{ conv.unreadCount }}
          </span>
        </div>
      </div>

      <div v-if="filteredConversations.length === 0" class="empty-state">
        No conversations yet
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useChatStore } from '@/stores/chat';
import { chatAPI } from '@/services/chatAPI';
import type { Conversation } from '@/types/chat';

const chatStore = useChatStore();
const searchQuery = ref('');

const filteredConversations = computed(() => {
  if (!searchQuery.value) {
    return chatStore.conversations;
  }

  return chatStore.conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '';
  const d = new Date(date);
  const today = new Date();

  if (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  ) {
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  return d.toLocaleDateString('vi-VN', {
    month: 'short',
    day: 'numeric',
  });
};

const selectConversation = (conv: Conversation) => {
  chatStore.setCurrentConversation(conv);
};

onMounted(async () => {
  try {
    chatStore.setLoading(true);
    const conversations = await chatAPI.getConversations();
    chatStore.setConversations(conversations);
  } catch (error) {
    console.error('Error loading conversations:', error);
    chatStore.setError('Failed to load conversations');
  } finally {
    chatStore.setLoading(false);
  }
});
</script>

<style scoped>
.conversation-list {
  width: 300px;
  background: white;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.list-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.unread-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #ff4444;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
}

.search-box {
  padding: 10px 15px;
  border-bottom: 1px solid #f0f0f0;
}

.search-box input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 13px;
  outline: none;
}

.search-box input:focus {
  border-color: #007bff;
}

.conversations {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  padding: 12px 15px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.conversation-item:hover {
  background: #f9f9f9;
}

.conversation-item.active {
  background: #e3f2fd;
  border-left: 4px solid #007bff;
}

.conversation-content {
  flex: 1;
  min-width: 0;
}

.conversation-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  font-size: 11px;
  padding: 2px 6px;
  background: #ffeaa7;
  border-radius: 3px;
  font-weight: 400;
}

.conversation-preview {
  font-size: 12px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.conversation-time {
  font-size: 12px;
  color: #999;
}

.unread-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: #ff4444;
  color: white;
  border-radius: 50%;
  font-size: 11px;
  font-weight: bold;
}

.empty-state {
  padding: 30px 15px;
  text-align: center;
  color: #999;
  font-size: 14px;
}
</style>
```

### TypingIndicator.vue

```vue
<!-- src/components/TypingIndicator.vue -->
<template>
  <div class="typing-indicator">
    <span></span>
    <span></span>
    <span></span>
  </div>
</template>

<style scoped>
.typing-indicator {
  display: flex;
  gap: 4px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%,
  60%,
  100% {
    opacity: 0.5;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-8px);
  }
}
</style>
```

---

## VI. CHAT API SERVICE

```typescript
// src/services/chatAPI.ts
import axios from 'axios';
import type { Conversation, Message } from '@/types/chat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: `${API_URL}/chat`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const chatAPI = {
  // Conversations
  getConversations: async (limit = 20, offset = 0) => {
    const { data } = await api.get<any>('/conversations', {
      params: { limit, offset },
    });
    return data.data;
  },

  getConversation: async (id: string) => {
    const { data } = await api.get<any>(`/conversations/${id}`);
    return data.data;
  },

  createConversation: async (payload: Partial<Conversation>) => {
    const { data } = await api.post<any>('/conversations', payload);
    return data.data;
  },

  // Messages
  getMessages: async (conversationId: string, limit = 50, offset = 0) => {
    const { data } = await api.get<any>(
      `/conversations/${conversationId}/messages`,
      { params: { limit, offset } }
    );
    return data.data;
  },

  sendMessage: async (conversationId: string, content: string) => {
    const { data } = await api.post<any>(
      `/conversations/${conversationId}/messages`,
      { content }
    );
    return data.data;
  },

  editMessage: async (messageId: string, content: string) => {
    const { data } = await api.put<any>(`/messages/${messageId}`, { content });
    return data.data;
  },

  deleteMessage: async (messageId: string) => {
    const { data } = await api.delete<any>(`/messages/${messageId}`);
    return data;
  },

  markAsRead: async (conversationId: string) => {
    const { data } = await api.put<any>(
      `/conversations/${conversationId}/read`
    );
    return data;
  },
};
```

---

## VII. MAIN APP.VUE

```vue
<!-- src/App.vue -->
<template>
  <div class="app">
    <div v-if="isAuthenticated" class="chat-layout">
      <ConversationList />
      <ChatWindow />
    </div>
    <div v-else class="login-page">
      <h1>Chat Application</h1>
      <p>Please log in to continue</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useAuth } from '@/composables/useAuth';
import { socketService } from '@/services/socketService';
import ConversationList from '@/components/ConversationList.vue';
import ChatWindow from '@/components/ChatWindow.vue';

const { user } = useAuth();

const isAuthenticated = computed(() => !!user?.value);

onMounted(async () => {
  if (isAuthenticated.value) {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        await socketService.connect(token);
      } catch (error) {
        console.error('Failed to connect socket:', error);
      }
    }
  }
});
</script>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
    Arial, sans-serif;
  background: #f5f5f5;
}

.app {
  height: 100vh;
  width: 100%;
}

.chat-layout {
  display: flex;
  height: 100vh;
}

.login-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.login-page h1 {
  font-size: 48px;
  margin-bottom: 20px;
}

.login-page p {
  font-size: 18px;
}
</style>
```

---

## VIII. ENV VARIABLES

```bash
# .env.local
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

---

## IX. VITE CONFIG

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

---

**Chúc bạn triển khai thành công với Vue 3! 🚀**
