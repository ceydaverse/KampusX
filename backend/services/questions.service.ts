import { getPool, sql } from '../db';
import { T } from '../constants/tables';

// SQL tarafında kategori adını slug'a çevirmek için kullanılan normalizasyon ifadesi
const NORMALIZED_CATEGORY_NAME_SQL_ACCENTS = `
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(
                REPLACE(
                  REPLACE(
                    REPLACE(
                      REPLACE(
                        REPLACE(kategori_adi, 'Ğ', 'g'),
                        'ğ', 'g'
                      ),
                      'Ü', 'u'
                    ),
                    'ü', 'u'
                  ),
                  'Ş', 's'
                ),
                'ş', 's'
              ),
              'İ', 'i'
            ),
            'I', 'i'
          ),
          'Ö', 'o'
        ),
        'ö', 'o'
      ),
      'Ç', 'c'
    ),
    'ç', 'c'
  )
`;

const NORMALIZED_CATEGORY_NAME_SQL = `
  LOWER(
    REPLACE(
      ${NORMALIZED_CATEGORY_NAME_SQL_ACCENTS},
      ' ',
      '-'
    )
  )
`;

export interface QuestionAuthor {
  id: number;
  username: string;
  ad?: string;
  soyad?: string;
  universite?: string | null;
  bolum?: string | null;
}

export interface Question {
  soru_id: number;
  kategori_id: number;
  kullanici_id: number;
  baslik: string;
  soru_metin: string;
  tarih: Date;
  likeCount?: number;
  isLikedByMe?: boolean;
  author?: QuestionAuthor;
  cevap_sayisi?: number;
}

async function findCategoryIdBySlug(slug: string): Promise<number> {
  const pool = await getPool();

  const query = `
    SELECT TOP 1 kategori_id
    FROM ${T.Kategoriler}
    WHERE ${NORMALIZED_CATEGORY_NAME_SQL} = @slug
  `;

  const result = await pool
    .request()
    .input('slug', sql.VarChar(200), slug.toLowerCase())
    .query(query);

  if (result.recordset.length === 0) {
    throw new Error('Kategori bulunamadı');
  }

  return result.recordset[0].kategori_id;
}

