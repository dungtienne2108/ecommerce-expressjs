# 📚 CHAT REALTIME DOCUMENTATION INDEX

## 📖 Tất cả các tài liệu đã được tạo để hỗ trợ tích hợp chat realtime

---

## 🎯 TÀI LIỆU CHÍNH

### 1. **CHAT_QUICK_START.md** ⚡ START HERE
   - **Mục đích:** Bắt đầu nhanh trong 5 bước
   - **Nội dung:**
     - Cài đặt dependencies
     - Tạo Socket Service
     - Tạo Chat Hook
     - Tạo Chat Component
     - Sử dụng trong App
   - **Dành cho:** Ai muốn bắt đầu ngay lập tức
   - **Thời gian:** 15-30 phút
   - **📄 [Đọc tại đây](./CHAT_QUICK_START.md)**

---

### 2. **CHAT_INTEGRATION_GUIDE.md** 📱 COMPREHENSIVE GUIDE
   - **Mục đích:** Hướng dẫn chi tiết, từng bước
   - **Nội dung:**
     - Socket Service (TypeScript)
     - Redux Store Setup
     - React Context Setup
     - useChat Hook
     - React Components (ChatWindow, ConversationList, etc.)
     - API Service
     - TypeScript Types
     - CSS Styling
     - Troubleshooting
   - **Dành cho:** Ai muốn hiểu chi tiết
   - **Thời gian:** 1-2 giờ
   - **Framework:** React + Redux/Context
   - **📄 [Đọc tại đây](./CHAT_INTEGRATION_GUIDE.md)**

---

### 3. **CHAT_VUE3_EXAMPLE.md** 🍃 VUE 3 ALTERNATIVE
   - **Mục đích:** Setup hoàn chỉnh cho Vue 3
   - **Nội dung:**
     - Socket Service (Vue version)
     - Pinia Store
     - Composables
     - Vue Components (.vue files)
     - API Service
     - Styling
   - **Dành cho:** Người sử dụng Vue 3
   - **Thời gian:** 1-2 giờ
   - **Framework:** Vue 3 + Pinia
   - **📄 [Đọc tại đây](./CHAT_VUE3_EXAMPLE.md)**

---

### 4. **CHAT_FLOW_DIAGRAMS.md** 📊 VISUAL GUIDE
   - **Mục đích:** Hiểu rõ luồng xử lý thông qua sơ đồ
   - **Nội dung:**
     - Connection Flow
     - Send Message Flow
     - Mark as Read Flow
     - Typing Indicator Flow
     - Join Conversation Flow
     - Delete Message Flow
     - Edit Message Flow
     - Authentication Flow (Detailed)
     - Error Handling Flow
     - Room Structure
     - State Changes
     - Message Lifecycle
   - **Dành cho:** Ai thích học bằng hình ảnh
   - **Thời gian:** 30 phút
   - **📄 [Đọc tại đây](./CHAT_FLOW_DIAGRAMS.md)**

---

## 🏗️ BACKEND ARCHITECTURE (Đã implement)

### Files chính:

| File | Mục đích |
|------|---------|
| `src/constants/socket-events.ts` | Định nghĩa tất cả socket events |
| `src/sockets/chat.handler.ts` | Xử lý socket events |
| `src/services/chat.service.ts` | Business logic |
| `src/controllers/chat.controller.ts` | REST API endpoints |
| `src/routes/chat.routes.ts` | Route definitions |
| `src/middleware/socket-auth.middleware.ts` | Socket authentication |
| `src/config/socket.ts` | Socket.IO configuration |
| `src/sockets/index.ts` | Socket initialization |

### Architecture Diagram:

```
┌─────────────────────────────────────────┐
│         Frontend (React/Vue)             │
│    Emits Events / Lắng nghe Events      │
└──────────────────┬──────────────────────┘
                   │
                   ↓ Socket.IO
┌─────────────────────────────────────────┐
│       Socket Authentication              │
│   (socketAuthMiddleware)                │
└──────────────────┬──────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────┐
│      Chat Handler (chat.handler.ts)     │
│  - Xử lý tất cả socket events           │
│  - Join/Leave rooms                     │
│  - Broadcast to rooms                   │
└──────────────────┬──────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────┐
│      Chat Service (chat.service.ts)     │
│  - Tạo conversation                     │
│  - Gửi/Sửa/Xóa message                 │
│  - Đánh dấu đã đọc                      │
│  - Validation & Authorization           │
└──────────────────┬──────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────┐
│    Repositories (Data Access Layer)     │
│  - Message Repository                   │
│  - Conversation Repository              │
└──────────────────┬──────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────┐
│   Prisma ORM + PostgreSQL Database      │
│  - messages table                       │
│  - conversations table                  │
│  - conversationParticipants table       │
└─────────────────────────────────────────┘
```

