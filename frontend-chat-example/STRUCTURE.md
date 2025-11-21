# 📂 Project Structure

## Tổng quan cấu trúc thư mục

```
frontend-chat-example/
├── 📄 Configuration Files
│   ├── package.json              # Dependencies và scripts
│   ├── tsconfig.json             # TypeScript config
│   ├── tsconfig.node.json        # TypeScript config cho Vite
│   ├── vite.config.ts            # Vite config
│   ├── tailwind.config.js        # Tailwind CSS config
│   ├── postcss.config.js         # PostCSS config
│   ├── .env.example              # Environment variables template
│   └── .gitignore                # Git ignore rules
│
├── 📚 Documentation
│   ├── README.md                 # Main documentation
│   ├── QUICK_START.md            # Quick start guide
│   ├── ARCHITECTURE.md           # Architecture documentation
│   └── STRUCTURE.md              # This file
│
├── 🌐 Entry Files
│   ├── index.html                # HTML entry point
│   └── src/
│       ├── main.tsx              # React entry point
│       ├── App.tsx               # Main app component
│       └── index.css             # Global styles
│
└── 💬 Chat Module (src/chat/)
    │
    ├── 🎨 components/            # React components
    │   ├── ChatLayout.tsx            # Main layout component
    │   ├── ConversationList.tsx      # List of conversations
    │   ├── ConversationItem.tsx      # Single conversation item
    │   ├── ChatBox.tsx               # Chat container
    │   ├── MessageList.tsx           # List of messages
    │   ├── MessageItem.tsx           # Single message item
    │   ├── MessageInput.tsx          # Message input field
    │   ├── TypingIndicator.tsx       # Typing animation
    │   └── index.ts                  # Components export
    │
    ├── 🪝 hooks/                 # Custom React hooks
    │   ├── useSocket.ts              # Socket connection hook
    │   ├── useChat.ts                # Chat operations hook
    │   ├── useConversations.ts       # Conversations management hook
    │   └── index.ts                  # Hooks export
    │
    ├── 🔧 services/              # Business logic services
    │   ├── socketService.ts          # Socket.IO service
    │   ├── chatService.ts            # Chat API service
    │   └── index.ts                  # Services export
    │
    ├── 📝 types/                 # TypeScript types
    │   └── chat.types.ts             # All chat-related types
    │
    ├── 🎨 styles/                # CSS styles
    │   └── chat.css                  # Chat custom styles
    │
    └── index.ts                  # Chat module main export
```

## 📊 File Count

| Category | Files | Lines of Code (approx) |
|----------|-------|------------------------|
| Components | 8 | ~800 |
| Hooks | 3 | ~400 |
| Services | 2 | ~500 |
| Types | 1 | ~150 |
| Config | 7 | ~150 |
| Docs | 4 | ~1000 |
| **Total** | **25** | **~3000** |

## 📦 Module Dependencies

```
┌─────────────────────────────────────┐
│         App.tsx (Entry)             │
└───────────────┬─────────────────────┘
                │
┌───────────────▼─────────────────────┐
│        ChatLayout Component         │
└───────────────┬─────────────────────┘
                │
        ┌───────┴────────┐
        │                │
┌───────▼────────┐  ┌───▼──────────┐
│ConversationList│  │   ChatBox    │
└───────┬────────┘  └───┬──────────┘
        │               │
   ┌────▼─────┐    ┌───▼─────────┐
   │Conversation│  │MessageList  │
   │   Item    │  │MessageInput │
   └──────────┘  │TypingIndicator│
                 └─────┬─────────┘
                       │
                  ┌────▼────┐
                  │Message  │
                  │  Item   │
                  └─────────┘
```

## 🎯 Component Usage

### ChatLayout
**Location**: `src/chat/components/ChatLayout.tsx`

**Props**:
```typescript
{
  currentUserId: string;
  currentUserName?: string;
  currentUserAvatar?: string;
}
```

**Usage**:
```tsx
<ChatLayout
  currentUserId="user-123"
  currentUserName="John Doe"
  currentUserAvatar="/avatar.jpg"
/>
```

### ConversationList
**Location**: `src/chat/components/ConversationList.tsx`

**Props**:
```typescript
{
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
}
```

### ChatBox
**Location**: `src/chat/components/ChatBox.tsx`

**Props**:
```typescript
{
  conversationId: string;
  conversation: Conversation;
  currentUserId: string;
  currentUserName?: string;
  currentUserAvatar?: string;
}
```

### MessageList
**Location**: `src/chat/components/MessageList.tsx`

**Props**:
```typescript
{
  messages: Message[];
  currentUserId: string;
  onEditMessage: (id: string, content: string) => Promise<void>;
  onDeleteMessage: (id: string) => Promise<void>;
}
```

### MessageItem
**Location**: `src/chat/components/MessageItem.tsx`

**Props**:
```typescript
{
  message: Message;
  isOwnMessage: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}
```

### MessageInput
**Location**: `src/chat/components/MessageInput.tsx`

**Props**:
```typescript
{
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}
```

### TypingIndicator
**Location**: `src/chat/components/TypingIndicator.tsx`

**Props**: None (pure UI component)

## 🪝 Hooks API

### useSocket
**Location**: `src/chat/hooks/useSocket.ts`

**Parameters**:
```typescript
{
  token: string | null;
  autoConnect?: boolean;
  serverUrl?: string;
}
```

