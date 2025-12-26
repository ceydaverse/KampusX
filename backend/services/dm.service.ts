import { getPool, sql } from '../db';
import { createNotification, getUserDisplayName } from './notifications.service';

/**
 * Mesajlasma tablosu kolon adları (sabit - DB gerçeğine göre)
 * DB Kolonları:
 * - mesaj_id
 * - oda_id (mesajlasma_id değil!)
 * - gonderen_kullanici (gonderen_id değil!)
 * - mesaj
 * - gonderim_tarihi (veya tarih)
 * - okundu
 * - tarih
 * - alici_id YOK (oda tablosundan bulunmalı)
 */
const MESAJLASMA_COLS = {
  mesaj_id: 'mesaj_id',
  oda_id: 'oda_id',  // mesajlasma_id değil!
  gonderen_kullanici: 'gonderen_kullanici',  // gonderen_id değil!
  mesaj: 'mesaj',
  tarih: 'tarih',  // veya gonderim_tarihi
  okundu: 'okundu',
};

/**
 * İki kullanıcı arasındaki oda ID'sini bul veya oluştur
 * Tablo: dbo.Mesaj_Oda (Mesajlasma_Oda değil)
 * Kolonlar: oda_id, kullanici1_id, kullanici2_id (muhtemelen)
 */
async function getOrCreateRoomId(userId1: number, userId2: number): Promise<number> {
  const pool = await getPool();
  
  // a = min, b = max (tutarlılık için)
  const a = Math.min(userId1, userId2);
  const b = Math.max(userId1, userId2);

  console.log('[DM][ROOM] getOrCreateRoomId:', { 
    table: 'dbo.Mesaj_Oda', 
    k1: userId1, 
    k2: userId2, 
    a, 
    b 
  });

  try {
    // Önce tablo kolonlarını INFORMATION_SCHEMA'dan oku (dbo.Mesaj_Oda)
    const schemaResult = await pool
      .request()
      .query(`
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Mesaj_Oda'
        ORDER BY ORDINAL_POSITION
      `);

    const columns = schemaResult.recordset.map((row: any) => row.COLUMN_NAME);
    console.log('[DM][ROOM] Mesaj_Oda kolonları:', columns);
    
    // Oda ID kolonunu bul (oda_id, mesajlasma_id, id gibi)
    const roomIdCol = columns.find((col: string) => {
      const colLower = col.toLowerCase();
      return colLower === 'oda_id' || 
             colLower.includes('mesajlasma_id') || 
             colLower === 'id' ||
             colLower.includes('room_id');
    }) || 'oda_id'; // Fallback: oda_id
    
    // Kullanıcı kolonlarını bul
    const user1Col = columns.find((col: string) => {
      const colLower = col.toLowerCase();
      return colLower === 'kullanici1_id' || 
             colLower.includes('user1') || 
             colLower === 'kullanici_1_id';
    }) || 'kullanici1_id'; // Fallback

    const user2Col = columns.find((col: string) => {
      const colLower = col.toLowerCase();
      return colLower === 'kullanici2_id' || 
             colLower.includes('user2') || 
             colLower === 'kullanici_2_id';
    }) || 'kullanici2_id'; // Fallback

    console.log('[DM][ROOM] Kullanılan kolonlar:', { roomIdCol, user1Col, user2Col });

    // Oda var mı kontrol et
    const findResult = await pool
      .request()
      .input('a', sql.Int, a)
      .input('b', sql.Int, b)
      .query(`
        SELECT [${roomIdCol}] AS roomId
        FROM dbo.Mesaj_Oda
        WHERE [${user1Col}] = @a AND [${user2Col}] = @b
      `);

    if (findResult.recordset.length > 0) {
      const roomId = findResult.recordset[0].roomId;
      console.log('[DM][ROOM] Oda bulundu:', roomId);
      return roomId;
    }

    // Oda yoksa oluştur
    const createResult = await pool
      .request()
      .input('a', sql.Int, a)
      .input('b', sql.Int, b)
      .query(`
        INSERT INTO dbo.Mesaj_Oda ([${user1Col}], [${user2Col}])
        OUTPUT INSERTED.[${roomIdCol}] AS roomId
        VALUES (@a, @b)
      `);

    if (createResult.recordset.length === 0) {
      throw new Error('Oda oluşturulamadı');
    }

    const roomId = createResult.recordset[0].roomId;
    console.log('[DM][ROOM] Oda oluşturuldu:', roomId);
    return roomId;

  } catch (err: any) {
    const errorMsg = err?.message || err?.originalError?.message || 'Bilinmeyen hata';
    console.error('[DM][SQL] getOrCreateRoomId ERROR:', {
      message: errorMsg,
      number: err?.originalError?.number,
      code: err?.code || err?.originalError?.code,
      proc: err?.originalError?.procName,
      line: err?.originalError?.lineNumber,
      serverName: err?.originalError?.serverName,
      stack: err?.stack,
      sqlError: err?.originalError?.message,
    });
    throw new Error(`Oda ID alınamadı: ${errorMsg}`);
  }
}

