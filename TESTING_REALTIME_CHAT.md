# 🧪 HƯỚNG DẪN TEST NHẮN TIN REALTIME

Tài liệu này hướng dẫn chi tiết cách test chức năng chat realtime trong hệ thống ecommerce-expressjs.

---

## 📋 MỤC LỤC

1. [Chuẩn bị môi trường](#1-chuẩn-bị-môi-trường)
2. [Test với Postman](#2-test-với-postman)
3. [Test với Socket.IO Client](#3-test-với-socketio-client)
4. [Test với HTML Test Page](#4-test-với-html-test-page)
5. [Test với curl và wscat](#5-test-với-curl-và-wscat)
6. [Scenarios Test](#6-scenarios-test)

---

## 1. CHUẨN BỊ MÔI TRƯỜNG

### 1.1. Khởi động server

```bash
# Đảm bảo database đang chạy
docker-compose up -d postgres redis

# Chạy migrations
npm run prisma:migrate

# Khởi động development server
npm run dev
```

Server sẽ chạy tại: `http://localhost:3000`

### 1.2. Tạo test users

Bạn cần có ít nhất 2 users để test chat giữa họ:

```bash
# Sử dụng REST API để đăng ký users
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@test.com",
    "password": "Password123!",
    "firstName": "User",
    "lastName": "One"
  }'

curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user2@test.com",
    "password": "Password123!",
    "firstName": "User",
    "lastName": "Two"
  }'
```

### 1.3. Lấy JWT tokens

```bash
# Login User 1
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@test.com",
    "password": "Password123!"
  }'

# Response:
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "...",
    "user": { ... }
  }
}

# Lưu accessToken để sử dụng
```

Lặp lại cho User 2.

---

## 2. TEST VỚI POSTMAN

### 2.1. Cài đặt Postman WebSocket Support

Postman từ version 10.0+ hỗ trợ WebSocket testing.

### 2.2. Tạo WebSocket Request

1. Mở Postman
2. Click **New** → **WebSocket Request**
3. URL: `ws://localhost:3000`
4. Click **Connect**

### 2.3. Thêm Authentication

Trong phần **Headers** hoặc **Params**:

**Option 1: Query Parameter**
```
ws://localhost:3000?token=YOUR_JWT_TOKEN_HERE
```

**Option 2: Headers**
```
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

### 2.4. Test Events

#### Tạo Conversation

```json
// Event name: chat:create_conversation
{
  "shopId": "shop-uuid-here",
  "title": "Hỗ trợ đơn hàng #123",
  "type": "CUSTOMER_SUPPORT"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "conv-uuid",
    "type": "CUSTOMER_SUPPORT",
    "status": "ACTIVE",
    "shopId": "shop-uuid",
    "title": "Hỗ trợ đơn hàng #123",
    "participants": [...],
    "createdAt": "2025-11-22T..."
  }
}
```

#### Gửi Message

```json
// Event name: chat:send_message
{
  "conversationId": "conv-uuid-from-above",
  "content": "Xin chào! Tôi cần hỗ trợ về đơn hàng",
  "type": "TEXT"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "msg-uuid",
    "conversationId": "conv-uuid",
    "senderId": "user-uuid",
    "content": "Xin chào! Tôi cần hỗ trợ về đơn hàng",
    "type": "TEXT",
    "status": "SENT",
    "sentAt": "2025-11-22T..."
  }
}
```

**Broadcast to Room:**
```json
// Event received: chat:new_message
{
  "id": "msg-uuid",
  "conversationId": "conv-uuid",
  "content": "Xin chào! Tôi cần hỗ trợ về đơn hàng",
  "sender": {
    "id": "user-uuid",
    "firstName": "User",
    "lastName": "One",
    "email": "user1@test.com"
  },
  "sentAt": "2025-11-22T..."
}
```

---

## 3. TEST VỚI SOCKET.IO CLIENT

### 3.1. Cài đặt Socket.IO Client

```bash
npm install socket.io-client
```

### 3.2. Tạo Test Script

Tạo file `test-chat.js`:

```javascript
const io = require('socket.io-client');

// Thay YOUR_JWT_TOKEN bằng token thật
const TOKEN_USER1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const TOKEN_USER2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// Connect User 1
const socket1 = io('http://localhost:3000', {
  auth: { token: TOKEN_USER1 }
});

// Connect User 2
const socket2 = io('http://localhost:3000', {
  auth: { token: TOKEN_USER2 }
});

// User 1 events
socket1.on('connect', () => {
  console.log('✅ User 1 connected:', socket1.id);
});

socket1.on('chat:user_status_changed', (data) => {
  console.log('👤 User status changed:', data);
});

socket1.on('chat:new_message', (message) => {
  console.log('📨 User 1 received message:', message);
});

// User 2 events
socket2.on('connect', () => {
  console.log('✅ User 2 connected:', socket2.id);

  // User 2 tạo conversation với shop
  setTimeout(() => {
    console.log('📝 User 2 creating conversation...');
    socket2.emit('chat:create_conversation', {
      shopId: 'your-shop-id-here',
      title: 'Test Conversation',
      type: 'CUSTOMER_SUPPORT'
    }, (response) => {
      console.log('✅ Conversation created:', response);

      if (response.success) {
        const conversationId = response.data.id;

        // User 1 join conversation
        socket1.emit('chat:join_conversation', { conversationId }, (res) => {
          console.log('✅ User 1 joined conversation:', res);
        });

        // User 2 gửi message
        setTimeout(() => {
          console.log('📤 User 2 sending message...');
          socket2.emit('chat:send_message', {
            conversationId,
            content: 'Hello from User 2!',
            type: 'TEXT'
          }, (res) => {
            console.log('✅ Message sent:', res);
          });
        }, 1000);

        // User 1 reply
        setTimeout(() => {
          console.log('📤 User 1 replying...');
          socket1.emit('chat:send_message', {
            conversationId,
            content: 'Hello from User 1! How can I help?',
            type: 'TEXT'
          }, (res) => {
            console.log('✅ Reply sent:', res);
          });
        }, 3000);
      }
    });
  }, 1000);
});

socket2.on('chat:new_message', (message) => {
  console.log('📨 User 2 received message:', message);
});

// Error handling
socket1.on('connect_error', (error) => {
  console.error('❌ User 1 connection error:', error.message);
});

socket2.on('connect_error', (error) => {
  console.error('❌ User 2 connection error:', error.message);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Disconnecting...');
  socket1.disconnect();
  socket2.disconnect();
  process.exit(0);
});
```

### 3.3. Chạy Test

```bash
node test-chat.js
```

**Expected Output:**
```
✅ User 1 connected: abc123
✅ User 2 connected: def456
👤 User status changed: { userId: 'user2-id', status: 'online' }
👤 User status changed: { userId: 'user1-id', status: 'online' }
📝 User 2 creating conversation...
✅ Conversation created: { success: true, data: {...} }
✅ User 1 joined conversation: { success: true }
📤 User 2 sending message...
✅ Message sent: { success: true, data: {...} }
📨 User 1 received message: { id: '...', content: 'Hello from User 2!', ... }
📨 User 2 received message: { id: '...', content: 'Hello from User 2!', ... }
📤 User 1 replying...
✅ Reply sent: { success: true, data: {...} }
📨 User 1 received message: { id: '...', content: 'Hello from User 1! How can I help?', ... }
📨 User 2 received message: { id: '...', content: 'Hello from User 1! How can I help?', ... }
```

---

## 4. TEST VỚI HTML TEST PAGE

### 4.1. Tạo Test HTML Page

Tạo file `test-chat.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chat Test Page</title>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
    }
    .container {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .messages {
      height: 400px;
      overflow-y: auto;
      border: 1px solid #eee;
      padding: 10px;
      margin-bottom: 10px;
      background: #f9f9f9;
    }
    .message {
      padding: 8px;
      margin: 5px 0;
      border-radius: 5px;
      background: white;
    }
    .message.sent {
      background: #dcf8c6;
      text-align: right;
    }
    .message.received {
      background: white;
    }
    input, button {
      padding: 10px;
      margin: 5px;
    }
    input[type="text"] {
      width: 300px;
    }
    .status {
      padding: 10px;
      margin: 10px 0;
      border-radius: 5px;
    }
    .status.connected {
      background: #d4edda;
      color: #155724;
    }
    .status.disconnected {
      background: #f8d7da;
      color: #721c24;
    }
    .typing {
      color: #888;
      font-style: italic;
      font-size: 12px;
      padding: 5px;
    }
  </style>
</head>
<body>
  <h1>🧪 Chat Realtime Test Page</h1>

  <div class="container">
    <h3>1. Kết nối</h3>
    <input type="text" id="token" placeholder="Nhập JWT Token">
    <button onclick="connect()">Kết nối</button>
    <button onclick="disconnect()">Ngắt kết nối</button>
    <div id="status" class="status disconnected">❌ Chưa kết nối</div>
  </div>

  <div class="container">
    <h3>2. Tạo/Join Conversation</h3>
    <input type="text" id="shopId" placeholder="Shop ID (optional)">
    <button onclick="createConversation()">Tạo Conversation</button>
    <br>
    <input type="text" id="conversationId" placeholder="Conversation ID">
    <button onclick="joinConversation()">Join Conversation</button>
  </div>

  <div class="container">
    <h3>3. Chat</h3>
    <div id="messages" class="messages"></div>
    <div id="typing" class="typing"></div>
    <input type="text" id="messageInput" placeholder="Nhập tin nhắn..." onkeypress="handleTyping(event)">
    <button onclick="sendMessage()">Gửi</button>
    <button onclick="markAsRead()">Đánh dấu đã đọc</button>
  </div>

  <div class="container">
    <h3>4. Logs</h3>
    <div id="logs" style="height: 200px; overflow-y: auto; background: #f0f0f0; padding: 10px; font-size: 12px;"></div>
  </div>

  <script>
    let socket = null;
    let currentConversationId = null;
    let typingTimeout = null;

    function log(message, data = null) {
      const logsDiv = document.getElementById('logs');
      const timestamp = new Date().toLocaleTimeString();
      logsDiv.innerHTML += `<div>[${timestamp}] ${message}</div>`;
      if (data) {
        logsDiv.innerHTML += `<pre>${JSON.stringify(data, null, 2)}</pre>`;
      }
      logsDiv.scrollTop = logsDiv.scrollHeight;
    }

    function connect() {
      const token = document.getElementById('token').value;
      if (!token) {
        alert('Vui lòng nhập JWT Token');
        return;
      }

      socket = io('http://localhost:3000', {
        auth: { token }
      });

      socket.on('connect', () => {
        log('✅ Kết nối thành công', { socketId: socket.id });
        document.getElementById('status').textContent = '✅ Đã kết nối';
        document.getElementById('status').className = 'status connected';
      });

      socket.on('disconnect', () => {
        log('❌ Ngắt kết nối');
        document.getElementById('status').textContent = '❌ Đã ngắt kết nối';
        document.getElementById('status').className = 'status disconnected';
      });

      socket.on('connect_error', (error) => {
        log('❌ Lỗi kết nối', { error: error.message });
        alert('Lỗi kết nối: ' + error.message);
      });

      // Chat events
      socket.on('chat:new_message', (message) => {
        log('📨 Nhận tin nhắn mới', message);
        displayMessage(message, false);
      });

      socket.on('chat:user_typing', (data) => {
        log('⌨️ User đang typing', data);
        document.getElementById('typing').textContent =
          `${data.user.firstName} đang nhập...`;
      });

      socket.on('chat:user_stopped_typing', (data) => {
        log('⌨️ User ngừng typing', data);
        document.getElementById('typing').textContent = '';
      });

      socket.on('chat:message_read', (data) => {
        log('✓✓ Tin nhắn đã được đọc', data);
      });

      socket.on('chat:user_status_changed', (data) => {
        log('👤 User status thay đổi', data);
      });
    }

    function disconnect() {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    }

    function createConversation() {
      if (!socket) {
        alert('Chưa kết nối!');
        return;
      }

      const shopId = document.getElementById('shopId').value;

      socket.emit('chat:create_conversation', {
        shopId: shopId || undefined,
        title: 'Test Conversation',
        type: 'CUSTOMER_SUPPORT'
      }, (response) => {
        log('✅ Tạo conversation', response);
        if (response.success) {
          currentConversationId = response.data.id;
          document.getElementById('conversationId').value = currentConversationId;

          // Auto join
          joinConversation();
        }
      });
    }

    function joinConversation() {
      if (!socket) {
        alert('Chưa kết nối!');
        return;
      }

      const conversationId = document.getElementById('conversationId').value;
      if (!conversationId) {
        alert('Vui lòng nhập Conversation ID');
        return;
      }

      currentConversationId = conversationId;

      socket.emit('chat:join_conversation', { conversationId }, (response) => {
        log('✅ Join conversation', response);
        if (response.success) {
          // Load messages
          loadMessages();
        }
      });
    }

    function loadMessages() {
      if (!socket || !currentConversationId) return;

      socket.emit('chat:get_messages', {
        conversationId: currentConversationId,
        limit: 50,
        offset: 0
      }, (response) => {
        log('📜 Load messages', response);
        if (response.success) {
          document.getElementById('messages').innerHTML = '';
          response.data.forEach(msg => displayMessage(msg, false));
        }
      });
    }

    function sendMessage() {
      if (!socket || !currentConversationId) {
        alert('Chưa join conversation!');
        return;
      }

      const input = document.getElementById('messageInput');
      const content = input.value.trim();

      if (!content) return;

      // Stop typing
      socket.emit('chat:typing_stop', { conversationId: currentConversationId });

      socket.emit('chat:send_message', {
        conversationId: currentConversationId,
        content,
        type: 'TEXT'
      }, (response) => {
        log('📤 Gửi tin nhắn', response);
        if (response.success) {
          displayMessage(response.data, true);
          input.value = '';
        }
      });
    }

    function displayMessage(message, isSent) {
      const messagesDiv = document.getElementById('messages');
      const msgDiv = document.createElement('div');
      msgDiv.className = `message ${isSent ? 'sent' : 'received'}`;

      const senderName = message.sender
        ? `${message.sender.firstName} ${message.sender.lastName}`
        : 'Unknown';

      const time = new Date(message.sentAt).toLocaleTimeString();

      msgDiv.innerHTML = `
        <strong>${senderName}</strong> <small>${time}</small>
        <div>${message.content}</div>
      `;

      messagesDiv.appendChild(msgDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function handleTyping(event) {
      if (!socket || !currentConversationId) return;

      // Emit typing start
      socket.emit('chat:typing_start', { conversationId: currentConversationId });

      // Clear previous timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      // Stop typing after 3 seconds
      typingTimeout = setTimeout(() => {
        socket.emit('chat:typing_stop', { conversationId: currentConversationId });
      }, 3000);

      // Send on Enter
      if (event.key === 'Enter') {
        sendMessage();
      }
    }

    function markAsRead() {
      if (!socket || !currentConversationId) return;

      socket.emit('chat:mark_as_read', {
        conversationId: currentConversationId
      }, (response) => {
        log('✓✓ Đánh dấu đã đọc', response);
      });
    }
  </script>
</body>
</html>
```

### 4.2. Sử dụng Test Page

1. Mở file `test-chat.html` trong browser
2. Nhập JWT Token vào ô input
3. Click "Kết nối"
4. Tạo conversation hoặc join conversation có sẵn
5. Gửi tin nhắn và xem real-time updates

**Mở nhiều tabs để test realtime:**
- Tab 1: User 1 (với token của user1)
- Tab 2: User 2 (với token của user2)
- Gửi tin nhắn từ Tab 1 → Tab 2 nhận ngay lập tức

---

## 5. TEST VỚI CURL VÀ WSCAT

### 5.1. Test REST API với curl

```bash
# 1. Tạo conversation qua REST API
curl -X POST http://localhost:3000/api/chat/conversations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "shop-uuid-here",
    "title": "Test Conversation"
  }'

# Response: { "success": true, "data": { "id": "conv-uuid", ... } }

# 2. Lấy danh sách conversations
curl http://localhost:3000/api/chat/conversations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 3. Gửi message qua REST API
curl -X POST http://localhost:3000/api/chat/conversations/CONV_ID/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Test message from curl",
    "type": "TEXT"
  }'

# 4. Lấy messages
curl http://localhost:3000/api/chat/conversations/CONV_ID/messages?limit=50 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 5. Mark as read
curl -X PUT http://localhost:3000/api/chat/conversations/CONV_ID/read \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5.2. Test WebSocket với wscat

```bash
# Cài đặt wscat
npm install -g wscat

# Kết nối với token
wscat -c "ws://localhost:3000?token=YOUR_JWT_TOKEN"

# Hoặc với Socket.IO protocol (cần wscat hỗ trợ)
wscat -c "ws://localhost:3000/socket.io/?EIO=4&transport=websocket&token=YOUR_JWT_TOKEN"
```

**Gửi events:**
```json
42["chat:create_conversation",{"shopId":"shop-id","title":"Test"}]
42["chat:send_message",{"conversationId":"conv-id","content":"Hello"}]
```

---

## 6. SCENARIOS TEST

### 6.1. Scenario: Customer chat với Shop Owner

**Setup:**
1. User A (Customer) - Login và lấy token
2. User B (Shop Owner) - Login và lấy token
3. Tạo shop với ownerId = User B

**Test Steps:**

```javascript
// User A tạo conversation với shop
socketA.emit('chat:create_conversation', {
  shopId: 'shop-id-of-user-b',
  title: 'Hỏi về sản phẩm XYZ',
  type: 'CUSTOMER_SUPPORT'
}, (response) => {
  const convId = response.data.id;

  // User B (shop owner) tự động được thêm vào conversation
  // User B join conversation
  socketB.emit('chat:join_conversation', { conversationId: convId });

  // User A gửi message
  socketA.emit('chat:send_message', {
    conversationId: convId,
    content: 'Sản phẩm XYZ còn hàng không?',
    type: 'TEXT'
  });

  // User B nhận message và reply
  socketB.on('chat:new_message', (msg) => {
    console.log('Shop owner nhận:', msg);

    socketB.emit('chat:send_message', {
      conversationId: convId,
      content: 'Vẫn còn hàng ạ. Bạn muốn đặt bao nhiêu?',
      type: 'TEXT'
    });
  });
});
```

**Expected:**
- User A thấy conversation được tạo
- User B (shop owner) được tự động thêm vào participants
- Messages được gửi và nhận real-time
- Unread count tăng cho người chưa đọc

### 6.2. Scenario: Typing Indicator

```javascript
// User A bắt đầu typing
socketA.emit('chat:typing_start', { conversationId: 'conv-id' });

// User B nhận event
socketB.on('chat:user_typing', (data) => {
  console.log(`${data.user.firstName} đang nhập...`);
  // Show "User A đang nhập..." trong UI
});

// Sau 3 giây hoặc khi send message
socketA.emit('chat:typing_stop', { conversationId: 'conv-id' });

// User B nhận event
socketB.on('chat:user_stopped_typing', (data) => {
  // Hide typing indicator
});
```

### 6.3. Scenario: Message với Attachments

```javascript
socketA.emit('chat:send_message', {
  conversationId: 'conv-id',
  content: 'Đây là ảnh sản phẩm',
  type: 'IMAGE',
  attachments: [
    {
      url: 'https://example.com/image.jpg',
      type: 'image/jpeg',
      name: 'product.jpg',
      size: 123456
    }
  ]
});
```

### 6.4. Scenario: Reply to Message

```javascript
// User B reply message của User A
socketB.emit('chat:send_message', {
  conversationId: 'conv-id',
  content: 'Đây là câu trả lời',
  type: 'TEXT',
  replyToId: 'message-id-of-user-a'
});

// Message sẽ có replyTo relationship
```

### 6.5. Scenario: Edit và Delete Message

```javascript
// Edit message
socketA.emit('chat:edit_message', {
  messageId: 'msg-id',
  content: 'Nội dung đã chỉnh sửa'
}, (response) => {
  console.log('Edited:', response.data);
});

// All users nhận event
socketB.on('chat:message_updated', (message) => {
  console.log('Message updated:', message);
  // message.editedAt sẽ có giá trị
});

// Delete message
socketA.emit('chat:delete_message', {
  messageId: 'msg-id'
});

// All users nhận event
socketB.on('chat:message_deleted', (data) => {
  console.log('Message deleted:', data.messageId);
  // Remove từ UI hoặc show "Tin nhắn đã bị xóa"
});
```

### 6.6. Scenario: Pagination - Load More Messages

```javascript
// Load first 50 messages
socketA.emit('chat:get_messages', {
  conversationId: 'conv-id',
  limit: 50,
  offset: 0
}, (response) => {
  const messages = response.data;
  console.log('First 50 messages:', messages);

  // User scroll up để load more
  // Load next 50 messages
  socketA.emit('chat:get_messages', {
    conversationId: 'conv-id',
    limit: 50,
    offset: 50
  }, (response) => {
    console.log('Next 50 messages:', response.data);
  });
});
```

### 6.7. Scenario: Mark as Read

```javascript
// Mark specific message as read
socketA.emit('chat:mark_as_read', {
  conversationId: 'conv-id',
  messageId: 'msg-id'
});

// Mark ALL messages in conversation as read
socketA.emit('chat:mark_as_read', {
  conversationId: 'conv-id'
  // Không có messageId
});

// Other users nhận notification
socketB.on('chat:message_read', (data) => {
  console.log('User đã đọc:', data);
  // Update UI: show double check mark
});
```

### 6.8. Scenario: Close Conversation

```javascript
socketA.emit('chat:close_conversation', {
  conversationId: 'conv-id'
}, (response) => {
  console.log('Conversation closed:', response.data);
});

// All participants nhận event
socketB.on('chat:conversation_closed', (conversation) => {
  console.log('Conversation đã đóng:', conversation);
  // Disable message input
});

// Nếu try gửi message sau khi closed
socketA.emit('chat:send_message', {
  conversationId: 'conv-id',
  content: 'Test'
}, (response) => {
  // response.success = false
  // response.error = "Conversation đã được đóng"
});
```

---

## 7. KIỂM TRA KẾT QUẢ

### 7.1. Check Database

```sql
-- Kiểm tra conversations
SELECT * FROM "Conversation" ORDER BY "createdAt" DESC LIMIT 10;

-- Kiểm tra messages
SELECT * FROM "Message" WHERE "conversationId" = 'conv-id' ORDER BY "sentAt" ASC;

-- Kiểm tra participants
SELECT * FROM "ConversationParticipant" WHERE "conversationId" = 'conv-id';

-- Kiểm tra unread count
SELECT
  cp.id,
  u.email,
  cp."unreadCount",
  cp."lastReadAt"
FROM "ConversationParticipant" cp
JOIN "User" u ON u.id = cp."userId"
WHERE cp."conversationId" = 'conv-id';
```

### 7.2. Check Logs

```bash
# Server logs sẽ hiển thị:
✅ Socket authenticated: user1@test.com (socket-id)
💬 User user1@test.com connected to chat
User user1@test.com joined conversation conv-id
```

### 7.3. Monitor Socket.IO Admin UI

```bash
# Truy cập Socket.IO Admin UI (nếu enabled)
# Mở browser: https://admin.socket.io
# Connect to: http://localhost:3000
```

---

## 8. TROUBLESHOOTING

### Lỗi: "Authentication error: Token không hợp lệ"

**Nguyên nhân:**
- Token sai hoặc hết hạn
- Token không được gửi đúng format

**Giải pháp:**
```javascript
// Đảm bảo gửi token đúng cách:
const socket = io('http://localhost:3000', {
  auth: { token: 'your-token-here' }
});

// Hoặc qua query:
const socket = io('http://localhost:3000?token=your-token-here');
```

### Lỗi: "Conversation không tồn tại"

**Nguyên nhân:**
- ConversationId sai
- Conversation đã bị xóa

**Giải pháp:**
```bash
# Kiểm tra conversation trong DB
psql -d your_database -c "SELECT * FROM \"Conversation\" WHERE id = 'conv-id';"
```

### Không nhận được realtime messages

**Nguyên nhân:**
- Chưa join conversation room
- Socket connection bị disconnect

**Giải pháp:**
```javascript
// Luôn join conversation trước khi chat
socket.emit('chat:join_conversation', { conversationId: 'conv-id' }, (response) => {
  if (response.success) {
    console.log('Joined successfully');
  }
});

// Listen for disconnect
socket.on('disconnect', () => {
  console.log('Disconnected! Try to reconnect...');
  socket.connect();
});
```

---

## 9. BEST PRACTICES

1. **Luôn xử lý callbacks:**
   ```javascript
   socket.emit('chat:send_message', payload, (response) => {
     if (response.success) {
       // Success
     } else {
       // Handle error
       console.error(response.error);
     }
   });
   ```

2. **Implement reconnection logic:**
   ```javascript
   const socket = io('http://localhost:3000', {
     auth: { token },
     reconnection: true,
     reconnectionAttempts: 5,
     reconnectionDelay: 1000
   });
   ```

3. **Clean up event listeners:**
   ```javascript
   // Khi unmount component hoặc disconnect
   socket.off('chat:new_message');
   socket.off('chat:user_typing');
   socket.disconnect();
   ```

4. **Error handling:**
   ```javascript
   socket.on('chat:error', (error) => {
     console.error('Chat error:', error);
     alert(error.message);
   });
   ```

---

## 10. KẾT LUẬN

Testing chat realtime đòi hỏi:
- ✅ Multiple clients để test real-time broadcasting
- ✅ Valid JWT tokens cho authentication
- ✅ Understanding về Socket.IO rooms và events
- ✅ Database verification để đảm bảo data consistency

Tools recommended:
- **Development:** HTML Test Page hoặc Socket.IO Client script
- **Manual Testing:** Postman với WebSocket support
- **Automated Testing:** Jest với socket.io-client
- **Monitoring:** Socket.IO Admin UI

Happy Testing! 🚀
