# Hướng dẫn tích hợp VNPay Payment Gateway

## Tổng quan

Dự án đã được tích hợp VNPay Payment Gateway để hỗ trợ thanh toán trực tuyến. Tài liệu này hướng dẫn cách cấu hình và sử dụng VNPay trong dự án.

## 1. Cấu hình

### 1.1. Đăng ký tài khoản VNPay

1. Truy cập https://sandbox.vnpayment.vn/ để đăng ký tài khoản test (sandbox)
2. Hoặc truy cập https://vnpay.vn/ để đăng ký tài khoản production
3. Sau khi đăng ký, bạn sẽ nhận được:
   - **TMN Code**: Mã định danh merchant
   - **Hash Secret**: Secret key để mã hóa dữ liệu

### 1.2. Cấu hình biến môi trường

Thêm các biến sau vào file `.env`:

```env
# VNPay Payment Gateway Configuration
VNPAY_TMN_CODE=your_vnpay_tmn_code_here
VNPAY_HASH_SECRET=your_vnpay_hash_secret_here
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:5000/api/payments/vnpay/return
VNPAY_IPN_URL=http://localhost:5000/api/payments/vnpay/ipn
```

**Lưu ý:**
- Với môi trường sandbox, sử dụng URL: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`
- Với môi trường production, sử dụng URL: `https://vnpay.vn/paymentv2/vpcpay.html`
- `VNPAY_RETURN_URL`: URL mà VNPay sẽ redirect user sau khi thanh toán
- `VNPAY_IPN_URL`: URL mà VNPay server sẽ gọi để thông báo kết quả thanh toán

### 1.3. Cập nhật Database Schema

Chạy migration để thêm `VNPAY` vào enum `PaymentMethod`:

```bash
npx prisma migrate dev --name add-vnpay-payment-method
npx prisma generate
```

## 2. Luồng thanh toán VNPay

### 2.1. Tạo đơn hàng

```http
POST /api/orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "shippingAddress": "123 Nguyễn Văn A, Q.1, TP.HCM",
  "recipientName": "Nguyễn Văn A",
  "recipientPhone": "0912345678",
  "paymentMethod": "VNPAY",
  "shippingMethod": "STANDARD",
  "customerNote": "Giao hàng giờ hành chính"
}
```

### 2.2. Tạo VNPay Payment URL

Sau khi tạo đơn hàng thành công, tạo payment URL:

```http
POST /api/payments/vnpay/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "orderId": "order-uuid-here",
  "amount": 100000,
  "orderInfo": "Thanh toán đơn hàng #ORD123456",
  "orderType": "other",
  "locale": "vn",
  "bankCode": "NCB"  // Optional: mã ngân hàng (NCB, BIDV, VCB, etc.)
}
```

**Response:**

```json
{
  "success": true,
  "message": "Tạo VNPay payment URL thành công",
  "data": {
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=...",
    "vnpayData": {
      "vnp_TmnCode": "...",
      "vnp_Amount": "10000000",
      "vnp_Command": "pay",
      "vnp_CreateDate": "20250124120000",
      "vnp_CurrCode": "VND",
      "vnp_IpAddr": "127.0.0.1",
      "vnp_Locale": "vn",
      "vnp_OrderInfo": "Thanh toán đơn hàng #ORD123456",
      "vnp_OrderType": "other",
      "vnp_ReturnUrl": "http://localhost:5000/api/payments/vnpay/return",
      "vnp_TxnRef": "ORD123456_1234567890",
      "vnp_Version": "2.1.0",
      "vnp_SecureHash": "..."
    }
  }
}
```

### 2.3. Redirect user đến VNPay

Frontend sẽ redirect user đến `paymentUrl`:

```javascript
window.location.href = response.data.paymentUrl;
```

### 2.4. VNPay xử lý thanh toán

User sẽ:
1. Chọn ngân hàng/phương thức thanh toán trên VNPay
2. Đăng nhập và xác thực thanh toán
3. Sau khi hoàn tất, VNPay sẽ redirect về `VNPAY_RETURN_URL`

### 2.5. Xử lý Return URL

VNPay sẽ redirect về:
```
GET /api/payments/vnpay/return?vnp_Amount=10000000&vnp_BankCode=NCB&vnp_TransactionNo=...&vnp_SecureHash=...
```

Backend sẽ:
1. Xác thực chữ ký (`vnp_SecureHash`)
2. Kiểm tra response code
3. Redirect user về frontend với kết quả:
   - Success: `{CORS_ORIGIN}/payment/result?success=true&message=...&txnRef=...&amount=...`
   - Failed: `{CORS_ORIGIN}/payment/result?success=false&message=...&txnRef=...`

### 2.6. Xử lý IPN (Instant Payment Notification)

VNPay server sẽ gọi IPN URL để thông báo kết quả:
```
GET /api/payments/vnpay/ipn?vnp_Amount=...&vnp_TransactionNo=...&vnp_SecureHash=...
```

Backend sẽ:
1. Xác thực chữ ký
2. Kiểm tra order và payment
3. Cập nhật trạng thái payment và order
4. Tạo cashback record (nếu thanh toán thành công)
5. Trả về response cho VNPay:
   ```json
   {
     "RspCode": "00",
     "Message": "Confirm Success"
   }
   ```

**VNPay Response Codes:**
- `00`: Giao dịch thành công
- `07`: Trừ tiền thành công nhưng giao dịch bị nghi ngờ
- `09`: Thẻ/tài khoản chưa đăng ký Internet Banking
- `10`: Xác thực thông tin sai quá 3 lần
- `11`: Hết hạn chờ thanh toán
- `12`: Thẻ/tài khoản bị khóa
- `24`: Khách hàng hủy giao dịch
- `51`: Tài khoản không đủ số dư
- `65`: Vượt quá hạn mức giao dịch
- `99`: Lỗi khác