export async function getQuestionsByCategoryId(
  kategoriId: number,
  currentUserId?: number
): Promise<Question[]> {
  const pool = await getPool();

  // Like count ve isLikedByMe ile birlikte getir
  const request = pool
    .request()
    .input('kategori_id', sql.Int, kategoriId);

  let query = `
    SELECT 
      s.soru_id,
      s.kategori_id,
      s.kullanici_id,
      s.baslik,
      s.soru_metin,
      s.tarih,
      s.etiketler,
      ISNULL(sb.likeCount, 0) AS likeCount,
      ISNULL(COUNT(DISTINCT c.cevap_id), 0) AS cevap_sayisi,
      k.kullanici_id AS author_id,
      k.kullanici_adi AS author_username,
      k.ad AS author_ad,
      k.soyad AS author_soyad,
      k.universite AS author_universite,
      k.bolum AS author_bolum
  `;

  if (currentUserId) {
    request.input('current_user_id', sql.Int, currentUserId);
    query += `,
      CASE 
        WHEN EXISTS(SELECT 1 FROM ${T.SoruBegeniler} WHERE soru_id = s.soru_id AND kullanici_id = @current_user_id) 
        THEN 1 
        ELSE 0 
      END AS isLikedByMe
    `;
  } else {
    query += `, 0 AS isLikedByMe`;
  }

  // Soft delete kolonu var mı kontrol et ve WHERE'a ekle
  let softDeleteFilter = '';
  try {
    const softDeleteCheck = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'Forum' 
        AND TABLE_NAME = 'Sorular' 
        AND COLUMN_NAME IN ('silindi', 'is_deleted', 'silindi_mi')
      `);
    if (softDeleteCheck.recordset.length > 0) {
      const colName = softDeleteCheck.recordset[0].COLUMN_NAME.toLowerCase();
      if (colName === 'silindi') {
        softDeleteFilter = ' AND (s.silindi = 0 OR s.silindi IS NULL)';
      } else if (colName === 'is_deleted') {
        softDeleteFilter = ' AND (s.is_deleted = 0 OR s.is_deleted IS NULL)';
      } else if (colName === 'silindi_mi') {
        softDeleteFilter = ' AND (s.silindi_mi = 0 OR s.silindi_mi IS NULL)';
      }
    }
  } catch (err) {
    // Kolon kontrolü hatası, soft delete filtresi ekleme
  }

  query += `
    FROM ${T.Sorular} s
    LEFT JOIN (SELECT soru_id, COUNT(*) AS likeCount FROM ${T.SoruBegeniler} GROUP BY soru_id) sb ON s.soru_id = sb.soru_id
    LEFT JOIN ${T.Cevaplar} c ON c.soru_id = s.soru_id
    LEFT JOIN ${T.Kullanicilar} k ON s.kullanici_id = k.kullanici_id
    WHERE s.kategori_id = @kategori_id${softDeleteFilter}
    GROUP BY 
      s.soru_id,
      s.kategori_id,
      s.kullanici_id,
      s.baslik,
      s.soru_metin,
      s.tarih,
      s.etiketler,
      k.kullanici_id,
      k.kullanici_adi,
      k.ad,
      k.soyad,
      k.universite,
      k.bolum,
      sb.likeCount
    ORDER BY s.tarih DESC
  `;

  const result = await request.query(query);

  return result.recordset.map((row: any) => {
    // Username fallback: kullanici_adi yoksa ad + soyad birleştir
    const username = row.author_username || 
      (row.author_ad && row.author_soyad 
        ? `${row.author_ad} ${row.author_soyad}`.trim() 
        : `kullanici_${row.kullanici_id}`);

    return {
      soru_id: row.soru_id,
      kategori_id: row.kategori_id,
      kullanici_id: row.kullanici_id,
      baslik: row.baslik,
      soru_metin: row.soru_metin,
      tarih: row.tarih,
      etiketler: row.etiketler || null,
      likeCount: Number(row.likeCount) || 0,
      isLikedByMe: row.isLikedByMe === 1 || row.isLikedByMe === true,
      cevap_sayisi: Number(row.cevap_sayisi) || 0,
      author: row.author_id ? {
        id: row.author_id,
        username: username,
        ad: row.author_ad || null,
        soyad: row.author_soyad || null,
        universite: row.author_universite || null,
        bolum: row.author_bolum || null,
      } : undefined,
    };
  }) as Question[];
}

// Deprecated: slug ile çalışan eski fonksiyon (geriye uyumluluk için)
export async function getQuestionsByCategorySlug(slug: string): Promise<Question[]> {
  const kategoriId = await findCategoryIdBySlug(slug);
  return getQuestionsByCategoryId(kategoriId);
}

/**
 * Tek bir sorunun detayını getir
 */
export async function getQuestionById(
  soruId: number,
  currentUserId?: number
): Promise<Question | null> {
  const pool = await getPool();

  const request = pool
    .request()
    .input('soru_id', sql.Int, soruId);

  let query = `
    SELECT 
      s.soru_id,
      s.kategori_id,
      s.kullanici_id,
      s.baslik,
      s.soru_metin,
      s.tarih,
      s.etiketler,
      ISNULL(sb.likeCount, 0) AS likeCount,
      ISNULL(COUNT(DISTINCT c.cevap_id), 0) AS cevap_sayisi,
      k.kullanici_id AS author_id,
      k.kullanici_adi AS author_username,
      k.ad AS author_ad,
      k.soyad AS author_soyad,
      k.universite AS author_universite,
      k.bolum AS author_bolum
  `;

  if (currentUserId) {
    request.input('current_user_id', sql.Int, currentUserId);
    query += `,
      CASE 
        WHEN EXISTS(SELECT 1 FROM ${T.SoruBegeniler} WHERE soru_id = s.soru_id AND kullanici_id = @current_user_id) 
        THEN 1 
        ELSE 0 
      END AS isLikedByMe
    `;
  } else {
    query += `, 0 AS isLikedByMe`;
  }

  // Soft delete kolonu var mı kontrol et ve WHERE'a ekle
  let softDeleteFilter = '';
  try {
    const softDeleteCheck = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'Forum' 
        AND TABLE_NAME = 'Sorular' 
        AND COLUMN_NAME IN ('silindi', 'is_deleted', 'silindi_mi')
      `);
    if (softDeleteCheck.recordset.length > 0) {
      const colName = softDeleteCheck.recordset[0].COLUMN_NAME.toLowerCase();
      if (colName === 'silindi') {
        softDeleteFilter = ' AND (s.silindi = 0 OR s.silindi IS NULL)';
      } else if (colName === 'is_deleted') {
        softDeleteFilter = ' AND (s.is_deleted = 0 OR s.is_deleted IS NULL)';
      } else if (colName === 'silindi_mi') {
        softDeleteFilter = ' AND (s.silindi_mi = 0 OR s.silindi_mi IS NULL)';
      }
    }
  } catch (err) {
    // Kolon kontrolü hatası, soft delete filtresi ekleme
  }

  query += `
    FROM ${T.Sorular} s
    LEFT JOIN (SELECT soru_id, COUNT(*) AS likeCount FROM ${T.SoruBegeniler} GROUP BY soru_id) sb ON s.soru_id = sb.soru_id
    LEFT JOIN ${T.Cevaplar} c ON c.soru_id = s.soru_id
    LEFT JOIN ${T.Kullanicilar} k ON s.kullanici_id = k.kullanici_id
    WHERE s.soru_id = @soru_id${softDeleteFilter}
    GROUP BY 
      s.soru_id,
      s.kategori_id,
      s.kullanici_id,
      s.baslik,
      s.soru_metin,
      s.tarih,
      s.etiketler,
      k.kullanici_id,
      k.kullanici_adi,
      k.ad,
      k.soyad,
      k.universite,
      k.bolum,
      sb.likeCount
  `;

  const result = await request.query(query);

  if (result.recordset.length === 0) {
    return null;
  }

  const row = result.recordset[0];
  
  // Username fallback: kullanici_adi yoksa ad + soyad birleştir
  const username = row.author_username || 
    (row.author_ad && row.author_soyad 
      ? `${row.author_ad} ${row.author_soyad}`.trim() 
      : `kullanici_${row.kullanici_id}`);

  return {
      soru_id: row.soru_id,
      kategori_id: row.kategori_id,
      kullanici_id: row.kullanici_id,
      baslik: row.baslik,
      soru_metin: row.soru_metin,
      tarih: row.tarih,
      etiketler: row.etiketler || null,
      likeCount: Number(row.likeCount) || 0,
      isLikedByMe: row.isLikedByMe === 1 || row.isLikedByMe === true,
      cevap_sayisi: Number(row.cevap_sayisi) || 0,
      author: row.author_id ? {
        id: row.author_id,
        username: username,
        ad: row.author_ad || null,
        soyad: row.author_soyad || null,
        universite: row.author_universite || null,
        bolum: row.author_bolum || null,
      } : undefined,
    };
}