export interface Conversation {
  conversation_id: number;
  user_id: number;
  user_name: string;
  last_message?: string;
  last_message_time?: Date;
  unreadCount: number;
  isBlocked?: boolean;
  isMuted?: boolean;
}

// Yeni response formatı
export interface ConversationResponse {
  mesajlasmaId: number;
  otherUserId: number;
  otherUserName: string;
  lastMessageText: string | null;
  lastMessageAt: string | null;
}

export interface DirectMessage {
  mesaj_id: number;
  gonderen_id: number;
  alici_id: number;
  mesaj: string;
  tarih: Date;
  okundu_by_sender?: boolean;
  okundu_by_receiver?: boolean;
}

/**
 * Kullanıcının konuşmalarını getir
 * Mesaj_Oda tablosundan odaları bulur, her oda için karşı kullanıcıyı ve son mesajı getirir
 * 
 * SQL Mantığı:
 * 1. Mesaj_Oda tablosundan kullanıcının dahil olduğu odaları getir (WHERE kullanici1_id = @me OR kullanici2_id = @me)
 * 2. Karşı tarafı hesapla: CASE WHEN kullanici1_id = @me THEN kullanici2_id ELSE kullanici1_id END
 * 3. Her oda için Mesajlasma tablosundan SON mesajı OUTER APPLY ile al
 * 4. otherUserId ile dbo.Kullanicilar tablosuna JOIN yap
 * 5. Sonuçları son mesaj tarihine göre DESC sırala
 */
