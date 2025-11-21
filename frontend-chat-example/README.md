# 💬 Real-time Chat Frontend

Hệ thống chat realtime cho nền tảng ecommerce, được xây dựng với React, TypeScript, Socket.IO và Tailwind CSS.

## 🎯 Tính năng

- ✅ **Realtime messaging** với Socket.IO
- ✅ **Typing indicators** - Hiển thị khi người dùng đang gõ
- ✅ **Read receipts** - Đánh dấu tin nhắn đã đọc
- ✅ **Edit & Delete messages** - Sửa và xóa tin nhắn
- ✅ **Online/Offline status** - Trạng thái online của người dùng
- ✅ **Conversation management** - Quản lý cuộc trò chuyện
- ✅ **Beautiful UI** - Giao diện đẹp mắt với Tailwind CSS
- ✅ **Responsive design** - Tương thích mobile
- ✅ **TypeScript** - Type-safe code

## 📁 Cấu trúc thư mục

```
src/
├── chat/
│   ├── components/          # React components
│   │   ├── ChatLayout.tsx        # Layout chính
│   │   ├── ConversationList.tsx  # Danh sách conversations
│   │   ├── ConversationItem.tsx  # Item trong list
│   │   ├── ChatBox.tsx           # Khu vực chat chính
│   │   ├── MessageList.tsx       # Danh sách messages
│   │   ├── MessageItem.tsx       # Item message
│   │   ├── MessageInput.tsx      # Input nhập tin nhắn
│   │   ├── TypingIndicator.tsx   # Typing indicator
│   │   └── index.ts
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useSocket.ts          # Socket connection management
│   │   ├── useChat.ts            # Chat operations cho conversation
│   │   ├── useConversations.ts   # Quản lý conversations
│   │   └── index.ts
│   │
│   ├── services/            # Services
│   │   ├── socketService.ts      # Socket.IO service
│   │   ├── chatService.ts        # Chat API service
│   │   └── index.ts
│   │
│   ├── types/               # TypeScript types
│   │   └── chat.types.ts
│   │
│   ├── styles/              # CSS styles
│   │   └── chat.css
│   │
│   └── index.ts             # Main export
│
├── App.tsx                  # Example app
└── main.tsx
```

## 🚀 Cài đặt

### 1. Install dependencies

```bash
npm install
# hoặc
yarn install
```

### 2. Cấu hình environment variables

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Sửa các giá trị trong `.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

### 3. Chạy development server

```bash
npm run dev
# hoặc
yarn dev
```

App sẽ chạy tại `http://localhost:3001`

## 📖 Hướng dẫn sử dụng

### 1. Basic Setup

```tsx
import { ChatLayout, useSocket } from './chat';
import { socketService } from './chat/services';

function App() {
  const [user, setUser] = useState(null);

  // Connect socket khi user đăng nhập
  const { isConnected } = useSocket({
    token: user?.token || null,
    autoConnect: !!user,
  });

  return (
    <ChatLayout
      currentUserId={user.id}
      currentUserName={user.name}
      currentUserAvatar={user.avatar}
    />
  );
}
```

### 2. Sử dụng Chat trong component riêng

```tsx
import { useChat } from './chat/hooks';

function CustomChatBox({ conversationId, userId }) {
  const {
    messages,
    loading,
    typingUsers,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    startTyping,
    stopTyping,
  } = useChat({
    conversationId,
    currentUserId: userId,
    autoLoad: true,
    autoJoin: true,
  });

  const handleSend = async (text) => {
    await sendMessage(text, 'TEXT');
  };

  return (
    <div>
      {/* Render messages */}
      {messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}

      {/* Input */}
      <input
        onChange={(e) => {
          if (e.target.value) startTyping();
          else stopTyping();
        }}
      />
    </div>
  );
}
```

### 3. Quản lý conversations

```tsx
import { useConversations } from './chat/hooks';

function ConversationManager() {
  const {
    conversations,
    loading,
    createConversation,
    loadConversations,
  } = useConversations();

  const handleCreate = async (shopId) => {
    const conv = await createConversation(shopId, 'Hỗ trợ khách hàng');
    console.log('Created:', conv);
  };

  return (
    <div>
      {conversations.map(conv => (
        <div key={conv.id}>{conv.title}</div>
      ))}
    </div>
  );
}
```

### 4. Sử dụng Chat Service trực tiếp