interface CreateQuestionInput {
  kategori_id: number;
  kullanici_id: number;
  baslik: string;
  soru_metin: string;
  etiketler?: string[];
}

export async function validateCategoryExists(kategoriId: number): Promise<boolean> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('kategori_id', sql.Int, kategoriId)
    .query(`SELECT 1 FROM ${T.Kategoriler} WHERE kategori_id = @kategori_id`);

  return result.recordset.length > 0;
}

export async function validateUserExists(kullaniciId: number): Promise<boolean> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('kullanici_id', sql.Int, kullaniciId)
    .query(`SELECT 1 FROM ${T.Kullanicilar} WHERE kullanici_id = @kullanici_id`);

  return result.recordset.length > 0;
}

export async function createQuestion(input: CreateQuestionInput): Promise<Question> {
  const pool = await getPool();

  // Kullanıcı varlık kontrolü
  const userExists = await validateUserExists(input.kullanici_id);
  if (!userExists) {
    throw new Error('kullanici bulunamadı');
  }

  // Kategori varlık kontrolü
  const categoryExists = await validateCategoryExists(input.kategori_id);
  if (!categoryExists) {
    throw new Error('Kategori bulunamadı');
  }

  // Etiketleri JSON string'e çevir (varsa)
  const etiketlerJson = input.etiketler && input.etiketler.length > 0
    ? JSON.stringify(input.etiketler)
    : null;

  // Etiketler kolonu varsa ekle, yoksa sadece mevcut kolonları kullan
  // Not: DB'de etiketler kolonu yoksa, etiketler parametresi atlanır
  const request = pool
    .request()
    .input('kullanici_id', sql.Int, input.kullanici_id)
    .input('kategori_id', sql.Int, input.kategori_id)
    .input('baslik', sql.NVarChar(sql.MAX), input.baslik)
    .input('soru_metin', sql.NVarChar(sql.MAX), input.soru_metin);

  // Etiketler kolonu varsa ekle
  if (etiketlerJson) {
    request.input('etiketler', sql.NVarChar(sql.MAX), etiketlerJson);
  }

  // Etiketler kolonu varsa INSERT'e ekle, yoksa sadece mevcut kolonları kullan
  const insertQuery = etiketlerJson
    ? `
      INSERT INTO ${T.Sorular} (kullanici_id, kategori_id, baslik, soru_metin, etiketler, tarih)
      OUTPUT INSERTED.soru_id, INSERTED.kategori_id, INSERTED.kullanici_id, INSERTED.baslik, INSERTED.soru_metin, INSERTED.tarih
      VALUES (@kullanici_id, @kategori_id, @baslik, @soru_metin, @etiketler, GETDATE())
    `
    : `
      INSERT INTO ${T.Sorular} (kullanici_id, kategori_id, baslik, soru_metin, tarih)
      OUTPUT INSERTED.soru_id, INSERTED.kategori_id, INSERTED.kullanici_id, INSERTED.baslik, INSERTED.soru_metin, INSERTED.tarih
      VALUES (@kullanici_id, @kategori_id, @baslik, @soru_metin, GETDATE())
    `;

  const insertResult = await request.query(insertQuery);

  // Etiketler log'lanıyor
  if (etiketlerJson) {
    console.log('Etiketler kaydedildi:', etiketlerJson);
  }

  return insertResult.recordset[0] as Question;
}

