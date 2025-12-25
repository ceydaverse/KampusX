import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getPool, sql } from '../db';

export async function handleRegister(req: Request, res: Response) {
  const {
    ad,
    soyad,
    email,
    password,
    universite,
    bolum,
    cinsiyet,
    dogum_yili,
  } = req.body || {};

  if (!ad || !soyad || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Ad, soyad, email ve şifre zorunludur.',
    });
  }

  try {
    const pool = await getPool();

    // Email var mı?
    const existingUser = await pool
      .request()
      .input('email', sql.VarChar(150), email)
      .query(
        `SELECT TOP 1 * FROM Kullanicilar WHERE email = @email AND silindi = 0`
      );

    if (existingUser.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu email ile kayıtlı bir kullanıcı zaten var.',
      });
    }

    // Şifre hashle
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Kullanıcı ekle
    const insertResult = await pool
      .request()
      .input('ad', sql.NVarChar(100), ad)
      .input('soyad', sql.NVarChar(100), soyad)
      .input('email', sql.VarChar(150), email)
      .input('sifre_hash', sql.Char(60), hashedPassword)
      .input('universite', sql.NVarChar(100), universite || null)
      .input('bolum', sql.NVarChar(100), bolum || null)
      .input('cinsiyet', sql.NVarChar(10), cinsiyet || null)
      .input('dogum_yili', sql.Int, dogum_yili || null)
      .query(`
        INSERT INTO Kullanicilar
          (ad, soyad, email, sifre_hash, universite, bolum, cinsiyet, dogum_yili)
        OUTPUT INSERTED.kullanici_id, INSERTED.ad, INSERTED.soyad, INSERTED.email,
               INSERTED.universite, INSERTED.bolum, INSERTED.cinsiyet
        VALUES
          (@ad, @soyad, @email, @sifre_hash, @universite, @bolum, @cinsiyet, @dogum_yili)
      `);

    const newUser = insertResult.recordset[0];
    const newUserId = newUser.kullanici_id;

    // Kullanici_Rol: normal_kullanici = rol_id 3
    await pool
      .request()
      .input('kullanici_id', sql.Int, newUserId)
      .input('rol_id', sql.Int, 3)
      .query(
        `INSERT INTO Kullanici_Rol (kullanici_id, rol_id) VALUES (@kullanici_id, @rol_id)`
      );

    return res.status(201).json({
      success: true,
      user: {
        id: newUser.kullanici_id,
        ad: newUser.ad,
        soyad: newUser.soyad,
        email: newUser.email,
        universite: newUser.universite,
        bolum: newUser.bolum,
        cinsiyet: newUser.cinsiyet,
      },
    });
  } catch (error) {
    console.error('Register hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
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
        `SELECT TOP 1 * FROM Kullanicilar WHERE email = @email AND silindi = 0`
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

