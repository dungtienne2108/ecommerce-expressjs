import { Router } from 'express';
import { combineMiddleware } from '../utils/middleware.util';
import {
  authenticateToken,
  requireRole,
  requireStatus,
} from '../middleware/auth.middleware';
import { RoleType, UserStatus } from '@prisma/client';
import { paymentController } from '../controllers/payment.controller';

const router = Router();

/**
 * PUBLIC ROUTES (với webhook)
 */

/**
 * @route POST /api/payments/webhook
 * @desc Xử lý webhook từ payment gateway (không cần auth)
 */
router.post('/webhook', paymentController.handlePaymentWebhook);

/**
 * PROTECTED ROUTES (yêu cầu đăng nhập và active status)
 */

/**
 * @route POST /api/payments
 * @desc Tạo payment cho đơn hàng
 * @access Private - User
 */
router.post(
  '/',
  combineMiddleware(authenticateToken, requireStatus([UserStatus.ACTIVE])),
  paymentController.createPayment
);

/**
 * @route GET /api/payments/:paymentId
 * @desc Lấy thông tin payment theo ID
 * @access Private - User (chỉ xem payment của chính mình hoặc nếu là shop owner)
 */
router.get(
  '/:paymentId',
  combineMiddleware(authenticateToken, requireStatus([UserStatus.ACTIVE])),
  paymentController.getPaymentById
);

/**
 * @route GET /api/payments/order/:orderId
 * @desc Lấy payment theo order ID
 * @access Private - User
 */
router.get(
  '/order/:orderId',
  combineMiddleware(authenticateToken, requireStatus([UserStatus.ACTIVE])),
  paymentController.getPaymentByOrderId
);

/**
 * @route GET /api/payments
 * @desc Lấy danh sách payments với filter (chỉ admin)
 * @access Private - Admin
 */
router.get(
  '/',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SYSTEM_ADMIN)
  ),
  paymentController.getPayments
);

/**
 * @route PATCH /api/payments/:paymentId/status
 * @desc Cập nhật trạng thái payment
 * @access Private - Admin
 */
router.patch(
  '/:paymentId/status',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SYSTEM_ADMIN)
  ),
  paymentController.updatePaymentStatus
);

/**
 * @route POST /api/payments/:paymentId/cancel
 * @desc Hủy payment
 * @access Private - User (chỉ hủy payment của chính mình)
 */
router.post(
  '/:paymentId/cancel',
  combineMiddleware(authenticateToken, requireStatus([UserStatus.ACTIVE])),
  paymentController.cancelPayment
);

/**
 * @route POST /api/payments/:paymentId/process-cashback
 * @desc Xử lý cashback cho payment
 * @access Private - Admin
 */
router.post(
  '/:paymentId/process-cashback',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SYSTEM_ADMIN)
  ),
  paymentController.processCashbackForPayment
);

/**
 * STATISTICS ROUTES (Admin only)
 */

/**
 * @route GET /api/payments/statistics
 * @desc Lấy thống kê doanh thu
 * @access Private - Admin
 */
router.get(
  '/statistics',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SYSTEM_ADMIN)
  ),
  paymentController.getPaymentStatistics
);

router.post(
  '/cashback/claim/:cashbackId',
  combineMiddleware(authenticateToken, requireStatus([UserStatus.ACTIVE])),
  paymentController.claimCashbackForUser
);

/**
 * CRON JOB ROUTES (Admin only - thường được gọi bởi cron jobs)
 */

/**
 * @route POST /api/payments/process-expired
 * @desc Xử lý payments đã hết hạn
 * @access Private - Admin (cron job)
 */
router.post(
  '/process-expired',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SYSTEM_ADMIN)
  ),
  paymentController.processExpiredPayments
);

/**
 * CASHBACK ROUTES (Admin only - thường được gọi bởi cron jobs)
 */

/**
 * @route POST /api/payments/cashback/process-pending
 * @desc Xử lý hàng loạt pending cashbacks
 * @access Private - Admin (cron job)
 */
router.post(
  '/cashback/process-pending',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SYSTEM_ADMIN)
  ),
  paymentController.processPendingCashbacks
);

/**
 * @route POST /api/payments/cashback/retry-failed
 * @desc Retry failed cashbacks
 * @access Private - Admin (cron job)
 */
router.post(
  '/cashback/retry-failed',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SYSTEM_ADMIN)
  ),
  paymentController.retryFailedCashbacks
);

/**
 * @route POST /api/payments/cashback/handle-expired
 * @desc Xử lý expired cashbacks
 * @access Private - Admin (cron job)
 */
router.post(
  '/cashback/handle-expired',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SYSTEM_ADMIN)
  ),
  paymentController.handleExpiredCashbacks
);

/**
 * @route GET /api/payments/vnpay/return
 * @desc Xử lý VNPay return URL (không cần auth - user redirect từ VNPay)
 */
router.get('/vnpay/return', paymentController.handleVNPayReturn);

/**
 * @route GET /api/payments/vnpay/ipn
 * @desc Xử lý VNPay IPN (không cần auth - callback từ VNPay server)
 */
router.get('/vnpay/ipn', paymentController.handleVNPayIPN);

/**
 * @route POST /api/payments/vnpay/create
 * @desc Tạo VNPay payment URL
 * @access Private - User
 */
router.post(
  '/vnpay/create',
  combineMiddleware(authenticateToken, requireStatus([UserStatus.ACTIVE])),
  paymentController.createVNPayPaymentUrl
);

export default router;