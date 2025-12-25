import { Request, Response } from 'express';
import { createQuestion, getQuestionsByCategoryId, deleteQuestion, getQuestionById } from '../services/questions.service';
import { getAnswersByQuestionId, createAnswer } from '../services/answers.service';
import { toggleQuestionLike, toggleAnswerLike } from '../services/likes.service';
import { saveQuestion, unsaveQuestion, getSavedQuestions, getSavedStatus } from '../services/bookmarks.service';

/**
 * Helper: Request'ten currentUserId'yi al
 */
function getCurrentUserId(req: Request): number | null {
  const userId = req.headers['x-user-id'];
  if (!userId) return null;
  const parsed = Number(userId);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Helper: Login kontrolü
 */
function requireAuth(req: Request): number {
  const userId = getCurrentUserId(req);
  if (!userId) {
    throw new Error('UNAUTHORIZED');
  }
  return userId;
}

export async function handleGetQuestions(req: Request, res: Response) {
  const kategoriId = req.query.kategori_id;

  if (!kategoriId || Number.isNaN(Number(kategoriId))) {
    return res.status(400).json({ success: false, message: 'kategori_id zorunlu' });
  }

  try {
    const currentUserId = getCurrentUserId(req);
    const items = await getQuestionsByCategoryId(Number(kategoriId), currentUserId || undefined);
    return res.json({ success: true, items });
  } catch (err: any) {
    const message = err?.message || 'Sorular getirilirken hata oluştu';
    return res.status(500).json({ success: false, message });
  }
}

/**
 * GET /api/questions/:questionId
 * Tek bir sorunun detayını getir
 */
export async function handleGetQuestionById(req: Request, res: Response) {
  const questionId = req.params.questionId;

  if (!questionId || Number.isNaN(Number(questionId))) {
    return res.status(400).json({ success: false, message: 'questionId geçersiz' });
  }

  try {
    const currentUserId = getCurrentUserId(req);
    const question = await getQuestionById(Number(questionId), currentUserId || undefined);

    if (!question) {
      return res.status(404).json({ success: false, message: 'Soru bulunamadı' });
    }

    return res.json({ success: true, item: question });
  } catch (err: any) {
    console.error('GET QUESTION BY ID ERROR:', err);
    const message = err?.message || 'Soru detayı getirilirken hata oluştu';
    return res.status(500).json({ success: false, message });
  }
}

export async function handleCreateQuestion(req: Request, res: Response) {
  const { kategori_id, kullanici_id, baslik, soru_metin, etiketler } = req.body || {};

  // kategori_id zorunlu kontrolü
  if (!kategori_id || Number.isNaN(Number(kategori_id))) {
    return res.status(400).json({ success: false, message: 'Kategori seçilmelidir' });
  }

  // kullanici_id zorunlu kontrolü
  if (!kullanici_id || Number.isNaN(Number(kullanici_id))) {
    return res.status(400).json({ success: false, message: 'kullanici_id gerekli' });
  }

  if (!baslik || typeof baslik !== 'string' || baslik.trim().length < 3) {
    return res.status(400).json({ success: false, message: 'Başlık en az 3 karakter olmalı' });
  }

  if (!soru_metin || typeof soru_metin !== 'string' || soru_metin.trim().length < 5) {
    return res.status(400).json({ success: false, message: 'Soru metni en az 5 karakter olmalı' });
  }

  // etiketler validasyonu (opsiyonel)
  let parsedEtiketler: string[] | undefined = undefined;
  if (etiketler !== undefined && etiketler !== null) {
    if (!Array.isArray(etiketler)) {
      return res.status(400).json({ success: false, message: 'Etiketler array olmalıdır' });
    }
    // Etiketleri temizle ve filtrele
    parsedEtiketler = etiketler
      .map((tag: any) => (typeof tag === 'string' ? tag.trim() : String(tag).trim()))
      .filter((tag: string) => tag.length > 0);
    if (parsedEtiketler.length === 0) {
      parsedEtiketler = undefined;
    }
  }

  try {
    const item = await createQuestion({
      kategori_id: Number(kategori_id),
      kullanici_id: Number(kullanici_id),
      baslik: baslik.trim(),
      soru_metin: soru_metin.trim(),
      etiketler: parsedEtiketler,
    });

    return res.status(201).json({ success: true, item });
  } catch (err: any) {
    // Kullanıcı bulunamadı hatası için 400 dön
    if (err?.message === 'kullanici bulunamadı') {
      return res.status(400).json({ success: false, message: 'kullanici bulunamadı' });
    }
    // Kategori bulunamadı hatası için 404 dön
    if (err?.message === 'Kategori bulunamadı') {
      return res.status(404).json({ success: false, message: 'Kategori bulunamadı' });
    }
    const message = err?.message || 'Soru kaydedilirken hata oluştu';
    return res.status(500).json({ success: false, message });
  }
}

/**
 * GET /api/questions/:questionId/answers
 * Bir sorunun cevaplarını getir
 */
export async function handleGetAnswers(req: Request, res: Response) {
  const questionId = req.params.questionId;

  if (!questionId || Number.isNaN(Number(questionId))) {
    return res.status(400).json({ success: false, message: 'questionId geçersiz' });
  }

  try {
    const currentUserId = getCurrentUserId(req);
    const answers = await getAnswersByQuestionId(Number(questionId), currentUserId || undefined);
    return res.json({ success: true, items: answers });
  } catch (err: any) {
    const message = err?.message || 'Cevaplar getirilirken hata oluştu';
    return res.status(500).json({ success: false, message });
  }
}

/**
 * POST /api/questions/:questionId/answers
 * Yeni cevap oluştur
 */
export async function handleCreateAnswer(req: Request, res: Response) {
  const questionId = req.params.questionId;
  const { cevap_metin, parent_cevap_id } = req.body || {};

  if (!questionId || Number.isNaN(Number(questionId))) {
    return res.status(400).json({ success: false, message: 'questionId geçersiz' });
  }

  if (!cevap_metin || typeof cevap_metin !== 'string' || cevap_metin.trim().length < 3) {
    return res.status(400).json({ success: false, message: 'Cevap metni en az 3 karakter olmalı' });
  }

  try {
    const kullaniciId = requireAuth(req);

    const answer = await createAnswer({
      soru_id: Number(questionId),
      kullanici_id: kullaniciId,
      cevap_metin: cevap_metin.trim(),
      parent_cevap_id: parent_cevap_id ? Number(parent_cevap_id) : null,
    });

    return res.status(201).json({ success: true, item: answer });
  } catch (err: any) {
    if (err?.message === 'UNAUTHORIZED') {
      return res.status(401).json({ success: false, message: 'Giriş yapmanız gerekiyor' });
    }
    const message = err?.message || 'Cevap kaydedilirken hata oluştu';
    return res.status(500).json({ success: false, message });
  }
}

/**
 * DELETE /api/questions/:questionId
 * Soruyu sil (soft delete)
 */
export async function handleDeleteQuestion(req: Request, res: Response) {
  const questionId = req.params.questionId;

  if (!questionId || Number.isNaN(Number(questionId))) {
    return res.status(400).json({ success: false, message: 'questionId geçersiz' });
  }

  try {
    const kullaniciId = requireAuth(req);

    await deleteQuestion(Number(questionId), kullaniciId);

    return res.json({ success: true, message: 'Soru silindi' });
  } catch (err: any) {
    if (err?.message === 'UNAUTHORIZED') {
      return res.status(401).json({ success: false, message: 'Giriş yapmanız gerekiyor' });
    }
    if (err?.message === 'Bu soruyu silme yetkiniz yok') {
      return res.status(403).json({ success: false, message: err.message });
    }
    const message = err?.message || 'Soru silinirken hata oluştu';
    return res.status(500).json({ success: false, message });
  }
}

/**
 * POST /api/questions/:questionId/like
 * Soru beğenme toggle
 */
export async function handleToggleQuestionLike(req: Request, res: Response) {
  const questionId = req.params.questionId;

  if (!questionId || Number.isNaN(Number(questionId))) {
    return res.status(400).json({ success: false, message: 'questionId geçersiz' });
  }

  try {
    const kullaniciId = requireAuth(req);

    const result = await toggleQuestionLike(Number(questionId), kullaniciId);

    return res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('LIKE ERROR (Question):', err);
    if (err?.message === 'UNAUTHORIZED') {
      return res.status(401).json({ success: false, message: 'Giriş yapmanız gerekiyor' });
    }
    const message = err?.message || 'Beğeni işlemi sırasında hata oluştu';
    return res.status(500).json({ success: false, message });
  }
}

/**
 * POST /api/answers/:answerId/like
 * Cevap beğenme toggle
 */
export async function handleToggleAnswerLike(req: Request, res: Response) {
  const answerId = req.params.answerId;

  if (!answerId || Number.isNaN(Number(answerId))) {
    return res.status(400).json({ success: false, message: 'answerId geçersiz' });
  }

  try {
    const kullaniciId = requireAuth(req);

    const result = await toggleAnswerLike(Number(answerId), kullaniciId);

    return res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('LIKE ERROR (Answer):', err);
    if (err?.message === 'UNAUTHORIZED') {
      return res.status(401).json({ success: false, message: 'Giriş yapmanız gerekiyor' });
    }
    const message = err?.message || 'Beğeni işlemi sırasında hata oluştu';
    return res.status(500).json({ success: false, message });
  }
}

/**
 * POST /api/questions/:soruId/kaydet
 * Soruyu kaydet
 */
export async function handleSaveQuestion(req: Request, res: Response) {
  const soruId = req.params.soruId || req.params.questionId;

  if (!soruId || Number.isNaN(Number(soruId))) {
    return res.status(400).json({ success: false, message: 'soruId geçersiz' });
  }

  try {
    const kullaniciId = requireAuth(req);

    await saveQuestion(Number(soruId), kullaniciId);

    return res.json({ success: true, saved: true });
  } catch (err: any) {
    if (err?.message === 'UNAUTHORIZED') {
      return res.status(401).json({ success: false, message: 'Giriş yapmanız gerekiyor' });
    }
    const message = err?.message || 'Soru kaydedilirken hata oluştu';
    return res.status(500).json({ success: false, message });
  }
}

/**
 * DELETE /api/questions/:soruId/kaydet
 * Soruyu kayıttan çıkar
 */
export async function handleUnsaveQuestion(req: Request, res: Response) {
  const soruId = req.params.soruId || req.params.questionId;

  if (!soruId || Number.isNaN(Number(soruId))) {
    return res.status(400).json({ success: false, message: 'soruId geçersiz' });
  }

  try {
    const kullaniciId = requireAuth(req);

    await unsaveQuestion(Number(soruId), kullaniciId);

    return res.json({ success: true, saved: false });
  } catch (err: any) {
    if (err?.message === 'UNAUTHORIZED') {
      return res.status(401).json({ success: false, message: 'Giriş yapmanız gerekiyor' });
    }
    const message = err?.message || 'Soru kayıttan çıkarılırken hata oluştu';
    return res.status(500).json({ success: false, message });
  }
}

/**
 * GET /api/questions/kaydedilenler
 * Kullanıcının kaydettiği soruları getir
 */
export async function handleGetSavedQuestions(req: Request, res: Response) {
  try {
    const kullaniciId = requireAuth(req);

    const items = await getSavedQuestions(kullaniciId);

    return res.json({ success: true, items });
  } catch (err: any) {
    if (err?.message === 'UNAUTHORIZED') {
      return res.status(401).json({ success: false, message: 'Giriş yapmanız gerekiyor' });
    }
    const message = err?.message || 'Kaydedilen sorular getirilirken hata oluştu';
    return res.status(500).json({ success: false, message });
  }
}

/**
 * GET /api/questions/kaydetme/durum?soruIds=1,2,3
 * Toplu kaydetme durumunu getir
 */
export async function handleGetSavedStatus(req: Request, res: Response) {
  const soruIdsParam = req.query.soruIds;

  if (!soruIdsParam || typeof soruIdsParam !== 'string') {
    return res.json({ success: true, savedIds: [] });
  }

  try {
    const kullaniciId = getCurrentUserId(req);
    if (!kullaniciId) {
      return res.json({ success: true, savedIds: [] });
    }

    const soruIds = soruIdsParam
      .split(',')
      .map((id) => Number(id.trim()))
      .filter((id) => !Number.isNaN(id) && id > 0);

    if (soruIds.length === 0) {
      return res.json({ success: true, savedIds: [] });
    }

    const savedIds = await getSavedStatus(soruIds, kullaniciId);

    return res.json({ success: true, savedIds });
  } catch (err: any) {
    console.error('GET SAVED STATUS ERROR:', err);
    // Hata olsa bile boş array dön (frontend çökmesin)
    return res.json({ success: true, savedIds: [] });
  }
}


