# 📱 HƯỚNG DẪN TÍCH HỢP CHAT REALTIME VÀO FRONT END

## I. THIẾT LẬP SOCKET.IO CLIENT

### 1. Cài đặt Socket.IO Client

```bash
npm install socket.io-client
```

### 2. Tạo Socket Service (React Example)

```typescript
// src/services/socketService.ts
import io, { Socket } from 'socket.io-client';
import { CHAT_EVENTS, CHAT_EVENTS_EMIT } from '../constants/socketEvents';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  /**
   * Kết nối đến Socket.IO server
   * @param token - JWT token từ localStorage
   */
  connect(token: string): void {
    if (this.socket?.connected) return;

    this.socket = io(process.env.REACT_APP_API_URL || 'http://localhost:3000', {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to chat server');
      this.emit('onConnected');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from chat server');
      this.emit('onDisconnected');
    });

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
      this.emit('onError', error);
    });
  }

  /**
   * Ngắt kết nối
   */
  disconnect(): void {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }
  }

  /**
   * Lắng nghe một sự kiện
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());

      // Đăng ký listener với socket
      this.socket?.on(event, (data: any) => {
        this.listeners.get(event)?.forEach(cb => cb(data));
      });
    }

    this.listeners.get(event)?.add(callback);
  }

  /**
   * Bỏ lắng nghe sự kiện
   */
  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Phát sự kiện
   */
  emit(event: string, data?: any): void {
    this.socket?.emit(event, data);
  }

  /**
   * Phát sự kiện với callback
   */
  emitWithAck(event: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket không kết nối'));
        return;
      }

      this.socket.emit(event, data, (response: any) => {
        if (response?.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Có lỗi xảy ra'));
        }
      });
    });
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
```

---

## II. CONSTANTS - ĐỊNH NGHĨA CÁC EVENTS

```typescript
// src/constants/socketEvents.ts

// Client → Server
export const CHAT_EVENTS = {
  JOIN_CONVERSATION: 'chat:join_conversation',
  LEAVE_CONVERSATION: 'chat:leave_conversation',
  CREATE_CONVERSATION: 'chat:create_conversation',
  SEND_MESSAGE: 'chat:send_message',
  GET_MESSAGES: 'chat:get_messages',
  MARK_AS_READ: 'chat:mark_as_read',
  TYPING_START: 'chat:typing_start',
  TYPING_STOP: 'chat:typing_stop',
  EDIT_MESSAGE: 'chat:edit_message',
  DELETE_MESSAGE: 'chat:delete_message',
  CLOSE_CONVERSATION: 'chat:close_conversation',
};

// Server → Client
export const CHAT_EVENTS_EMIT = {
  NEW_MESSAGE: 'chat:new_message',
  MESSAGE_UPDATED: 'chat:message_updated',
  MESSAGE_DELETED: 'chat:message_deleted',
  MESSAGE_READ: 'chat:message_read',
  CONVERSATION_CREATED: 'chat:conversation_created',
  CONVERSATION_UPDATED: 'chat:conversation_updated',
  CONVERSATION_CLOSED: 'chat:conversation_closed',
  USER_TYPING: 'chat:user_typing',
  USER_STOPPED_TYPING: 'chat:user_stopped_typing',
  USER_STATUS_CHANGED: 'chat:user_status_changed',
  ERROR: 'chat:error',
};

// Room naming
export const SOCKET_ROOMS = {
  conversation: (conversationId: string) => `conversation:${conversationId}`,
  user: (userId: string) => `user:${userId}`,
};
```

---

## III. TYPES & INTERFACES

```typescript
// src/types/chat.types.ts

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM' | 'ORDER' | 'PRODUCT';
  attachments?: Array<{
    url: string;
    type: string;
    name: string;
    size: number;
  }>;
  replyToId?: string;
  orderId?: string;
  productId?: string;
  isRead: boolean;
  sentAt: Date;
  editedAt?: Date;
  deletedAt?: Date;
  sender?: User;
  replyTo?: Message;
}

export interface Conversation {
  id: string;
  type: 'CUSTOMER_SUPPORT' | 'SHOP_TO_CUSTOMER' | 'ADMIN_SUPPORT';
  title: string;
  subject?: string;
  status: 'ACTIVE' | 'CLOSED' | 'RESOLVED';
  lastMessage?: string;
  lastMessageAt?: Date;
  messageCount: number;
  unreadCount: number;
  participants?: Array<{
    id: string;
    user: User;
    role: 'CUSTOMER' | 'SHOP_OWNER' | 'ADMIN';
    isActive: boolean;
    unreadCount: number;
  }>;
  shop?: {
    id: string;
    name: string;
    logoUrl?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TypingUser {
  id: string;
  firstName: string;
  lastName: string;
}
```

