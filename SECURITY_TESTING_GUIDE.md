# HƯỚNG DẪN KIỂM TRA BẢO MẬT - PHÂN QUYỀN

## 📋 Tổng quan

Bộ công cụ này giúp bạn demo và kiểm tra các lỗ hổng bảo mật về phân quyền (Authorization) trong dự án ecommerce-expressjs.

## 📁 Các file đã tạo

1. **AUTHORIZATION_DEMO_SCENARIOS.md** - Tài liệu chi tiết về:
   - Tổng quan hệ thống phân quyền
   - Kịch bản demo phân quyền đúng
   - 5 lỗ hổng bảo mật đã phát hiện (CRITICAL → MEDIUM)
   - Các kịch bản khai thác (exploitation) với ví dụ curl
   - Khuyến nghị sửa lỗi chi tiết với code mẫu
   - Checklist kiểm tra bảo mật

2. **test-authorization-exploits.sh** - Script bash tương tác để:
   - Tự động test các lỗ hổng
   - Menu lựa chọn exploit cụ thể
   - Colored output để dễ theo dõi
   - Tự động capture và lưu tokens

3. **Authorization-Exploits.postman_collection.json** - Postman collection với:
   - 30+ requests đã cấu hình sẵn
   - Test scripts tự động kiểm tra vulnerabilities
   - Variables để dễ dàng chuyển đổi giữa các tài khoản
   - Organized theo từng exploit scenario

4. **SECURITY_TESTING_GUIDE.md** - File này

## 🚀 Cách sử dụng

### Option 1: Sử dụng Bash Script (Recommended cho demo trực tiếp)

```bash
# 1. Cấp quyền thực thi
chmod +x test-authorization-exploits.sh

# 2. Đảm bảo server đang chạy
npm run dev  # hoặc npm start

# 3. Chạy script
./test-authorization-exploits.sh

# 4. Chọn exploit từ menu
# Exploit #1: Tự duyệt shop (CRITICAL)
# Exploit #2: Duyệt shop người khác (CRITICAL)
# Exploit #3: IDOR - Xem info user khác (HIGH)
# Exploit #4: Sửa order của người khác (MEDIUM)
# Exploit #5: Đọc chat của người khác (MEDIUM)
```

**Yêu cầu**:
```bash
# Cài đặt jq (JSON processor)
sudo apt-get install jq

# Hoặc trên macOS
brew install jq
```

### Option 2: Sử dụng Postman (Recommended cho testing có tổ chức)

```bash
# 1. Mở Postman

# 2. Import collection
File → Import → Authorization-Exploits.postman_collection.json

# 3. Cấu hình Variables
# Click vào collection → Variables tab
# - baseUrl: http://localhost:3000 (hoặc URL server của bạn)
# - Các token sẽ tự động được set sau khi login

# 4. Chạy requests theo thứ tự
# Folder 1: Setup - Authentication (login các tài khoản)
# Folder 2-6: Các exploit scenarios
# Folder 7: Valid authorization tests (baseline)

# 5. Xem kết quả trong Console tab
# Tests sẽ tự động fail nếu có vulnerability
```

### Option 3: Manual Testing với curl

Xem file `AUTHORIZATION_DEMO_SCENARIOS.md` section 4 để có các lệnh curl chi tiết.

---

## 🔴 Lỗ hổng đã phát hiện (Tóm tắt)

### 1. CRITICAL: Shop Approval/Reject - Missing Authorization

**File**: `src/routes/shop.routes.ts:54-71`

**Vấn đề**: BẤT KỲ user ACTIVE nào cũng có thể:
- Tự duyệt shop của mình
- Duyệt/từ chối shop của người khác

**Test**:
```bash
# Bash script
./test-authorization-exploits.sh
# Chọn option 1 hoặc 2

# Postman
Folder: "EXPLOIT #1: Shop Self-Approval"
```

**Impact**:
- Bỏ qua KYC process
- Shop lừa đảo được kích hoạt
- DoS attack (từ chối shop hợp lệ)

**Priority**: FIX NGAY (Week 1)

---

### 2. HIGH: User Detail - IDOR Vulnerability

**File**: `src/routes/user.routes.ts:13`

**Vấn đề**: User có thể xem thông tin chi tiết của BẤT KỲ user nào:
```bash
GET /api/users/{any-user-id}
# Không kiểm tra ownership
```

**Test**:
```bash
# Bash script
./test-authorization-exploits.sh
# Chọn option 3

# Postman
Folder: "EXPLOIT #3: User Info IDOR"
```

**Impact**:
- Rò rỉ email, phone, status
- User enumeration
- Phishing attacks

**Priority**: FIX NGAY (Week 1)

---

### 3. MEDIUM: Order Status Update - Missing Role Check

**File**: `src/routes/order.routes.ts:39-43`

