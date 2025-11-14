# Hướng Dẫn Sử Dụng Chức Năng Chat Realtime

## Tổng Quan

Hệ thống chat realtime được xây dựng bằng **Socket.IO** để hỗ trợ khách hàng trong nền tảng ecommerce. Cho phép:

- ✅ Chat realtime giữa khách hàng và shop
- ✅ Admin có thể tham gia bất kỳ cuộc hội thoại nào
- ✅ Hỗ trợ nhiều loại tin nhắn (text, image, file, order, product)
- ✅ Typing indicators
- ✅ Read receipts
- ✅ Message history và pagination
- ✅ REST API để lấy conversation history

## Cấu Trúc Database

### Models Mới Được Thêm Vào

#### 1. **Conversation** - Cuộc hội thoại
- `id`: UUID
- `type`: CUSTOMER_SUPPORT | SHOP_TO_CUSTOMER | ADMIN_SUPPORT
- `status`: ACTIVE | WAITING | RESOLVED | CLOSED
- `shopId`: Liên kết với shop (optional)
- `title`, `subject`: Tiêu đề và chủ đề
- `lastMessageAt`, `lastMessageText`: Tin nhắn cuối cùng
- `totalMessages`, `unreadCount`: Thống kê
- `priority`: 0 (normal) | 1 (high) | 2 (urgent)
- `tags`: Array các tags để filter

#### 2. **ConversationParticipant** - Người tham gia
- `conversationId`, `userId`: Liên kết
- `role`: CUSTOMER | SHOP_OWNER | ADMIN | SYSTEM
- `joinedAt`, `leftAt`: Thời gian tham gia/rời
- `lastReadAt`, `unreadCount`: Tracking đã đọc
- `isMuted`, `isActive`: Settings

#### 3. **Message** - Tin nhắn
- `conversationId`, `senderId`: Liên kết
- `type`: TEXT | IMAGE | FILE | SYSTEM | ORDER | PRODUCT
- `content`: Nội dung tin nhắn
- `status`: SENT | DELIVERED | READ | FAILED
- `attachments`: JSON array các file đính kèm
- `orderId`, `productId`: Reference đến order/product (optional)
- `replyToId`: Reply to message khác
- `sentAt`, `deliveredAt`, `readAt`, `editedAt`, `deletedAt`: Timestamps

## Cài Đặt

### 1. Chạy Migration

```bash
npx prisma migrate dev --name add_chat_support_system
```

### 2. Generate Prisma Client

```bash
npx prisma generate
```

### 3. Khởi Động Server

Server sẽ tự động khởi động Socket.IO khi start:

```bash
npm run dev
```

Bạn sẽ thấy:
```
🚀 Server chạy ở cổng :3000
🌍 Environment: development
✅ Socket.IO server initialized
💬 Socket.IO đã sẵn sàng
```

## Socket.IO Client - Kết Nối

### JavaScript/TypeScript Client

```typescript
import { io } from 'socket.io-client';

// Kết nối với authentication
const socket = io('http://localhost:3000', {
  auth: {
    token: 'YOUR_JWT_TOKEN' // JWT token từ login
  },
  transports: ['websocket', 'polling']
});

// Xử lý connection events
socket.on('connect', () => {
  console.log('Connected to chat server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from chat server');
});

socket.on('chat:error', (error) => {
  console.error('Chat error:', error);
});
```

## Socket Events

### Client → Server Events

#### 1. **Tạo Conversation**
```typescript
socket.emit('chat:create_conversation', {
  shopId: 'shop-uuid',
  title: 'Hỗ trợ đơn hàng',
  subject: 'order_issue',
  type: 'CUSTOMER_SUPPORT'
}, (response) => {
  if (response.success) {
    console.log('Conversation created:', response.data);
  }
});
```

#### 2. **Join Conversation**
```typescript
socket.emit('chat:join_conversation', {
  conversationId: 'conversation-uuid'
}, (response) => {
  if (response.success) {
    console.log('Joined conversation');
  }
});
```

