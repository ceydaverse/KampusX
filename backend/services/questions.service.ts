import { getPool, sql } from '../db';

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
}

async function findCategoryIdBySlug(slug: string): Promise<number> {
  const pool = await getPool();

  const query = `
    SELECT TOP 1 kategori_id
    FROM Forum.Kategoriler
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
      COUNT(DISTINCT sb.kullanici_id) AS likeCount,
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
        WHEN EXISTS(SELECT 1 FROM dbo.SoruBegeniler WHERE soru_id = s.soru_id AND kullanici_id = @current_user_id) 
        THEN 1 
        ELSE 0 
      END AS isLikedByMe
    `;
  } else {
    query += `, 0 AS isLikedByMe`;
  }

  query += `
    FROM Forum.Sorular s
    LEFT JOIN dbo.SoruBegeniler sb ON s.soru_id = sb.soru_id
    LEFT JOIN dbo.Kullanicilar k ON s.kullanici_id = k.kullanici_id
    WHERE s.kategori_id = @kategori_id
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
      k.bolum
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
      COUNT(DISTINCT sb.kullanici_id) AS likeCount,
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
        WHEN EXISTS(SELECT 1 FROM dbo.SoruBegeniler WHERE soru_id = s.soru_id AND kullanici_id = @current_user_id) 
        THEN 1 
        ELSE 0 
      END AS isLikedByMe
    `;
  } else {
    query += `, 0 AS isLikedByMe`;
  }

  query += `
    FROM Forum.Sorular s
    LEFT JOIN dbo.SoruBegeniler sb ON s.soru_id = sb.soru_id
    LEFT JOIN dbo.Kullanicilar k ON s.kullanici_id = k.kullanici_id
    WHERE s.soru_id = @soru_id
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
      k.bolum
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
    .query(`SELECT 1 FROM Forum.Kategoriler WHERE kategori_id = @kategori_id`);

  return result.recordset.length > 0;
}

export async function validateUserExists(kullaniciId: number): Promise<boolean> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('kullanici_id', sql.Int, kullaniciId)
    .query(`SELECT 1 FROM dbo.Kullanicilar WHERE kullanici_id = @kullanici_id`);

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
      INSERT INTO Forum.Sorular (kullanici_id, kategori_id, baslik, soru_metin, etiketler, tarih)
      OUTPUT INSERTED.soru_id, INSERTED.kategori_id, INSERTED.kullanici_id, INSERTED.baslik, INSERTED.soru_metin, INSERTED.tarih
      VALUES (@kullanici_id, @kategori_id, @baslik, @soru_metin, @etiketler, GETDATE())
    `
    : `
      INSERT INTO Forum.Sorular (kullanici_id, kategori_id, baslik, soru_metin, tarih)
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
 * Soruyu hard delete yap
 */
export async function deleteQuestion(
  soruId: number,
  kullaniciId: number
): Promise<void> {
  const pool = await getPool();

  // Soru varlık ve owner kontrolü
  const questionCheck = await pool
    .request()
    .input('soru_id', sql.Int, soruId)
    .input('kullanici_id', sql.Int, kullaniciId)
    .query(`
      SELECT kullanici_id 
      FROM Forum.Sorular 
      WHERE soru_id = @soru_id
    `);

  if (questionCheck.recordset.length === 0) {
    throw new Error('Soru bulunamadı');
  }

  if (questionCheck.recordset[0].kullanici_id !== kullaniciId) {
    throw new Error('Bu soruyu silme yetkiniz yok');
  }

  // Hard delete
  await pool
    .request()
    .input('soru_id', sql.Int, soruId)
    .query(`
      DELETE FROM Forum.Sorular 
      WHERE soru_id = @soru_id
    `);
}

