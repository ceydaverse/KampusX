import { getPool, sql } from '../db';
import { T } from '../constants/tables';

export interface Category {
  kategori_id: number;
  kategori_adi: string;
  ana_kategori_id?: number | null;
}

export async function getAllCategories(): Promise<Category[]> {
  const pool = await getPool();

  // Çözüm A: ana_kategori_id kolonu yoksa, sadece mevcut kolonları seç
  // Önce kolonun var olup olmadığını kontrol et
  try {
    const result = await pool.request().query(`
      SELECT kategori_id, kategori_adi, ana_kategori_id
      FROM ${T.Kategoriler}
      ORDER BY kategori_id
    `);

    return result.recordset as Category[];
  } catch (err: any) {
    // Eğer ana_kategori_id kolonu yoksa, sadece kategori_id ve kategori_adi seç
    if (err?.message?.includes('ana_kategori_id') || err?.originalError?.message?.includes('ana_kategori_id')) {
      const result = await pool.request().query(`
        SELECT kategori_id, kategori_adi, NULL AS ana_kategori_id
        FROM ${T.Kategoriler}
        ORDER BY kategori_id
      `);

      return result.recordset as Category[];
    }
    throw err;
  }
}

export async function getSubCategoriesByParentId(anaKategoriId: number): Promise<Category[]> {
  const pool = await getPool();

  // Çözüm A: ana_kategori_id kolonu yoksa, tüm kategorileri döndür (filtreleme yapamayız)
  try {
    const result = await pool
      .request()
      .input('ana_kategori_id', sql.Int, anaKategoriId)
      .query(`
        SELECT kategori_id, kategori_adi, ana_kategori_id
        FROM ${T.Kategoriler}
        WHERE ana_kategori_id = @ana_kategori_id
        ORDER BY kategori_id
      `);

    return result.recordset as Category[];
  } catch (err: any) {
    // Eğer ana_kategori_id kolonu yoksa, tüm kategorileri döndür
    if (err?.message?.includes('ana_kategori_id') || err?.originalError?.message?.includes('ana_kategori_id')) {
      // Kolon yoksa, tüm kategorileri döndür (filtreleme yapamayız)
      const result = await pool.request().query(`
        SELECT kategori_id, kategori_adi, NULL AS ana_kategori_id
        FROM ${T.Kategoriler}
        ORDER BY kategori_id
      `);

      return result.recordset as Category[];
    }
    throw err;
  }
}

