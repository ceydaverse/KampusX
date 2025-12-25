import { Router } from 'express';
import {
  handleGetNotifications,
  handleGetUnreadCount,
  handleMarkNotificationAsRead,
  handleMarkAllAsRead,
} from '../controllers/notifications.controller';

const router = Router();

router.get('/', handleGetNotifications);
router.get('/unread-count', handleGetUnreadCount);
router.patch('/:id/read', handleMarkNotificationAsRead);
router.patch('/read-all', handleMarkAllAsRead);

export default router;









