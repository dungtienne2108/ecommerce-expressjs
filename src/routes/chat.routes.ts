import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Tất cả routes đều yêu cầu authentication
router.use(authenticateToken);

/**
 * Conversation routes
 */

// GET /api/chat/conversations - Lấy danh sách conversations
router.get('/conversations', ChatController.getConversations);

// POST /api/chat/conversations - Tạo conversation mới
router.post('/conversations', ChatController.createConversation);

// GET /api/chat/conversations/:id - Lấy chi tiết conversation
router.get('/conversations/:id', ChatController.getConversation);

// GET /api/chat/conversations/:id/messages - Lấy messages trong conversation
router.get('/conversations/:id/messages', ChatController.getMessages);

// POST /api/chat/conversations/:id/messages - Gửi message
router.post('/conversations/:id/messages', ChatController.sendMessage);

// PUT /api/chat/conversations/:id/read - Đánh dấu đã đọc
router.put('/conversations/:id/read', ChatController.markAsRead);

// PUT /api/chat/conversations/:id/close - Đóng conversation
router.put('/conversations/:id/close', ChatController.closeConversation);

// PUT /api/chat/conversations/:id/resolve - Resolve conversation
router.put('/conversations/:id/resolve', ChatController.resolveConversation);

/**
 * Message routes
 */

// PUT /api/chat/messages/:id - Sửa message
router.put('/messages/:id', ChatController.editMessage);

// DELETE /api/chat/messages/:id - Xóa message
router.delete('/messages/:id', ChatController.deleteMessage);

/**
 * Shop routes
 */

// GET /api/chat/shop/:shopId/conversations - Lấy conversations của shop
router.get('/shop/:shopId/conversations', ChatController.getShopConversations);

export default router;