import { Request, Response } from 'express';
import { getUserById, updateUser, searchUsers } from '../services/users.service';
import { getLikedQuestionsByUserId, getLikedAnswersByUserId } from '../services/likes.service';

/**
 * GET /api/users/search?q=cey
 * Kullanıcı arama
 */
export async function handleSearchUsers(req: Request, res: Response) {
  try {
    const query = (req.query.q as string) || '';
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    if (Number.isNaN(limit) || limit < 1 || limit > 50) {
      return res.status(400).json({
        success: false,
        message: 'Limit 1-50 arasında olmalıdır',
      });
    }

    const users = await searchUsers(query, limit);

    return res.json({
      success: true,
      items: users.map((user) => ({
        kullanici_id: user.kullanici_id,
        ad: user.ad,
        soyad: user.soyad,
        email: user.email,
      })),
    });
  } catch (err: any) {
    console.error('Search users error:', err);
    return res.status(500).json({
      success: false,
      message: 'Kullanıcı arama sırasında hata oluştu',
    });
  }
}

/**
 * GET /api/users/:id
 * Kullanıcı profil bilgilerini getir
 */
export async function handleGetUserById(req: Request, res: Response) {
  try {
    const userId = Number(req.params.id);

    if (Number.isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz kullanıcı ID',
      });
    }

    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    // Güvenlik: Şifre ve hassas bilgileri döndürme
    return res.json({
      success: true,
      user: {
        id: user.kullanici_id,
        username: user.kullanici_adi || (user.ad && user.soyad ? `${user.ad} ${user.soyad}`.trim() : `kullanici_${user.kullanici_id}`),
        ad: user.ad,
        soyad: user.soyad,
        universite: user.universite,
        bolum: user.bolum,
        email: user.email,
        dogum_yili: user.dogum_yili,
        cinsiyet: user.cinsiyet,
      },
    });
  } catch (err: any) {
    console.error('Get user by id error:', err);
    return res.status(500).json({
      success: false,
      message: 'Kullanıcı bilgileri getirilirken hata oluştu',
    });
  }
}

export async function handleGetMe(req: Request, res: Response) {
  // x-user-id header'ından kullanıcı ID'sini al
  const userIdHeader = req.headers['x-user-id'] as string;

  if (!userIdHeader || Number.isNaN(Number(userIdHeader))) {
    return res.status(401).json({
      success: false,
      message: 'Kullanıcı kimliği bulunamadı',
    });
  }

  const kullaniciId = Number(userIdHeader);

  try {
    const user = await getUserById(kullaniciId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.kullanici_id,
        ad: user.ad,
        soyad: user.soyad,
        email: user.email,
        universite: user.universite,
        bolum: user.bolum,
        kullanici_adi: user.kullanici_adi,
        dogum_yili: user.dogum_yili,
        cinsiyet: user.cinsiyet,
      },
    });
  } catch (err: any) {
    console.error('Get user error:', err);
    return res.status(500).json({
      success: false,
      message: 'Kullanıcı bilgileri getirilirken hata oluştu',
    });
  }
}

