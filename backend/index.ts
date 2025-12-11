// backend/index.ts
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { getPool, sql } from './db';

dotenv.config();

const app = express();

// Frontend portuna CORS izni
app.use(
  cors({
    origin: 'http://localhost:5174',
  })
);

app.use(express.json());

const PORT = Number(process.env.PORT) || 5000;

// ------------------------
//  TEST ENDPOINTLER
// ------------------------

app.get('/', (req: Request, res: Response) => {
  res.send('Backend çalışıyor 🚀');
});

app.get('/api/test-db', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT 1 AS test');

    res.json({ success: true, db: result.recordset });
  } catch (error) {
    console.error('DB Test Error:', error);
    res.status(500).json({ success: false, error });
  }
});

// ------------------------
//  REGISTER
// ------------------------

app.post('/api/auth/register', async (req: Request, res: Response) => {
  const {
    ad,
    soyad,
    email,
    password,
    universite,
    bolum,
    cinsiyet,
    dogum_yili,
  } = req.body;

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
});

// ------------------------
//  LOGIN
// ------------------------

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: 'Email ve şifre zorunludur.' });
  }

  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .input('email', sql.VarChar(150), email)
      .query(
        `SELECT TOP 1 * FROM Kullanicilar WHERE email = @email AND silindi = 0`
      );

    if (result.recordset.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: 'Email veya şifre hatalı.' });
    }

    const user = result.recordset[0];

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
  } catch (error) {
    console.error('Login hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
    });
  }
});

app.listen(PORT, () => {
  console.log(`KampusX backend http://localhost:${PORT} üzerinde çalışıyor`);
});


