import { getPool, sql } from '../db';
import { T } from '../constants/tables';

export type SearchResultType = 'question' | 'user' | 'group' | 'category';

export interface SearchResult {
  type: SearchResultType;
  id: number;
  title: string;
  snippet?: string;
  categoryId?: number | null;
  categoryName?: string | null;
}

export async function searchAll(q: string, limit = 10): Promise<SearchResult[]> {
  const pool = await getPool();

  // Pattern: %q%
  const pattern = `%${q.toLowerCase()}%`;

  // Tek sorgu içinde UNION ALL
  const query = `
    DECLARE @pattern NVARCHAR(200) = @patternParam;

    SELECT TOP (@limit) *
    FROM (
      -- Sorular
      SELECT 
        'question' AS type,
        s.soru_id AS id,
        s.baslik AS title,
        LEFT(ISNULL(s.soru_metin, ''), 160) AS snippet,
        s.kategori_id AS categoryId,
        k.kategori_adi AS categoryName
      FROM ${T.Sorular} s
      LEFT JOIN ${T.Kategoriler} k ON s.kategori_id = k.kategori_id
      WHERE 
        LOWER(ISNULL(s.baslik, '')) LIKE @pattern
        OR LOWER(ISNULL(s.soru_metin, '')) LIKE @pattern
        OR LOWER(ISNULL(s.etiketler, '')) LIKE @pattern
        OR LOWER(ISNULL(k.kategori_adi, '')) LIKE @pattern

      UNION ALL

      -- Kullanıcılar
      SELECT
        'user' AS type,
        k.kullanici_id AS id,
        ISNULL(k.kullanici_adi, CONCAT(ISNULL(k.ad, ''), ' ', ISNULL(k.soyad, ''))) AS title,
        CONCAT(ISNULL(k.ad, ''), ' ', ISNULL(k.soyad, '')) AS snippet,
        NULL AS categoryId,
        NULL AS categoryName
      FROM ${T.Kullanicilar} k
      WHERE 
        LOWER(ISNULL(k.kullanici_adi, '')) LIKE @pattern
        OR LOWER(CONCAT(ISNULL(k.ad, ''), ' ', ISNULL(k.soyad, ''))) LIKE @pattern

      UNION ALL

      -- Gruplar (varsa)
      SELECT
        'group' AS type,
        g.grup_id AS id,
        g.grup_adi AS title,
        NULL AS snippet,
        NULL AS categoryId,
        NULL AS categoryName
      FROM ${T.Gruplar} g
      WHERE LOWER(ISNULL(g.grup_adi, '')) LIKE @pattern

      UNION ALL

      -- Kategoriler
      SELECT
        'category' AS type,
        c.kategori_id AS id,
        c.kategori_adi AS title,
        NULL AS snippet,
        NULL AS categoryId,
        NULL AS categoryName
      FROM ${T.Kategoriler} c
      WHERE LOWER(ISNULL(c.kategori_adi, '')) LIKE @pattern
    ) AS combined
    ORDER BY 
      CASE type 
        WHEN 'question' THEN 1 
        WHEN 'user' THEN 2 
        WHEN 'group' THEN 3 
        ELSE 4 
      END,
      title
  `;

  try {
    const result = await pool
      .request()
      .input('patternParam', sql.NVarChar(200), pattern)
      .input('limit', sql.Int, limit)
      .query(query);

    return result.recordset.map((row: any) => ({
      type: row.type as SearchResultType,
      id: Number(row.id),
      title: row.title || '',
      snippet: row.snippet || '',
      categoryId: row.categoryId ?? null,
      categoryName: row.categoryName ?? null,
    }));
  } catch (err: any) {
    console.error('❌ searchAll error:', {
      message: err?.message,
      code: err?.code,
      originalError: err?.originalError?.message,
    });
    return [];
  }
}



