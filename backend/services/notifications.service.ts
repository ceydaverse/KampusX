import { getPool, sql } from '../db';
import { getIO } from '../socket/realtime';

export interface Notification {
  bildirim_id: number;
  kullanici_id: number;
  soru_id?: number | null;
  cevap_id?: number | null;
  mesaj: string;
  tip: string;
  tarih: Date;
  okundu: boolean;
  okundu_tarih?: Date | null;
  actor?: {
    id: number;
    username?: string;
    ad?: string;
    soyad?: string;
  };
}

/**
 * Bildirim oluştur ve Socket.IO ile gerçek zamanlı gönder
 * 
 * @param payload Bildirim bilgileri
 * @returns Oluşturulan bildirim kaydı (bildirim_id, kullanici_id, mesaj, tip, tarih, okundu, soru_id, cevap_id)
 */
export async function createNotification(payload: {
  kullanici_id: number;
  soru_id?: number | null;
  cevap_id?: number | null;
  mesaj: string;
  tip: string;
}): Promise<Notification> {
  const pool = await getPool();

  try {
    // DB'ye INSERT at (okundu=0 default)
    const result = await pool
      .request()
      .input('kullanici_id', sql.Int, payload.kullanici_id)
      .input('soru_id', sql.Int, payload.soru_id || null)
      .input('cevap_id', sql.Int, payload.cevap_id || null)
      .input('mesaj', sql.NVarChar(sql.MAX), payload.mesaj)
      .input('tip', sql.NVarChar(50), payload.tip)
      .query(`
        INSERT INTO dbo.Bildirimler (kullanici_id, soru_id, cevap_id, mesaj, tip, tarih, okundu)
        OUTPUT INSERTED.bildirim_id, INSERTED.kullanici_id, INSERTED.soru_id, INSERTED.cevap_id, 
               INSERTED.mesaj, INSERTED.tip, INSERTED.tarih, INSERTED.okundu
        VALUES (@kullanici_id, @soru_id, @cevap_id, @mesaj, @tip, GETDATE(), 0)
      `);

    const row = result.recordset[0];
    const createdNotification: Notification = {
      bildirim_id: row.bildirim_id,
      kullanici_id: row.kullanici_id,
      soru_id: row.soru_id,
      cevap_id: row.cevap_id,
      mesaj: row.mesaj,
      tip: row.tip,
      tarih: row.tarih,
      okundu: row.okundu === 1,
      okundu_tarih: null,
    };

    // Socket.IO ile gerçek zamanlı gönder (güvenli: try/catch ile)
    try {
      const io = getIO();
      if (io) {
        io.to(`user-${payload.kullanici_id}`).emit('notification:new', createdNotification);
        console.log(`✅ Notification emitted via Socket.IO to user-${payload.kullanici_id}:`, createdNotification.bildirim_id);
      } else {
        console.warn('⚠️ Socket.IO instance not available, notification not emitted');
      }
    } catch (socketErr: any) {
      // Socket emit hatası server'ı crash etmesin
      console.error('❌ Socket emit error (notification still saved):', socketErr?.message);
    }

    return createdNotification;
  } catch (err: any) {
    console.error('❌ createNotification error:', {
      message: err?.message,
      originalError: err?.originalError?.message,
      code: err?.code,
    });
    throw err;
  }
}

/**
 * Kullanıcının bildirimlerini getir
 */
