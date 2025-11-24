import { Router } from 'express';
import { combineMiddleware } from '../utils/middleware.util';
import {
  authenticateToken,
  requireRole,
  requireStatus,
} from '../middleware/auth.middleware';
import { conversationController } from '../controllers/conversation.controller';
import { messageController } from '../controllers/message.controller';

const router = Router();

router.post(
  '/conversations',
  combineMiddleware(authenticateToken, requireStatus(['ACTIVE'])),
    conversationController.createConversation 
);

router.get(
  '/conversations/:conversationId',
  combineMiddleware(authenticateToken, requireStatus(['ACTIVE'])),
    conversationController.getConversationById 
);

router.get(
  '/conversations',
  combineMiddleware(authenticateToken, requireStatus(['ACTIVE'])),
    conversationController.getConversationsByUserId 
);

router.post(
    '/conversations/:conversationId/messages',
    combineMiddleware(authenticateToken, requireStatus(['ACTIVE'])),
    messageController.sendMessage
)

router.get(
    '/conversations/:conversationId/messages',
    combineMiddleware(authenticateToken, requireStatus(['ACTIVE'])),
    messageController.getMessages
);

router.get(
    '/messages/:messageId',
    combineMiddleware(authenticateToken, requireStatus(['ACTIVE'])),
    messageController.getMessage
);

router.get(
    '/conversations/:conversationId/unread-count',
    combineMiddleware(authenticateToken, requireStatus(['ACTIVE'])),
    messageController.getUnreadCount
);

router.post(
    '/conversations/:conversationId/mark-as-read',
    combineMiddleware(authenticateToken, requireStatus(['ACTIVE'])),
    messageController.markAsRead
);

router.post(
    '/messages/mark-as-read',
    combineMiddleware(authenticateToken, requireStatus(['ACTIVE'])),
    messageController.markMessagesAsRead
);

export default router;