/**
 * Soruyu sil (transaction + soft delete kontrolü + child delete)
 */
export async function deleteQuestion(
  soruId: number,
  kullaniciId: number
): Promise<void> {
  const pool = await getPool();
  const t0 = Date.now();

  try {
    // Soru varlık ve owner kontrolü
    const checkStart = Date.now();
    const questionCheck = await pool
      .request()
      .input('soru_id', sql.Int, soruId)
      .query(`
        SELECT kullanici_id 
        FROM ${T.Sorular} 
        WHERE soru_id = @soru_id
      `);

    console.log(`[deleteQuestion] step=checkQuestion ms=${Date.now() - checkStart}`);

    if (questionCheck.recordset.length === 0) {
      throw new Error('Soru bulunamadı');
    }

    if (questionCheck.recordset[0].kullanici_id !== kullaniciId) {
      throw new Error('Bu soruyu silme yetkiniz yok');
    }

    // Soft delete kolonlarını kontrol et
    const softDeleteCheckStart = Date.now();
    const softDeleteCheck = await pool
      .request()
      .query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'Forum' 
          AND TABLE_NAME = 'Sorular' 
          AND COLUMN_NAME IN ('silindi', 'silinme_tarihi', 'silindi_mi', 'deleted_at', 'is_deleted')
      `);

    const softDeleteColumns = softDeleteCheck.recordset.map((row: any) => row.COLUMN_NAME.toLowerCase());
    const hasSilindi = softDeleteColumns.includes('silindi');
    const hasSilinmeTarihi = softDeleteColumns.includes('silinme_tarihi');
    const hasDeletedAt = softDeleteColumns.includes('deleted_at');
    const hasIsDeleted = softDeleteColumns.includes('is_deleted');
    const hasSilindiMi = softDeleteColumns.includes('silindi_mi');

    console.log(`[deleteQuestion] step=checkSoftDeleteColumns ms=${Date.now() - softDeleteCheckStart} columns=${softDeleteColumns.join(',')}`);

    // Transaction başlat
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // LOCK_TIMEOUT ayarla
      const lockTimeoutStart = Date.now();
      await transaction.request().query('SET LOCK_TIMEOUT 10000;');
      console.log(`[deleteQuestion] step=setLockTimeout ms=${Date.now() - lockTimeoutStart}`);

      if (hasSilindi || hasIsDeleted || hasSilindiMi) {
        // Soft delete yap
        const softDeleteStart = Date.now();
        let softDeleteQuery = `UPDATE ${T.Sorular} SET `;
        const updates: string[] = [];

        if (hasSilindi) {
          updates.push('silindi = 1');
        }
        if (hasIsDeleted) {
          updates.push('is_deleted = 1');
        }
        if (hasSilindiMi) {
          updates.push('silindi_mi = 1');
        }
        if (hasSilinmeTarihi) {
          updates.push('silinme_tarihi = GETDATE()');
        }
        if (hasDeletedAt) {
          updates.push('deleted_at = GETDATE()');
        }

        softDeleteQuery += updates.join(', ') + ` WHERE soru_id = @soru_id`;

        await transaction.request()
          .input('soru_id', sql.Int, soruId)
          .query(softDeleteQuery);

        console.log(`[deleteQuestion] step=softDelete ms=${Date.now() - softDeleteStart} query="${softDeleteQuery}"`);

        await transaction.commit();
        console.log(`[deleteQuestion] step=complete ms=${Date.now() - t0} method=softDelete`);
        return;
      }

      // Hard delete akışı: Önce çocuk kayıtları sil
      
      // 1. CevapBegeniler (cevap_id → Forum.Cevaplar üzerinden)
      const deleteCevapBegenilerStart = Date.now();
      try {
        await transaction.request()
          .input('soru_id', sql.Int, soruId)
          .query(`
            DELETE FROM ${T.CevapBegeniler}
            WHERE cevap_id IN (
              SELECT cevap_id FROM ${T.Cevaplar} WHERE soru_id = @soru_id
            )
          `);
        console.log(`[deleteQuestion] step=deleteCevapBegeniler ms=${Date.now() - deleteCevapBegenilerStart}`);
      } catch (err: any) {
        console.warn(`[deleteQuestion] step=deleteCevapBegeniler WARN: ${err?.message}`);
        // Tablo yoksa devam et
      }

      // 2. Forum.Cevaplar
      const deleteCevaplarStart = Date.now();
      try {
        await transaction.request()
          .input('soru_id', sql.Int, soruId)
          .query(`DELETE FROM ${T.Cevaplar} WHERE soru_id = @soru_id`);
        console.log(`[deleteQuestion] step=deleteCevaplar ms=${Date.now() - deleteCevaplarStart}`);
      } catch (err: any) {
        console.error(`[deleteQuestion] step=deleteCevaplar ERROR: ${err?.message}`);
        throw err;
      }

      // 3. SoruBegeniler
      const deleteSoruBegenilerStart = Date.now();
      try {
        await transaction.request()
          .input('soru_id', sql.Int, soruId)
          .query(`DELETE FROM ${T.SoruBegeniler} WHERE soru_id = @soru_id`);
        console.log(`[deleteQuestion] step=deleteSoruBegeniler ms=${Date.now() - deleteSoruBegenilerStart}`);
      } catch (err: any) {
        console.warn(`[deleteQuestion] step=deleteSoruBegeniler WARN: ${err?.message}`);
        // Tablo yoksa devam et
      }

      // 4. SoruKaydetme
      const deleteSoruKaydetmeStart = Date.now();
      try {
        await transaction.request()
          .input('soru_id', sql.Int, soruId)
          .query(`DELETE FROM ${T.SoruKaydetme} WHERE soru_id = @soru_id`);
        console.log(`[deleteQuestion] step=deleteSoruKaydetme ms=${Date.now() - deleteSoruKaydetmeStart}`);
      } catch (err: any) {
        console.warn(`[deleteQuestion] step=deleteSoruKaydetme WARN: ${err?.message}`);
        // Tablo yoksa devam et
      }

      // 5. Bildirimler (soru_id veya hedef_soru_id kolonu varsa)
      const deleteBildirimlerStart = Date.now();
      try {
        // Önce kolonu kontrol et
        const bildirimColCheck = await transaction.request().query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = 'dbo' 
            AND TABLE_NAME = 'Bildirimler' 
            AND COLUMN_NAME IN ('soru_id', 'hedef_soru_id', 'soruId')
        `);

        if (bildirimColCheck.recordset.length > 0) {
          const bildirimCol = bildirimColCheck.recordset[0].COLUMN_NAME;
          await transaction.request()
            .input('soru_id', sql.Int, soruId)
            .query(`DELETE FROM ${T.Bildirimler} WHERE ${bildirimCol} = @soru_id`);
          console.log(`[deleteQuestion] step=deleteBildirimler ms=${Date.now() - deleteBildirimlerStart} column=${bildirimCol}`);
        } else {
          console.log(`[deleteQuestion] step=deleteBildirimler SKIPPED (no soru_id column)`);
        }
      } catch (err: any) {
        console.warn(`[deleteQuestion] step=deleteBildirimler WARN: ${err?.message}`);
        // Tablo yoksa veya kolon yoksa devam et
      }

      // 6. Son olarak Forum.Sorular kaydını sil
      const deleteSoruStart = Date.now();
      await transaction.request()
        .input('soru_id', sql.Int, soruId)
        .query(`DELETE FROM ${T.Sorular} WHERE soru_id = @soru_id`);
      console.log(`[deleteQuestion] step=deleteSoru ms=${Date.now() - deleteSoruStart}`);

      // Transaction commit
      await transaction.commit();
      console.log(`[deleteQuestion] step=complete ms=${Date.now() - t0} method=hardDelete`);

    } catch (err: any) {
      await transaction.rollback();
      console.error(`[deleteQuestion] step=error ms=${Date.now() - t0}`, {
        message: err?.message,
        number: err?.originalError?.number,
        code: err?.code || err?.originalError?.code,
        proc: err?.originalError?.procName,
        line: err?.originalError?.lineNumber,
        questionId: soruId,
        currentUserId: kullaniciId,
      });
      throw err;
    }
  } catch (err: any) {
    console.error(`[deleteQuestion] step=fatalError ms=${Date.now() - t0}`, {
      message: err?.message,
      number: err?.originalError?.number,
      code: err?.code || err?.originalError?.code,
      proc: err?.originalError?.procName,
      line: err?.originalError?.lineNumber,
      questionId: soruId,
      currentUserId: kullaniciId,
    });
    throw err;
  }
}

