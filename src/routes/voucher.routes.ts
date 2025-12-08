import { Router } from 'express';
import { voucherController } from '../controllers/voucher.controller';
import { combineMiddleware } from '../utils/middleware.util';
import {
  authenticateToken,
  requireRole,
  requireStatus,
} from '../middleware/auth.middleware';
import { RoleType, UserStatus } from '@prisma/client';

const router = Router();

router.post(
  '/',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SYSTEM_ADMIN, RoleType.SELLER)
  ),
  voucherController.createVoucher
);
router.get('/:id', voucherController.getById);
router.get('/code/:code', voucherController.getByCode);
router.get('/customer/public', voucherController.getPublicVouchers);
router.get('/shop/:shopId', voucherController.getShopVouchers);

export default router;