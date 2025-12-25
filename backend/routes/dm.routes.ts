import { Router } from 'express';
import {
  handleGetConversations,
  handleGetMessages,
  handleSendMessage,
  handleMarkRead,
  handleMuteUser,
  handleUnmuteUser,
  handleBlockUser,
  handleUnblockUser,
} from '../controllers/dm.controller';

const router = Router();

router.get('/conversations', handleGetConversations);
router.get('/messages', handleGetMessages);
router.post('/messages', handleSendMessage);
router.post('/messages/read', handleMarkRead);
router.post('/mute', handleMuteUser);
router.delete('/mute/:targetUserId', handleUnmuteUser);
router.post('/block', handleBlockUser);
router.delete('/block/:targetUserId', handleUnblockUser);

export default router;










