import { Request, Response } from 'express';
import { getPool, sql } from '../db';

export type TrendingQuestionDto = {
  soru_id: number;
  baslik: string;
  cevap_sayisi: number;
  begeni_sayisi: number;
  tarih: string; // ISO
};

export async function getTrendingFeed(req: Request, res: Response) {
  try {
    // Limit query param'ını parse et ve clamp et (1-50 arası)
    let limit = 20; // default
    if (req.query.limit) {
      const parsedLimit = Number(req.query.limit);
      if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(Math.max(1, parsedLimit), 50); // Clamp 1-50
      }
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit) 
          soru_id, 
          baslik, 
          cevap_sayisi, 
          begeni_sayisi, 
          tarih
        FROM Forum.v_TrendSorular
        ORDER BY begeni_sayisi DESC, cevap_sayisi DESC
      `);

    // DTO'ya map'le (tarih'i ISO string'e çevir)
    const items: TrendingQuestionDto[] = result.recordset.map((row: any) => ({
      soru_id: row.soru_id,
      baslik: row.baslik || '',
      cevap_sayisi: Number(row.cevap_sayisi) || 0,
      begeni_sayisi: Number(row.begeni_sayisi) || 0,
      tarih: row.tarih ? new Date(row.tarih).toISOString() : new Date().toISOString(),
    }));

    return res.json({ items });
  } catch (err: any) {
    console.error('[FEED_TRENDING]', {
      message: err?.message,
      code: err?.code || err?.number,
      original: err?.originalError?.message,
      stack: err?.stack,
    });
    
    return res.status(500).json({
      success: false,
      message: 'TREND_FEED_FAILED',
      ...(process.env.NODE_ENV !== 'production' && {
        detail: err?.originalError?.message || err?.message,
      }),
    });
  }
}
