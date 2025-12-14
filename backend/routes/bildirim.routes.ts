import { Router, Request, Response } from 'express';
import { getPool, sql } from '../db';

const router = Router();

// 🔔 Kullanıcıya ait bildirimleri getir
router.get('/:kullaniciId', async (req: Request, res: Response) => {
  const { kullaniciId } = req.params;

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('kullaniciId', sql.Int, kullaniciId)
      .query(`
        SELECT 
          bildirim_id,
          mesaj,
          tip,
          tarih
        FROM Bildirimler
        WHERE kullanici_id = @kullaniciId
        ORDER BY tarih DESC
      `);

    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('Bildirimler alınamadı:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

console.log('📢 Bildirim route okundu'); // Artık sadece log verecek

export default router;
