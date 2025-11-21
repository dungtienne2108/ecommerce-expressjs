# 📦 Installation & Setup Guide

Hướng dẫn chi tiết từng bước để cài đặt và chạy chat frontend.

## ✅ Prerequisites Check

Trước khi bắt đầu, đảm bảo bạn đã cài:

```bash
# Check Node.js version (cần >= 18)
node --version

# Check npm version
npm --version

# Check git
git --version
```

Nếu chưa có, tải tại:
- **Node.js**: https://nodejs.org/ (LTS version)
- **Git**: https://git-scm.com/

## 🚀 Step-by-Step Installation

### Bước 1: Verify Backend

Trước tiên, đảm bảo backend đang chạy:

```bash
# Mở terminal mới, di chuyển đến thư mục backend
cd /path/to/backend

# Check backend có chạy không
curl http://localhost:3000/api/health

# Nếu không chạy, start backend:
npm run dev
```

### Bước 2: Di chuyển đến Frontend

```bash
cd /path/to/frontend-chat-example
```

### Bước 3: Install Dependencies

#### Option A: Using npm

```bash
npm install
```

#### Option B: Using yarn

```bash
# Cài yarn nếu chưa có
npm install -g yarn

# Install dependencies
yarn install
```

#### Option C: Using pnpm (fastest)

```bash
# Cài pnpm nếu chưa có
npm install -g pnpm

# Install dependencies
pnpm install
```

**Expected output**:
```
added 200+ packages in 30s

8 packages are looking for funding
  run `npm fund` for details
```

### Bước 4: Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Sửa file .env
nano .env
# hoặc mở bằng editor yêu thích
```

**Nội dung file `.env`**:

```env
# Backend API URL
VITE_API_URL=http://localhost:3000

# Socket URL (nếu khác với API URL)
# VITE_SOCKET_URL=http://localhost:3000
```

**Lưu ý**:
- Đảm bảo URL đúng với backend của bạn
- Không có dấu `/` ở cuối URL

### Bước 5: Run Development Server

```bash
npm run dev
```

**Expected output**:

```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:3001/
  ➜  Network: http://192.168.1.100:3001/
  ➜  press h to show help
```

### Bước 6: Open in Browser

1. Mở trình duyệt
2. Truy cập: `http://localhost:3001`
3. Bạn sẽ thấy trang login

### Bước 7: Login

Sử dụng tài khoản test của bạn:

```
Email: your-test-email@example.com
Password: your-password
```

### Bước 8: Verify Everything Works

Checklist:

- [ ] Trang load không có lỗi
- [ ] Login thành công
- [ ] Thấy "Connected" badge màu xanh
- [ ] Có thể xem conversations (nếu có)
- [ ] Có thể tạo conversation mới
- [ ] Có thể gửi tin nhắn
- [ ] Tin nhắn xuất hiện realtime

## 🔍 Troubleshooting

### Lỗi: "Cannot find module"

```bash
# Xóa node_modules và reinstall
rm -rf node_modules package-lock.json
npm install
```

### Lỗi: "Port 3001 already in use"

**Cách 1: Kill process đang dùng port**
```bash
# Trên Linux/Mac
lsof -ti:3001 | xargs kill -9

# Trên Windows
netstat -ano | findstr :3001
taskkill /PID <PID_NUMBER> /F
```

**Cách 2: Đổi port**

Sửa file `vite.config.ts`:
```typescript
server: {
  port: 3002, // Đổi thành port khác
}
```

### Lỗi: "Socket connection failed"

**Kiểm tra**:

1. Backend có đang chạy không?
   ```bash
   curl http://localhost:3000/api/health
   ```

2. CORS có được config đúng không?

   File backend `src/middleware/cors.ts`:
   ```typescript
   origin: [
     'http://localhost:3001',
     'http://localhost:3002'
   ]
   ```

3. URL trong `.env` có đúng không?

4. Token có hợp lệ không?
   - Mở DevTools → Application → Local Storage
   - Check key `token` có giá trị

### Lỗi: "Failed to fetch conversations"

**Check**:

1. Mở DevTools → Network tab
2. Xem request có đi đến đúng URL không
3. Check response status code
4. Verify token trong Authorization header

### Lỗi: TypeScript

```bash
# Type check
npm run type-check

# Nếu có lỗi, xem lỗi và fix
# Hoặc tạm thời ignore:
# @ts-ignore
```

### Lỗi: "Cannot read property of undefined"

Thường do:
1. User chưa login (chưa có token)
2. API trả về data không đúng format
3. Missing null checks

**Fix**: Xem console log và fix component tương ứng

