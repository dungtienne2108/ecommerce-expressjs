# ⚡ CHAT REALTIME - QUICK START GUIDE

## 🎯 5 BƯỚC CƠ BẢN ĐỂ TÍCH HỢP CHAT

### BƯỚC 1: CÀI ĐẶT DEPENDENCIES

```bash
# Frontend (React)
npm install socket.io-client axios

# Nếu dùng Redux
npm install @reduxjs/toolkit react-redux

# Nếu dùng Vue 3
npm install socket.io-client axios pinia
```

---

### BƯỚC 2: TẠO SOCKET SERVICE

```typescript
// src/services/socketService.ts
import io from 'socket.io-client';

class SocketService {
  private socket = null;

  connect(token: string) {
    this.socket = io('http://localhost:3000', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected');
    });
  }

  emit(event, data) {
    this.socket?.emit(event, data);
  }

  on(event, callback) {
    this.socket?.on(event, callback);
  }

  emitWithAck(event, data) {
    return new Promise((resolve, reject) => {
      this.socket?.emit(event, data, (response) => {
        response?.success ? resolve(response.data) : reject(response?.error);
      });
    });
  }

  disconnect() {
    this.socket?.disconnect();
  }
}

export const socketService = new SocketService();
```

---

### BƯỚC 3: TẠO CHAT HOOK (React)

```typescript
// src/hooks/useChat.ts
import { useEffect, useState } from 'react';
import { socketService } from '../services/socketService';

const CHAT_EVENTS = {
  JOIN_CONVERSATION: 'chat:join_conversation',
  SEND_MESSAGE: 'chat:send_message',
  MARK_AS_READ: 'chat:mark_as_read',
  TYPING_START: 'chat:typing_start',
  TYPING_STOP: 'chat:typing_stop',
};

const CHAT_EVENTS_EMIT = {
  NEW_MESSAGE: 'chat:new_message',
  MESSAGE_READ: 'chat:message_read',
  USER_TYPING: 'chat:user_typing',
  USER_STOPPED_TYPING: 'chat:user_stopped_typing',
};

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect socket
    const token = localStorage.getItem('accessToken');
    if (token) {
      socketService.connect(token);
      setIsConnected(true);
    }

    // Listen for new messages
    socketService.on(CHAT_EVENTS_EMIT.NEW_MESSAGE, (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

  const sendMessage = async (conversationId, content) => {
    try {
      const message = await socketService.emitWithAck(
        CHAT_EVENTS.SEND_MESSAGE,
        { conversationId, content }
      );
      setMessages((prev) => [...prev, message]);
      return message;
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const joinConversation = async (conversationId) => {
    await socketService.emitWithAck(CHAT_EVENTS.JOIN_CONVERSATION, {
      conversationId,
    });
  };

  const markAsRead = async (conversationId) => {
    await socketService.emitWithAck(CHAT_EVENTS.MARK_AS_READ, {
      conversationId,
    });
  };

  return {
    messages,
    isConnected,
    sendMessage,
    joinConversation,
    markAsRead,
  };
};
```

---

### BƯỚC 4: TẠO CHAT COMPONENT

```typescript
// src/components/ChatWindow.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';

export const ChatWindow = ({ conversationId }) => {
  const { messages, sendMessage, joinConversation, markAsRead } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    joinConversation(conversationId);
  }, [conversationId, joinConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    markAsRead(conversationId);
  }, [messages, conversationId, markAsRead]);

  const handleSend = async () => {
    if (input.trim()) {
      await sendMessage(conversationId, input);
      setInput('');
    }
  };

  return (
    <div className="chat-window">
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className="message">
            <strong>{msg.sender?.firstName}</strong>
            <p>{msg.content}</p>
            <small>{new Date(msg.sentAt).toLocaleTimeString()}</small>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
};
```

---

### BƯỚC 5: USE IN APP

```typescript
// src/App.tsx
import { ChatWindow } from './components/ChatWindow';

function App() {
  return (
    <div className="app">
      <ChatWindow conversationId="conv123" />
    </div>
  );
}

export default App;
```

---

## 📋 SOCKET EVENTS REFERENCE

### Server → Client (Lắng nghe)