---

## IV. CHAT STORE / CONTEXT (State Management)

### Option 1: Redux (or Redux Toolkit)

```typescript
// src/redux/chatSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Message, Conversation, TypingUser } from '../types/chat.types';

interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  typingUsers: TypingUser[];
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
}

const initialState: ChatState = {
  conversations: [],
  currentConversation: null,
  messages: [],
  typingUsers: [],
  isLoading: false,
  error: null,
  isConnected: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Conversations
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
    },
    setCurrentConversation: (state, action: PayloadAction<Conversation>) => {
      state.currentConversation = action.payload;
    },

    // Messages
    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages = action.payload;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    updateMessage: (state, action: PayloadAction<Message>) => {
      const index = state.messages.findIndex(m => m.id === action.payload.id);
      if (index >= 0) {
        state.messages[index] = action.payload;
      }
    },
    deleteMessage: (state, action: PayloadAction<string>) => {
      state.messages = state.messages.filter(m => m.id !== action.payload);
    },

    // Typing
    setTypingUsers: (state, action: PayloadAction<TypingUser[]>) => {
      state.typingUsers = action.payload;
    },
    addTypingUser: (state, action: PayloadAction<TypingUser>) => {
      const exists = state.typingUsers.find(u => u.id === action.payload.id);
      if (!exists) {
        state.typingUsers.push(action.payload);
      }
    },
    removeTypingUser: (state, action: PayloadAction<string>) => {
      state.typingUsers = state.typingUsers.filter(u => u.id !== action.payload);
    },

    // Status
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setConversations,
  setCurrentConversation,
  setMessages,
  addMessage,
  updateMessage,
  deleteMessage,
  setTypingUsers,
  addTypingUser,
  removeTypingUser,
  setConnected,
  setLoading,
  setError,
} = chatSlice.actions;

export default chatSlice.reducer;
```

### Option 2: React Context + useReducer

```typescript
// src/context/ChatContext.tsx
import React, { createContext, useReducer, useCallback } from 'react';
import { Message, Conversation } from '../types/chat.types';

interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isConnected: boolean;
  isLoading: boolean;
}

type ChatAction =
  | { type: 'SET_CONVERSATIONS'; payload: Conversation[] }
  | { type: 'SET_CURRENT_CONVERSATION'; payload: Conversation }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: ChatState = {
  conversations: [],
  currentConversation: null,
  messages: [],
  isConnected: false,
  isLoading: false,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };
    case 'SET_CURRENT_CONVERSATION':
      return { ...state, currentConversation: action.payload };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

export const ChatContext = createContext<{
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
} | null>(null);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  return (
    <ChatContext.Provider value={{ state, dispatch }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = React.useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext phải được sử dụng trong ChatProvider');
  }
  return context;
};
```

---

## V. HOOKS & SERVICES

### ChatService Hook

