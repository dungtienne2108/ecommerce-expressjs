# 🏗️ Architecture Documentation

Chi tiết về kiến trúc của hệ thống chat frontend.

## 📐 Overview

```
┌─────────────────────────────────────────────────────┐
│                   User Interface                     │
│  (React Components + Tailwind CSS)                   │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│              Custom Hooks Layer                      │
│  (useSocket, useChat, useConversations)              │
└───────────────────┬─────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼──────┐      ┌────────▼────────┐
│Socket Service│      │  Chat Service   │
│(Socket.IO)   │      │  (Axios/REST)   │
└───────┬──────┘      └────────┬────────┘
        │                      │
        │    ┌─────────────────┘
        │    │
┌───────▼────▼──────────────────────────────────┐
│           Backend API Server                   │
│  (Express + Socket.IO + Prisma)                │
└────────────────────────────────────────────────┘
```

## 🔄 Data Flow

### 1. Message Sending Flow

```
User types message
      ↓
MessageInput component
      ↓
useChat hook (sendMessage)
      ↓
chatService.sendMessage()
      ↓
socketService.emit('chat:send_message')
      ↓
[SOCKET] → Backend
      ↓
Backend processes & saves to DB
      ↓
[SOCKET] ← Backend broadcasts 'chat:new_message'
      ↓
useChat hook listener (onNewMessage)
      ↓
Update messages state
      ↓
MessageList re-renders
      ↓
User sees message
```

### 2. Initial Load Flow

```
User opens chat
      ↓
ChatLayout mounts
      ↓
useConversations hook loads conversations (REST API)
      ↓
User selects conversation
      ↓
ChatBox mounts with conversationId
      ↓
useChat hook:
  - Joins socket room
  - Loads messages (REST API)
  - Registers socket listeners
      ↓
Messages displayed
      ↓
Ready for realtime updates
```

### 3. Realtime Update Flow

```
Another user sends message
      ↓
[SOCKET] Server emits 'chat:new_message'
      ↓
useChat listener receives event
      ↓
Checks if message belongs to current conversation
      ↓
Updates messages state (avoids duplicates)
      ↓
Auto mark as read (if not sender)
      ↓
Component re-renders
      ↓
Message appears in UI
```

## 🧩 Component Architecture

### Component Hierarchy

```
App
└── ChatLayout
    ├── ConversationList
    │   └── ConversationItem (multiple)
    │       ├── Avatar
    │       ├── Name & Subject
    │       ├── Last Message
    │       └── Unread Badge
    │
    └── ChatBox
        ├── Header
        │   ├── Avatar
        │   └── Title & Status
        ├── MessageList
        │   └── MessageItem (multiple)
        │       ├── Avatar
        │       ├── Content
        │       ├── Timestamp
        │       └── Actions (Edit/Delete)
        ├── TypingIndicator
        └── MessageInput
            ├── Emoji Button
            ├── Textarea
            └── Send Button
```

### Component Responsibilities

| Component | Responsibilities |
|-----------|-----------------|
| **ChatLayout** | - Layout chính<br/>- Quản lý selected conversation<br/>- Coordinate giữa list và chat box |
| **ConversationList** | - Hiển thị danh sách conversations<br/>- Handle selection<br/>- Show unread counts |
| **ConversationItem** | - Render một conversation<br/>- Show avatar, name, last message<br/>- Highlight if selected |
| **ChatBox** | - Container cho chat area<br/>- Coordinate messages và input<br/>- Handle typing indicators |
| **MessageList** | - Render danh sách messages<br/>- Group messages by sender<br/>- Handle load more |
| **MessageItem** | - Render một message<br/>- Show edit/delete actions<br/>- Handle message states |
| **MessageInput** | - Input area<br/>- Handle typing events<br/>- Auto-resize textarea |
| **TypingIndicator** | - Show typing animation<br/>- Display "đang gõ..." |

## 🪝 Hooks Architecture

### useSocket

**Purpose**: Quản lý Socket.IO connection lifecycle

**Responsibilities**:
- Connect/disconnect socket
- Track connection status
- Auto reconnect on token change
- Cleanup on unmount

**Usage**:
```tsx
const { isConnected, socketId, connect, disconnect } = useSocket({
  token: user?.token,
  autoConnect: true,
  serverUrl: 'http://localhost:3000'
});
```

### useChat

**Purpose**: Quản lý chat operations cho một conversation

**State Management**:
- messages: Message[]
- loading: boolean
- error: string | null
- typingUsers: Set<string>
- hasMore: boolean

**Operations**:
- loadMessages()
- sendMessage()
- editMessage()
- deleteMessage()
- markAsRead()
- startTyping() / stopTyping()

**Event Listeners**:
- onNewMessage
- onMessageUpdated
- onMessageDeleted
- onUserTyping
- onUserStoppedTyping

**Lifecycle**:
1. Mount: Join conversation room
2. Load initial messages
3. Register socket listeners
4. Unmount: Leave room, cleanup listeners

**Usage**:
```tsx
const {
  messages,
  loading,
  typingUsers,
  sendMessage,
  editMessage,
  deleteMessage
} = useChat({
  conversationId,
  currentUserId,
  autoLoad: true,
  autoJoin: true
});
```