```tsx
import { chatService } from './chat/services';

// Gửi message
await chatService.sendMessage({
  conversationId: 'xxx',
  content: 'Hello',
  type: 'TEXT',
});

// Edit message
await chatService.editMessage({
  messageId: 'xxx',
  content: 'Updated content',
});

// Delete message
await chatService.deleteMessage({
  messageId: 'xxx',
});

// Mark as read
await chatService.markAsRead({
  conversationId: 'xxx',
});

// Listen for events
chatService.onNewMessage((message) => {
  console.log('New message:', message);
});

chatService.onUserTyping((data) => {
  console.log('User typing:', data);
});
```

## 🎨 Customization

### Thay đổi màu sắc

Sửa file `tailwind.config.js`:

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          // Màu chủ đạo của bạn
          500: '#your-color',
          600: '#your-color-darker',
        },
      },
    },
  },
}
```

### Custom CSS

Thêm custom styles vào `src/chat/styles/chat.css`

### Override Components

Tất cả components đều có thể override hoặc extend:

```tsx
import { MessageItem } from './chat/components';

// Tạo custom message item
function CustomMessageItem(props) {
  return (
    <div className="my-custom-style">
      <MessageItem {...props} />
      {/* Thêm custom content */}
    </div>
  );
}
```

## 🔌 Socket Events

### Client → Server

- `chat:create_conversation` - Tạo conversation
- `chat:join_conversation` - Join room
- `chat:leave_conversation` - Leave room
- `chat:send_message` - Gửi tin nhắn
- `chat:edit_message` - Sửa tin nhắn
- `chat:delete_message` - Xóa tin nhắn
- `chat:mark_as_read` - Đánh dấu đã đọc
- `chat:typing_start` - Bắt đầu gõ
- `chat:typing_stop` - Dừng gõ

### Server → Client

- `chat:new_message` - Tin nhắn mới
- `chat:message_updated` - Tin nhắn được sửa
- `chat:message_deleted` - Tin nhắn bị xóa
- `chat:message_read` - Tin nhắn được đọc
- `chat:user_typing` - User đang gõ
- `chat:user_stopped_typing` - User dừng gõ
- `chat:user_status_changed` - Trạng thái user thay đổi
- `chat:conversation_created` - Conversation mới
- `chat:conversation_closed` - Conversation đóng

## 🔧 API Endpoints

### REST API (Fallback/Initial Load)

```
GET    /api/chat/conversations              - Danh sách conversations
POST   /api/chat/conversations              - Tạo conversation
GET    /api/chat/conversations/:id          - Chi tiết conversation
GET    /api/chat/conversations/:id/messages - Lịch sử tin nhắn
POST   /api/chat/conversations/:id/messages - Gửi message (REST)
PUT    /api/chat/conversations/:id/read     - Mark as read
PUT    /api/chat/conversations/:id/close    - Close conversation
PUT    /api/chat/messages/:id               - Edit message
DELETE /api/chat/messages/:id               - Delete message
```

## 📱 Responsive Design

- Desktop: Full layout với sidebar và chat box
- Tablet: Collapsible sidebar
- Mobile: Stack layout với navigation

## 🐛 Troubleshooting

### Socket không connect

1. Kiểm tra `VITE_API_URL` trong `.env`
2. Kiểm tra token có hợp lệ không
3. Xem console log để debug

### Messages không realtime

1. Đảm bảo đã join conversation room
2. Kiểm tra socket connection
3. Verify event listeners được đăng ký

### Typing indicator không hoạt động

1. Kiểm tra `startTyping()` được gọi khi typing
2. Verify socket events được emit
3. Đảm bảo conversation room đã join

## 🔐 Security

- Tất cả API calls đều yêu cầu authentication token
- Socket connection cũng cần token
- Token được gửi qua `Authorization` header hoặc socket `auth`
- Backend verify token trước khi cho phép join room

## 📚 Technologies

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Socket.IO Client** - Realtime communication
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **date-fns** - Date formatting
- **Vite** - Build tool

## 🤝 Contributing

1. Fork the project
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License

## 💡 Tips

1. **Performance**: Sử dụng React.memo cho components không thay đổi thường xuyên
2. **Optimization**: Implement virtual scrolling cho conversations list nếu có nhiều conversations
3. **Caching**: Cache messages trong localStorage để load nhanh hơn
4. **Error handling**: Implement retry logic cho failed messages
5. **Offline support**: Queue messages khi offline và sync khi online

## 📞 Support

Nếu có vấn đề, tạo issue trên GitHub hoặc liên hệ team.

---

Made with ❤️ by Your Team