## 3. Frontend Integration Example

### 3.1. React Example

```javascript
import axios from 'axios';

const createVNPayPayment = async (orderId, amount, orderInfo) => {
  try {
    const response = await axios.post(
      '/api/payments/vnpay/create',
      {
        orderId,
        amount,
        orderInfo,
        orderType: 'other',
        locale: 'vn',
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.data.success) {
      // Redirect to VNPay
      window.location.href = response.data.data.paymentUrl;
    }
  } catch (error) {
    console.error('Failed to create VNPay payment:', error);
  }
};

// Payment result page
const PaymentResultPage = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const success = searchParams.get('success') === 'true';
  const message = decodeURIComponent(searchParams.get('message') || '');
  const txnRef = searchParams.get('txnRef');
  const amount = searchParams.get('amount');

  return (
    <div>
      {success ? (
        <div>
          <h1>✅ Thanh toán thành công!</h1>
          <p>Mã giao dịch: {txnRef}</p>
          <p>Số tiền: {amount} VND</p>
        </div>
      ) : (
        <div>
          <h1>❌ Thanh toán thất bại!</h1>
          <p>{message}</p>
        </div>
      )}
    </div>
  );
};
```

## 4. Testing

### 4.1. Thông tin test VNPay Sandbox

**Ngân hàng NCB:**
- Số thẻ: `9704198526191432198`
- Tên chủ thẻ: `NGUYEN VAN A`
- Ngày phát hành: `07/15`
- Mật khẩu OTP: `123456`

**Các ngân hàng khác:**
- Tham khảo: https://sandbox.vnpayment.vn/apis/docs/bang-ma-test/

### 4.2. Test Flow

1. Tạo đơn hàng với `paymentMethod: "VNPAY"`
2. Gọi API `/api/payments/vnpay/create` để lấy payment URL
3. Truy cập payment URL trên browser
4. Chọn ngân hàng NCB
5. Nhập thông tin thẻ test
6. Nhập OTP: `123456`
7. Xác nhận thanh toán
8. Kiểm tra redirect về frontend
9. Kiểm tra IPN callback trong logs
10. Kiểm tra payment status trong database

## 5. Production Checklist

- [ ] Đăng ký tài khoản VNPay production
- [ ] Cập nhật `VNPAY_TMN_CODE` và `VNPAY_HASH_SECRET` production
- [ ] Cập nhật `VNPAY_URL` thành production URL
- [ ] Cập nhật `VNPAY_RETURN_URL` và `VNPAY_IPN_URL` với domain production
- [ ] Đảm bảo HTTPS cho IPN URL (VNPay yêu cầu HTTPS)
- [ ] Test kỹ lưỡng trên staging environment
- [ ] Thiết lập monitoring cho VNPay transactions
- [ ] Thiết lập alert cho failed payments
- [ ] Backup dữ liệu trước khi deploy

## 6. Troubleshooting

### 6.1. Invalid Checksum Error

**Nguyên nhân:**
- `VNPAY_HASH_SECRET` không đúng
- Params bị thay đổi khi redirect

**Giải pháp:**
- Kiểm tra lại `VNPAY_HASH_SECRET`
- Đảm bảo không encode URL params

### 6.2. Order Not Found

**Nguyên nhân:**
- Transaction reference không khớp
- Payment record chưa được tạo

**Giải pháp:**
- Kiểm tra transaction reference format
- Đảm bảo payment record được tạo trước khi redirect

### 6.3. IPN Not Received

**Nguyên nhân:**
- IPN URL không accessible từ VNPay server
- Firewall block VNPay IP

**Giải pháp:**
- Đảm bảo IPN URL là public và accessible
- Whitelist VNPay IPs
- Check server logs

## 7. API Reference

### 7.1. POST /api/payments/vnpay/create

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "orderId": "string (uuid, required)",
  "amount": "number (required)",
  "orderInfo": "string (max 255, required)",
  "orderType": "string (optional: billpayment, fashion, other, topup)",
  "locale": "string (optional: vn, en)",
  "bankCode": "string (optional: NCB, BIDV, VCB, etc.)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tạo VNPay payment URL thành công",
  "data": {
    "paymentUrl": "string",
    "vnpayData": {
      "vnp_TmnCode": "string",
      "vnp_Amount": "string",
      "vnp_Command": "string",
      "vnp_CreateDate": "string",
      "vnp_CurrCode": "string",
      "vnp_IpAddr": "string",
      "vnp_Locale": "string",
      "vnp_OrderInfo": "string",
      "vnp_OrderType": "string",
      "vnp_ReturnUrl": "string",
      "vnp_TxnRef": "string",
      "vnp_Version": "string",
      "vnp_SecureHash": "string"
    }
  }
}
```

### 7.2. GET /api/payments/vnpay/return

**Query Params:**
- All VNPay return params (auto-handled)

**Response:**
- Redirect to frontend with result

### 7.3. GET /api/payments/vnpay/ipn

**Query Params:**
- All VNPay IPN params (auto-handled)

**Response:**
```json
{
  "RspCode": "00",
  "Message": "Confirm Success"
}
```

## 8. Tài liệu tham khảo

- VNPay Sandbox: https://sandbox.vnpayment.vn/
- VNPay API Documentation: https://sandbox.vnpayment.vn/apis/docs/
- VNPay Response Codes: https://sandbox.vnpayment.vn/apis/docs/bang-ma-loi/
- VNPay Test Cards: https://sandbox.vnpayment.vn/apis/docs/bang-ma-test/