### useConversations

**Purpose**: Quản lý danh sách conversations

**State Management**:
- conversations: Conversation[]
- loading: boolean
- error: string | null

**Operations**:
- loadConversations()
- createConversation()
- updateConversation()

**Event Listeners**:
- onConversationCreated
- onConversationClosed

**Usage**:
```tsx
const {
  conversations,
  loading,
  createConversation,
  updateConversation
} = useConversations();
```

## 🔌 Services Architecture

### SocketService

**Single Responsibility**: Quản lý Socket.IO connection

**Key Methods**:
- `connect(token, url)` - Establish connection
- `disconnect()` - Close connection
- `emit(event, data)` - Send event with Promise
- `on(event, callback)` - Register listener
- `off(event, callback)` - Remove listener
- `isConnected()` - Check status

**Features**:
- Auto reconnection
- Token-based auth
- Promise-based emit
- Error handling
- Connection status tracking

### ChatService

**Dual Mode**: REST API + Socket.IO

**REST Methods** (Initial load, fallback):
- `getConversations()`
- `getConversation(id)`
- `getMessages(conversationId)`
- `createConversationREST()`
- `sendMessageREST()`

**Socket Methods** (Realtime):
- `createConversation()`
- `joinConversation()`
- `leaveConversation()`
- `sendMessage()`
- `editMessage()`
- `deleteMessage()`
- `markAsRead()`
- `startTyping()` / `stopTyping()`

**Event Listeners**:
- Message events (new, updated, deleted, read)
- Typing events
- User status events
- Conversation events

**Why Dual Mode?**
- REST: Reliable for initial data load, works offline
- Socket: Fast realtime updates, efficient

## 🔐 Authentication Flow

```
1. User logs in → Receive JWT token
2. Store token in localStorage
3. Pass token to useSocket hook
4. Socket connects with token in auth
5. Backend validates token
6. Connection established
7. User info attached to socket
8. Ready for chat operations
```

**Token Transmission**:
```typescript
// Socket.IO
socket = io(url, {
  auth: {
    token: token  // Sent in handshake
  }
});

// REST API
headers: {
  Authorization: `Bearer ${token}`
}
```

## 📦 State Management

### Local Component State
- UI states (input text, editing mode, etc.)
- Managed by React useState

### Custom Hooks State
- Chat data (messages, conversations)
- Managed by custom hooks
- Shared across components

### Why No Redux?
- Custom hooks provide sufficient state management
- Reduce complexity
- Better performance with targeted re-renders
- Easier to understand and maintain

## 🎯 Performance Optimizations

### 1. Memoization
```tsx
// Memoize callbacks
const handleSend = useCallback(() => {
  // ...
}, [dependencies]);

// Memoize components
const MessageItem = React.memo(MessageItemComponent);
```

### 2. Virtualization (Future)
For large message lists:
```tsx
import { FixedSizeList } from 'react-window';
```

### 3. Debouncing
```tsx
// Typing indicator
const debouncedStopTyping = useMemo(
  () => debounce(() => stopTyping(), 3000),
  []
);
```

### 4. Avoid Duplicate Renders
```tsx
// Check before adding
if (prev.find((m) => m.id === message.id)) {
  return prev;
}
return [...prev, message];
```

## 🔄 Error Handling

### Network Errors
```tsx
try {
  await sendMessage(text);
} catch (error) {
  // Show error notification
  // Optionally queue for retry
}
```

### Socket Disconnection
```tsx
socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server disconnected, try reconnect
    socket.connect();
  }
  // Show "Reconnecting..." UI
});
```

### Failed Messages
```tsx
// Future: Add status to messages
interface Message {
  status: 'sending' | 'sent' | 'failed';
  // ...
}

// Show retry button for failed messages
```

## 🧪 Testing Strategy

### Unit Tests
- Services (socketService, chatService)
- Hooks (useSocket, useChat, useConversations)
- Utils and helpers

### Integration Tests
- Component interactions
- Hook + Service integration
- Event flows

### E2E Tests
- Complete user flows
- Multi-user scenarios
- Socket event handling

## 🚀 Future Enhancements

### 1. Message Queue
Queue messages when offline, sync when online

### 2. Optimistic Updates
Show message immediately, rollback on error

### 3. Message Pagination
Load older messages efficiently

### 4. File Uploads
Handle image/file attachments

### 5. Rich Text
Support formatting, mentions, emojis

### 6. Voice Messages
Record and send audio

### 7. Video Chat
Integrate WebRTC for video calls

### 8. Message Search
Full-text search in conversations

### 9. Push Notifications
Browser notifications for new messages

### 10. Offline Support
Service Worker + IndexedDB cache

## 📚 Best Practices

### 1. Always Cleanup
```tsx
useEffect(() => {
  // Setup
  return () => {
    // Cleanup listeners, timers, etc.
  };
}, []);
```

### 2. Type Safety
Use TypeScript for all code, define proper interfaces

### 3. Error Boundaries
Wrap components in error boundaries

### 4. Accessibility
- ARIA labels
- Keyboard navigation
- Screen reader support

### 5. Performance
- Lazy load components
- Code splitting
- Optimize images

---

**Version**: 1.0.0
**Last Updated**: 2024
**Author**: Your Team
