import { getPool, sql } from '../db';
import { T } from '../constants/tables';
import { createNotification, getQuestionOwnerId, getUserDisplayName } from './notifications.service';

export interface AnswerAuthor {
  id: number;
  username: string;
  ad?: string;
  soyad?: string;
  universite?: string | null;
  bolum?: string | null;
}

export interface Answer {
  cevap_id: number;
  soru_id: number;
  kullanici_id: number;
  cevap_metin: string;
  tarih: Date;
  likeCount?: number;
  isLikedByMe?: boolean;
  author?: AnswerAuthor;
}

interface CreateAnswerInput {
  soru_id: number;
  kullanici_id: number;
  cevap_metin: string;
}

/**
 * Bir sorunun cevaplarını getir (nested yapı ile)
 */
export async function getAnswersByQuestionId(
  soruId: number,
  currentUserId?: number
): Promise<Answer[]> {
  const pool = await getPool();

  // Cevapları ve like sayılarını getir
  const request = pool
    .request()
    .input('soru_id', sql.Int, soruId);

  let query = `
    SELECT 
      c.cevap_id,
      c.soru_id,
      c.kullanici_id,
      c.cevap_metin,
      c.tarih,
      ISNULL(cb.likeCount, 0) AS likeCount,
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
        WHEN EXISTS(SELECT 1 FROM ${T.CevapBegeniler} WHERE cevap_id = c.cevap_id AND kullanici_id = @current_user_id) 
        THEN 1 
        ELSE 0 
      END AS isLikedByMe
    `;
  } else {
    query += `, 0 AS isLikedByMe`;
  }

  query += `
    FROM ${T.Cevaplar} c
    LEFT JOIN (SELECT cevap_id, COUNT(*) AS likeCount FROM ${T.CevapBegeniler} GROUP BY cevap_id) cb ON c.cevap_id = cb.cevap_id
    LEFT JOIN ${T.Kullanicilar} k ON c.kullanici_id = k.kullanici_id
    WHERE c.soru_id = @soru_id
    GROUP BY 
      c.cevap_id,
      c.soru_id,
      c.kullanici_id,
      c.cevap_metin,
      c.tarih,
      k.kullanici_id,
      k.kullanici_adi,
      k.ad,
      k.soyad,
      k.universite,
      k.bolum,
      cb.likeCount
    ORDER BY c.tarih ASC
  `;

  const result = await request.query(query);

  const answers = result.recordset.map((row: any) => {
    // Username fallback: kullanici_adi yoksa ad + soyad birleştir
    const username = row.author_username || 
      (row.author_ad && row.author_soyad 
        ? `${row.author_ad} ${row.author_soyad}`.trim() 
        : `kullanici_${row.kullanici_id}`);

    return {
      cevap_id: row.cevap_id,
      soru_id: row.soru_id,
      kullanici_id: row.kullanici_id,
      cevap_metin: row.cevap_metin,
      tarih: row.tarih,
      likeCount: Number(row.likeCount) || 0,
      isLikedByMe: row.isLikedByMe === 1 || row.isLikedByMe === true,
      author: row.author_id ? {
        id: row.author_id,
        username: username,
        ad: row.author_ad || null,
        soyad: row.author_soyad || null,
        universite: row.author_universite || null,
        bolum: row.author_bolum || null,
      } : undefined,
    };
  }) as Answer[];

  // Flat liste
  return answers;
}

/**
 * Yeni cevap oluştur
 */
export async function createAnswer(input: CreateAnswerInput): Promise<Answer> {
  const pool = await getPool();

  // Soru varlık kontrolü
  const questionCheck = await pool
    .request()
    .input('soru_id', sql.Int, input.soru_id)
    .query(`SELECT 1 FROM ${T.Sorular} WHERE soru_id = @soru_id`);

  if (questionCheck.recordset.length === 0) {
    throw new Error('Soru bulunamadı');
  }

  // OUTPUT INSERTED direkt kullanılamaz (trigger varsa). OUTPUT INTO @Inserted kullan.
  const request = pool
    .request()
    .input('soru_id', sql.Int, input.soru_id)
    .input('kullanici_id', sql.Int, input.kullanici_id)
    .input('cevap_metin', sql.NVarChar(sql.MAX), input.cevap_metin);

  const insertSql = `
    DECLARE @Inserted TABLE (cevap_id INT);
    
    INSERT INTO ${T.Cevaplar} (soru_id, kullanici_id, cevap_metin, tarih)
    OUTPUT INSERTED.cevap_id INTO @Inserted(cevap_id)
    VALUES (@soru_id, @kullanici_id, @cevap_metin, GETDATE());
    
    SELECT cevap_id FROM @Inserted;
  `;

  const insertResult = await request.query(insertSql);
  const insertedId = insertResult.recordset?.[0]?.cevap_id;

  if (!insertedId) {
    throw new Error("Cevap eklendi ama cevap_id dönmedi.");
  }

  // Insert sonrası cevabı çek (tüm alanları almak için)
  const answerResult = await pool
    .request()
    .input('cevap_id', sql.Int, insertedId)
    .query(`
      SELECT TOP 1 
        cevap_id,
        soru_id,
        kullanici_id,
        cevap_metin,
        tarih
      FROM ${T.Cevaplar}
      WHERE cevap_id = @cevap_id
    `);

  if (answerResult.recordset.length === 0) {
    throw new Error("Cevap eklendi ama sonrasında bulunamadı.");
  }

  const row = answerResult.recordset[0];
  
  // Bildirim oluştur (soru sahibine)
  try {
    const questionOwnerId = await getQuestionOwnerId(input.soru_id);
    if (questionOwnerId && questionOwnerId !== input.kullanici_id) {
      const actorName = await getUserDisplayName(input.kullanici_id);
      await createNotification({
        kullanici_id: questionOwnerId,
        soru_id: input.soru_id,
        cevap_id: row.cevap_id,
        mesaj: `${actorName} soruna cevap verdi`,
        tip: 'cevap',
      });
    }
  } catch (err) {
    // Bildirim hatası cevap oluşturmayı engellemesin
    console.error('Bildirim oluşturulurken hata:', err);
  }

  return {
    cevap_id: row.cevap_id,
    soru_id: row.soru_id,
    kullanici_id: row.kullanici_id,
    cevap_metin: row.cevap_metin,
    tarih: row.tarih,
    likeCount: 0,
    isLikedByMe: false,
  };
}

