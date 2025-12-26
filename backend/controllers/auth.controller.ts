import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getPool, sql } from '../db';
import { T } from '../constants/tables';

// Türkçe karakterleri sadeleştir
function normalizeTurkishChars(text: string): string {
  const turkishMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U',
  };
  return text.replace(/[çÇğĞıİöÖşŞüÜ]/g, (char) => turkishMap[char] || char);
}

// Email'den kullanıcı adı üret
async function generateUsernameFromEmail(email: string, pool: any): Promise<string> {
  const emailPrefix = email.split('@')[0];
  // Türkçe karakterleri sadeleştir, boşlukları ve özel karakterleri kaldır
  let baseUsername = normalizeTurkishChars(emailPrefix)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20); // Max 20 karakter

  if (!baseUsername || baseUsername.length === 0) {
    baseUsername = 'user';
  }

  let username = baseUsername;
  let suffix = 0;
  const maxAttempts = 100;

  // Kullanıcı adı çakışması kontrolü
  while (suffix < maxAttempts) {
    const checkResult = await pool
      .request()
      .input('kullanici_adi', sql.NVarChar(100), username)
      .query(
        `SELECT TOP 1 kullanici_id FROM ${T.Kullanicilar} WHERE kullanici_adi = @kullanici_adi AND silindi = 0`
      );

    if (checkResult.recordset.length === 0) {
      // Kullanıcı adı müsait
      return username;
    }

    // Çakışma var, suffix ekle
    suffix++;
    username = `${baseUsername}${suffix}`;
  }

  // Max attempts'e ulaşıldıysa timestamp ekle
  return `${baseUsername}${Date.now().toString().slice(-6)}`;
}

