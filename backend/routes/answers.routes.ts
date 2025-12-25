import { Router } from 'express';
import { handleToggleAnswerLike } from '../controllers/questions.controller';

const router = Router();

// Cevap beğenme
router.post('/:answerId/like', handleToggleAnswerLike);

export default router;