export async function getConversations(currentUserId: number): Promise<ConversationResponse[]> {
  const pool = await getPool();

  try {
    // Mesaj_Oda tablosunun ID kolonunu keşfet (oda_id mi mesajlasma_id mi?)
    const schemaCheck = await pool
      .request()
      .query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Mesaj_Oda'
        ORDER BY ORDINAL_POSITION
      `);
    
    const columns = schemaCheck.recordset.map((row: any) => row.COLUMN_NAME.toLowerCase());
    const roomIdCol = columns.find((col: string) => 
      col === 'oda_id' || col.includes('mesajlasma_id') || col === 'id'
    ) || 'oda_id'; // Fallback

    const result = await pool
      .request()
      .input('me', sql.Int, currentUserId)
      .query(`
        SELECT 
          mo.[${roomIdCol}] AS mesajlasmaId,
          -- Karşı tarafı hesapla
          CASE 
            WHEN mo.kullanici1_id = @me THEN mo.kullanici2_id
            ELSE mo.kullanici1_id
          END AS otherUserId,
          -- Kullanıcı bilgisi (ad + soyad veya kullanici_adi)
          COALESCE(
            k.kullanici_adi,
            k.ad + ' ' + k.soyad,
            'Kullanıcı ' + CAST(
              CASE 
                WHEN mo.kullanici1_id = @me THEN mo.kullanici2_id
                ELSE mo.kullanici1_id
              END AS VARCHAR
            )
          ) AS otherUserName,
          -- aktif alias (silindi kolonuna göre)
          CAST(CASE WHEN k.silindi = 0 THEN 1 ELSE 0 END AS bit) AS aktif,
          -- Son mesaj (OUTER APPLY ile - mesaj yoksa NULL)
          lm.mesaj AS lastMessageText,
          -- Son mesaj tarihi
          lm.tarih AS lastMessageAt
        FROM dbo.Mesaj_Oda mo
        -- Karşı taraf bilgisini getir
        INNER JOIN dbo.Kullanicilar k ON k.kullanici_id = CASE 
          WHEN mo.kullanici1_id = @me THEN mo.kullanici2_id
          ELSE mo.kullanici1_id
        END
          AND k.silindi = 0
        -- Her oda için son mesajı al (OUTER APPLY - mesaj yoksa bile oda listelensin)
        OUTER APPLY (
          SELECT TOP 1
            last_mesaj.${MESAJLASMA_COLS.mesaj} AS mesaj,
            last_mesaj.${MESAJLASMA_COLS.tarih} AS tarih,
            last_mesaj.${MESAJLASMA_COLS.gonderen_kullanici} AS gonderen_id
          FROM dbo.Mesajlasma last_mesaj
          WHERE last_mesaj.${MESAJLASMA_COLS.oda_id} = mo.[${roomIdCol}]
          ORDER BY last_mesaj.${MESAJLASMA_COLS.tarih} DESC
        ) AS lm
        WHERE mo.kullanici1_id = @me OR mo.kullanici2_id = @me
        -- Son mesaj tarihine göre DESC sırala (tarih NULL olanlar en sonda)
        ORDER BY lm.tarih DESC, mo.[${roomIdCol}] DESC
      `);

    return result.recordset.map((row: any) => ({
      mesajlasmaId: Number(row.mesajlasmaId),
      otherUserId: Number(row.otherUserId),
      otherUserName: String(row.otherUserName || 'Kullanıcı'),
      lastMessageText: row.lastMessageText || null,
      lastMessageAt: row.lastMessageAt ? new Date(row.lastMessageAt).toISOString() : null,
    })) as ConversationResponse[];
  } catch (err: any) {
    console.error('[DM][SQL ERROR] getConversations:', {
      message: err?.message,
      number: err?.originalError?.number,
      code: err?.code || err?.originalError?.code,
      proc: err?.originalError?.procName,
      line: err?.originalError?.lineNumber,
      serverName: err?.originalError?.serverName,
      originalError: err?.originalError?.message,
      stack: err?.stack,
    });
    
    // Hata durumunda boş array dön (frontend çökmesin)
    return [];
  }
}

/**
 * İki kullanıcı arasındaki mesajları getir
 * 
 * SQL Mantığı:
 * 1. Mesaj_Oda tablosunda iki kullanıcı arasındaki odayı bul (TOP 1)
 * 2. Oda yoksa boş array dön
 * 3. Oda varsa Mesajlasma tablosundan odaya ait mesajları getir
 */
export async function getMessages(
  currentUserId: number,
  withUserId: number
): Promise<{ mesajlasmaId: number | null; items: DirectMessage[] }> {
  const pool = await getPool();

  try {
    // Mesaj_Oda tablosunda odayı bul
    // Önce kolon adlarını keşfet (oda_id mi mesajlasma_id mi?)
    const schemaCheck = await pool
      .request()
      .query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Mesaj_Oda'
        ORDER BY ORDINAL_POSITION
      `);
    
    const columns = schemaCheck.recordset.map((row: any) => row.COLUMN_NAME.toLowerCase());
    const roomIdCol = columns.find((col: string) => 
      col === 'oda_id' || col.includes('mesajlasma_id') || col === 'id'
    ) || 'oda_id'; // Fallback

    const roomResult = await pool
      .request()
      .input('me', sql.Int, currentUserId)
      .input('other', sql.Int, withUserId)
      .query(`
        SELECT TOP 1 [${roomIdCol}] AS mesajlasmaId
        FROM dbo.Mesaj_Oda
        WHERE (kullanici1_id = @me AND kullanici2_id = @other)
           OR (kullanici1_id = @other AND kullanici2_id = @me)
      `);

    // Oda yoksa boş array dön
    if (roomResult.recordset.length === 0 || !roomResult.recordset[0].mesajlasmaId) {
      return {
        mesajlasmaId: null,
        items: [],
      };
    }

    const mesajlasmaId = Number(roomResult.recordset[0].mesajlasmaId);

    // Odaya ait mesajları getir - sabit kolon adları kullan
    const messagesResult = await pool
      .request()
      .input('oda_id', sql.Int, mesajlasmaId)
      .query(`
        SELECT 
          ${MESAJLASMA_COLS.mesaj_id} AS mesaj_id,
          ${MESAJLASMA_COLS.oda_id} AS mesajlasma_id,
          ${MESAJLASMA_COLS.gonderen_kullanici} AS gonderen_id,
          NULL AS alici_id,
          ${MESAJLASMA_COLS.mesaj} AS mesaj,
          ${MESAJLASMA_COLS.tarih} AS tarih,
          ${MESAJLASMA_COLS.okundu} AS okundu
        FROM dbo.Mesajlasma
        WHERE ${MESAJLASMA_COLS.oda_id} = @oda_id
        ORDER BY ${MESAJLASMA_COLS.tarih} ASC
      `);

    const items = messagesResult.recordset.map((row: any) => ({
      mesaj_id: Number(row.mesaj_id),
      gonderen_id: Number(row.gonderen_id),
      alici_id: row.alici_id ? Number(row.alici_id) : null,
      mesaj: String(row.mesaj || ''),
      tarih: row.tarih,
      okundu_by_sender: row.gonderen_id === currentUserId ? (row.okundu === 1 || row.okundu === true) : undefined,
      okundu_by_receiver: row.gonderen_id !== currentUserId ? (row.okundu === 1 || row.okundu === true) : undefined,  // alici_id yok, gonderen_id != currentUserId kontrol et
    })) as DirectMessage[];

    return {
      mesajlasmaId,
      items,
    };
  } catch (err: any) {
    console.error('[DM][SQL ERROR] getMessages:', {
      message: err?.message,
      number: err?.originalError?.number,
      code: err?.code || err?.originalError?.code,
      proc: err?.originalError?.procName,
      line: err?.originalError?.lineNumber,
      serverName: err?.originalError?.serverName,
      originalError: err?.originalError?.message,
      stack: err?.stack,
      currentUserId,
      withUserId,
    });
    
    // Hata durumunda boş array dön (500 dönmesin)
    return {
      mesajlasmaId: null,
      items: [],
    };
  }
}

