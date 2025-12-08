import { Router } from 'express';
import { combineMiddleware } from '../utils/middleware.util';
import {
  authenticateToken,
  requireRole,
  requireStatus,
} from '../middleware/auth.middleware';
import { RoleType, UserStatus } from '@prisma/client';
import { orderController } from '../controllers/order.controller';

const router = Router();

router.post(
  '/',
  combineMiddleware(authenticateToken, requireStatus([UserStatus.ACTIVE])),
  orderController.createOrder
);

router.get(
  '/all',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SYSTEM_ADMIN)
  ),
  orderController.getOrders
);

router.get(
  '/shop/:shopId',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SYSTEM_ADMIN, RoleType.SELLER)
  ),
  orderController.getShopOrders
)

router.get(
  '/:orderId',
  combineMiddleware(authenticateToken, requireStatus([UserStatus.ACTIVE])),
  orderController.getOrderById
);
router.get(
  '/',
  combineMiddleware(authenticateToken, requireStatus([UserStatus.ACTIVE])),
  orderController.getMyOrders
);
router.put(
  '/:orderId/status',
  combineMiddleware(authenticateToken, requireStatus([UserStatus.ACTIVE])),
  orderController.updateOrderStatus
);
router.post(
  '/:orderId/cancel',
  combineMiddleware(authenticateToken, requireStatus([UserStatus.ACTIVE])),
  orderController.cancelOrder
);
router.post(
  '/:orderId/confirm',
  combineMiddleware(
    authenticateToken,
    requireStatus([UserStatus.ACTIVE]),
    requireRole(RoleType.SELLER, RoleType.SYSTEM_ADMIN)
  ),
  orderController.confirmOrder
);
export default router;