export async function handleRegister(req: Request, res: Response) {
  const isDev = process.env.NODE_ENV !== 'production';

  // Dev modda request body'yi logla
  if (isDev) {
    console.log('REGISTER BODY:', req.body);
  }

  // Request body'den farklı field isimlerini destekle
  const {
    ad,
    soyad,
    email,
    password,
    sifre,
    kullanici_adi,
    kullaniciAdi,
    username,
    universite,
    bolum,
    cinsiyet,
    dogum_yili,
  } = req.body || {};

  // Password mapping: password veya sifre
  const finalPassword = password || sifre;

  // Validation - zorunlu alanlar
  const missingFields: string[] = [];
  if (!ad || typeof ad !== 'string' || !ad.trim()) missingFields.push('ad');
  if (!soyad || typeof soyad !== 'string' || !soyad.trim()) missingFields.push('soyad');
  if (!email || typeof email !== 'string' || !email.trim()) missingFields.push('email');
  if (!finalPassword || typeof finalPassword !== 'string' || !finalPassword.trim()) {
    missingFields.push('password (veya sifre)');
  }

  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Eksik alan',
      detail: `Eksik alanlar: ${missingFields.join(', ')}`,
    });
  }

  try {
    const pool = await getPool();

    // Kullanıcı adı mapping: kullanici_adi, kullaniciAdi veya username
    let finalKullaniciAdi = kullanici_adi || kullaniciAdi || username;
    
    // kullanici_adi yoksa veya boşsa email'den üret
    if (!finalKullaniciAdi || typeof finalKullaniciAdi !== 'string' || !finalKullaniciAdi.trim()) {
      finalKullaniciAdi = await generateUsernameFromEmail(email.trim(), pool);
    } else {
      finalKullaniciAdi = finalKullaniciAdi.trim();
    }

    // Email var mı kontrol et
    const emailCheckResult = await pool
      .request()
      .input('email', sql.VarChar(150), email.trim().toLowerCase())
      .query(
        `SELECT TOP 1 kullanici_id FROM ${T.Kullanicilar} WHERE LOWER(email) = LOWER(@email) AND silindi = 0`
      );

    if (emailCheckResult.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Bu email ile kayıtlı kullanıcı var.',
      });
    }

    // Kullanıcı adı çakışması kontrol et (eğer manuel girildiyse)
    if (kullanici_adi || kullaniciAdi || username) {
      const usernameCheckResult = await pool
        .request()
        .input('kullanici_adi', sql.NVarChar(100), finalKullaniciAdi)
        .query(
          `SELECT TOP 1 kullanici_id FROM ${T.Kullanicilar} WHERE kullanici_adi = @kullanici_adi AND silindi = 0`
        );

      if (usernameCheckResult.recordset.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Bu kullanıcı adı alınmış.',
        });
      }
    }

    // Şifre hashle
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(finalPassword, saltRounds);

    // SQL sorgusu ve parametreleri logla (şifre hariç)
    const insertParams = {
      ad: ad.trim(),
      soyad: soyad.trim(),
      email: email.trim().toLowerCase(),
      kullanici_adi: finalKullaniciAdi,
      sifre_hash: hashedPassword.substring(0, 10) + '...', // Sadece ilk 10 karakter göster
      universite: universite?.trim() || null,
      bolum: bolum?.trim() || null,
      cinsiyet: cinsiyet?.trim() || null,
      dogum_yili: dogum_yili || null,
    };

    if (isDev) {
      console.log('📝 REGISTER INSERT - Parameters:', JSON.stringify(insertParams, null, 2));
      console.log('REGISTER MAPPED:', { ad: ad.trim(), soyad: soyad.trim(), email: email.trim().toLowerCase(), kullanici_adi: finalKullaniciAdi });
    }

    // Kullanıcı ekle (dbo.Kullanicilar şeması ile) - kullanici_adi eklendi
    const insertQuery = `
      INSERT INTO ${T.Kullanicilar}
        (ad, soyad, email, kullanici_adi, sifre_hash, universite, bolum, cinsiyet, dogum_yili)
      OUTPUT INSERTED.kullanici_id, INSERTED.ad, INSERTED.soyad, INSERTED.email, INSERTED.kullanici_adi
      VALUES
        (@ad, @soyad, @email, @kullanici_adi, @sifre_hash, @universite, @bolum, @cinsiyet, @dogum_yili)
    `;

    if (isDev) {
      console.log('📝 REGISTER INSERT - Query:', insertQuery);
    }

    const insertResult = await pool
      .request()
      .input('ad', sql.NVarChar(100), ad.trim())
      .input('soyad', sql.NVarChar(100), soyad.trim())
      .input('email', sql.VarChar(150), email.trim().toLowerCase())
      .input('kullanici_adi', sql.NVarChar(100), finalKullaniciAdi)
      .input('sifre_hash', sql.Char(60), hashedPassword)
      .input('universite', sql.NVarChar(100), universite?.trim() || null)
      .input('bolum', sql.NVarChar(100), bolum?.trim() || null)
      .input('cinsiyet', sql.NVarChar(10), cinsiyet?.trim() || null)
      .input('dogum_yili', sql.Int, dogum_yili || null)
      .query(insertQuery);

    const newUser = insertResult.recordset[0];
    const newUserId = newUser.kullanici_id;

    // Kullanici_Rol: normal_kullanici = rol_id 3 (eğer tablo varsa)
    try {
      await pool
        .request()
        .input('kullanici_id', sql.Int, newUserId)
        .input('rol_id', sql.Int, 3)
        .query(
          `INSERT INTO dbo.Kullanici_Rol (kullanici_id, rol_id) VALUES (@kullanici_id, @rol_id)`
        );
    } catch (roleError: any) {
      // Rol tablosu yoksa veya hata varsa sadece logla, kayıt işlemini devam ettir
      console.warn('⚠️ Kullanici_Rol insert hatası (ignored):', roleError?.message);
    }

    return res.status(201).json({
      success: true,
      user: {
        id: newUser.kullanici_id,
        ad: newUser.ad,
        soyad: newUser.soyad,
        email: newUser.email,
        kullanici_adi: newUser.kullanici_adi,
      },
    });
  } catch (error: any) {
    // Detaylı hata loglama
    console.error('❌ REGISTER ERROR:', {
      message: error?.message,
      number: error?.number,
      code: error?.code,
      originalError: error?.originalError?.message,
      stack: error?.stack,
      state: error?.state,
      class: error?.class,
      serverName: error?.serverName,
      procedureName: error?.procedureName,
      lineNumber: error?.lineNumber,
    });

    // Error handling
    const errorMessage = error?.message || '';
    const errorNumber = error?.number;

    // SQL Server error 515: Cannot insert the value NULL into column (NULL violation)
    if (errorNumber === 515) {
      // Hangi kolon NULL olduğunu bul
      let nullColumn = 'bilinmeyen alan';
      if (errorMessage.includes('kullanici_adi')) nullColumn = 'kullanici_adi';
      else if (errorMessage.includes('ad')) nullColumn = 'ad';
      else if (errorMessage.includes('soyad')) nullColumn = 'soyad';
      else if (errorMessage.includes('email')) nullColumn = 'email';
      else if (errorMessage.includes('sifre_hash')) nullColumn = 'sifre_hash';

      return res.status(400).json({
        success: false,
        message: 'Eksik alan',
        detail: `${nullColumn} alanı boş olamaz.`,
        ...(isDev && { sqlError: errorMessage }),
      });
    }

    // SQL Server unique constraint error codes
    // 2601: Cannot insert duplicate key (unique index violation)
    // 2627: Violation of PRIMARY KEY constraint or UNIQUE constraint
    if (errorNumber === 2601 || errorNumber === 2627) {
      let conflictMessage = 'Bu bilgilerle kayıtlı kullanıcı var.';
      
      if (errorMessage.includes('email') || errorMessage.toLowerCase().includes('email')) {
        conflictMessage = 'Bu email ile kayıtlı kullanıcı var.';
      } else if (errorMessage.includes('kullanici_adi') || errorMessage.toLowerCase().includes('username')) {
        conflictMessage = 'Bu kullanıcı adı alınmış.';
      }

      return res.status(409).json({
        success: false,
        message: conflictMessage,
        ...(isDev && { detail: errorMessage }),
      });
    }

    // Diğer hatalar için 500 döndür
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      ...(isDev && {
        detail: errorMessage,
        code: errorNumber,
        original: error?.originalError?.message,
      }),
    });
  }
}

