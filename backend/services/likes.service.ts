import { getPool, sql } from '../db';
import { createNotification, getQuestionOwnerId, getAnswerOwnerId, getUserDisplayName } from './notifications.service';

/**
 * Soru beğenme toggle
 */
export async function toggleQuestionLike(
  soruId: number,
  kullaniciId: number
): Promise<{ liked: boolean; likeCount: number }> {
  const pool = await getPool();

  // Önce beğeni var mı kontrol et
  const checkResult = await pool
    .request()
    .input('soru_id', sql.Int, soruId)
    .input('kullanici_id', sql.Int, kullaniciId)
    .query(`
      SELECT 1 
      FROM dbo.SoruBegeniler 
      WHERE soru_id = @soru_id AND kullanici_id = @kullanici_id
    `);

  const exists = checkResult.recordset.length > 0;

  if (exists) {
    // Beğeniyi kaldır
    await pool
      .request()
      .input('soru_id', sql.Int, soruId)
      .input('kullanici_id', sql.Int, kullaniciId)
      .query(`
        DELETE FROM dbo.SoruBegeniler 
        WHERE soru_id = @soru_id AND kullanici_id = @kullanici_id
      `);
  } else {
    // Beğeni ekle
    await pool
      .request()
      .input('soru_id', sql.Int, soruId)
      .input('kullanici_id', sql.Int, kullaniciId)
      .query(`
        INSERT INTO dbo.SoruBegeniler (soru_id, kullanici_id, tarih)
        VALUES (@soru_id, @kullanici_id, GETDATE())
      `);

    // Bildirim oluştur (soru sahibine)
    try {
      const questionOwnerId = await getQuestionOwnerId(soruId);
      if (questionOwnerId && questionOwnerId !== kullaniciId) {
        const actorName = await getUserDisplayName(kullaniciId);
        await createNotification({
          kullanici_id: questionOwnerId,
          soru_id: soruId,
          cevap_id: null,
          mesaj: `${actorName} sorunu beğendi`,
          tip: 'soru_begeni',
        });
      }
    } catch (err) {
      console.error('Bildirim oluşturulurken hata:', err);
    }
  }

  // Güncel like sayısını getir
  const countResult = await pool
    .request()
    .input('soru_id', sql.Int, soruId)
    .query(`
      SELECT COUNT(*) AS likeCount 
      FROM dbo.SoruBegeniler 
      WHERE soru_id = @soru_id
    `);

  const likeCount = Number(countResult.recordset[0].likeCount) || 0;

  return {
    liked: !exists,
    likeCount,
  };
}

/**
 * Cevap beğenme toggle
 */
export async function toggleAnswerLike(
  cevapId: number,
  kullaniciId: number
): Promise<{ liked: boolean; likeCount: number }> {
  const pool = await getPool();

  // Önce beğeni var mı kontrol et
  const checkResult = await pool
    .request()
    .input('cevap_id', sql.Int, cevapId)
    .input('kullanici_id', sql.Int, kullaniciId)
    .query(`
      SELECT 1 
      FROM dbo.CevapBegeniler 
      WHERE cevap_id = @cevap_id AND kullanici_id = @kullanici_id
    `);

  const exists = checkResult.recordset.length > 0;

  if (exists) {
    // Beğeniyi kaldır
    await pool
      .request()
      .input('cevap_id', sql.Int, cevapId)
      .input('kullanici_id', sql.Int, kullaniciId)
      .query(`
        DELETE FROM dbo.CevapBegeniler 
        WHERE cevap_id = @cevap_id AND kullanici_id = @kullanici_id
      `);
  } else {
    // Beğeni ekle
    await pool
      .request()
      .input('cevap_id', sql.Int, cevapId)
      .input('kullanici_id', sql.Int, kullaniciId)
      .query(`
        INSERT INTO dbo.CevapBegeniler (cevap_id, kullanici_id, tarih)
        VALUES (@cevap_id, @kullanici_id, GETDATE())
      `);

    // Bildirim oluştur (cevap sahibine)
    try {
      const answerOwnerId = await getAnswerOwnerId(cevapId);
      if (answerOwnerId && answerOwnerId !== kullaniciId) {
        // Cevabın soru_id'sini al
        const answerInfo = await pool
          .request()
          .input('cevap_id', sql.Int, cevapId)
          .query(`SELECT soru_id FROM dbo.Cevaplar WHERE cevap_id = @cevap_id`);

        const soruId = answerInfo.recordset[0]?.soru_id || null;
        const actorName = await getUserDisplayName(kullaniciId);
        await createNotification({
          kullanici_id: answerOwnerId,
          soru_id: soruId,
          cevap_id: cevapId,
          mesaj: `${actorName} cevabını beğendi`,
          tip: 'cevap_begeni',
        });
      }
    } catch (err) {
      console.error('Bildirim oluşturulurken hata:', err);
    }
  }

  // Güncel like sayısını getir
  const countResult = await pool
    .request()
    .input('cevap_id', sql.Int, cevapId)
    .query(`
      SELECT COUNT(*) AS likeCount 
      FROM dbo.CevapBegeniler 
      WHERE cevap_id = @cevap_id
    `);

  const likeCount = Number(countResult.recordset[0].likeCount) || 0;

  return {
    liked: !exists,
    likeCount,
  };
}

/**
 * Kullanıcının beğendiği soruları getir
 */
export async function getLikedQuestionsByUserId(kullaniciId: number): Promise<any[]> {
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
        s.kategori_id,
        sb.tarih AS begeni_tarihi
      FROM dbo.SoruBegeniler sb
      INNER JOIN dbo.Sorular s ON sb.soru_id = s.soru_id
      WHERE sb.kullanici_id = @kullanici_id
      ORDER BY sb.tarih DESC
    `);

  return result.recordset.map((row: any) => ({
    soru_id: row.soru_id,
    baslik: row.baslik,
    soru_metin: row.soru_metin,
    tarih: row.tarih,
    kategori_id: row.kategori_id,
    begeni_tarihi: row.begeni_tarihi,
  }));
}

/**
 * Kullanıcının beğendiği cevapları getir
 */
export async function getLikedAnswersByUserId(kullaniciId: number): Promise<any[]> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('kullanici_id', sql.Int, kullaniciId)
    .query(`
      SELECT 
        c.cevap_id,
        c.cevap_metin,
        c.tarih,
        c.soru_id,
        cb.tarih AS begeni_tarihi
      FROM dbo.CevapBegeniler cb
      INNER JOIN dbo.Cevaplar c ON cb.cevap_id = c.cevap_id
      WHERE cb.kullanici_id = @kullanici_id
      ORDER BY cb.tarih DESC
    `);

  return result.recordset.map((row: any) => ({
    cevap_id: row.cevap_id,
    cevap_metin: row.cevap_metin,
    tarih: row.tarih,
    soru_id: row.soru_id,
    begeni_tarihi: row.begeni_tarihi,
  }));
}