export async function getNotificationsByUserId(
  userId: number,
  options?: { limit?: number; onlyUnread?: boolean }
): Promise<Notification[]> {
  const pool = await getPool();

  const limit = options?.limit || 30;
  const onlyUnread = options?.onlyUnread || false;

  let query = `
    SELECT 
      b.bildirim_id,
      b.kullanici_id,
      b.soru_id,
      b.cevap_id,
      b.mesaj,
      b.tip,
      b.tarih,
      b.okundu,
      b.okundu_tarih,
      k.kullanici_id AS actor_id,
      k.kullanici_adi AS actor_username,
      k.ad AS actor_ad,
      k.soyad AS actor_soyad
    FROM dbo.Bildirimler b
    LEFT JOIN dbo.Kullanicilar k ON (
      (b.tip = 'cevap' AND k.kullanici_id IN (
        SELECT c.kullanici_id FROM dbo.Cevaplar c WHERE c.cevap_id = b.cevap_id
      ))
      OR (b.tip = 'soru_begeni' AND k.kullanici_id IN (
        SELECT sb.kullanici_id FROM dbo.SoruBegeniler sb 
        WHERE sb.soru_id = b.soru_id AND sb.kullanici_id != b.kullanici_id
        ORDER BY sb.tarih DESC
      ))
      OR (b.tip = 'cevap_begeni' AND k.kullanici_id IN (
        SELECT cb.kullanici_id FROM dbo.CevapBegeniler cb 
        WHERE cb.cevap_id = b.cevap_id AND cb.kullanici_id != b.kullanici_id
        ORDER BY cb.tarih DESC
      ))
      OR (b.tip = 'mesaj' AND k.kullanici_id IN (
        SELECT m.gonderen_id FROM dbo.Mesajlasma m 
        WHERE m.alici_id = b.kullanici_id
        ORDER BY m.tarih DESC
      ))
    )
    WHERE b.kullanici_id = @userId
  `;

  if (onlyUnread) {
    query += ` AND b.okundu = 0`;
  }

  query += ` ORDER BY b.tarih DESC`;

  if (limit > 0) {
    query += ` OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY`;
  }

  const request = pool
    .request()
    .input('userId', sql.Int, userId);

  if (limit > 0) {
    request.input('limit', sql.Int, limit);
  }

  const result = await request.query(query);

  return result.recordset.map((row: any) => ({
    bildirim_id: row.bildirim_id,
    kullanici_id: row.kullanici_id,
    soru_id: row.soru_id,
    cevap_id: row.cevap_id,
    mesaj: row.mesaj,
    tip: row.tip,
    tarih: row.tarih,
    okundu: row.okundu === 1,
    okundu_tarih: row.okundu_tarih || null,
    actor: row.actor_id
      ? {
          id: row.actor_id,
          username: row.actor_username || null,
          ad: row.actor_ad || null,
          soyad: row.actor_soyad || null,
        }
      : undefined,
  })) as Notification[];
}

/**
 * Okunmamış bildirim sayısını getir
 */
export async function getUnreadCount(userId: number): Promise<number> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('userId', sql.Int, userId)
    .query(`
      SELECT COUNT(*) AS count
      FROM dbo.Bildirimler
      WHERE kullanici_id = @userId AND okundu = 0
    `);

  return Number(result.recordset[0].count) || 0;
}

/**
 * Bildirimi okundu yap
 */
export async function markNotificationAsRead(
  notificationId: number,
  userId: number
): Promise<boolean> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('bildirim_id', sql.Int, notificationId)
    .input('kullanici_id', sql.Int, userId)
    .query(`
      UPDATE dbo.Bildirimler
      SET okundu = 1, okundu_tarih = GETDATE()
      WHERE bildirim_id = @bildirim_id AND kullanici_id = @kullanici_id
    `);

  return result.rowsAffected[0] > 0;
}

/**
 * Tüm bildirimleri okundu yap
 */
export async function markAllNotificationsAsRead(userId: number): Promise<number> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('kullanici_id', sql.Int, userId)
    .query(`
      UPDATE dbo.Bildirimler
      SET okundu = 1, okundu_tarih = GETDATE()
      WHERE kullanici_id = @kullanici_id AND okundu = 0
    `);

  return result.rowsAffected[0] || 0;
}

/**
 * Soru sahibini getir
 */
export async function getQuestionOwnerId(soruId: number): Promise<number | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('soru_id', sql.Int, soruId)
    .query(`
      SELECT kullanici_id FROM dbo.Sorular WHERE soru_id = @soru_id
    `);

  if (result.recordset.length === 0) {
    return null;
  }

  return result.recordset[0].kullanici_id;
}

/**
 * Cevap sahibini getir
 */
export async function getAnswerOwnerId(cevapId: number): Promise<number | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('cevap_id', sql.Int, cevapId)
    .query(`
      SELECT kullanici_id FROM dbo.Cevaplar WHERE cevap_id = @cevap_id
    `);

  if (result.recordset.length === 0) {
    return null;
  }

  return result.recordset[0].kullanici_id;
}

/**
 * Kullanıcı adını getir
 */
export async function getUserDisplayName(userId: number): Promise<string> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('kullanici_id', sql.Int, userId)
    .query(`
      SELECT 
        COALESCE(kullanici_adi, ad + ' ' + soyad, 'Kullanıcı ' + CAST(kullanici_id AS VARCHAR)) AS display_name
      FROM dbo.Kullanicilar
      WHERE kullanici_id = @kullanici_id
    `);

  if (result.recordset.length === 0) {
    return 'Kullanıcı';
  }

  return result.recordset[0].display_name || 'Kullanıcı';
}




