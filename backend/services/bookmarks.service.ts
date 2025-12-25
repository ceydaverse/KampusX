import { getPool, sql } from '../db';

/**
 * Soruyu kaydet
 */
export async function saveQuestion(soruId: number, kullaniciId: number): Promise<void> {
  const pool = await getPool();

  // Önce kontrol et
  const checkResult = await pool
    .request()
    .input('soru_id', sql.Int, soruId)
    .input('kullanici_id', sql.Int, kullaniciId)
    .query(`
      SELECT kayit_id
      FROM dbo.SoruKaydetme
      WHERE soru_id = @soru_id AND kullanici_id = @kullanici_id
    `);

  if (checkResult.recordset.length > 0) {
    // Zaten kaydedilmiş, hata verme, sadece return
    return;
  }

  // Kaydet
  await pool
    .request()
    .input('soru_id', sql.Int, soruId)
    .input('kullanici_id', sql.Int, kullaniciId)
    .query(`
      INSERT INTO dbo.SoruKaydetme (soru_id, kullanici_id)
      VALUES (@soru_id, @kullanici_id)
    `);
}

/**
 * Soruyu kayıttan çıkar
 */
export async function unsaveQuestion(soruId: number, kullaniciId: number): Promise<void> {
  const pool = await getPool();

  await pool
    .request()
    .input('soru_id', sql.Int, soruId)
    .input('kullanici_id', sql.Int, kullaniciId)
    .query(`
      DELETE FROM dbo.SoruKaydetme
      WHERE soru_id = @soru_id AND kullanici_id = @kullanici_id
    `);
}

/**
 * Kullanıcının kaydettiği soruları getir
 */
export async function getSavedQuestions(kullaniciId: number): Promise<any[]> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('kullanici_id', sql.Int, kullaniciId)
    .query(`
      SELECT 
        s.soru_id,
        s.baslik,
        s.soru_metin,
        s.tarih,
        s.kullanici_id,
        k.kullanici_adi,
        k.ad,
        k.soyad,
        k.universite,
        k.bolum
      FROM dbo.SoruKaydetme sk
      INNER JOIN Forum.Sorular s ON sk.soru_id = s.soru_id
      LEFT JOIN dbo.Kullanicilar k ON s.kullanici_id = k.kullanici_id
      WHERE sk.kullanici_id = @kullanici_id
      ORDER BY sk.kayit_id DESC
    `);

  return result.recordset.map((row: any) => ({
    soru_id: row.soru_id,
    baslik: row.baslik,
    soru_metin: row.soru_metin,
    tarih: row.tarih,
    kullanici_id: row.kullanici_id,
    author: {
      id: row.kullanici_id,
      username: row.kullanici_adi || `kullanici_${row.kullanici_id}`,
      ad: row.ad,
      soyad: row.soyad,
      universite: row.universite,
      bolum: row.bolum,
    },
  }));
}

/**
 * Toplu kaydetme durumunu getir
 */
export async function getSavedStatus(soruIds: number[], kullaniciId: number): Promise<number[]> {
  if (soruIds.length === 0) {
    return [];
  }

  const pool = await getPool();

  // MSSQL'de IN clause için parametreli sorgu
  const placeholders = soruIds.map((_, i) => `@soru_id_${i}`).join(',');
  const request = pool.request().input('kullanici_id', sql.Int, kullaniciId);
  
  soruIds.forEach((id, i) => {
    request.input(`soru_id_${i}`, sql.Int, id);
  });

  const result = await request.query(`
    SELECT soru_id
    FROM dbo.SoruKaydetme
    WHERE kullanici_id = @kullanici_id
      AND soru_id IN (${placeholders})
  `);

  return result.recordset.map((row: any) => row.soru_id);
}