## 🧪 Testing Installation

### Test 1: Check Dependencies

```bash
# Check tất cả dependencies đã được install
npm ls

# Check specific package
npm ls socket.io-client
```

### Test 2: Build Production

```bash
# Build để xem có lỗi không
npm run build

# Nếu build thành công:
✓ built in 2.5s
```

### Test 3: Preview Production Build

```bash
npm run preview
```

Mở `http://localhost:4173` để test production build.

### Test 4: Multi-User Test

1. Mở 2 trình duyệt (hoặc 2 incognito windows)
2. Login với 2 users khác nhau
3. Tạo conversation giữa 2 users
4. Gửi tin nhắn qua lại
5. Verify realtime updates

## 📱 Mobile Testing

### Option 1: Using ngrok (easiest)

```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 3001

# Sẽ có URL như: https://abc123.ngrok.io
# Truy cập URL này từ mobile
```

### Option 2: Using local IP

```bash
# Get your local IP
# Linux/Mac:
ifconfig | grep "inet "

# Windows:
ipconfig

# Example: 192.168.1.100
```

**Update `.env`**:
```env
VITE_API_URL=http://192.168.1.100:3000
```

**Update backend CORS**:
```typescript
origin: ['http://192.168.1.100:3001']
```

**Access from mobile**:
```
http://192.168.1.100:3001
```

## 🎨 Customization After Install

### Change Colors

File: `tailwind.config.js`

```js
colors: {
  primary: {
    500: '#YOUR_COLOR',
    600: '#YOUR_COLOR_DARKER',
  }
}
```

### Change Port

File: `vite.config.ts`

```typescript
server: {
  port: 3001, // Change here
}
```

### Change API URL

File: `.env`

```env
VITE_API_URL=https://your-production-api.com
```

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

Output in `dist/` folder.

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts
```

### Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy

# Follow prompts
```

### Deploy to Nginx

```bash
# Build
npm run build

# Copy dist folder to nginx
sudo cp -r dist/* /var/www/html/

# Configure nginx
sudo nano /etc/nginx/sites-available/default

# Add:
location / {
  try_files $uri $uri/ /index.html;
}

# Restart nginx
sudo systemctl restart nginx
```

## 📊 Performance Optimization

### 1. Enable Gzip

Nginx config:
```nginx
gzip on;
gzip_types text/css application/javascript;
```

### 2. Enable Caching

```nginx
location /assets/ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

### 3. Use CDN

Upload built assets to CDN (Cloudflare, AWS CloudFront, etc.)

### 4. Code Splitting

Already enabled in Vite config. Verify:

```bash
npm run build

# Should see multiple chunk files:
# index-abc123.js
# vendor-xyz789.js
```

## 🔒 Security Checklist

- [ ] Environment variables không commit vào git
- [ ] `.env` trong `.gitignore`
- [ ] HTTPS trong production
- [ ] Token expires được handle
- [ ] XSS protection enabled
- [ ] CORS properly configured
- [ ] Rate limiting on backend
- [ ] Input validation
- [ ] Error messages không expose sensitive info

## 📈 Monitoring

### Add Analytics

```tsx
// src/App.tsx
import { useEffect } from 'react';

useEffect(() => {
  // Google Analytics
  gtag('config', 'GA_MEASUREMENT_ID');
}, []);
```

### Add Error Tracking

```bash
# Install Sentry
npm install @sentry/react

# Initialize
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
});
```

## 🎓 Next Steps

1. ✅ Read [QUICK_START.md](./QUICK_START.md) for usage
2. ✅ Read [README.md](./README.md) for API docs
3. ✅ Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand structure
4. ✅ Start customizing for your needs
5. ✅ Deploy to production

## 📞 Get Help

If you encounter issues:

1. Check this guide thoroughly
2. Read error messages carefully
3. Check browser console (F12)
4. Check network tab in DevTools
5. Verify backend is running
6. Ask in GitHub Discussions
7. Create GitHub Issue with:
   - Error message
   - Steps to reproduce
   - Environment info (Node version, OS, etc.)

## ✨ Success!

If you see this in your browser:

```
┌────────────────────────────────────┐
│  Chat System    [Connected]        │
├────────────────────────────────────┤
│                                    │
│  💬 Conversations                  │
│                                    │
│  No conversations yet              │
│  Click "Create New" to start       │
│                                    │
└────────────────────────────────────┘
```

**Congratulations! 🎉**

Your chat system is up and running!

---

**Installation Time**: 5-10 minutes
**Difficulty**: Easy
**Support**: Available via GitHub

Happy coding! 🚀
