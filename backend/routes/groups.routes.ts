import { Router } from 'express';
import {
  handleGetGroups,
  handleGetGroupMessages,
  handleCreateGroupMessage,
  handleGetGroupMembers,
  handleMarkMessagesAsRead,
  handleCreateGroup,
} from '../controllers/groups.controller';

const router = Router();

router.get('/', handleGetGroups);
router.post('/', handleCreateGroup); // Spesifik route'lar önce
router.get('/:grupId/messages', handleGetGroupMessages);
router.post('/:grupId/messages', handleCreateGroupMessage);
router.get('/:grupId/members', handleGetGroupMembers);
router.post('/:grupId/read', handleMarkMessagesAsRead);

export default router;