---

## 🔌 SOCKET EVENTS REFERENCE

### Server → Client (Lắng nghe)

| Event | Data | Khi nào |
|-------|------|---------|
| `chat:new_message` | Message object | Có message mới |
| `chat:message_updated` | Message object | Message bị sửa |
| `chat:message_deleted` | {messageId, conversationId} | Message bị xóa |
| `chat:message_read` | {conversationId, userId, messageId} | Message được đọc |
| `chat:user_typing` | {conversationId, user} | User đang gõ |
| `chat:user_stopped_typing` | {conversationId, userId} | User ngừng gõ |
| `chat:user_status_changed` | {userId, status} | User online/offline |
| `chat:conversation_created` | Conversation object | Conversation mới |
| `chat:conversation_closed` | Conversation object | Conversation bị đóng |

### Client → Server (Phát)

| Event | Payload | Mục đích |
|-------|---------|---------|
| `chat:join_conversation` | {conversationId} | Tham gia conversation |
| `chat:leave_conversation` | {conversationId} | Rời conversation |
| `chat:send_message` | {conversationId, content, type?} | Gửi message |
| `chat:mark_as_read` | {conversationId, messageId?} | Đánh dấu đã đọc |
| `chat:typing_start` | {conversationId} | Bắt đầu gõ |
| `chat:typing_stop` | {conversationId} | Kết thúc gõ |
| `chat:edit_message` | {messageId, content} | Sửa message |
| `chat:delete_message` | {messageId} | Xóa message |

---

## 🎨 FRONTEND SETUP CHOICES

### Option 1: React + Redux (Recommended for large apps)
- **Pros:** Centralized state, good DevTools, scalable
- **Cons:** More boilerplate
- **Guide:** CHAT_INTEGRATION_GUIDE.md
- **Setup time:** 1-2 hours

### Option 2: React + Context (Good for small to medium apps)
- **Pros:** Less boilerplate, simpler
- **Cons:** Less tooling support
- **Guide:** CHAT_INTEGRATION_GUIDE.md (Context section)
- **Setup time:** 45 minutes - 1 hour

### Option 3: Vue 3 + Pinia (Modern Vue setup)
- **Pros:** Elegant syntax, good performance
- **Cons:** Different ecosystem
- **Guide:** CHAT_VUE3_EXAMPLE.md
- **Setup time:** 1-2 hours

### Option 4: Vanilla JS (No framework)
- **Pros:** Lightweight, no dependencies
- **Cons:** More manual work
- **Guide:** CHAT_QUICK_START.md (can adapt)
- **Setup time:** 30 minutes - 1 hour

---

## 🚀 IMPLEMENTATION ROADMAP

### Phase 1: Setup (30 minutes)
- [ ] Install dependencies
- [ ] Create Socket Service
- [ ] Setup authentication
- [ ] Test connection

### Phase 2: Basic Chat (1-2 hours)
- [ ] Create Chat Component
- [ ] Implement send message
- [ ] Implement receive message
- [ ] List conversations

### Phase 3: Features (2-3 hours)
- [ ] Mark as read
- [ ] Typing indicator
- [ ] Edit message
- [ ] Delete message

### Phase 4: Polish (1-2 hours)
- [ ] Error handling
- [ ] Loading states
- [ ] Styling
- [ ] Responsive design

### Phase 5: Advanced (Optional)
- [ ] File upload
- [ ] Reactions/Emojis
- [ ] Search messages
- [ ] Message persistence

---

## 🔐 SECURITY FEATURES (Already implemented)

✅ JWT Authentication
- Token verified on every connection
- User status checked
- Role-based access

✅ Authorization
- Only participants can access conversation
- Only message sender can edit/delete
- Soft delete (data preserved)

✅ Input Validation
- Message content validation
- File size limits (1MB)
- Type validation

✅ Rate Limiting
- Can be added via middleware

---

## 📊 DATABASE SCHEMA (Prisma)

