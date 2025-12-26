import { getPool, sql } from '../db';
import { T } from '../constants/tables';

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
      FROM ${T.SoruKaydetme}
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
      FROM ${T.SoruKaydetme} sk
      INNER JOIN ${T.Sorular} s ON sk.soru_id = s.soru_id
      LEFT JOIN ${T.Kullanicilar} k ON s.kullanici_id = k.kullanici_id
      WHERE sk.kullanici_id = @kullanici_id${softDeleteFilter}
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






