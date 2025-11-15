import { Router } from 'express';
import {
  authenticateToken,
  requireOwnership,
  requirePermission,
  requireRole,
  requireStatus,
} from '../middleware/auth.middleware';
import { productController } from '../controllers/product.controller';
import { combineMiddleware } from '../utils/middleware.util';
import { PermissionAction, PermissionModule, RoleType } from '@prisma/client';
import { UserStatus } from '../constants/status';
import { ActivityLogger } from '../services/logger.service';

const router = Router();

router.get('/:id', authenticateToken, productController.findById);
router.get('/', productController.findMany);
router.post(
  '/',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SYSTEM_ADMIN, RoleType.SELLER),
    requirePermission(
      PermissionModule.PRODUCT_MANAGEMENT,
      PermissionAction.CREATE
    )
  ),
  ActivityLogger.logMiddleware(
    PermissionAction.CREATE,
    PermissionModule.PRODUCT_MANAGEMENT
  ),
  productController.createDraftProduct
);
router.put(
  '/:productId/categories',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SYSTEM_ADMIN, RoleType.SELLER),
    requirePermission(
      PermissionModule.PRODUCT_MANAGEMENT,
      PermissionAction.UPDATE
    )
  ),
  ActivityLogger.logMiddleware(
    PermissionAction.UPDATE,
    PermissionModule.PRODUCT_MANAGEMENT
  ),
  productController.addCategoriesToProduct
);
router.post(
  '/:productId/options',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SYSTEM_ADMIN, RoleType.SELLER),
    requirePermission(
      PermissionModule.PRODUCT_MANAGEMENT,
      PermissionAction.UPDATE
    )
  ),
  ActivityLogger.logMiddleware(
    PermissionAction.UPDATE,
    PermissionModule.PRODUCT_MANAGEMENT
  ),
  productController.addOptionsToProduct
);
router.post(
  '/:productId/variants',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SYSTEM_ADMIN, RoleType.SELLER),
    requirePermission(
      PermissionModule.PRODUCT_MANAGEMENT,
      PermissionAction.UPDATE
    )
  ),
  ActivityLogger.logMiddleware(
    PermissionAction.UPDATE,
    PermissionModule.PRODUCT_MANAGEMENT
  ),
  productController.addVariantsToProduct
);
router.post(
  '/:productId/images',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SYSTEM_ADMIN, RoleType.SELLER),
    requirePermission(
      PermissionModule.PRODUCT_MANAGEMENT,
      PermissionAction.UPDATE
    )
  ),
  ActivityLogger.logMiddleware(
    PermissionAction.UPDATE,
    PermissionModule.PRODUCT_MANAGEMENT
  ),
  productController.addImagesToProduct
);
router.put(
  '/:productId/status',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SYSTEM_ADMIN, RoleType.SELLER),
    requirePermission(
      PermissionModule.PRODUCT_MANAGEMENT,
      PermissionAction.UPDATE
    )
  ),
  ActivityLogger.logMiddleware(
    PermissionAction.UPDATE,
    PermissionModule.PRODUCT_MANAGEMENT
  ),
  productController.updateProductStatus
);

export default router;