```typescript
// Khi có message mới
socket.on('chat:new_message', (message) => {
  console.log('New message:', message);
  // {
  //   id, conversationId, senderId, content,
  //   type, sentAt, sender: { id, firstName, lastName }
  // }
});

// Khi message được đọc
socket.on('chat:message_read', (data) => {
  console.log('Message read:', data);
  // { conversationId, userId, messageId }
});

// Khi user đang gõ
socket.on('chat:user_typing', (data) => {
  console.log('User typing:', data.user.firstName);
  // { conversationId, user: { id, firstName, lastName } }
});

// Khi user ngừng gõ
socket.on('chat:user_stopped_typing', (data) => {
  console.log('User stopped:', data.userId);
});

// Message bị sửa
socket.on('chat:message_updated', (message) => {
  console.log('Message updated:', message);
});

// Message bị xóa
socket.on('chat:message_deleted', (data) => {
  console.log('Message deleted:', data.messageId);
  // { messageId, conversationId }
});

// User status
socket.on('chat:user_status_changed', (data) => {
  console.log('User status:', data.status); // 'online' | 'offline'
});
```

### Client → Server (Phát)

```typescript
// Tham gia conversation
socket.emit('chat:join_conversation',
  { conversationId: 'conv123' },
  (response) => console.log(response)
);

// Gửi tin nhắn
socket.emit('chat:send_message',
  {
    conversationId: 'conv123',
    content: 'Hello!',
    type: 'TEXT', // TEXT, IMAGE, FILE, ORDER
  },
  (response) => {
    if (response.success) {
      console.log('Message sent:', response.data);
    }
  }
);

// Đánh dấu đã đọc
socket.emit('chat:mark_as_read',
  { conversationId: 'conv123' },
  (response) => console.log(response)
);

// User đang gõ
socket.emit('chat:typing_start',
  { conversationId: 'conv123' }
);

// User ngừng gõ (tự động sau 2 giây)
socket.emit('chat:typing_stop',
  { conversationId: 'conv123' }
);

// Sửa message
socket.emit('chat:edit_message',
  {
    messageId: 'msg123',
    content: 'Updated content',
  },
  (response) => console.log(response)
);

// Xóa message
socket.emit('chat:delete_message',
  { messageId: 'msg123' },
  (response) => console.log(response)
);

// Rời conversation
socket.emit('chat:leave_conversation',
  { conversationId: 'conv123' }
);
```

---

## 🔐 AUTHENTICATION

### Gửi token khi connect

```typescript
// Option 1: Qua auth object (RECOMMENDED)
const socket = io('http://localhost:3000', {
  auth: {
    token: localStorage.getItem('accessToken'),
  },
});

// Option 2: Qua query parameter
const token = localStorage.getItem('accessToken');
const socket = io(`http://localhost:3000?token=${token}`);

// Option 3: Qua headers
const socket = io('http://localhost:3000', {
  transportOptions: {
    polling: {
      extraHeaders: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    },
  },
});
```

---

## 🧪 TEST SOCKET CONNECTION

### Browser Console Test

```javascript
// Kiểm tra kết nối
console.log('Connected:', socket.connected);

// Kiểm tra socket ID
console.log('Socket ID:', socket.id);

// Lắng nghe tất cả events
socket.onAny((event, data) => {
  console.log(`[${event}]`, data);
});

// Phát test event
socket.emit('chat:join_conversation',
  { conversationId: 'test-conv' },
  (response) => console.log('Response:', response)
);

