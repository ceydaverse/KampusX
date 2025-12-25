import { Router } from 'express';
import {
  handleCreateQuestion,
  handleGetQuestions,
  handleGetQuestionById,
  handleGetAnswers,
  handleCreateAnswer,
  handleDeleteQuestion,
  handleToggleQuestionLike,
  handleToggleAnswerLike,
  handleSaveQuestion,
  handleUnsaveQuestion,
  handleGetSavedQuestions,
  handleGetSavedStatus,
} from '../controllers/questions.controller';

const router = Router();

// Soru listesi ve oluşturma
router.get('/', handleGetQuestions);
router.post('/', handleCreateQuestion);

// Spesifik route'lar önce olmalı (Express route matching için)
// Kaydetme endpoint'leri (özel route'lar, genel route'lardan önce)
router.get('/kaydedilenler', handleGetSavedQuestions);
router.get('/kaydetme/durum', handleGetSavedStatus);

// Cevaplar
router.get('/:questionId/answers', handleGetAnswers);
router.post('/:questionId/answers', handleCreateAnswer);

// Soru silme, beğenme ve kaydetme
router.delete('/:questionId', handleDeleteQuestion);
router.post('/:questionId/like', handleToggleQuestionLike);
router.post('/:questionId/kaydet', handleSaveQuestion);
router.delete('/:questionId/kaydet', handleUnsaveQuestion);

// Tek soru detayı (en son, genel route)
router.get('/:questionId', handleGetQuestionById);

// Cevap beğenme (answers route'u için ayrı router gerekebilir, şimdilik burada)
// Not: Bu route questions router'ında olmalı çünkü /api/questions/:questionId/answers şeklinde
// Cevap beğenme için ayrı bir answers router oluşturulabilir veya burada kalabilir

export default router;



