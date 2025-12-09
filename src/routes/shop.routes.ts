import { Router } from 'express';
import {
  authenticateToken,
  requirePermission,
  requireRole,
  requireStatus,
  requireVerified,
} from '../middleware/auth.middleware';
import { shopController } from '../controllers/shop.controller';
import { combineMiddleware } from '../utils/middleware.util';
import { UserStatus } from '../constants/status';
import { PermissionAction, PermissionModule, RoleType } from '@prisma/client';
import { ActivityLogger } from '../services/logger.service';
import { productController } from '../controllers/product.controller';

const router = Router();

router.get(
  '/top-rated/list',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
  ),
  shopController.findTopRatedShops
);

router.get(
  '/:id',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
  ),
  shopController.findById
);

router.get(
  '/owner/me',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SYSTEM_ADMIN, RoleType.SELLER)
  ),
  shopController.findByOwnerId
)

router.get(
  '/:shopId/products',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
  ),
  productController.findByShopId
);

router.post(
  '/',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireVerified
  ),
  ActivityLogger.logMiddleware(PermissionAction.CREATE, PermissionModule.SHOP_MANAGEMENT),
  shopController.createDraftShop
);
router.put(
  '/:id/bank-account',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE])
  ),
  ActivityLogger.logMiddleware(PermissionAction.UPDATE, PermissionModule.SHOP_MANAGEMENT),
  shopController.updateBankAccount
);
router.post(
  '/:id/kyc',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE])
  ),
  ActivityLogger.logMiddleware(PermissionAction.UPDATE, PermissionModule.SHOP_MANAGEMENT),
  shopController.submitKyc
);
router.put(
  '/:id/submit-approval',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SYSTEM_ADMIN, RoleType.SELLER)
  ),
  ActivityLogger.logMiddleware(PermissionAction.UPDATE, PermissionModule.SHOP_MANAGEMENT),
  shopController.submitForApproval
);
router.put(
  '/:id/approval',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SYSTEM_ADMIN)
  ),
  ActivityLogger.logMiddleware(PermissionAction.UPDATE, PermissionModule.SHOP_MANAGEMENT),
  shopController.approval
);
router.put(
  '/:id/reject',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SYSTEM_ADMIN)
  ),
  ActivityLogger.logMiddleware(PermissionAction.UPDATE, PermissionModule.SHOP_MANAGEMENT),
  shopController.reject
);

export default router;
