import { getPool, sql } from '../db';

export interface Answer {
  cevap_id: number;
  soru_id: number;
  kullanici_id: number;
  cevap_metin: string;
  tarih: Date;
  likeCount?: number;
  isLikedByMe?: boolean;
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
      COUNT(DISTINCT cb.kullanici_id) AS likeCount
  `;

  if (currentUserId) {
    request.input('current_user_id', sql.Int, currentUserId);
    query += `,
      CASE 
        WHEN EXISTS(SELECT 1 FROM dbo.CevapBegeniler WHERE cevap_id = c.cevap_id AND kullanici_id = @current_user_id) 
        THEN 1 
        ELSE 0 
      END AS isLikedByMe
    `;
  } else {
    query += `, 0 AS isLikedByMe`;
  }

  query += `
    FROM dbo.Cevaplar c
    LEFT JOIN dbo.CevapBegeniler cb ON c.cevap_id = cb.cevap_id
    WHERE c.soru_id = @soru_id
    GROUP BY 
      c.cevap_id,
      c.soru_id,
      c.kullanici_id,
      c.cevap_metin,
      c.tarih
    ORDER BY c.tarih ASC
  `;

  const result = await request.query(query);

  const answers = result.recordset.map((row: any) => ({
    cevap_id: row.cevap_id,
    soru_id: row.soru_id,
    kullanici_id: row.kullanici_id,
    cevap_metin: row.cevap_metin,
    tarih: row.tarih,
    likeCount: Number(row.likeCount) || 0,
    isLikedByMe: row.isLikedByMe === 1 || row.isLikedByMe === true,
  })) as Answer[];

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
    .query('SELECT 1 FROM dbo.Sorular WHERE soru_id = @soru_id');

  if (questionCheck.recordset.length === 0) {
    throw new Error('Soru bulunamadı');
  }

  const insertResult = await pool
    .request()
    .input('soru_id', sql.Int, input.soru_id)
    .input('kullanici_id', sql.Int, input.kullanici_id)
    .input('cevap_metin', sql.NVarChar(sql.MAX), input.cevap_metin)
    .query(`
      INSERT INTO dbo.Cevaplar (soru_id, kullanici_id, cevap_metin, tarih)
      OUTPUT INSERTED.cevap_id, INSERTED.soru_id, INSERTED.kullanici_id, 
             INSERTED.cevap_metin, INSERTED.tarih
      VALUES (@soru_id, @kullanici_id, @cevap_metin, GETDATE())
    `);

  const row = insertResult.recordset[0];
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

