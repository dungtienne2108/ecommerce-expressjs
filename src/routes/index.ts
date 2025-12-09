import { Router } from 'express';
import authRoutes from './auth.routes';
import healthRoutes from './health.routes';
import userRoutes from './user.routes';
import productRoutes from './product.routes';
import shopRoutes from './shop.routes';
import cartRoutes from './cart.routes';
import orderRoutes from './order.routes';
import adminRoutes from './admin.routes';
import categoryRoutes from './category.route';
import paymentRoutes from './payment.routes';
import chatRoutes from './chat.route';
import voucherRoutes from './voucher.routes';
import analyticsRoutes from './analytics.routes';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Express.js + Prisma + JWT Authentication API',
      version: '1.0.0',
      endpoints: {
        auth: '/api/auth',
        health: '/health',
        users: '/api/users',
        products: '/api/products',
        shops: '/api/shops',
        cart: '/api/cart',
      },
    },
  });
});

router.use('/api/auth', authRoutes);
router.use('/api/users', userRoutes);
router.use('/api/products', productRoutes);
router.use('/api/shops', shopRoutes);
router.use('/health', healthRoutes);
router.use('/api/cart', cartRoutes);
router.use('/api/orders', orderRoutes);
router.use('/api/admin', adminRoutes);
router.use('/api/categories', categoryRoutes);
router.use('/api/payments', paymentRoutes);
router.use('/api/chat', chatRoutes);
router.use('/api/vouchers', voucherRoutes);
router.use('/api', analyticsRoutes);

export default router;