/**
 * Mesaj gönder
 */
export async function sendMessage(
  currentUserId: number,
  toUserId: number,
  text: string
): Promise<DirectMessage> {
  const pool = await getPool();

  // Engelleme kontrolü (TRY/CATCH ile - tablo yoksa veya aktif kolonu yoksa devam et)
  try {
    const blockCheck = await pool
      .request()
      .input('engelleyen_id', sql.Int, currentUserId)
      .input('engellenen_id', sql.Int, toUserId)
      .query(`
        SELECT engel_id FROM dbo.Kullanici_Engel
        WHERE engelleyen_id = @engelleyen_id 
          AND engellenen_id = @engellenen_id
      `);

    if (blockCheck.recordset.length > 0) {
      throw new Error('Kullanıcı engelli');
    }
  } catch (err: any) {
    // Eğer hata "Invalid object name" içeriyorsa, engel kontrolünü atla
    const errorMessage = err?.message || err?.originalError?.message || '';
    if (
      (errorMessage.includes('Invalid object name') && errorMessage.includes('Kullanici_Engel')) ||
      errorMessage.includes("Invalid column name 'aktif'")
    ) {
      console.warn('Kullanici_Engel table/aktif column missing, skipping block check');
      // Engel kontrolü yokmuş gibi devam et
    } else if (errorMessage.includes('Kullanıcı engelli')) {
      // Bu bizim fırlattığımız hata, yukarı fırlat
      throw err;
    } else {
      // Diğer hatalar için engel kontrolünü atla (tablo/kolon yoksa)
      console.warn('Engel kontrolü atlandı (tablo/kolon mevcut değil):', errorMessage);
    }
  }

  // Karşı tarafın engelleme kontrolü (TRY/CATCH ile - tablo yoksa veya aktif kolonu yoksa devam et)
  try {
    const reverseBlockCheck = await pool
      .request()
      .input('engelleyen_id', sql.Int, toUserId)
      .input('engellenen_id', sql.Int, currentUserId)
      .query(`
        SELECT engel_id FROM dbo.Kullanici_Engel
        WHERE engelleyen_id = @engelleyen_id 
          AND engellenen_id = @engellenen_id
      `);

    if (reverseBlockCheck.recordset.length > 0) {
      throw new Error('Bu kullanıcıya mesaj gönderemezsiniz');
    }
  } catch (err: any) {
    // Eğer hata "Invalid object name" içeriyorsa, engel kontrolünü atla
    const errorMessage = err?.message || err?.originalError?.message || '';
    if (
      (errorMessage.includes('Invalid object name') && errorMessage.includes('Kullanici_Engel')) ||
      errorMessage.includes("Invalid column name 'aktif'")
    ) {
      console.warn('Kullanici_Engel table/aktif column missing, skipping reverse block check');
      // Engel kontrolü yokmuş gibi devam et
    } else if (errorMessage.includes('Bu kullanıcıya mesaj gönderemezsiniz')) {
      // Bu bizim fırlattığımız hata, yukarı fırlat
      throw err;
    } else {
      // Diğer hatalar için engel kontrolünü atla (tablo/kolon yoksa)
      console.warn('Reverse engel kontrolü atlandı (tablo/kolon mevcut değil):', errorMessage);
    }
  }

  // Oda ID'sini bul veya oluştur
  let roomId: number;
  try {
    roomId = await getOrCreateRoomId(currentUserId, toUserId);
  } catch (err: any) {
    console.error('❌ sendMessage - Room ID alınamadı:', err);
    throw new Error(`Mesaj gönderilemedi: Oda oluşturulamadı - ${err?.message || 'Bilinmeyen hata'}`);
  }

  // roomId'yi return edilecek mesaj objesine ekle (socket emit için)
  const messageWithRoomId = { roomId };

  // Mesajı ekle - sabit kolon adları kullan (alici_id YOK, oda tablosundan bulunmalı)
  const insertQuery = `
    INSERT INTO dbo.Mesajlasma (
      ${MESAJLASMA_COLS.oda_id},
      ${MESAJLASMA_COLS.gonderen_kullanici},
      ${MESAJLASMA_COLS.mesaj},
      ${MESAJLASMA_COLS.tarih}
    )
    OUTPUT 
      INSERTED.${MESAJLASMA_COLS.mesaj_id} AS mesaj_id,
      INSERTED.${MESAJLASMA_COLS.gonderen_kullanici} AS gonderen_id,
      INSERTED.${MESAJLASMA_COLS.mesaj} AS mesaj,
      INSERTED.${MESAJLASMA_COLS.tarih} AS tarih
    VALUES (
      @oda_id,
      @gonderen_kullanici,
      @mesaj,
      GETDATE()
    )
  `;

  const request = pool
    .request()
    .input('oda_id', sql.Int, roomId)
    .input('gonderen_kullanici', sql.Int, currentUserId)
    .input('mesaj', sql.NVarChar(sql.MAX), text.trim());

  let result;
  try {
    result = await request.query(insertQuery);
  } catch (err: any) {
    console.error('[DM][POST /messages][SQL ERROR] INSERT Mesajlasma:', {
      message: err?.message,
      number: err?.originalError?.number,
      code: err?.code || err?.originalError?.code,
      proc: err?.originalError?.procName,
      line: err?.originalError?.lineNumber,
      serverName: err?.originalError?.serverName,
      query: insertQuery.substring(0, 200),
    });
    throw err;
  }

  if (result.recordset.length === 0) {
    throw new Error('Mesaj gönderilemedi');
  }

  const row = result.recordset[0];

  // Bildirim oluştur (alıcıya) - tip: "dm"
  try {
    const actorName = await getUserDisplayName(currentUserId);
    await createNotification({
      kullanici_id: toUserId,
      soru_id: null,
      cevap_id: null,
      mesaj: `${actorName} sana mesaj gönderdi`,
      tip: 'dm',
    });
  } catch (err: any) {
    // Bildirim hatası mesaj gönderimini engellemez
    console.error('❌ DM bildirim oluşturulurken hata (mesaj yine de gönderildi):', err?.message);
  }

  // OUTPUT'tan dönen kolonları oku (AS alias kullanıldığı için direkt alias adları ile okunabilir)
  const messageResult: any = {
    mesaj_id: row.mesaj_id,
    gonderen_id: row.gonderen_id,
    alici_id: toUserId,  // alici_id kolonu yok, toUserId kullan
    mesaj: row.mesaj,
    tarih: row.tarih,
    okundu_by_sender: true, // Gönderen mesajı gönderdiği için okundu sayılır
    okundu_by_receiver: false,
    roomId, // Socket emit için
    mesajlasma_id: roomId, // Alternatif alan adı
  };
  
  return messageResult;
}