export async function handleUpdateMe(req: Request, res: Response) {
  // x-user-id header'ından kullanıcı ID'sini al
  const userIdHeader = req.headers['x-user-id'] as string;

  if (!userIdHeader || Number.isNaN(Number(userIdHeader))) {
    return res.status(401).json({
      success: false,
      message: 'Kullanıcı kimliği bulunamadı',
    });
  }

  const kullaniciId = Number(userIdHeader);

  // Body validation
  const { ad, soyad, universite, bolum, kullanici_adi, dogum_yili, cinsiyet } = req.body || {};

  if (!ad || typeof ad !== 'string' || ad.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Ad zorunludur ve boş olamaz',
    });
  }

  if (ad.trim().length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Ad en fazla 100 karakter olabilir',
    });
  }

  if (!soyad || typeof soyad !== 'string' || soyad.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Soyad zorunludur ve boş olamaz',
    });
  }

  if (soyad.trim().length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Soyad en fazla 100 karakter olabilir',
    });
  }

  // Opsiyonel alanlar için validation
  if (universite !== undefined && universite !== null && typeof universite !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Üniversite string olmalıdır',
    });
  }

  if (universite && universite.trim().length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Üniversite en fazla 100 karakter olabilir',
    });
  }

  if (bolum !== undefined && bolum !== null && typeof bolum !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Bölüm string olmalıdır',
    });
  }

  if (bolum && bolum.trim().length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Bölüm en fazla 100 karakter olabilir',
    });
  }

  if (kullanici_adi !== undefined && kullanici_adi !== null && typeof kullanici_adi !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Kullanıcı adı string olmalıdır',
    });
  }

  if (kullanici_adi && kullanici_adi.trim().length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Kullanıcı adı en fazla 100 karakter olabilir',
    });
  }

  // dogum_yili validation
  if (dogum_yili !== undefined && dogum_yili !== null) {
    if (typeof dogum_yili !== 'number' || !Number.isInteger(dogum_yili)) {
      return res.status(400).json({
        success: false,
        message: 'Doğum yılı integer olmalıdır',
      });
    }

    const currentYear = new Date().getFullYear();
    const minYear = 1900;
    const maxYear = currentYear - 10; // En az 10 yaşında olmalı

    if (dogum_yili < minYear || dogum_yili > maxYear) {
      return res.status(400).json({
        success: false,
        message: `Doğum yılı ${minYear} ile ${maxYear} arasında olmalıdır`,
      });
    }
  }

  // cinsiyet validation
  if (cinsiyet !== undefined && cinsiyet !== null) {
    if (typeof cinsiyet !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Cinsiyet string olmalıdır',
      });
    }

    const allowedCinsiyetValues = ['Kadın', 'Erkek', 'Diğer', 'Belirtmek istemiyorum'];
    if (!allowedCinsiyetValues.includes(cinsiyet.trim())) {
      return res.status(400).json({
        success: false,
        message: `Cinsiyet şu değerlerden biri olmalıdır: ${allowedCinsiyetValues.join(', ')}`,
      });
    }
  }

  try {
    const updateInput = {
      kullanici_id: kullaniciId,
      ad: ad.trim(),
      soyad: soyad.trim(),
      universite: universite ? universite.trim() : null,
      bolum: bolum ? bolum.trim() : null,
      kullanici_adi: kullanici_adi ? kullanici_adi.trim() : null,
      dogum_yili: dogum_yili !== undefined && dogum_yili !== null ? Number(dogum_yili) : null,
      cinsiyet: cinsiyet ? cinsiyet.trim() : null,
    };

    const { user: updatedUser, rowsAffected } = await updateUser(updateInput);

    // Debug log
    console.log('UPDATE ME', {
      userId: kullaniciId,
      body: req.body,
      rowsAffected,
    });

    return res.json({
      success: true,
      user: {
        id: updatedUser.kullanici_id,
        ad: updatedUser.ad,
        soyad: updatedUser.soyad,
        email: updatedUser.email,
        universite: updatedUser.universite,
        bolum: updatedUser.bolum,
        kullanici_adi: updatedUser.kullanici_adi,
        dogum_yili: updatedUser.dogum_yili,
        cinsiyet: updatedUser.cinsiyet,
      },
    });
  } catch (err: any) {
    if (err?.message === 'Kullanıcı bulunamadı' || err?.message === 'Kullanıcı bulunamadı veya güncellenemedi') {
      console.log('PUT /api/users/me - User not found, returning 404');
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    console.error('Update user error:', err);
    return res.status(500).json({
      success: false,
      message: 'Kullanıcı bilgileri güncellenirken hata oluştu',
    });
  }
}

/**
 * GET /api/users/me/likes
 * Kullanıcının beğendiği sorular ve cevapları getir
 */
export async function handleGetMyLikes(req: Request, res: Response) {
  // Debug log - handler başında
  console.log("✅ LIKES HIT", { 
    path: req.path, 
    query: req.query, 
    params: req.params, 
    user: (req as any).user,
    headers: {
      'x-user-id': req.headers['x-user-id'],
    }
  });

  // kullaniciId parametresini güvenli parse et (hem query hem params hem header'dan)
  const raw = (req.query.kullaniciId ?? req.query.kullanici_id ?? req.params.kullaniciId ?? req.headers['x-user-id']) as string;
  
  if (!raw) {
    console.error("❌ LIKES ERROR: kullaniciId bulunamadı");
    return res.status(400).json({
      success: false,
      message: 'kullaniciId zorunlu',
    });
  }

  const kullaniciId = Number(raw);

  if (Number.isNaN(kullaniciId)) {
    console.error("❌ LIKES ERROR: kullaniciId geçersiz", raw);
    return res.status(400).json({
      success: false,
      message: 'kullaniciId zorunlu',
    });
  }

  console.log("✅ LIKES parsed kullaniciId:", kullaniciId);

  try {
    const [questions, answers] = await Promise.all([
      getLikedQuestionsByUserId(kullaniciId),
      getLikedAnswersByUserId(kullaniciId),
    ]);

    console.log("✅ LIKES SUCCESS", { 
      questionsCount: questions.length, 
      answersCount: answers.length 
    });

    return res.json({
      success: true,
      questions,
      answers,
    });
  } catch (err: any) {
    console.error("❌ LIKES ERROR", err);
    return res.status(500).json({
      success: false,
      message: 'Beğeniler getirilirken hata oluştu',
    });
  }
}
