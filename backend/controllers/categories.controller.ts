import { Request, Response } from 'express';
import { getAllCategories, getSubCategoriesByParentId } from '../services/categories.service';

export async function handleGetCategories(req: Request, res: Response) {
  try {
    const anaKategoriId = req.query.ana_kategori_id;

    // Eğer ana_kategori_id query param'ı varsa, sadece alt kategorileri döndür
    if (anaKategoriId && !Number.isNaN(Number(anaKategoriId))) {
      const items = await getSubCategoriesByParentId(Number(anaKategoriId));
      return res.json({ success: true, items });
    }

    // Yoksa tüm kategorileri döndür
    const items = await getAllCategories();
    return res.json({ success: true, items });
  } catch (err: any) {
    const message = err?.message || 'Kategoriler getirilirken hata oluştu';
    return res.status(500).json({ success: false, message });
  }
}