**Vấn đề**: User có thể cập nhật status của đơn hàng không phải của mình

**Test**:
```bash
# Postman
Folder: "EXPLOIT #4: Order Status Update"
```

**Impact**:
- Hủy đơn của người khác
- Mark as DELIVERED để lừa đảo

**Priority**: Week 2

---

### 4. MEDIUM: Chat - Missing Conversation Access Check

**File**: `src/routes/chat.routes.ts`

**Vấn đề**: Không kiểm tra user có phải participant của conversation không

**Test**:
```bash
# Postman
Folder: "EXPLOIT #5: Chat Privacy Breach"
```

**Impact**:
- Đọc tin nhắn riêng tư
- Gửi message giả mạo
- Xóa/sửa tin nhắn của người khác

**Priority**: Week 2

---

## 📊 Demo Presentation Flow (Cho khách hàng/stakeholders)

### Phần 1: Giới thiệu (5 phút)
```
1. Mở file: AUTHORIZATION_DEMO_SCENARIOS.md
2. Trình bày section 1: Tổng quan hệ thống phân quyền
   - 5 roles: SYSTEM_ADMIN, SELLER, CUSTOMER, GUEST, KYC_REVIEWER
   - Permission system: MODULE:ACTION
   - 3 lớp bảo vệ: Route → Service → Database
```

### Phần 2: Demo Authorization Đúng (10 phút)
```
1. Mở Postman
2. Chạy folder "Valid Authorization Tests"
   ✅ Admin can list users → 200 OK
   ❌ Customer cannot list users → 403 Forbidden
   ✅ Seller can create product → 201 Created
   ❌ Customer cannot create product → 403 Forbidden

3. Giải thích:
   - Middleware chain hoạt động đúng
   - Role-based access control work as expected
```

### Phần 3: Demo Vulnerabilities (20 phút)

**3.1. CRITICAL: Shop Self-Approval**
```bash
# Terminal 1: Chạy server với logs
npm run dev

# Terminal 2: Chạy exploit
./test-authorization-exploits.sh
# Chọn option 1

# Kết quả mong đợi (nếu có lỗi):
🔴 LỖ HỔNG XÁC NHẬN! Shop đã được tự duyệt
⚠️  Shop ID: shop-abc123
⚠️  Trạng thái: APPROVED

# Giải thích tác động:
- Attacker tạo shop với KYC giả
- Tự duyệt mà không cần KYC reviewer
- Có thể bán hàng lừa đảo
```

**3.2. HIGH: User IDOR**
```bash
# Chọn option 3 trong script
# Hoặc Postman: "EXPLOIT #3: User Info IDOR"

# Kết quả (nếu có lỗi):
🔴 IDOR VULNERABILITY CONFIRMED!
❌ Leaked Email: victim@example.com
❌ Leaked Phone: +84123456789
❌ Account Status: ACTIVE

# Tác động:
- Rò rỉ PII (Personally Identifiable Information)
- Có thể dùng cho phishing
```

**3.3. MEDIUM: Order & Chat**
```
- Demo tương tự với Postman
- Show impact: Privacy breach, fraud potential
```

### Phần 4: Solutions (10 phút)
```
1. Mở file: AUTHORIZATION_DEMO_SCENARIOS.md
2. Section 5: Khuyến nghị sửa lỗi
3. Show code diffs:
   - BEFORE: Missing role check
   - AFTER: With requireRole middleware

4. Prioritization:
   Week 1: Fix CRITICAL + HIGH
   Week 2: Fix MEDIUM
   Week 3: Comprehensive testing + penetration test
```

---

## 🛡️ Khuyến nghị sửa lỗi (Quick Reference)

### Fix #1: Shop Approval (CRITICAL)

**File**: `src/routes/shop.routes.ts`

```typescript
// BEFORE (Vulnerable)
router.put('/:id/approval',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE])
  ),
  shopController.approvalShop
);

// AFTER (Secure)
router.put('/:id/approval',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SYSTEM_ADMIN, RoleType.KYC_REVIEWER),  // ✅ ADD
    requirePermission(
      PermissionModule.SHOP_MANAGEMENT,
      PermissionAction.APPROVE
    )  // ✅ ADD
  ),
  shopController.approvalShop
);
```

### Fix #2: User IDOR (HIGH)

**File**: `src/routes/user.routes.ts`

```typescript
// BEFORE
router.get('/:id',
  combineMiddleware(authenticateToken),
  userController.getUserById
);

// AFTER
router.get('/:id',
  combineMiddleware(
    authenticateToken,
    requireOwnership(async (req) => req.params.id)  // ✅ ADD
  ),
  userController.getUserById
);
```

### Fix #3: Order Status (MEDIUM)

**File**: `src/services/order.service.ts`