#### 3. **Gửi Tin Nhắn**
```typescript
socket.emit('chat:send_message', {
  conversationId: 'conversation-uuid',
  content: 'Xin chào, tôi cần hỗ trợ',
  type: 'TEXT'
}, (response) => {
  if (response.success) {
    console.log('Message sent:', response.data);
  }
});

// Gửi với attachments
socket.emit('chat:send_message', {
  conversationId: 'conversation-uuid',
  content: 'Đây là hình ảnh sản phẩm',
  type: 'IMAGE',
  attachments: [{
    url: 'https://example.com/image.jpg',
    type: 'image/jpeg',
    name: 'product.jpg',
    size: 102400
  }]
}, callback);
```

#### 4. **Đánh Dấu Đã Đọc**
```typescript
socket.emit('chat:mark_as_read', {
  conversationId: 'conversation-uuid',
  messageId: 'message-uuid' // optional, nếu không có sẽ mark all
}, (response) => {
  console.log('Marked as read');
});
```

#### 5. **Typing Indicators**
```typescript
// Bắt đầu typing
socket.emit('chat:typing_start', {
  conversationId: 'conversation-uuid'
});

// Ngừng typing
socket.emit('chat:typing_stop', {
  conversationId: 'conversation-uuid'
});
```

#### 6. **Sửa/Xóa Tin Nhắn**
```typescript
// Sửa tin nhắn
socket.emit('chat:edit_message', {
  messageId: 'message-uuid',
  content: 'Nội dung đã chỉnh sửa'
}, callback);

// Xóa tin nhắn
socket.emit('chat:delete_message', {
  messageId: 'message-uuid'
}, callback);
```

### Server → Client Events

#### 1. **Tin Nhắn Mới**
```typescript
socket.on('chat:new_message', (message) => {
  console.log('New message:', message);
  // Hiển thị tin nhắn trong UI
});
```

#### 2. **Tin Nhắn Đã Đọc**
```typescript
socket.on('chat:message_read', (data) => {
  console.log('Message read by:', data.userId);
  // Cập nhật UI read receipts
});
```

#### 3. **User Typing**
```typescript
socket.on('chat:user_typing', (data) => {
  console.log(`${data.user.firstName} is typing...`);
  // Hiển thị typing indicator
});

socket.on('chat:user_stopped_typing', (data) => {
  console.log(`User ${data.userId} stopped typing`);
  // Ẩn typing indicator
});
```

#### 4. **Tin Nhắn Updated/Deleted**
```typescript
socket.on('chat:message_updated', (message) => {
  console.log('Message updated:', message);
});

socket.on('chat:message_deleted', (data) => {
  console.log('Message deleted:', data.messageId);
});
```

#### 5. **Conversation Events**
```typescript
socket.on('chat:conversation_created', (conversation) => {
  console.log('New conversation:', conversation);
});

socket.on('chat:conversation_closed', (conversation) => {
  console.log('Conversation closed:', conversation);
});
```

#### 6. **User Status**
```typescript
socket.on('chat:user_status_changed', (data) => {
  console.log(`User ${data.userId} is ${data.status}`);
});
```

## REST API Endpoints

Ngoài Socket.IO, bạn cũng có thể sử dụng REST API để quản lý chat:

### 1. **Lấy Danh Sách Conversations**
```http
GET /api/chat/conversations
Authorization: Bearer YOUR_JWT_TOKEN
Query Params:
  - limit: 20 (optional)
  - offset: 0 (optional)

Response:
{
  "success": true,
  "data": [...],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 10
  }
}
```

### 2. **Tạo Conversation**
```http
POST /api/chat/conversations
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "shopId": "shop-uuid",
  "title": "Hỗ trợ khách hàng",
  "subject": "product_question",
  "type": "CUSTOMER_SUPPORT"
}
```

### 3. **Lấy Messages**
```http
GET /api/chat/conversations/:id/messages
Authorization: Bearer YOUR_JWT_TOKEN
Query Params:
  - limit: 50 (optional)
  - offset: 0 (optional)
  - before: message-uuid (optional, for pagination)
```