export async function handleLogin(req: Request, res: Response) {
  // Request body validation
  const { email, password } = req.body || {};

  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email zorunludur ve string olmalıdır.' 
    });
  }

  if (!password || typeof password !== 'string' || !password.trim()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Şifre zorunludur ve string olmalıdır.' 
    });
  }

  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .input('email', sql.VarChar(150), email.trim())
      .query(
        `SELECT TOP 1 * FROM ${T.Kullanicilar} WHERE LOWER(email) = LOWER(@email) AND silindi = 0`
      );

    if (result.recordset.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: 'Email veya şifre hatalı.' });
    }

    const user = result.recordset[0];

    // Şifre hash kontrolü
    if (!user.sifre_hash) {
      console.error('AUTH LOGIN ERROR: User has no password hash', { email });
      return res.status(500).json({
        success: false,
        message: 'Kullanıcı verisi hatalı.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.sifre_hash.trim());

    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: 'Email veya şifre hatalı.' });
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
        cinsiyet: user.cinsiyet,
      },
    });
  } catch (error: any) {
    console.error('AUTH LOGIN ERROR:', {
      message: error?.message,
      code: error?.code,
      originalError: error?.originalError?.message,
      stack: error?.stack,
      email: email ? '***' : 'missing',
    });

    return res.status(500).json({
      success: false,
      message: 'Login failed',
      error: {
        message: error?.message,
        code: error?.code,
        original: error?.originalError?.message,
      },
    });
  }
}