```typescript
// src/hooks/useChat.ts
import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { socketService } from '../services/socketService';
import { CHAT_EVENTS, CHAT_EVENTS_EMIT } from '../constants/socketEvents';
import {
  addMessage,
  updateMessage,
  deleteMessage,
  setCurrentConversation,
  setMessages,
  setConnected,
  addTypingUser,
  removeTypingUser,
} from '../redux/chatSlice';
import { Message, Conversation } from '../types/chat.types';

export const useChat = () => {
  const dispatch = useDispatch();
  const { currentConversation, messages, isConnected } = useSelector(
    (state: any) => state.chat
  );
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Khởi tạo socket khi component mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    socketService.connect(token);

    // Lắng nghe các events từ server
    socketService.on(CHAT_EVENTS_EMIT.NEW_MESSAGE, (message: Message) => {
      if (message.conversationId === currentConversation?.id) {
        dispatch(addMessage(message));
      }
    });

    socketService.on(CHAT_EVENTS_EMIT.MESSAGE_UPDATED, (message: Message) => {
      if (message.conversationId === currentConversation?.id) {
        dispatch(updateMessage(message));
      }
    });

    socketService.on(CHAT_EVENTS_EMIT.MESSAGE_DELETED, (data: any) => {
      if (data.conversationId === currentConversation?.id) {
        dispatch(deleteMessage(data.messageId));
      }
    });

    socketService.on(CHAT_EVENTS_EMIT.USER_TYPING, (data: any) => {
      if (data.conversationId === currentConversation?.id) {
        dispatch(addTypingUser(data.user));
      }
    });

    socketService.on(CHAT_EVENTS_EMIT.USER_STOPPED_TYPING, (data: any) => {
      if (data.conversationId === currentConversation?.id) {
        dispatch(removeTypingUser(data.userId));
      }
    });

    return () => {
      socketService.disconnect();
    };
  }, [dispatch, currentConversation?.id]);

  // Tham gia conversation
  const joinConversation = useCallback(
    async (conversationId: string) => {
      try {
        await socketService.emitWithAck(CHAT_EVENTS.JOIN_CONVERSATION, {
          conversationId,
        });
        console.log('✅ Joined conversation:', conversationId);
      } catch (error) {
        console.error('Error joining conversation:', error);
      }
    },
    []
  );

  // Gửi tin nhắn
  const sendMessage = useCallback(
    async (content: string, options?: any) => {
      if (!currentConversation?.id) return;

      try {
        const message = await socketService.emitWithAck(CHAT_EVENTS.SEND_MESSAGE, {
          conversationId: currentConversation.id,
          content,
          type: 'TEXT',
          ...options,
        });

        dispatch(addMessage(message));
        return message;
      } catch (error) {
        console.error('Error sending message:', error);
        throw error;
      }
    },
    [currentConversation?.id, dispatch]
  );

  // Đánh dấu đã đọc
  const markAsRead = useCallback(async (messageId?: string) => {
    if (!currentConversation?.id) return;

    try {
      await socketService.emitWithAck(CHAT_EVENTS.MARK_AS_READ, {
        conversationId: currentConversation.id,
        messageId,
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [currentConversation?.id]);

  // Gửi chỉ dấu typing
  const notifyTyping = useCallback(() => {
    if (!currentConversation?.id || !isConnected) return;

    socketService.emit(CHAT_EVENTS.TYPING_START, {
      conversationId: currentConversation.id,
    });

    // Tự động gửi TYPING_STOP sau 2 giây
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketService.emit(CHAT_EVENTS.TYPING_STOP, {
        conversationId: currentConversation.id,
      });
    }, 2000);
  }, [currentConversation?.id, isConnected]);

  // Sửa tin nhắn
  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      try {
        const message = await socketService.emitWithAck(CHAT_EVENTS.EDIT_MESSAGE, {
          messageId,
          content,
        });

        dispatch(updateMessage(message));
        return message;
      } catch (error) {
        console.error('Error editing message:', error);
        throw error;
      }
    },
    [dispatch]
  );

  // Xóa tin nhắn
  const deleteMsg = useCallback(async (messageId: string) => {
    try {
      await socketService.emitWithAck(CHAT_EVENTS.DELETE_MESSAGE, {
        messageId,
      });

      dispatch(deleteMessage(messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }, [dispatch]);

  return {
    currentConversation,
    messages,
    isConnected,
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

## VI. REACT COMPONENTS

### ChatWindow Component

```typescript
// src/components/ChatWindow.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../hooks/useChat';
import { Message as MessageType } from '../types/chat.types';