/**
 * Mesajları okundu işaretle
 * 
 * Body'de { mesajlasmaId } veya { withUserId } gelebilir
 * Eğer withUserId geldiyse önce odaId'yi Mesaj_Oda'dan bul
 * Sonra okundu güncelle: UPDATE dbo.Mesajlasma SET okundu=1 WHERE oda_id=@odaId AND gonderen_kullanici!=@me AND okundu=0
 * Not: alici_id kolonu yok, sadece gonderen_kullanici != @me ile filtrele
 */
export async function markMessagesAsRead(
  currentUserId: number,
  mesajlasmaId?: number | null,
  withUserId?: number | null
): Promise<void> {
  const pool = await getPool();

  try {
    let odaId: number | null = null;

    // Eğer mesajlasmaId gelmişse direkt kullan
    if (mesajlasmaId) {
      odaId = Number(mesajlasmaId);
    } 
      // Eğer withUserId gelmişse önce odaId'yi bul
      else if (withUserId) {
      // Kolon adını keşfet
      const schemaCheck = await pool
        .request()
        .query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Mesaj_Oda'
          ORDER BY ORDINAL_POSITION
        `);
      
      const columns = schemaCheck.recordset.map((row: any) => row.COLUMN_NAME.toLowerCase());
      const roomIdCol = columns.find((col: string) => 
        col === 'oda_id' || col.includes('mesajlasma_id') || col === 'id'
      ) || 'oda_id'; // Fallback

      const roomResult = await pool
        .request()
        .input('me', sql.Int, currentUserId)
        .input('other', sql.Int, Number(withUserId))
        .query(`
          SELECT TOP 1 [${roomIdCol}] AS odaId
          FROM dbo.Mesaj_Oda
          WHERE (kullanici1_id = @me AND kullanici2_id = @other)
             OR (kullanici1_id = @other AND kullanici2_id = @me)
        `);

      if (roomResult.recordset.length === 0 || !roomResult.recordset[0].odaId) {
        // Oda yoksa işlem yapılacak bir şey yok
        console.log(`⚠️ markMessagesAsRead - Room not found for users: ${currentUserId} <-> ${withUserId}`);
        return;
      }

      odaId = Number(roomResult.recordset[0].odaId);
    } else {
      // Hiçbiri verilmemişse hata
      throw new Error('mesajlasmaId veya withUserId zorunludur');
    }

    if (!odaId || Number.isNaN(odaId)) {
      console.warn(`⚠️ markMessagesAsRead - Invalid odaId: ${odaId}`);
      return;
    }

    // Okundu güncelle - sabit kolon adları kullan (alici_id yok, sadece oda_id ile filtrele)
    const updateQuery = `
      UPDATE dbo.Mesajlasma
      SET ${MESAJLASMA_COLS.okundu} = 1
      WHERE ${MESAJLASMA_COLS.oda_id} = @oda_id
        AND ${MESAJLASMA_COLS.gonderen_kullanici} != @me  -- Gönderen kendisi değilse
        AND ${MESAJLASMA_COLS.okundu} = 0
    `;

    const updateResult = await pool
      .request()
      .input('oda_id', sql.Int, odaId)
      .input('me', sql.Int, currentUserId)
      .query(updateQuery);

    const updatedCount = updateResult.rowsAffected[0] || 0;
    console.log(`✅ markMessagesAsRead - Updated ${updatedCount} messages as read (odaId: ${odaId}, me: ${currentUserId})`);
  } catch (err: any) {
    console.error('❌ markMessagesAsRead - SQL Error:', {
      message: err?.message,
      originalError: err?.originalError?.message,
      code: err?.code,
      sqlState: err?.sqlState,
      sqlMessage: err?.sqlMessage,
      stack: err?.stack,
      currentUserId,
      mesajlasmaId,
      withUserId,
    });
    throw err;
  }
}

/**
 * Kullanıcıyı sessize al
 */
export async function muteUser(
  currentUserId: number,
  targetUserId: number,
  until?: Date | null
): Promise<void> {
  const pool = await getPool();

  // Mevcut kaydı kontrol et
  const existing = await pool
    .request()
    .input('kullanici_id', sql.Int, currentUserId)
    .input('hedef_kullanici_id', sql.Int, targetUserId)
    .query(`
      SELECT sessize_id FROM dbo.Kullanici_SessizeAlinan
      WHERE kullanici_id = @kullanici_id AND hedef_kullanici_id = @hedef_kullanici_id
    `);

  if (existing.recordset.length > 0) {
    // Güncelle
    await pool
      .request()
      .input('kullanici_id', sql.Int, currentUserId)
      .input('hedef_kullanici_id', sql.Int, targetUserId)
      .input('bitis_tarih', sql.DateTime, until || null)
      .query(`
        UPDATE dbo.Kullanici_SessizeAlinan
        SET bitis_tarih = @bitis_tarih,
            aktif = 1,
            baslangic_tarih = GETDATE()
        WHERE kullanici_id = @kullanici_id AND hedef_kullanici_id = @hedef_kullanici_id
      `);
  } else {
    // Yeni kayıt ekle
    await pool
      .request()
      .input('kullanici_id', sql.Int, currentUserId)
      .input('hedef_kullanici_id', sql.Int, targetUserId)
      .input('bitis_tarih', sql.DateTime, until || null)
      .query(`
        INSERT INTO dbo.Kullanici_SessizeAlinan (kullanici_id, hedef_kullanici_id, baslangic_tarih, bitis_tarih, aktif)
        VALUES (@kullanici_id, @hedef_kullanici_id, GETDATE(), @bitis_tarih, 1)
      `);
  }
}

/**
 * Sessize almayı kaldır
 */
export async function unmuteUser(
  currentUserId: number,
  targetUserId: number
): Promise<void> {
  const pool = await getPool();

  await pool
    .request()
    .input('kullanici_id', sql.Int, currentUserId)
    .input('hedef_kullanici_id', sql.Int, targetUserId)
    .query(`
      UPDATE dbo.Kullanici_SessizeAlinan
      SET aktif = 0
      WHERE kullanici_id = @kullanici_id AND hedef_kullanici_id = @hedef_kullanici_id
    `);
}

/**
 * Kullanıcıyı engelle
 */
export async function blockUser(
  currentUserId: number,
  targetUserId: number
): Promise<void> {
  const pool = await getPool();

  // Mevcut kaydı kontrol et
  const existing = await pool
    .request()
    .input('engelleyen_id', sql.Int, currentUserId)
    .input('engellenen_id', sql.Int, targetUserId)
    .query(`
      SELECT engel_id FROM dbo.Kullanici_Engel
      WHERE engelleyen_id = @engelleyen_id AND engellenen_id = @engellenen_id
    `);

  if (existing.recordset.length > 0) {
    // Mevcut kaydı güncelle (aktif kolonu yoksa sadece tarih güncelle)
    await pool
      .request()
      .input('engelleyen_id', sql.Int, currentUserId)
      .input('engellenen_id', sql.Int, targetUserId)
      .query(`
        UPDATE dbo.Kullanici_Engel
        SET tarih = GETDATE()
        WHERE engelleyen_id = @engelleyen_id AND engellenen_id = @engellenen_id
      `);
  } else {
    // Yeni kayıt ekle (aktif kolonu yoksa sadece zorunlu kolonları ekle)
    try {
      await pool
        .request()
        .input('engelleyen_id', sql.Int, currentUserId)
        .input('engellenen_id', sql.Int, targetUserId)
        .query(`
          INSERT INTO dbo.Kullanici_Engel (engelleyen_id, engellenen_id, tarih)
          VALUES (@engelleyen_id, @engellenen_id, GETDATE())
        `);
    } catch (err: any) {
      // aktif kolonu varsa onu da ekle (INSERT hatası alınırsa)
      const errorMessage = err?.message || err?.originalError?.message || '';
      if (errorMessage.includes('column') || errorMessage.includes('NULL')) {
        // Kolon eksik hatası alındıysa aktif kolonu da ekle
        await pool
          .request()
          .input('engelleyen_id', sql.Int, currentUserId)
          .input('engellenen_id', sql.Int, targetUserId)
          .query(`
            INSERT INTO dbo.Kullanici_Engel (engelleyen_id, engellenen_id, tarih, aktif)
            VALUES (@engelleyen_id, @engellenen_id, GETDATE(), 1)
          `);
      } else {
        throw err;
      }
    }
  }
}

/**
 * Engeli kaldır
 */
export async function unblockUser(
  currentUserId: number,
  targetUserId: number
): Promise<void> {
  const pool = await getPool();

  // aktif kolonu yoksa kaydı sil
  await pool
    .request()
    .input('engelleyen_id', sql.Int, currentUserId)
    .input('engellenen_id', sql.Int, targetUserId)
    .query(`
      DELETE FROM dbo.Kullanici_Engel
      WHERE engelleyen_id = @engelleyen_id AND engellenen_id = @engellenen_id
    `);
}

/**
 * Engelleme durumunu kontrol et
 */
export async function isBlocked(
  currentUserId: number,
  targetUserId: number
): Promise<boolean> {
  const pool = await getPool();

  // aktif kolonu yoksa sadece kayıt var mı kontrol et
  try {
    const result = await pool
      .request()
      .input('engelleyen_id', sql.Int, currentUserId)
      .input('engellenen_id', sql.Int, targetUserId)
      .query(`
        SELECT engel_id FROM dbo.Kullanici_Engel
        WHERE engelleyen_id = @engelleyen_id 
          AND engellenen_id = @engellenen_id
      `);

    return result.recordset.length > 0;
  } catch (err: any) {
    // aktif kolonu yoksa veya tablo yoksa false dön
    const errorMessage = err?.message || err?.originalError?.message || '';
    if (
      errorMessage.includes('Invalid column name') ||
      (errorMessage.includes('Invalid object name') && errorMessage.includes('Kullanici_Engel'))
    ) {
      console.warn('[isBlocked] Kullanici_Engel table/aktif column missing, returning false');
      return false;
    }
    throw err;
  }
}

