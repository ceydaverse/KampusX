import { Router } from 'express';
import {
  handleGetFollowStatus,
  handleFollowUser,
  handleUnfollowUser,
} from '../controllers/follows.controller';

const router = Router();

// Spesifik route'lar önce
router.get('/status/:targetUserId', handleGetFollowStatus);
router.post('/:targetUserId', handleFollowUser);
router.delete('/:targetUserId', handleUnfollowUser);

export default router;









