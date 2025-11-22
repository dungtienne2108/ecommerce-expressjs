# 🎨 HƯỚNG DẪN TÍCH HỢP CHAT REALTIME VÀO FRONTEND

Tài liệu này hướng dẫn chi tiết cách tích hợp chức năng chat realtime vào frontend application (React, Vue, Angular, hoặc Vanilla JS).

---

## 📋 MỤC LỤC

1. [Cài đặt Dependencies](#1-cài-đặt-dependencies)
2. [React Integration](#2-react-integration)
3. [Vue.js Integration](#3-vuejs-integration)
4. [Angular Integration](#4-angular-integration)
5. [Vanilla JavaScript](#5-vanilla-javascript)
6. [UI Components](#6-ui-components)
7. [State Management](#7-state-management)
8. [Best Practices](#8-best-practices)

---

## 1. CÀI ĐẶT DEPENDENCIES

### 1.1. React/Next.js

```bash
npm install socket.io-client
# Hoặc
yarn add socket.io-client
```

### 1.2. Vue.js

```bash
npm install socket.io-client
# Vue 3 composition API recommended
```

### 1.3. Angular

```bash
npm install socket.io-client
npm install --save-dev @types/socket.io-client
```

---

## 2. REACT INTEGRATION

### 2.1. Socket Service (Singleton Pattern)

Tạo file `src/services/socket.service.ts`:

```typescript
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;

  /**
   * Kết nối tới Socket.IO server
   */
  connect(token: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.token = token;

    this.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
    });

    return this.socket;
  }

  /**
   * Ngắt kết nối
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Lấy socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Emit event với callback
   */
  emit<T = any>(event: string, data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit(event, data, (response: any) => {
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Listen to event
   */
  on(event: string, callback: (...args: any[]) => void): void {
    this.socket?.on(event, callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: (...args: any[]) => void): void {
    this.socket?.off(event, callback);
  }
}

export const socketService = new SocketService();
```

### 2.2. React Hook - useSocket

Tạo file `src/hooks/useSocket.ts`:

```typescript
import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { socketService } from '../services/socket.service';

export function useSocket(token: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    // Connect
    const socketInstance = socketService.connect(token);
    setSocket(socketInstance);

    // Event listeners
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);

    // Cleanup
    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      // Note: Không disconnect ở đây vì socket là singleton
      // Chỉ disconnect khi user logout
    };
  }, [token]);

  return { socket, isConnected };
}
```

### 2.3. React Hook - useChat

Tạo file `src/hooks/useChat.ts`:

```typescript
import { useEffect, useState, useCallback } from 'react';
import { socketService } from '../services/socket.service';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  status: string;
  sentAt: string;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface Conversation {
  id: string;
  title: string;
  type: string;
  status: string;
  lastMessageAt?: string;
  lastMessageText?: string;
  unreadCount: number;
}

export function useChat(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState<{ userId: string; userName: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Load messages
   */
  const loadMessages = useCallback(async (limit = 50, offset = 0) => {
    if (!conversationId) return;

    setIsLoading(true);
    try {
      const data = await socketService.emit<Message[]>('chat:get_messages', {
        conversationId,
        limit,
        offset,
      });
      setMessages(data);
    } catch (error) {
      console.error('Load messages error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  /**
   * Send message
   */
  const sendMessage = useCallback(async (content: string, type = 'TEXT') => {
    if (!conversationId) return;

    try {
      const message = await socketService.emit<Message>('chat:send_message', {
        conversationId,
        content,
        type,
      });
      // Message sẽ được nhận qua event 'chat:new_message'
      // Không cần update state ở đây
      return message;
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  }, [conversationId]);

  /**
   * Join conversation
   */
  const joinConversation = useCallback(async () => {
    if (!conversationId) return;

    try {
      await socketService.emit('chat:join_conversation', { conversationId });
      console.log('✅ Joined conversation:', conversationId);
    } catch (error) {
      console.error('Join conversation error:', error);
    }
  }, [conversationId]);

  /**
   * Leave conversation
   */
  const leaveConversation = useCallback(() => {
    if (!conversationId) return;

    const socket = socketService.getSocket();
    socket?.emit('chat:leave_conversation', { conversationId });
    console.log('👋 Left conversation:', conversationId);
  }, [conversationId]);

  /**
   * Mark as read
   */
  const markAsRead = useCallback(async (messageId?: string) => {
    if (!conversationId) return;

    try {
      await socketService.emit('chat:mark_as_read', {
        conversationId,
        messageId,
      });
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  }, [conversationId]);

  /**
   * Typing indicator
   */
  const startTyping = useCallback(() => {
    if (!conversationId) return;
    const socket = socketService.getSocket();
    socket?.emit('chat:typing_start', { conversationId });
  }, [conversationId]);

  const stopTyping = useCallback(() => {
    if (!conversationId) return;
    const socket = socketService.getSocket();
    socket?.emit('chat:typing_stop', { conversationId });
  }, [conversationId]);

  /**
   * Event listeners
   */
  useEffect(() => {
    if (!conversationId) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    // Join conversation
    joinConversation();

    // New message
    const handleNewMessage = (message: Message) => {
      if (message.conversationId === conversationId) {
        setMessages((prev) => [...prev, message]);
      }
    };

    // Typing
    const handleTyping = (data: { conversationId: string; user: any }) => {
      if (data.conversationId === conversationId) {
        setIsTyping({
          userId: data.user.id,
          userName: `${data.user.firstName} ${data.user.lastName}`,
        });

        // Auto clear after 3 seconds
        setTimeout(() => setIsTyping(null), 3000);
      }
    };

    const handleStopTyping = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === conversationId) {
        setIsTyping(null);
      }
    };

    // Message updated
    const handleMessageUpdated = (message: Message) => {
      if (message.conversationId === conversationId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === message.id ? message : m))
        );
      }
    };

    // Message deleted
    const handleMessageDeleted = (data: { messageId: string; conversationId: string }) => {
      if (data.conversationId === conversationId) {
        setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
      }
    };

    // Register events
    socket.on('chat:new_message', handleNewMessage);
    socket.on('chat:user_typing', handleTyping);
    socket.on('chat:user_stopped_typing', handleStopTyping);
    socket.on('chat:message_updated', handleMessageUpdated);
    socket.on('chat:message_deleted', handleMessageDeleted);

    // Cleanup
    return () => {
      socket.off('chat:new_message', handleNewMessage);
      socket.off('chat:user_typing', handleTyping);
      socket.off('chat:user_stopped_typing', handleStopTyping);
      socket.off('chat:message_updated', handleMessageUpdated);
      socket.off('chat:message_deleted', handleMessageDeleted);
      leaveConversation();
    };
  }, [conversationId, joinConversation, leaveConversation]);

  return {
    messages,
    isTyping,
    isLoading,
    loadMessages,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping,
  };
}
```

### 2.4. React Component - ChatRoom

Tạo file `src/components/ChatRoom.tsx`:

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../hooks/useChat';
import { useSocket } from '../hooks/useSocket';

interface ChatRoomProps {
  conversationId: string;
  token: string;
  currentUserId: string;
}

export function ChatRoom({ conversationId, token, currentUserId }: ChatRoomProps) {
  const { isConnected } = useSocket(token);
  const {
    messages,
    isTyping,
    isLoading,
    loadMessages,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping,
  } = useChat(conversationId);

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load messages on mount
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Scroll to bottom when new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark as read when messages change
  useEffect(() => {
    if (messages.length > 0) {
      markAsRead();
    }
  }, [messages, markAsRead]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    // Emit typing start
    startTyping();

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim()) return;

    try {
      stopTyping();
      await sendMessage(inputValue.trim());
      setInputValue('');
    } catch (error) {
      alert('Gửi tin nhắn thất bại');
    }
  };

  if (!isConnected) {
    return <div className="chat-room loading">Đang kết nối...</div>;
  }

  return (
    <div className="chat-room">
      {/* Header */}
      <div className="chat-header">
        <h3>Chat Room</h3>
        <div className="status">
          {isConnected ? '🟢 Online' : '🔴 Offline'}
        </div>
      </div>

      {/* Messages */}
      <div className="messages-container">
        {isLoading ? (
          <div className="loading">Đang tải tin nhắn...</div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${
                  message.senderId === currentUserId ? 'sent' : 'received'
                }`}
              >
                <div className="message-header">
                  <span className="sender-name">
                    {message.sender
                      ? `${message.sender.firstName} ${message.sender.lastName}`
                      : 'Unknown'}
                  </span>
                  <span className="timestamp">
                    {new Date(message.sentAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="message-content">{message.content}</div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="typing-indicator">
                {isTyping.userName} đang nhập...
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form className="chat-input" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Nhập tin nhắn..."
          disabled={!isConnected}
        />
        <button type="submit" disabled={!isConnected || !inputValue.trim()}>
          Gửi
        </button>
      </form>
    </div>
  );
}
```

### 2.5. CSS Styling

Tạo file `src/components/ChatRoom.css`:

```css
.chat-room {
  display: flex;
  flex-direction: column;
  height: 600px;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.chat-header {
  padding: 15px;
  background: #4a90e2;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-header h3 {
  margin: 0;
  font-size: 18px;
}

.status {
  font-size: 14px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f5f5f5;
}

.message {
  margin-bottom: 15px;
  padding: 10px 15px;
  border-radius: 8px;
  max-width: 70%;
  animation: slideIn 0.2s ease-out;
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

.message.sent {
  background: #dcf8c6;
  margin-left: auto;
  text-align: right;
}

.message.received {
  background: white;
  margin-right: auto;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 12px;
  color: #666;
}

.sender-name {
  font-weight: bold;
}

.timestamp {
  font-size: 11px;
}

.message-content {
  font-size: 14px;
  word-wrap: break-word;
}

.typing-indicator {
  color: #888;
  font-style: italic;
  font-size: 13px;
  padding: 10px;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.chat-input {
  display: flex;
  padding: 15px;
  background: white;
  border-top: 1px solid #ddd;
}

.chat-input input {
  flex: 1;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 14px;
  outline: none;
}

.chat-input input:focus {
  border-color: #4a90e2;
}

.chat-input button {
  margin-left: 10px;
  padding: 10px 20px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: background 0.2s;
}

.chat-input button:hover:not(:disabled) {
  background: #357abd;
}

.chat-input button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #888;
}
```

### 2.6. Usage Example

```tsx
import React from 'react';
import { ChatRoom } from './components/ChatRoom';

function App() {
  const token = localStorage.getItem('accessToken');
  const currentUserId = localStorage.getItem('userId');
  const conversationId = 'your-conversation-id';

  if (!token) {
    return <div>Please login first</div>;
  }

  return (
    <div className="app">
      <ChatRoom
        conversationId={conversationId}
        token={token}
        currentUserId={currentUserId}
      />
    </div>
  );
}

export default App;
```

---

## 3. VUE.JS INTEGRATION

### 3.1. Socket Plugin

Tạo file `src/plugins/socket.ts`:

```typescript
import { io, Socket } from 'socket.io-client';
import { App } from 'vue';

export interface SocketPlugin {
  socket: Socket | null;
  connect(token: string): void;
  disconnect(): void;
}

export const socketPlugin = {
  install(app: App, options: { url: string }) {
    let socket: Socket | null = null;

    const plugin: SocketPlugin = {
      socket,
      connect(token: string) {
        if (socket?.connected) return;

        socket = io(options.url, {
          auth: { token },
          transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
          console.log('✅ Socket connected');
        });

        this.socket = socket;
      },
      disconnect() {
        socket?.disconnect();
        socket = null;
        this.socket = null;
      },
    };

    app.config.globalProperties.$socket = plugin;
    app.provide('socket', plugin);
  },
};
```

### 3.2. Composable - useChat (Vue 3)

Tạo file `src/composables/useChat.ts`:

```typescript
import { ref, onMounted, onUnmounted, inject } from 'vue';
import type { SocketPlugin } from '../plugins/socket';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  sentAt: string;
  sender?: {
    firstName: string;
    lastName: string;
  };
}

export function useChat(conversationId: string) {
  const socketPlugin = inject<SocketPlugin>('socket');
  const messages = ref<Message[]>([]);
  const isTyping = ref<string | null>(null);

  const sendMessage = (content: string): Promise<Message> => {
    return new Promise((resolve, reject) => {
      socketPlugin?.socket?.emit(
        'chat:send_message',
        { conversationId, content, type: 'TEXT' },
        (response: any) => {
          if (response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response.error));
          }
        }
      );
    });
  };

  const loadMessages = (): Promise<Message[]> => {
    return new Promise((resolve, reject) => {
      socketPlugin?.socket?.emit(
        'chat:get_messages',
        { conversationId, limit: 50, offset: 0 },
        (response: any) => {
          if (response.success) {
            messages.value = response.data;
            resolve(response.data);
          } else {
            reject(new Error(response.error));
          }
        }
      );
    });
  };

  const joinConversation = () => {
    socketPlugin?.socket?.emit(
      'chat:join_conversation',
      { conversationId },
      (response: any) => {
        console.log('Joined conversation:', response);
      }
    );
  };

  onMounted(() => {
    const socket = socketPlugin?.socket;
    if (!socket) return;

    joinConversation();

    // Event listeners
    const handleNewMessage = (message: Message) => {
      if (message.conversationId === conversationId) {
        messages.value.push(message);
      }
    };

    const handleTyping = (data: any) => {
      if (data.conversationId === conversationId) {
        isTyping.value = `${data.user.firstName} ${data.user.lastName}`;
        setTimeout(() => (isTyping.value = null), 3000);
      }
    };

    socket.on('chat:new_message', handleNewMessage);
    socket.on('chat:user_typing', handleTyping);

    // Load messages
    loadMessages();

    // Cleanup
    onUnmounted(() => {
      socket.off('chat:new_message', handleNewMessage);
      socket.off('chat:user_typing', handleTyping);
      socket.emit('chat:leave_conversation', { conversationId });
    });
  });

  return {
    messages,
    isTyping,
    sendMessage,
    loadMessages,
  };
}
```

### 3.3. Vue Component

```vue
<template>
  <div class="chat-room">
    <div class="messages">
      <div
        v-for="message in messages"
        :key="message.id"
        :class="['message', message.senderId === currentUserId ? 'sent' : 'received']"
      >
        <div class="sender">
          {{ message.sender?.firstName }} {{ message.sender?.lastName }}
        </div>
        <div class="content">{{ message.content }}</div>
        <div class="time">{{ formatTime(message.sentAt) }}</div>
      </div>
      <div v-if="isTyping" class="typing">{{ isTyping }} đang nhập...</div>
    </div>

    <form @submit.prevent="handleSend" class="input-form">
      <input v-model="inputValue" placeholder="Nhập tin nhắn..." />
      <button type="submit">Gửi</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useChat } from '../composables/useChat';

const props = defineProps<{
  conversationId: string;
  currentUserId: string;
}>();

const { messages, isTyping, sendMessage } = useChat(props.conversationId);
const inputValue = ref('');

const handleSend = async () => {
  if (!inputValue.value.trim()) return;

  try {
    await sendMessage(inputValue.value);
    inputValue.value = '';
  } catch (error) {
    console.error('Send error:', error);
  }
};

const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString();
};
</script>

<style scoped>
/* Similar to React CSS */
</style>
```

---

## 4. ANGULAR INTEGRATION

### 4.1. Socket Service

Tạo file `src/app/services/socket.service.ts`:

```typescript
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket | null = null;

  connect(token: string): void {
    if (this.socket?.connected) return;

    this.socket = io(environment.socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  emit<T>(event: string, data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit(event, data, (response: any) => {
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  on<T>(event: string): Observable<T> {
    return new Observable((observer) => {
      if (!this.socket) {
        observer.error(new Error('Socket not connected'));
        return;
      }

      const handler = (data: T) => {
        observer.next(data);
      };

      this.socket.on(event, handler);

      return () => {
        this.socket?.off(event, handler);
      };
    });
  }
}
```

### 4.2. Chat Service

```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SocketService } from './socket.service';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  sentAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  public messages$ = this.messagesSubject.asObservable();

  constructor(private socketService: SocketService) {
    // Listen for new messages
    this.socketService.on<Message>('chat:new_message').subscribe((message) => {
      const currentMessages = this.messagesSubject.value;
      this.messagesSubject.next([...currentMessages, message]);
    });
  }

  async joinConversation(conversationId: string): Promise<void> {
    await this.socketService.emit('chat:join_conversation', { conversationId });
  }

  async loadMessages(conversationId: string): Promise<void> {
    const messages = await this.socketService.emit<Message[]>('chat:get_messages', {
      conversationId,
      limit: 50,
      offset: 0,
    });
    this.messagesSubject.next(messages);
  }

  async sendMessage(conversationId: string, content: string): Promise<Message> {
    return this.socketService.emit<Message>('chat:send_message', {
      conversationId,
      content,
      type: 'TEXT',
    });
  }
}
```

### 4.3. Chat Component

```typescript
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { ChatService } from '../services/chat.service';
import { SocketService } from '../services/socket.service';

@Component({
  selector: 'app-chat-room',
  templateUrl: './chat-room.component.html',
  styleUrls: ['./chat-room.component.css'],
})
export class ChatRoomComponent implements OnInit, OnDestroy {
  @Input() conversationId!: string;
  @Input() token!: string;

  messages$ = this.chatService.messages$;
  inputValue = '';

  constructor(
    private socketService: SocketService,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    this.socketService.connect(this.token);
    this.chatService.joinConversation(this.conversationId);
    this.chatService.loadMessages(this.conversationId);
  }

  ngOnDestroy(): void {
    // Leave conversation when component destroyed
  }

  async sendMessage(): Promise<void> {
    if (!this.inputValue.trim()) return;

    try {
      await this.chatService.sendMessage(this.conversationId, this.inputValue);
      this.inputValue = '';
    } catch (error) {
      console.error('Send error:', error);
    }
  }
}
```

---

## 5. VANILLA JAVASCRIPT

### 5.1. Simple Implementation

```html
<!DOCTYPE html>
<html>
<head>
  <title>Chat App</title>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
</head>
<body>
  <div id="chat-room">
    <div id="messages"></div>
    <input id="message-input" type="text" placeholder="Nhập tin nhắn...">
    <button id="send-btn">Gửi</button>
  </div>

  <script>
    const TOKEN = 'YOUR_JWT_TOKEN';
    const CONVERSATION_ID = 'your-conversation-id';

    // Connect
    const socket = io('http://localhost:3000', {
      auth: { token: TOKEN }
    });

    socket.on('connect', () => {
      console.log('✅ Connected');

      // Join conversation
      socket.emit('chat:join_conversation', { conversationId: CONVERSATION_ID }, (res) => {
        if (res.success) {
          loadMessages();
        }
      });
    });

    // Load messages
    function loadMessages() {
      socket.emit('chat:get_messages', {
        conversationId: CONVERSATION_ID,
        limit: 50,
        offset: 0
      }, (response) => {
        if (response.success) {
          displayMessages(response.data);
        }
      });
    }

    // Display messages
    function displayMessages(messages) {
      const messagesDiv = document.getElementById('messages');
      messagesDiv.innerHTML = '';

      messages.forEach(msg => {
        const div = document.createElement('div');
        div.textContent = `${msg.sender.firstName}: ${msg.content}`;
        messagesDiv.appendChild(div);
      });
    }

    // New message
    socket.on('chat:new_message', (message) => {
      if (message.conversationId === CONVERSATION_ID) {
        const messagesDiv = document.getElementById('messages');
        const div = document.createElement('div');
        div.textContent = `${message.sender.firstName}: ${message.content}`;
        messagesDiv.appendChild(div);
      }
    });

    // Send message
    document.getElementById('send-btn').addEventListener('click', () => {
      const input = document.getElementById('message-input');
      const content = input.value.trim();

      if (!content) return;

      socket.emit('chat:send_message', {
        conversationId: CONVERSATION_ID,
        content,
        type: 'TEXT'
      }, (response) => {
        if (response.success) {
          input.value = '';
        }
      });
    });
  </script>
</body>
</html>
```

---

## 6. UI COMPONENTS

### 6.1. Conversation List Component

```tsx
// React example
interface Conversation {
  id: string;
  title: string;
  lastMessageText?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

export function ConversationList({ onSelect }: { onSelect: (id: string) => void }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    // Load conversations via REST API
    fetch('http://localhost:3000/api/chat/conversations', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setConversations(data.data));
  }, []);

  return (
    <div className="conversation-list">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className="conversation-item"
          onClick={() => onSelect(conv.id)}
        >
          <div className="title">{conv.title}</div>
          <div className="preview">{conv.lastMessageText}</div>
          {conv.unreadCount > 0 && (
            <div className="unread-badge">{conv.unreadCount}</div>
          )}
        </div>
      ))}
    </div>
  );
}
```

### 6.2. Message Input with File Upload

```tsx
export function MessageInput({ onSend }: { onSend: (content: string, files?: File[]) => void }) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSend(content, files);
    setContent('');
    setFiles([]);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="file"
        multiple
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
      />
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Nhập tin nhắn..."
      />
      <button type="submit">Gửi</button>
    </form>
  );
}
```

---

## 7. STATE MANAGEMENT

### 7.1. Redux Toolkit (React)

```typescript
// chatSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ChatState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  activeConversationId: string | null;
}

const initialState: ChatState = {
  conversations: [],
  messages: {},
  activeConversationId: null,
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
    },
    setMessages: (state, action: PayloadAction<{ conversationId: string; messages: Message[] }>) => {
      state.messages[action.payload.conversationId] = action.payload.messages;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      const { conversationId } = action.payload;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      state.messages[conversationId].push(action.payload);
    },
    setActiveConversation: (state, action: PayloadAction<string>) => {
      state.activeConversationId = action.payload;
    },
  },
});

export const { setConversations, setMessages, addMessage, setActiveConversation } = chatSlice.actions;
export default chatSlice.reducer;
```

### 7.2. Pinia (Vue)

```typescript
// stores/chat.ts
import { defineStore } from 'pinia';

export const useChatStore = defineStore('chat', {
  state: () => ({
    conversations: [] as Conversation[],
    messages: {} as Record<string, Message[]>,
    activeConversationId: null as string | null,
  }),

  actions: {
    setConversations(conversations: Conversation[]) {
      this.conversations = conversations;
    },

    addMessage(message: Message) {
      const { conversationId } = message;
      if (!this.messages[conversationId]) {
        this.messages[conversationId] = [];
      }
      this.messages[conversationId].push(message);
    },

    setActiveConversation(id: string) {
      this.activeConversationId = id;
    },
  },

  getters: {
    activeMessages: (state) => {
      return state.activeConversationId
        ? state.messages[state.activeConversationId] || []
        : [];
    },
  },
});
```

---

## 8. BEST PRACTICES

### 8.1. Error Handling

```typescript
// Wrap socket operations với try-catch
try {
  await sendMessage(content);
} catch (error) {
  // Show user-friendly error
  toast.error('Không thể gửi tin nhắn. Vui lòng thử lại.');

  // Log for debugging
  console.error('Send message error:', error);

  // Optionally retry
  retryOperation(() => sendMessage(content));
}
```

### 8.2. Reconnection Logic

```typescript
const socket = io(url, {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`Reconnected after ${attemptNumber} attempts`);

  // Rejoin all conversations
  activeConversations.forEach((convId) => {
    socket.emit('chat:join_conversation', { conversationId: convId });
  });

  // Reload messages
  loadMessages();
});
```

### 8.3. Memory Management

```typescript
// Always cleanup event listeners
useEffect(() => {
  const handleNewMessage = (msg: Message) => {
    // Handle message
  };

  socket.on('chat:new_message', handleNewMessage);

  return () => {
    socket.off('chat:new_message', handleNewMessage);
  };
}, []);
```

### 8.4. Optimistic UI Updates

```typescript
const sendMessage = async (content: string) => {
  // Create optimistic message
  const optimisticMessage: Message = {
    id: `temp-${Date.now()}`,
    conversationId,
    content,
    senderId: currentUserId,
    sentAt: new Date().toISOString(),
    status: 'SENDING',
  };

  // Add to UI immediately
  setMessages((prev) => [...prev, optimisticMessage]);

  try {
    // Send to server
    const realMessage = await socketService.emit('chat:send_message', {
      conversationId,
      content,
      type: 'TEXT',
    });

    // Replace optimistic with real message
    setMessages((prev) =>
      prev.map((m) => (m.id === optimisticMessage.id ? realMessage : m))
    );
  } catch (error) {
    // Mark as failed
    setMessages((prev) =>
      prev.map((m) =>
        m.id === optimisticMessage.id ? { ...m, status: 'FAILED' } : m
      )
    );
  }
};
```

### 8.5. Security

```typescript
// Never expose token in client code
// Store in secure httpOnly cookies or encrypted localStorage

// Validate all incoming messages
const isValidMessage = (msg: any): msg is Message => {
  return (
    typeof msg.id === 'string' &&
    typeof msg.content === 'string' &&
    typeof msg.senderId === 'string'
  );
};

socket.on('chat:new_message', (data) => {
  if (isValidMessage(data)) {
    addMessage(data);
  } else {
    console.error('Invalid message received:', data);
  }
});
```

---

## 9. KẾT LUẬN

### Checklist tích hợp Frontend:

- ✅ Cài đặt `socket.io-client`
- ✅ Tạo Socket Service/Plugin
- ✅ Implement authentication với JWT
- ✅ Tạo Chat hooks/composables
- ✅ Build UI components (Message list, Input, Conversation list)
- ✅ Handle realtime events (new_message, typing, read receipts)
- ✅ Implement error handling và reconnection
- ✅ Add optimistic UI updates
- ✅ Cleanup event listeners
- ✅ State management (Redux/Pinia/Context)

### Resources:

- Socket.IO Client Docs: https://socket.io/docs/v4/client-api/
- React Hooks: https://react.dev/reference/react
- Vue Composables: https://vuejs.org/guide/reusability/composables.html

Happy coding! 🚀