```typescript
async updateOrderStatus(orderId: string, newStatus: OrderStatus, userId: string) {
  const order = await this.uow.orders.findById(orderId);

  // ✅ ADD: Authorization check
  const user = await this.uow.users.findById(userId);
  const isAdmin = user.roles.some(r => r.role.type === RoleType.SYSTEM_ADMIN);
  const isOrderOwner = order.userId === userId;
  const shop = await this.uow.shops.findById(order.shopId);
  const isShopOwner = shop?.ownerId === userId;

  if (!isAdmin && !isOrderOwner && !isShopOwner) {
    throw new ForbiddenError('Bạn không có quyền cập nhật đơn hàng này');
  }

  // Rest of the logic...
}
```

### Fix #4: Chat Access (MEDIUM)

**File**: `src/services/chat.service.ts`

```typescript
// ✅ ADD: Helper method
private async verifyConversationAccess(conversationId: string, userId: string) {
  const conversation = await this.uow.conversations.findById(conversationId);
  const isParticipant = conversation.participants.some(p => p.userId === userId);
  const user = await this.uow.users.findById(userId);
  const isAdmin = user.roles.some(r => r.role.type === RoleType.SYSTEM_ADMIN);

  if (!isParticipant && !isAdmin) {
    throw new ForbiddenError('Bạn không có quyền truy cập cuộc hội thoại này');
  }
}

// Use in all chat methods
async getMessages(conversationId: string, userId: string) {
  await this.verifyConversationAccess(conversationId, userId);  // ✅ ADD
  return await this.uow.messages.findByConversationId(conversationId);
}
```

---

## 📝 Checklist trước khi Deploy

Trước khi deploy lên production, đảm bảo:

- [ ] Đã fix tất cả lỗ hổng CRITICAL (Shop Approval)
- [ ] Đã fix tất cả lỗ hổng HIGH (User IDOR)
- [ ] Đã thêm unit tests cho authorization
- [ ] Đã chạy lại toàn bộ Postman collection (không còn vulnerability)
- [ ] Đã chạy bash script và tất cả exploits đều bị block (403)
- [ ] Đã code review toàn bộ routes để tìm pattern tương tự
- [ ] Đã document authorization requirements cho team
- [ ] Đã setup monitoring/alerting cho unauthorized access attempts
- [ ] Đã penetration test bởi security team (nếu có)

---

## 🔍 Kiểm tra nhanh

Sau khi fix, chạy lệnh này để verify:

```bash
# Chạy tất cả exploits tự động
./test-authorization-exploits.sh
# Chọn option 6 (Run all exploits)

# Expected result: TẤT CẢ phải trả về 403 Forbidden
# Nếu còn bất kỳ exploit nào return 200 → Vẫn còn vulnerability
```

Hoặc với Postman:

```
Collection Runner → Select "Authorization-Exploits" → Run

Expected: All tests PASS (meaning all exploits were blocked)
```

---

## 📚 Tài liệu tham khảo

- [OWASP Top 10 - A01:2021 Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [OWASP Testing Guide - Authorization Testing](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/05-Authorization_Testing/)
- [CWE-639: Authorization Bypass Through User-Controlled Key](https://cwe.mitre.org/data/definitions/639.html)
- File: `AUTHORIZATION_DEMO_SCENARIOS.md` (Tài liệu chi tiết nhất)

---

## ❓ FAQ

**Q: Script báo "Server không phản hồi", làm sao?**
```bash
# Kiểm tra server có chạy không
curl http://localhost:3000/api/health

# Nếu không có /api/health endpoint, sửa trong script:
# Line ~30: Đổi endpoint khác (VD: /api/auth/login)
```

**Q: Tôi muốn test với URL khác (không phải localhost)?**
```bash
# Option 1: Set environment variable
export API_BASE_URL=https://staging.example.com
./test-authorization-exploits.sh

# Option 2: Edit script
# Line 10: Sửa API_BASE_URL="https://your-url.com"
```

**Q: Postman collection không có token?**
```
1. Chạy folder "Setup - Authentication" trước
2. Các request sẽ tự động lưu token vào collection variables
3. Nếu vẫn không có, check Console tab xem có lỗi gì
```

**Q: Tôi muốn thêm exploit mới?**
```bash
# 1. Thêm function vào bash script (theo pattern có sẵn)
# 2. Thêm vào menu (function show_menu)
# 3. Thêm case trong main() function

# Hoặc tạo request mới trong Postman
# Copy request có sẵn → Sửa URL/body → Add test script
```

---

## 👥 Liên hệ

Nếu có câu hỏi hoặc phát hiện lỗ hổng mới, vui lòng:
- Tạo issue trên GitHub (nếu public repo)
- Liên hệ security team
- Email: security@your-company.com

---

**Tạo bởi**: Claude Code Security Analysis
**Ngày**: 2025-11-15
**Version**: 1.0
**Last Updated**: 2025-11-15
