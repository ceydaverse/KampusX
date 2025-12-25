import { Router } from 'express';
import { handleGetMe, handleUpdateMe, handleGetMyLikes, handleGetUserById, handleSearchUsers } from '../controllers/users.controller';

const router = Router();

// Spesifik route'lar önce (me/likes, search gibi)
router.get('/search', handleSearchUsers);
router.get('/me/likes', handleGetMyLikes);
router.get('/me', handleGetMe);
router.put('/me', handleUpdateMe);
// Genel route'lar sonra (:id gibi)
router.get('/:id', handleGetUserById);

export default router;