### 4. **Gửi Message (qua REST)**
```http
POST /api/chat/conversations/:id/messages
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "content": "Xin chào",
  "type": "TEXT",
  "replyToId": "message-uuid" // optional
}
```

### 5. **Đánh Dấu Đã Đọc**
```http
PUT /api/chat/conversations/:id/read
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "messageId": "message-uuid" // optional
}
```

### 6. **Đóng Conversation**
```http
PUT /api/chat/conversations/:id/close
Authorization: Bearer YOUR_JWT_TOKEN
```

### 7. **Shop Conversations**
```http
GET /api/chat/shop/:shopId/conversations
Authorization: Bearer YOUR_JWT_TOKEN
```

## Ví Dụ React Client

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

function ChatComponent({ token, conversationId }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');

  useEffect(() => {
    // Kết nối socket
    const newSocket = io('http://localhost:3000', {
      auth: { token }
    });

    setSocket(newSocket);

    // Join conversation
    newSocket.emit('chat:join_conversation', { conversationId });

    // Lắng nghe tin nhắn mới
    newSocket.on('chat:new_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Cleanup
    return () => {
      newSocket.close();
    };
  }, [token, conversationId]);

  const sendMessage = () => {
    if (!socket || !inputMessage.trim()) return;

    socket.emit('chat:send_message', {
      conversationId,
      content: inputMessage,
      type: 'TEXT'
    }, (response) => {
      if (response.success) {
        setInputMessage('');
      }
    });
  };

  const handleTyping = () => {
    socket?.emit('chat:typing_start', { conversationId });
    // Debounce typing_stop event
    setTimeout(() => {
      socket?.emit('chat:typing_stop', { conversationId });
    }, 1000);
  };

  return (
    <div>
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id}>{msg.content}</div>
        ))}
      </div>
      <input
        value={inputMessage}
        onChange={(e) => {
          setInputMessage(e.target.value);
          handleTyping();
        }}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
```

## Testing

### Test Socket Connection
```bash
# Sử dụng wscat để test
npm install -g wscat

# Connect với token
wscat -c ws://localhost:3000 \
  --auth "token=YOUR_JWT_TOKEN"
```

### Test REST API
```bash
# Lấy conversations
curl -X GET http://localhost:3000/api/chat/conversations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Tạo conversation
curl -X POST http://localhost:3000/api/chat/conversations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "shop-uuid",
    "title": "Test conversation"
  }'
```

## Security

### Authentication
- Socket.IO yêu cầu JWT token để kết nối
- Token được verify qua middleware `socketAuthMiddleware`
- User phải có status = ACTIVE

### Authorization
- Chỉ participants mới có thể xem/gửi tin nhắn trong conversation
- Shop owner có thể resolve conversation
- Admin có thể tham gia bất kỳ conversation nào

### Rate Limiting
- TODO: Cần implement rate limiting cho socket events
- Có thể sử dụng Redis để track số lượng messages per user per minute

## Performance Tips

1. **Pagination**: Luôn sử dụng pagination khi lấy messages
2. **Lazy Loading**: Load messages khi scroll lên
3. **Debouncing**: Debounce typing events
4. **Disconnect**: Disconnect socket khi không sử dụng
5. **Redis Adapter**: Sử dụng Redis adapter cho horizontal scaling

## Troubleshooting

### Socket Không Kết Nối Được
- Kiểm tra JWT token có hợp lệ không
- Kiểm tra CORS configuration
- Kiểm tra firewall/network

### Tin Nhắn Không Realtime
- Kiểm tra đã join conversation chưa
- Kiểm tra socket còn connected không
- Check server logs

### Database Issues
- Chạy migration: `npx prisma migrate dev`
- Check database connection
- Verify Prisma schema

## Roadmap

- [ ] File upload integration với Cloudinary
- [ ] Voice messages
- [ ] Video call integration
- [ ] Message reactions
- [ ] Message forwarding
- [ ] Broadcast messages
- [ ] Chat bot integration
- [ ] Admin dashboard cho chat management
- [ ] Analytics và reporting

## Support

Nếu có vấn đề, vui lòng tạo issue trên GitHub repository.
