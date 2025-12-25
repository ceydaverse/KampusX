import { Request, Response } from 'express';
import { searchAll } from '../services/search.service';

export async function handleSearch(req: Request, res: Response) {
  try {
    const q = (req.query.q as string | undefined)?.trim() || '';
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        q,
        results: [],
      });
    }

    const safeLimit = !limit || Number.isNaN(limit) ? 10 : Math.min(limit, 20);
    const results = await searchAll(q, safeLimit);

    return res.json({
      success: true,
      q,
      results,
    });
  } catch (err: any) {
    console.error('❌ Search error:', {
      message: err?.message,
      code: err?.code,
      originalError: err?.originalError?.message,
    });
    return res.status(500).json({
      success: false,
      message: 'Arama sırasında hata oluştu',
    });
  }
}



