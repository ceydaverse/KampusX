import { Router, Request, Response } from 'express';
import { getPool, sql } from '../db';
import bcrypt from 'bcryptjs';

const router = Router();

// Kayıt ol endpoint
router.post('/register', async (req: Request, res: Response) => {
  const { ad, soyad, email, password } = req.body;

  if (!ad || !soyad || !email || !password) {
    return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur.' });
  }

  try {
    const pool = await getPool();

    // Email kontrolü
    const existing = await pool.request()
      .input('email', sql.VarChar(150), email)
      .query('SELECT * FROM Kullanicilar WHERE email = @email');

    if (existing.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'Email zaten kullanılıyor.' });
    }

    // Şifreyi hashle
    const hash = await bcrypt.hash(password, 10);

    // Kullanıcı ekle
    const result = await pool.request()
      .input('ad', sql.NVarChar(100), ad)
      .input('soyad', sql.NVarChar(100), soyad)
      .input('email', sql.VarChar(150), email)
      .input('sifre_hash', sql.VarChar(255), hash)
      .query(`INSERT INTO Kullanicilar (ad, soyad, email, sifre_hash) 
              VALUES (@ad, @soyad, @email, @sifre_hash);
              SELECT SCOPE_IDENTITY() AS id;`);

    return res.json({ success: true, user: { id: result.recordset[0].id, ad, soyad, email } });

  } catch (error) {
    console.error('Register hatası:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

export default router;
