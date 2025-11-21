# 🚀 Quick Start Guide

Hướng dẫn nhanh để chạy chat frontend trong 5 phút!

## 📋 Prerequisites

- Node.js >= 18
- npm hoặc yarn
- Backend server đang chạy (xem backend README)

## 🎯 Bước 1: Clone & Install

```bash
# Di chuyển vào thư mục frontend
cd frontend-chat-example

# Install dependencies
npm install
# hoặc
yarn install
```

## ⚙️ Bước 2: Cấu hình

Tạo file `.env`:

```bash
cp .env.example .env
```

Sửa file `.env`:

```env
VITE_API_URL=http://localhost:3000
```

> **Lưu ý**: Đảm bảo backend của bạn đang chạy tại địa chỉ này!

## 🏃 Bước 3: Chạy

```bash
npm run dev
# hoặc
yarn dev
```

Mở trình duyệt tại: `http://localhost:3001`

## 🔑 Bước 4: Đăng nhập

Sử dụng thông tin đăng nhập test (hoặc tài khoản của bạn):

```
Email: test@example.com
Password: your_password
```

## 🎉 Hoàn tất!

Bây giờ bạn có thể:

1. ✅ Xem danh sách conversations
2. ✅ Tạo conversation mới
3. ✅ Gửi tin nhắn realtime
4. ✅ Chỉnh sửa/xóa tin nhắn
5. ✅ Xem typing indicators
6. ✅ Xem trạng thái online/offline

## 🔧 Test với nhiều users

Mở nhiều tab/cửa sổ trình duyệt:

1. Tab 1: Đăng nhập với user A
2. Tab 2: Đăng nhập với user B
3. Tạo conversation giữa 2 users
4. Test gửi tin nhắn qua lại!

## 📱 Test trên Mobile

1. Lấy IP của máy: `ipconfig` (Windows) hoặc `ifconfig` (Mac/Linux)
2. Sửa `.env`:
   ```env
   VITE_API_URL=http://YOUR_IP:3000
   ```
3. Truy cập từ mobile: `http://YOUR_IP:3001`

## 🐛 Gặp vấn đề?

### Socket không connect

```bash
# Kiểm tra backend có chạy không
curl http://localhost:3000/api/health

# Kiểm tra CORS trong backend
# File: src/middleware/cors.ts
origin: ['http://localhost:3001', 'http://YOUR_IP:3001']
```

### Không thấy messages

1. Mở DevTools → Console
2. Xem có lỗi gì không
3. Kiểm tra Network tab
4. Verify token trong localStorage

### Build lỗi

```bash
# Clear cache và reinstall
rm -rf node_modules package-lock.json
npm install
```

## 🎨 Customize

### Thay đổi port

File `vite.config.ts`:

```ts
server: {
  port: 3001, // Đổi thành port khác
}
```

### Thay đổi màu

File `tailwind.config.js`:

```js
colors: {
  primary: {
    500: '#YOUR_COLOR',
  }
}
```

## 📚 Next Steps

Xem [README.md](./README.md) để tìm hiểu:

- 📖 Chi tiết về architecture
- 🔌 Socket events
- 🎯 Advanced usage
- 🛠️ API documentation

## 💡 Pro Tips

1. **Hot Reload**: Vite tự động reload khi bạn sửa code
2. **TypeScript**: Sử dụng VSCode để có IntelliSense tốt nhất
3. **DevTools**: Mở React DevTools để debug components
4. **Network**: Check Network tab để xem Socket.IO handshake

## 🤝 Need Help?

- 📖 Đọc [README.md](./README.md)
- 🐛 Tạo issue trên GitHub
- 💬 Hỏi team

---

Happy Coding! 🎉