**Returns**:
```typescript
{
  isConnected: boolean;
  socketId: string | undefined;
  connect: (token?: string) => void;
  disconnect: () => void;
  socket: Socket | null;
}
```

### useChat
**Location**: `src/chat/hooks/useChat.ts`

**Parameters**:
```typescript
{
  conversationId: string;
  currentUserId: string;
  autoLoad?: boolean;
  autoJoin?: boolean;
}
```

**Returns**:
```typescript
{
  messages: Message[];
  loading: boolean;
  error: string | null;
  typingUsers: Set<string>;
  hasMore: boolean;
  loadMessages: (offset?: number) => Promise<void>;
  sendMessage: (content: string) => Promise<Message>;
  editMessage: (id: string, content: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  markAsRead: (messageId?: string) => Promise<void>;
  startTyping: () => void;
  stopTyping: () => void;
}
```

### useConversations
**Location**: `src/chat/hooks/useConversations.ts`

**Parameters**: None

**Returns**:
```typescript
{
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  loadConversations: (limit?: number, offset?: number) => Promise<void>;
  createConversation: (shopId: string, title?: string) => Promise<Conversation>;
  updateConversation: (conversation: Conversation) => void;
}
```

## 🔧 Services API

### socketService
**Location**: `src/chat/services/socketService.ts`

**Methods**:
- `connect(token, serverUrl?)` - Connect to server
- `disconnect()` - Disconnect
- `emit<T>(event, data)` - Emit event, returns Promise<T>
- `on(event, callback)` - Register listener
- `off(event, callback?)` - Remove listener
- `isConnected()` - Check connection status
- `getSocket()` - Get socket instance
- `getSocketId()` - Get socket ID

### chatService
**Location**: `src/chat/services/chatService.ts`

**REST Methods**:
- `getConversations(limit?, offset?)` - Get conversations
- `getConversation(id)` - Get single conversation
- `getMessages(conversationId, limit?, offset?, before?)` - Get messages
- `createConversationREST(payload)` - Create conversation
- `sendMessageREST(conversationId, content, type?)` - Send message
- `markAsReadREST(conversationId, messageId?)` - Mark as read
- `closeConversation(conversationId)` - Close conversation

**Socket Methods**:
- `createConversation(payload)` - Create via socket
- `joinConversation(conversationId)` - Join room
- `leaveConversation(conversationId)` - Leave room
- `sendMessage(payload)` - Send via socket
- `editMessage(payload)` - Edit message
- `deleteMessage(payload)` - Delete message
- `markAsRead(payload)` - Mark as read
- `startTyping(conversationId)` - Start typing
- `stopTyping(conversationId)` - Stop typing

**Event Listeners**:
- `onNewMessage(callback)` / `offNewMessage()`
- `onMessageUpdated(callback)` / `offMessageUpdated()`
- `onMessageDeleted(callback)` / `offMessageDeleted()`
- `onMessageRead(callback)` / `offMessageRead()`
- `onUserTyping(callback)` / `offUserTyping()`
- `onUserStoppedTyping(callback)` / `offUserStoppedTyping()`
- `onUserStatusChanged(callback)` / `offUserStatusChanged()`
- `onConversationCreated(callback)` / `offConversationCreated()`
- `onConversationClosed(callback)` / `offConversationClosed()`
- `removeAllListeners()` - Remove all

## 📝 Types Overview

**Location**: `src/chat/types/chat.types.ts`

**Main Types**:
- `Message` - Tin nhắn
- `Conversation` - Cuộc trò chuyện
- `User` - Người dùng
- `Shop` - Cửa hàng
- `ConversationParticipant` - Người tham gia
- `Attachment` - File đính kèm
- `TypingIndicator` - Typing data
- `UserStatus` - User status

**Payload Types**:
- `SendMessagePayload`
- `CreateConversationPayload`
- `JoinConversationPayload`
- `MarkAsReadPayload`
- `TypingPayload`
- `EditMessagePayload`
- `DeleteMessagePayload`
- `GetMessagesPayload`

## 🎨 Styling

### Tailwind CSS Classes
Most styling uses Tailwind utility classes.

### Custom CSS
**Location**: `src/chat/styles/chat.css`

**Features**:
- Custom scrollbar styling
- Message animations
- Typing indicator animation
- Hover effects
- Responsive utilities
- Gradient backgrounds

### Theme Colors
Defined in `tailwind.config.js`:
- Primary colors (blue shades)
- Gradient utilities
- Custom animations

## 🔐 Environment Variables

**File**: `.env`

**Variables**:
```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000  # Optional
```

## 📦 Build Output

After `npm run build`:

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ... (other chunks)
└── ... (static assets)
```

## 🔍 Import Paths

**Absolute imports** configured in `tsconfig.json`:

```typescript
// From anywhere
import { ChatLayout } from '@/chat/components';
import { useChat } from '@/chat/hooks';
import { chatService } from '@/chat/services';
import type { Message } from '@/chat/types';
```

**Relative imports** from chat module:

```typescript
// From chat/components
import { useChat } from '../hooks';
import { chatService } from '../services';
```

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Main documentation với features, API, examples |
| `QUICK_START.md` | Hướng dẫn nhanh để chạy project |
| `ARCHITECTURE.md` | Chi tiết về kiến trúc và design patterns |
| `STRUCTURE.md` | This file - cấu trúc project |

---

**Last Updated**: 2024
**Maintained By**: Your Team