// Kiểm tra disconnect
socket.disconnect();
console.log('Connected:', socket.connected); // false
```

---

## 🐛 COMMON ISSUES & SOLUTIONS

### ❌ "Token không hợp lệ"

**Nguyên nhân:** Token hết hạn hoặc sai format

```typescript
// ✅ Solution
const token = localStorage.getItem('accessToken');
if (!token || isTokenExpired(token)) {
  // Refresh token
  const newToken = await api.post('/auth/refresh');
  localStorage.setItem('accessToken', newToken);
  socketService.connect(newToken);
}
```

### ❌ "WebSocket is closed"

**Nguyên nhân:** Kết nối bị đóng hoặc server không chạy

```typescript
// ✅ Solution
socketService.on('disconnect', () => {
  // Attempt reconnect
  setTimeout(() => {
    const token = localStorage.getItem('accessToken');
    socketService.connect(token);
  }, 3000);
});
```

### ❌ "CORS policy error"

**Nguyên nhân:** Server chưa cấu hình CORS

```typescript
// Server-side fix (đã được implement sẵn)
// src/config/socket.ts
const socketOptions = {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
};
```

### ❌ "Message không update realtime"

**Nguyên nhân:** Chưa join conversation hoặc event listener chưa được đăng ký

```typescript
// ✅ Solution
useEffect(() => {
  // Join conversation first
  joinConversation(conversationId);

  // Then setup listeners
  socketService.on('chat:new_message', (message) => {
    if (message.conversationId === conversationId) {
      setMessages((prev) => [...prev, message]);
    }
  });

  return () => {
    socketService.off('chat:new_message', null);
  };
}, [conversationId]);
```

---

## 📊 MESSAGE OBJECT STRUCTURE

```typescript
interface Message {
  id: string;                    // Message ID
  conversationId: string;        // Which conversation
  senderId: string;              // Who sent it
  content: string;               // Message text
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM' | 'ORDER' | 'PRODUCT';
  attachments?: Array<{          // Files attached
    url: string;
    type: string;
    name: string;
    size: number;
  }>;
  replyToId?: string;            // Reply to another message
  orderId?: string;              // Related order
  productId?: string;            // Related product
  isRead: boolean;               // Has receiver read it
  sentAt: Date;                  // When sent
  editedAt?: Date;               // When last edited
  deletedAt?: Date;              // When deleted (soft delete)
  sender?: {                     // Sender info
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  replyTo?: Message;             // The message being replied to
}

interface Conversation {
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
    userId: string;
    conversationId: string;
    role: 'CUSTOMER' | 'SHOP_OWNER' | 'ADMIN';
    isActive: boolean;
    unreadCount: number;
    lastReadAt: Date;
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      avatarUrl?: string;
    };
  }>;
  shop?: {
    id: string;
    name: string;
    logoUrl?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🎨 STYLING EXAMPLE

```css
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.message {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 10px;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.message strong {
  display: block;
  font-size: 13px;
  margin-bottom: 4px;
  color: #333;
}

.message p {
  margin: 0;
  word-wrap: break-word;
}

.message small {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #999;
}

.message.own {
  background: #007bff;
  color: white;
  align-self: flex-end;
}

.input-area {
  padding: 15px;
  background: white;
  border-top: 1px solid #e0e0e0;
  display: flex;
  gap: 10px;
}

.input-area input {
  flex: 1;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 20px;
  outline: none;
}

.input-area input:focus {
  border-color: #007bff;
}

.input-area button {
  padding: 10px 25px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
}

.input-area button:hover {
  background: #0056b3;
}
```

---

## 📚 FILE STRUCTURE COMPARISON

### React
```
src/
├── hooks/useChat.ts
├── components/ChatWindow.tsx
├── services/socketService.ts
└── App.tsx
```

### Vue 3
```
src/
├── composables/useChat.ts
├── components/ChatWindow.vue
├── services/socketService.ts
├── stores/chat.ts
└── App.vue
```

### Vanilla JS
```
src/
├── services/socket.js
├── components/chatWindow.js
├── utils/eventEmitter.js
└── index.html
```

---

## 🚀 NEXT STEPS

1. **Setup socket service** - Copy socketService từ bước 2
2. **Create chat hook** - Implement useChat hook
3. **Build UI component** - Create ChatWindow component
4. **Test connection** - Use browser console to test
5. **Add error handling** - Handle connection failures
6. **Implement pagination** - Load messages on scroll
7. **Add features** - File upload, reactions, etc.

---

## 📖 DOCUMENTATION FILES

- **CHAT_INTEGRATION_GUIDE.md** - Chi tiết toàn bộ setup
- **CHAT_FLOW_DIAGRAMS.md** - Sơ đồ luồng xử lý
- **CHAT_VUE3_EXAMPLE.md** - Ví dụ Vue 3 hoàn chỉnh

---

**Bắt đầu nhanh với 5 bước trên! 🎉**
