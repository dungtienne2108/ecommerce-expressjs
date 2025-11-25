import { Router } from 'express';
import { combineMiddleware } from '../utils/middleware.util';
import {
  authenticateToken,
  requireRole,
  requireStatus,
} from '../middleware/auth.middleware';
import { RoleType, UserStatus } from '@prisma/client';
import { voucherController } from '../controllers/voucher.controller';

const router = Router();

/**
 * POST /api/vouchers - Tạo voucher mới (SELLER, ADMIN)
 */
router.post(
  '/',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SELLER, RoleType.SYSTEM_ADMIN)
  ),
  voucherController.createVoucher
);

/**
 * GET /api/vouchers - Lấy danh sách vouchers (Public - có filter)
 */
router.get('/', voucherController.getVouchers);

/**
 * GET /api/vouchers/:id - Lấy voucher theo ID
 */
router.get('/:id', voucherController.getVoucherById);

/**
 * GET /api/vouchers/code/:code - Lấy voucher theo code
 */
router.get('/code/:code', voucherController.getVoucherByCode);

/**
 * POST /api/vouchers/validate - Validate voucher (CUSTOMER)
 */
router.post(
  '/validate',
  combineMiddleware(authenticateToken, requireStatus([UserStatus.ACTIVE])),
  voucherController.validateVoucher
);

/**
 * PUT /api/vouchers/:id - Cập nhật voucher (SELLER, ADMIN)
 */
router.put(
  '/:id',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SELLER, RoleType.SYSTEM_ADMIN)
  ),
  voucherController.updateVoucher
);

/**
 * DELETE /api/vouchers/:id - Xóa voucher (SELLER, ADMIN)
 */
router.delete(
  '/:id',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SELLER, RoleType.SYSTEM_ADMIN)
  ),
  voucherController.deleteVoucher
);

export default router;
