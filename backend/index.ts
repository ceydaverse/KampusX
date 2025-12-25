import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { getPool, sql } from './db';
import bildirimRoutes from './routes/bildirim.routes';
import authRoutes from './routes/auth.routes';



dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// 🔹 Bildirim route'u
app.use('/api/bildirimler', bildirimRoutes);
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;

// Ana test endpoint
app.get('/', (req: Request, res: Response) => {
  res.send('Backend çalışıyor 🚀');
});

// MSSQL test endpoint
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

// LOGIN endpoint
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email ve şifre zorunludur.' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('email', sql.VarChar(150), email)
      .query(`SELECT TOP 1 * FROM Kullanicilar WHERE email = @email AND silindi = 0`);

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Email veya şifre hatalı.' });
    }

    const user = result.recordset[0];
    const isMatch = await bcrypt.compare(password, user.sifre_hash.trim());

    if (!isMatch) {
      return res.status(401).json({ message: 'Email veya şifre hatalı.' });
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
        cinsiyet: user.cinsiyet
      }
    });
  } catch (error) {
    console.error('Login hatası:', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
});

app.listen(PORT, () => {
  console.log(`KampusX backend http://localhost:${PORT} üzerinde çalışıyor`);
});