interface ChatWindowProps {
  conversationId: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ conversationId }) => {
  const {
    currentConversation,
    messages,
    joinConversation,
    sendMessage,
    markAsRead,
    notifyTyping,
  } = useChat();

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Tham gia conversation khi thay đổi
  useEffect(() => {
    if (conversationId) {
      joinConversation(conversationId);
    }
  }, [conversationId, joinConversation]);

  // Scroll đến cuối khi có message mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Đánh dấu đã đọc khi scroll đến cuối
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLDivElement;
      if (target.scrollHeight - target.scrollTop < 100) {
        markAsRead();
      }
    };

    const container = document.getElementById('messages-container');
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, [markAsRead]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    try {
      setIsSending(true);
      await sendMessage(input);
      setInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    // Gửi chỉ dấu typing mỗi khi user gõ
    notifyTyping();
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h2>{currentConversation?.title}</h2>
      </div>

      <div id="messages-container" className="messages-container">
        {messages.map((msg) => (
          <div key={msg.id} className="message">
            <div className="message-sender">
              {msg.sender?.firstName} {msg.sender?.lastName}
            </div>
            <div className="message-content">{msg.content}</div>
            <div className="message-time">
              {new Date(msg.sentAt).toLocaleTimeString()}
            </div>
            {msg.isRead && <span className="read-indicator">✓✓</span>}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Nhập tin nhắn..."
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <button onClick={handleSendMessage} disabled={isSending}>
          {isSending ? 'Đang gửi...' : 'Gửi'}
        </button>
      </div>
    </div>
  );
};
```

### Conversation List Component

```typescript
// src/components/ConversationList.tsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setConversations, setCurrentConversation } from '../redux/chatSlice';
import { Conversation } from '../types/chat.types';
import { chatAPI } from '../api/chatAPI';

export const ConversationList: React.FC = () => {
  const dispatch = useDispatch();
  const { conversations, currentConversation } = useSelector(
    (state: any) => state.chat
  );

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const data = await chatAPI.getConversations();
      dispatch(setConversations(data));
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  return (
    <div className="conversation-list">
      <h3>Tin nhắn</h3>
      {conversations.map((conv: Conversation) => (
        <div
          key={conv.id}
          className={`conversation-item ${
            currentConversation?.id === conv.id ? 'active' : ''
          }`}
          onClick={() => dispatch(setCurrentConversation(conv))}
        >
          <div className="conversation-title">{conv.title}</div>
          <div className="conversation-preview">{conv.lastMessage}</div>
          {conv.unreadCount > 0 && (
            <span className="unread-badge">{conv.unreadCount}</span>
          )}
        </div>
      ))}
    </div>
  );
};
```

---

## VII. API SERVICE (Nếu sử dụng REST API thay cho Socket)

```typescript
// src/api/chatAPI.ts
import axios from 'axios';
import { Message, Conversation } from '../types/chat.types';

const API_URL = process.env.REACT_APP_API_URL;

const api = axios.create({
  baseURL: `${API_URL}/api/chat`,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  },
});

export const chatAPI = {
  // Conversations
  getConversations: async (limit = 20, offset = 0) => {
    const response = await api.get<any>('/conversations', {
      params: { limit, offset },
    });
    return response.data.data;
  },

  getConversation: async (id: string) => {
    const response = await api.get<any>(`/conversations/${id}`);
    return response.data.data;
  },

  createConversation: async (data: Partial<Conversation>) => {
    const response = await api.post<any>('/conversations', data);
    return response.data.data;
  },

  closeConversation: async (conversationId: string) => {
    const response = await api.put<any>(
      `/conversations/${conversationId}/close`
    );
    return response.data.data;
  },

  // Messages
  getMessages: async (conversationId: string, limit = 50, offset = 0) => {
    const response = await api.get<any>(
      `/conversations/${conversationId}/messages`,
      { params: { limit, offset } }
    );
    return response.data.data;
  },

  sendMessage: async (conversationId: string, content: string, options?: any) => {
    const response = await api.post<any>(
      `/conversations/${conversationId}/messages`,
      { content, ...options }
    );
    return response.data.data;
  },

  markAsRead: async (conversationId: string, messageId?: string) => {
    const response = await api.put<any>(
      `/conversations/${conversationId}/read`,
      { messageId }
    );
    return response.data;
  },

  editMessage: async (messageId: string, content: string) => {
    const response = await api.put<any>(`/messages/${messageId}`, {
      content,
    });
    return response.data.data;
  },

  deleteMessage: async (messageId: string) => {
    const response = await api.delete<any>(`/messages/${messageId}`);
    return response.data;
  },
};
```

---

## VIII. CẤU HÌNH TYPESCRIPT (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "jsx": "react-jsx",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  }
}
```

---

## IX. SETUP MAIN APP

```typescript
// src/App.tsx
import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { ChatProvider } from './context/ChatContext';
import { store } from './redux/store';
import { ChatWindow } from './components/ChatWindow';
import { ConversationList } from './components/ConversationList';

function App() {
  return (
    <Provider store={store}>
      <ChatProvider>
        <div className="app">
          <div className="sidebar">
            <ConversationList />
          </div>
          <div className="main">
            <ChatWindow conversationId="..." />
          </div>
        </div>
      </ChatProvider>
    </Provider>
  );
}

export default App;
```

---

## X. CSS STYLING

```css
/* src/styles/chat.css */

.chat-window {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.chat-header {
  padding: 15px 20px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.message {
  max-width: 70%;
  padding: 10px 15px;
  border-radius: 10px;
  background: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.3s ease-in-out;
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

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 10px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ccc;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    opacity: 0.5;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-10px);
  }
}

.read-indicator {
  font-size: 12px;
  color: #888;
  margin-left: 5px;
}

.conversation-list {
  width: 300px;
  background: white;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
}

.conversation-item {
  padding: 15px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}

.conversation-item:hover {
  background: #f9f9f9;
}

.conversation-item.active {
  background: #e3f2fd;
  border-left: 4px solid #007bff;
}

.unread-badge {
  display: inline-block;
  background: #ff4444;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  float: right;
}
```

---

## XI. ENV VARIABLES

```bash
# .env.local
REACT_APP_API_URL=http://localhost:3000
REACT_APP_SOCKET_URL=http://localhost:3000
REACT_APP_LOG_LEVEL=debug
```

---

## XII. TROUBLESHOOTING

### 1. **Lỗi Authentication**

```
Error: Authentication error: Token không hợp lệ
```

**Giải pháp:**
- Kiểm tra token có hợp lệ không
- Token phải được gửi trong `auth` object
- Kiểm tra token có expired không

### 2. **Lỗi CORS**

```
Access to XMLHttpRequest blocked by CORS policy
```

**Giải pháp:**
- Kiểm tra `REACT_APP_API_URL` có chính xác không
- Server đã cấu hình CORS chưa

### 3. **WebSocket không kết nối**

```
WebSocket is closed before the connection is established
```

**Giải pháp:**
- Kiểm tra server có chạy không
- Kiểm tra port có đúng không
- Thử dùng fallback transport `polling`

### 4. **Tin nhắn không cập nhật real-time**

**Giải pháp:**
- Kiểm tra socket có kết nối không (`isConnected`)
- Kiểm tra conversation có join chưa
- Kiểm tra event listener có được đăng ký không

---

## XIII. BEST PRACTICES

1. **Disconnect socket khi unmount component**
   ```typescript
   useEffect(() => {
     return () => socketService.disconnect();
   }, []);
   ```

2. **Debounce typing notification**
   ```typescript
   const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout>();

   const handleTyping = () => {
     clearTimeout(typingTimeout);
     socketService.emit(CHAT_EVENTS.TYPING_START, ...);

     setTypingTimeout(setTimeout(() => {
       socketService.emit(CHAT_EVENTS.TYPING_STOP, ...);
     }, 2000));
   };
   ```

3. **Handle connection loss gracefully**
   ```typescript
   socketService.on('disconnect', () => {
     dispatch(setConnected(false));
     // Show notification to user
     // Attempt to reconnect
   });
   ```

4. **Validate message content**
   ```typescript
   const validateMessage = (content: string) => {
     if (!content.trim()) return false;
     if (content.length > 5000) return false;
     return true;
   };
   ```

5. **Implement message pagination**
   ```typescript
   const loadMoreMessages = async () => {
     const newMessages = await chatAPI.getMessages(
       conversationId,
       50,
       messages.length
     );
     dispatch(setMessages([...newMessages, ...messages]));
   };
   ```

---

**Chúc bạn triển khai thành công! 🚀**