### messages table
```typescript
model Message {
  id                String
  conversationId    String
  senderId          String
  content           String
  type              MessageType       // TEXT, IMAGE, FILE, etc
  attachments       Json[]
  replyToId         String?
  orderId           String?
  productId         String?
  isRead            Boolean
  sentAt            DateTime
  editedAt          DateTime?
  deletedAt         DateTime?

  conversation      Conversation
  sender            User
  replyTo           Message?
}

model Conversation {
  id                String
  type              ConversationType  // CUSTOMER_SUPPORT, SHOP_TO_CUSTOMER
  title             String
  subject           String?
  status            ConversationStatus // ACTIVE, CLOSED, RESOLVED
  lastMessage       String?
  lastMessageAt     DateTime?
  messageCount      Int = 0
  unreadCount       Int = 0
  shopId            String?

  messages          Message[]
  participants      ConversationParticipant[]
  shop              Shop?
}

model ConversationParticipant {
  id                String
  conversationId    String
  userId            String
  role              ParticipantRole   // CUSTOMER, SHOP_OWNER, ADMIN
  isActive          Boolean
  unreadCount       Int = 0
  lastReadAt        DateTime?

  conversation      Conversation
  user              User
}
```

---

## 🧪 TESTING

### Unit Tests
```typescript
// Test socket connection
it('should connect with valid token', async () => {
  const token = 'valid-jwt-token';
  await socketService.connect(token);
  expect(socketService.isConnected()).toBe(true);
});

// Test send message
it('should send message to conversation', async () => {
  const message = await socketService.emitWithAck(
    'chat:send_message',
    { conversationId: 'conv1', content: 'Hello' }
  );
  expect(message.content).toBe('Hello');
});
```

### Integration Tests
```typescript
// Test real socket connection
describe('Chat Socket Integration', () => {
  it('should receive message from other user', (done) => {
    socket.on('chat:new_message', (message) => {
      expect(message.content).toBe('Hello');
      done();
    });

    socket.emit('chat:send_message', {
      conversationId: 'conv1',
      content: 'Hello',
    });
  });
});
```

---

## 🐛 DEBUGGING

### Enable Socket.IO Debug Mode
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  debug: true,
});

// In browser console
localStorage.debug = 'socket.io-client:*';
```

### Monitor Events
```typescript
socket.onAny((event, data) => {
  console.log(`[${new Date().toISOString()}] ${event}`, data);
});
```

### Check Connection Status
```typescript
console.log('Connected:', socket.connected);
console.log('Socket ID:', socket.id);
console.log('Disconnected Reason:', socket.disconnected);
```

---

## 📈 PERFORMANCE OPTIMIZATION

1. **Message Pagination**
   - Load 50 messages at a time
   - Load more on scroll

2. **Virtual Scrolling**
   - Render only visible messages
   - Use react-window or similar

3. **Debounce Typing**
   - Don't send every keystroke
   - Wait 300ms before sending

4. **Connection Pooling**
   - Reuse socket connection
   - Close on logout

5. **Caching**
   - Cache conversation list
   - Cache message list per conversation

---

## 🆘 TROUBLESHOOTING CHECKLIST

- [ ] Backend server is running on port 3000?
- [ ] Frontend can reach backend URL?
- [ ] JWT token is valid and not expired?
- [ ] Socket.IO client version matches server?
- [ ] CORS is properly configured?
- [ ] Database is running?
- [ ] Tables are created (migrations run)?
- [ ] Authentication middleware is enabled?

---

## 📞 QUICK REFERENCE

### Socket Service Methods
```typescript
socketService.connect(token)              // Connect to server
socketService.disconnect()                // Disconnect
socketService.emit(event, data)           // Emit event
socketService.emitWithAck(event, data)    // Emit + wait for response
socketService.on(event, callback)         // Listen for event
socketService.off(event, callback)        // Stop listening
socketService.isConnected()               // Check connection status
```

### Common Patterns
```typescript
// Connect on component mount
useEffect(() => {
  const token = localStorage.getItem('token');
  socketService.connect(token);
  return () => socketService.disconnect();
}, []);

// Join conversation
const joinConv = async (convId) => {
  await socketService.emitWithAck('chat:join_conversation', {
    conversationId: convId,
  });
};

// Send message
const send = async (convId, content) => {
  const msg = await socketService.emitWithAck('chat:send_message', {
    conversationId: convId,
    content,
  });
  return msg;
};

// Listen for new message
socketService.on('chat:new_message', (message) => {
  setMessages(prev => [...prev, message]);
});
```

---

## 📚 EXTERNAL RESOURCES

- [Socket.IO Documentation](https://socket.io/docs/)
- [React Documentation](https://react.dev/)
- [Vue 3 Documentation](https://vuejs.org/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [Pinia](https://pinia.vuejs.org/)

---

## 📝 NOTES

- All timestamps are in UTC (ISO 8601 format)
- Messages are soft deleted (data preserved in DB)
- Unread count is per-user per-conversation
- Typing indicator times out after 2 seconds
- WebSocket fallback to polling for compatibility

---

**Chúc bạn triển khai thành công! 🚀**

**Bắt đầu từ: CHAT_QUICK_START.md** ⚡
