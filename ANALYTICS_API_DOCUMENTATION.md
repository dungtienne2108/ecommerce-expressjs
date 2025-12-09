# Analytics API Routes Documentation

## Overview
Tài liệu này ghi lại các routes trong `/analytics` và cấu trúc data mà từng route trả về.

---

## 1. GET `/api/analytics/revenue`
**Mô tả:** Lấy thống kê doanh thu theo thời gian thực

**Query Parameters:**
- `period`: TimePeriod (TODAY, YESTERDAY, THIS_WEEK, LAST_WEEK, THIS_MONTH, LAST_MONTH, THIS_QUARTER, LAST_QUARTER, THIS_YEAR, LAST_YEAR, CUSTOM)
- `from`: Date (optional)
- `to`: Date (optional)
- `shopId`: string (optional)

**Response Data Structure:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": number,
    "paidRevenue": number,
    "pendingRevenue": number,
    "refundedAmount": number,
    "averageOrderValue": number,
    "revenueChange": number,
    "currency": string
  },
  "message": "Lấy thống kê doanh thu thành công"
}
```

---

## 2. GET `/api/analytics/revenue-trend`
**Mô tả:** Lấy xu hướng doanh thu theo thời gian (chi tiết từng ngày)

**Query Parameters:**
- `period`: TimePeriod
- `from`: Date (optional)
- `to`: Date (optional)
- `shopId`: string (optional)

**Response Data Structure:**
```json
{
  "success": true,
  "data": {
    "period": "THIS_MONTH",
    "data": [
      {
        "date": "2025-12-09",
        "totalRevenue": number,
        "orderCount": number,
        "averageOrderValue": number,
        "paymentMethods": [
          {
            "method": string,
            "count": number,
            "amount": number
          }
        ]
      }
    ],
    "summary": {
      "totalRevenue": number,
      "paidRevenue": number,
      "pendingRevenue": number,
      "refundedAmount": number,
      "averageOrderValue": number,
      "revenueChange": number,
      "currency": string
    }
  },
  "message": "Lấy xu hướng doanh thu thành công"
}
```

---

## 3. GET `/api/analytics/orders`
**Mô tả:** Lấy thống kê đơn hàng theo thời gian thực

**Query Parameters:**
- `period`: TimePeriod
- `from`: Date (optional)
- `to`: Date (optional)
- `shopId`: string (optional)

**Response Data Structure:**
```json
{
  "success": true,
  "data": {
    "totalOrders": number,
    "completedOrders": number,
    "cancelledOrders": number,
    "pendingOrders": number,
    "shippingOrders": number,
    "refundedOrders": number,
    "completionRate": number,
    "cancellationRate": number,
    "averageOrderValue": number,
    "orderChange": number
  },
  "message": "Lấy thống kê đơn hàng thành công"
}
```

---

## 4. GET `/api/analytics/orders-trend`
**Mô tả:** Lấy xu hướng đơn hàng theo thời gian (chi tiết từng ngày)

**Query Parameters:**
- `period`: TimePeriod
- `from`: Date (optional)
- `to`: Date (optional)
- `shopId`: string (optional)

**Response Data Structure:**
```json
{
  "success": true,
  "data": {
    "period": "THIS_MONTH",
    "data": [
      {
        "date": "2025-12-09",
        "totalOrders": number,
        "completedOrders": number,
        "cancelledOrders": number,
        "refundedOrders": number,
        "totalRevenue": number,
        "averageOrderValue": number
      }
    ],
    "summary": {
      "totalOrders": number,
      "completedOrders": number,
      "cancelledOrders": number,
      "pendingOrders": number,
      "shippingOrders": number,
      "refundedOrders": number,
      "completionRate": number,
      "cancellationRate": number,
      "averageOrderValue": number,
      "orderChange": number
    }
  },
  "message": "Lấy xu hướng đơn hàng thành công"
}
```

---

## 5. GET `/api/analytics/payment`
**Mô tả:** Lấy thống kê thanh toán

**Query Parameters:**
- `period`: TimePeriod
- `from`: Date (optional)
- `to`: Date (optional)
- `shopId`: string (optional)

**Response Data Structure:**
```json
{
  "success": true,
  "data": {
    "totalPayments": number,
    "successfulPayments": number,
    "failedPayments": number,
    "pendingPayments": number,
    "successRate": number,
    "totalPaidAmount": number,
    "paymentMethods": [
      {
        "method": string,
        "count": number,
        "totalAmount": number,
        "percentage": number,
        "successRate": number
      }
    ]
  },
  "message": "Lấy thống kê thanh toán thành công"
}
```

---

## 6. GET `/api/analytics/products`
**Mô tả:** Lấy thống kê sản phẩm bán chạy (Top selling products)

**Query Parameters:**
- `period`: TimePeriod
- `from`: Date (optional)
- `to`: Date (optional)
- `limit`: number (default: 10) - số sản phẩm top
- `shopId`: string (optional)

**Response Data Structure:**
```json
{
  "success": true,
  "data": {
    "topSellingProducts": [
      {
        "productId": string,
        "productName": string,
        "shopId": string,
        "soldCount": number,
        "totalRevenue": number,
        "averageRating": number
      }
    ],
    "totalProductsSold": number,
    "totalProductRevenue": number
  },
  "message": "Lấy thống kê sản phẩm thành công"
}
```

---

## 7. GET `/api/analytics/shops-ranking`
**Mô tả:** Lấy xếp hạng top shops

**Query Parameters:**
- `period`: TimePeriod
- `from`: Date (optional)
- `to`: Date (optional)
- `limit`: number (default: 10) - số shops top

**Response Data Structure:**
```json
{
  "success": true,
  "data": {
    "ranking": [
      {
        "shopId": string,
        "shopName": string,
        "totalRevenue": number,
        "totalOrders": number,
        "completedOrders": number,
        "averageOrderValue": number,
        "rating": number,
        "reviewCount": number,
        "soldCount": number
      }
    ],
    "period": "THIS_MONTH",
    "totalShops": number
  },
  "message": "Lấy xếp hạng cửa hàng thành công"
}
```

---

## 8. GET `/api/analytics/top-shops`
**Mô tả:** Lấy danh sách top shops theo doanh thu

**Query Parameters:**
- `period`: TimePeriod
- `from`: Date (optional)
- `to`: Date (optional)
- `limit`: number (default: 10)

**Response Data Structure:**
```json
{
  "success": true,
  "data": {
    "ranking": [
      {
        "shopId": string,
        "shopName": string,
        "totalRevenue": number,
        "totalOrders": number,
        "completedOrders": number,
        "averageOrderValue": number,
        "rating": number,
        "reviewCount": number,
        "soldCount": number
      }
    ],
    "period": "THIS_MONTH",
    "totalShops": number
  },
  "message": "Lấy danh sách top shops thành công"
}
```

---

## 9. GET `/api/analytics/real-time`
**Mô tả:** Lấy thống kê real-time (không cần query parameters)

**Query Parameters:** Không có

**Response Data Structure:**
```json
{
  "success": true,
  "data": {
    "activeOrders": number,
    "totalOnlineShops": number,
    "totalOnlineCustomers": number,
    "ordersInLastHour": number,
    "revenueInLastHour": number,
    "lastUpdated": "2025-12-09T12:34:56.789Z"
  },
  "message": "Lấy thống kê real-time thành công"
}
```

---

## 10. GET `/api/analytics/comprehensive`
**Mô tả:** Lấy thống kê toàn diện (Dashboard - kết hợp tất cả dữ liệu)

**Query Parameters:**
- `period`: TimePeriod
- `from`: Date (optional)
- `to`: Date (optional)
- `shopId`: string (optional)

**Response Data Structure:**
```json
{
  "success": true,
  "data": {
    "revenueStats": {
      "totalRevenue": number,
      "paidRevenue": number,
      "pendingRevenue": number,
      "refundedAmount": number,
      "averageOrderValue": number,
      "revenueChange": number,
      "currency": string
    },
    "orderStats": {
      "totalOrders": number,
      "completedOrders": number,
      "cancelledOrders": number,
      "pendingOrders": number,
      "shippingOrders": number,
      "refundedOrders": number,
      "completionRate": number,
      "cancellationRate": number,
      "averageOrderValue": number,
      "orderChange": number
    },
    "paymentStats": {
      "totalPayments": number,
      "successfulPayments": number,
      "failedPayments": number,
      "pendingPayments": number,
      "successRate": number,
      "totalPaidAmount": number,
      "paymentMethods": [
        {
          "method": string,
          "count": number,
          "totalAmount": number,
          "percentage": number,
          "successRate": number
        }
      ]
    },
    "productAnalytics": {
      "topSellingProducts": [
        {
          "productId": string,
          "productName": string,
          "shopId": string,
          "soldCount": number,
          "totalRevenue": number,
          "averageRating": number
        }
      ],
      "totalProductsSold": number,
      "totalProductRevenue": number
    },
    "realTimeStats": {
      "activeOrders": number,
      "totalOnlineShops": number,
      "totalOnlineCustomers": number,
      "ordersInLastHour": number,
      "revenueInLastHour": number,
      "lastUpdated": "2025-12-09T12:34:56.789Z"
    },
    "ordersByStatus": [
      {
        "status": "PENDING|PROCESSING|SHIPPED|DELIVERED|CANCELLED|RETURNED",
        "count": number,
        "percentage": number
      }
    ],
    "ordersByPaymentStatus": [
      {
        "status": "PENDING|PAID|FAILED|REFUNDED",
        "count": number,
        "percentage": number
      }
    ],
    "period": "THIS_MONTH",
    "dateRange": {
      "from": "2025-12-01",
      "to": "2025-12-31"
    },
    "generatedAt": "2025-12-09T12:34:56.789Z"
  },
  "message": "Lấy thống kê toàn diện thành công"
}
```

---

## 11. GET `/api/shops/:shopId/analytics`
**Mô tả:** Dashboard của shop (chủ shop xem doanh thu và đơn hàng của shop mình)

**Route Parameters:**
- `shopId`: string (bắt buộc)

**Query Parameters:**
- `period`: TimePeriod
- `from`: Date (optional)
- `to`: Date (optional)

**Response Data Structure:** (Giống như `/api/analytics/comprehensive`)
```json
{
  "success": true,
  "data": {
    "revenueStats": { ... },
    "orderStats": { ... },
    "paymentStats": { ... },
    "productAnalytics": { ... },
    "realTimeStats": { ... },
    "ordersByStatus": [ ... ],
    "ordersByPaymentStatus": [ ... ],
    "period": "THIS_MONTH",
    "dateRange": {
      "from": "2025-12-01",
      "to": "2025-12-31"
    },
    "generatedAt": "2025-12-09T12:34:56.789Z"
  },
  "message": "Lấy dashboard cửa hàng thành công"
}
```

---

## Authentication
Tất cả routes đều yêu cầu token authentication qua middleware `authenticateToken`

---

## Time Period Options
- `TODAY` - Hôm nay
- `YESTERDAY` - Hôm qua
- `THIS_WEEK` - Tuần này
- `LAST_WEEK` - Tuần trước
- `THIS_MONTH` - Tháng này (mặc định)
- `LAST_MONTH` - Tháng trước
- `THIS_QUARTER` - Quý này
- `LAST_QUARTER` - Quý trước
- `THIS_YEAR` - Năm nay
- `LAST_YEAR` - Năm trước
- `CUSTOM` - Tùy chỉnh (cần cung cấp `from` và `to`)

---

## Cache Configuration
- **SHORT (5 phút):** Real-time stats
- **MEDIUM (15 phút):** Daily stats
- **LONG (1 giờ):** Aggregated stats

