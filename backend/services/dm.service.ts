import { getPool, sql } from '../db';
import { createNotification, getUserDisplayName } from './notifications.service';

/**
 * İki kullanıcı arasındaki oda ID'sini bul veya oluştur
 */
async function getOrCreateRoomId(userId1: number, userId2: number): Promise<number> {
  const pool = await getPool();
  
  // a = min, b = max (tutarlılık için)
  const a = Math.min(userId1, userId2);
  const b = Math.max(userId1, userId2);

  try {
    // Önce tablo kolonlarını INFORMATION_SCHEMA'dan oku
    const schemaResult = await pool
      .request()
      .query(`
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Mesajlasma_Oda'
        ORDER BY ORDINAL_POSITION
      `);

    const columns = schemaResult.recordset.map((row: any) => row.COLUMN_NAME.toLowerCase());
    
    // Oda ID kolonunu bul
    const roomIdCol = columns.find((col: string) => 
      col.includes('mesajlasma_id') || col.includes('oda_id') || col === 'id'
    );
    
    // Kullanıcı kolonlarını bul
    const user1Col = columns.find((col: string) => 
      col.includes('kullanici1') || col.includes('user1') || col.includes('kullanici_1')
    );
    const user2Col = columns.find((col: string) => 
      col.includes('kullanici2') || col.includes('user2') || col.includes('kullanici_2')
    );

    if (!roomIdCol || !user1Col || !user2Col) {
      const errorMsg = `Mesajlasma_Oda tablosu kolonları bulunamadı. Bulunan kolonlar: ${columns.join(', ')}`;
      console.error('❌ getOrCreateRoomId - Schema Error:', errorMsg);
      throw new Error(errorMsg);
    }

    console.log('🔵 getOrCreateRoomId - Schema:', { roomIdCol, user1Col, user2Col });

    // Oda var mı kontrol et
    const findResult = await pool
      .request()
      .input('a', sql.Int, a)
      .input('b', sql.Int, b)
      .query(`
        SELECT ${roomIdCol} AS roomId
        FROM dbo.Mesajlasma_Oda
        WHERE ${user1Col} = @a AND ${user2Col} = @b
      `);

    if (findResult.recordset.length > 0) {
      const roomId = findResult.recordset[0].roomId;
      console.log('✅ getOrCreateRoomId - Room found:', roomId);
      return roomId;
    }

    // Oda yoksa oluştur
    const createResult = await pool
      .request()
      .input('a', sql.Int, a)
      .input('b', sql.Int, b)
      .query(`
        INSERT INTO dbo.Mesajlasma_Oda (${user1Col}, ${user2Col})
        OUTPUT INSERTED.${roomIdCol} AS roomId
        VALUES (@a, @b)
      `);

    if (createResult.recordset.length === 0) {
      throw new Error('Oda oluşturulamadı');
    }

    const roomId = createResult.recordset[0].roomId;
    console.log('✅ getOrCreateRoomId - Room created:', roomId);
    return roomId;

  } catch (err: any) {
    const errorMsg = err?.message || err?.originalError?.message || 'Bilinmeyen hata';
    console.error('❌ getOrCreateRoomId - Error:', {
      message: errorMsg,
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
 * Mesajlasma_Oda tablosundan odaları bulur, her oda için karşı kullanıcıyı ve son mesajı getirir
 * 
 * SQL Mantığı:
 * 1. Mesajlasma_Oda tablosundan kullanıcının dahil olduğu odaları getir (WHERE kullanici1_id = @me OR kullanici2_id = @me)
 * 2. Karşı tarafı hesapla: CASE WHEN kullanici1_id = @me THEN kullanici2_id ELSE kullanici1_id END
 * 3. Her oda için Mesajlasma tablosundan SON mesajı OUTER APPLY ile al
 * 4. otherUserId ile dbo.Kullanicilar tablosuna JOIN yap
 * 5. Sonuçları son mesaj tarihine göre DESC sırala
 */
export async function getConversations(currentUserId: number): Promise<ConversationResponse[]> {
  const pool = await getPool();

  try {
    const result = await pool
      .request()
      .input('me', sql.Int, currentUserId)
      .query(`
        SELECT 
          mo.mesajlasma_id AS mesajlasmaId,
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
          -- Son mesaj (OUTER APPLY ile - mesaj yoksa NULL)
          lm.mesaj AS lastMessageText,
          -- Son mesaj tarihi
          lm.tarih AS lastMessageAt
        FROM dbo.Mesajlasma_Oda mo
        -- Karşı taraf bilgisini getir
        INNER JOIN dbo.Kullanicilar k ON k.kullanici_id = CASE 
          WHEN mo.kullanici1_id = @me THEN mo.kullanici2_id
          ELSE mo.kullanici1_id
        END
        -- Her oda için son mesajı al (OUTER APPLY - mesaj yoksa bile oda listelensin)
        OUTER APPLY (
          SELECT TOP 1
            m.mesaj,
            m.tarih,
            m.gonderen_id
          FROM dbo.Mesajlasma m
          WHERE m.mesajlasma_id = mo.mesajlasma_id
          ORDER BY m.tarih DESC
        ) AS lm
        WHERE mo.kullanici1_id = @me OR mo.kullanici2_id = @me
        -- Son mesaj tarihine göre DESC sırala (tarih NULL olanlar en sonda)
        ORDER BY lm.tarih DESC, mo.mesajlasma_id DESC
      `);

    return result.recordset.map((row: any) => ({
      mesajlasmaId: Number(row.mesajlasmaId),
      otherUserId: Number(row.otherUserId),
      otherUserName: String(row.otherUserName || 'Kullanıcı'),
      lastMessageText: row.lastMessageText || null,
      lastMessageAt: row.lastMessageAt ? new Date(row.lastMessageAt).toISOString() : null,
    })) as ConversationResponse[];
  } catch (err: any) {
    console.error('❌ getConversations - SQL Error:', {
      message: err?.message,
      originalError: err?.originalError?.message,
      code: err?.code,
      stack: err?.stack,
      sqlState: err?.sqlState,
      sqlMessage: err?.sqlMessage,
    });
    
    // Hata durumunda boş array dön (frontend çökmesin)
    return [];
  }
}

/**
 * İki kullanıcı arasındaki mesajları getir
 * 
 * SQL Mantığı:
 * 1. Mesajlasma_Oda tablosunda iki kullanıcı arasındaki odayı bul (TOP 1)
 * 2. Oda yoksa boş array dön
 * 3. Oda varsa Mesajlasma tablosundan odaya ait mesajları getir
 */
export async function getMessages(
  currentUserId: number,
  withUserId: number
): Promise<{ mesajlasmaId: number | null; items: DirectMessage[] }> {
  const pool = await getPool();

  try {
    // Mesajlasma_Oda tablosunda odayı bul
    // SELECT TOP 1 mesajlasma_id FROM dbo.Mesajlasma_Oda
    // WHERE (kullanici1_id=@me AND kullanici2_id=@other) OR (kullanici1_id=@other AND kullanici2_id=@me)
    const roomResult = await pool
      .request()
      .input('me', sql.Int, currentUserId)
      .input('other', sql.Int, withUserId)
      .query(`
        SELECT TOP 1 mesajlasma_id
        FROM dbo.Mesajlasma_Oda
        WHERE (kullanici1_id = @me AND kullanici2_id = @other)
           OR (kullanici1_id = @other AND kullanici2_id = @me)
      `);

    // Oda yoksa boş array dön
    if (roomResult.recordset.length === 0 || !roomResult.recordset[0].mesajlasma_id) {
      return {
        mesajlasmaId: null,
        items: [],
      };
    }

    const mesajlasmaId = Number(roomResult.recordset[0].mesajlasma_id);

    // Odaya ait mesajları getir
    // SELECT mesaj_id,mesajlasma_id,gonderen_id,alici_id,mesaj,tarih,okundu
    // FROM dbo.Mesajlasma
    // WHERE mesajlasma_id=@odaId
    // ORDER BY tarih ASC
    const messagesResult = await pool
      .request()
      .input('mesajlasma_id', sql.Int, mesajlasmaId)
      .query(`
        SELECT 
          mesaj_id,
          mesajlasma_id,
          gonderen_id,
          alici_id,
          mesaj,
          tarih,
          okundu
        FROM dbo.Mesajlasma
        WHERE mesajlasma_id = @mesajlasma_id
        ORDER BY tarih ASC
      `);

    const items = messagesResult.recordset.map((row: any) => ({
      mesaj_id: Number(row.mesaj_id),
      gonderen_id: Number(row.gonderen_id),
      alici_id: row.alici_id ? Number(row.alici_id) : null,
      mesaj: String(row.mesaj || ''),
      tarih: row.tarih,
      okundu_by_sender: row.gonderen_id === currentUserId ? (row.okundu === 1 || row.okundu === true) : undefined,
      okundu_by_receiver: row.alici_id === currentUserId ? (row.okundu === 1 || row.okundu === true) : undefined,
    })) as DirectMessage[];

    return {
      mesajlasmaId,
      items,
    };
  } catch (err: any) {
    console.error('❌ getMessages - SQL Error:', {
      message: err?.message,
      originalError: err?.originalError?.message,
      code: err?.code,
      sqlState: err?.sqlState,
      sqlMessage: err?.sqlMessage,
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

  // Engelleme kontrolü (TRY/CATCH ile - tablo yoksa devam et)
  try {
    const blockCheck = await pool
      .request()
      .input('engelleyen_id', sql.Int, currentUserId)
      .input('engellenen_id', sql.Int, toUserId)
      .query(`
        SELECT engel_id FROM dbo.Kullanici_Engel
        WHERE engelleyen_id = @engelleyen_id 
          AND engellenen_id = @engellenen_id 
          AND aktif = 1
      `);

    if (blockCheck.recordset.length > 0) {
      throw new Error('Kullanıcı engelli');
    }
  } catch (err: any) {
    // Eğer hata "Invalid object name" ve "Kullanici_Engel" içeriyorsa, engel kontrolünü atla
    const errorMessage = err?.message || err?.originalError?.message || '';
    if (errorMessage.includes('Invalid object name') && errorMessage.includes('Kullanici_Engel')) {
      console.warn('Kullanici_Engel table missing, skipping block check');
      // Engel kontrolü yokmuş gibi devam et
    } else {
      // Diğer hatalar için normal hatayı fırlat
      throw err;
    }
  }

  // Karşı tarafın engelleme kontrolü (TRY/CATCH ile - tablo yoksa devam et)
  try {
    const reverseBlockCheck = await pool
      .request()
      .input('engelleyen_id', sql.Int, toUserId)
      .input('engellenen_id', sql.Int, currentUserId)
      .query(`
        SELECT engel_id FROM dbo.Kullanici_Engel
        WHERE engelleyen_id = @engelleyen_id 
          AND engellenen_id = @engellenen_id 
          AND aktif = 1
      `);

    if (reverseBlockCheck.recordset.length > 0) {
      throw new Error('Bu kullanıcıya mesaj gönderemezsiniz');
    }
  } catch (err: any) {
    // Eğer hata "Invalid object name" ve "Kullanici_Engel" içeriyorsa, engel kontrolünü atla
    const errorMessage = err?.message || err?.originalError?.message || '';
    if (errorMessage.includes('Invalid object name') && errorMessage.includes('Kullanici_Engel')) {
      console.warn('Kullanici_Engel table missing, skipping reverse block check');
      // Engel kontrolü yokmuş gibi devam et
    } else {
      // Diğer hatalar için normal hatayı fırlat
      throw err;
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

  // Mesajlasma tablosunda alici_id kolonu var mı kontrol et
  const hasAliciId = await pool
    .request()
    .query(`
      SELECT COL_LENGTH('dbo.Mesajlasma', 'alici_id') AS hasAliciId
    `);

  const hasAliciIdCol = hasAliciId.recordset[0]?.hasAliciId !== null;

  // Mesajı ekle
  let insertQuery: string;
  if (hasAliciIdCol) {
    insertQuery = `
      INSERT INTO dbo.Mesajlasma (mesajlasma_id, gonderen_id, alici_id, mesaj, okundu, tarih)
      OUTPUT INSERTED.mesaj_id, INSERTED.gonderen_id, INSERTED.alici_id, INSERTED.mesaj, INSERTED.tarih
      VALUES (@mesajlasma_id, @gonderen_id, @alici_id, @mesaj, 0, GETDATE())
    `;
  } else {
    insertQuery = `
      INSERT INTO dbo.Mesajlasma (mesajlasma_id, gonderen_id, mesaj, okundu, tarih)
      OUTPUT INSERTED.mesaj_id, INSERTED.gonderen_id, INSERTED.mesaj, INSERTED.tarih
      VALUES (@mesajlasma_id, @gonderen_id, @mesaj, 0, GETDATE())
    `;
  }

  const request = pool
    .request()
    .input('mesajlasma_id', sql.Int, roomId)
    .input('gonderen_id', sql.Int, currentUserId)
    .input('mesaj', sql.NVarChar(sql.MAX), text.trim());

  if (hasAliciIdCol) {
    request.input('alici_id', sql.Int, toUserId);
  }

  const result = await request.query(insertQuery);

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

  const messageResult: any = {
    mesaj_id: row.mesaj_id,
    gonderen_id: row.gonderen_id,
    alici_id: hasAliciIdCol ? row.alici_id : toUserId,
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
 * Eğer withUserId geldiyse önce odaId'yi Mesajlasma_Oda'dan bul
 * Sonra okundu güncelle: UPDATE dbo.Mesajlasma SET okundu=1 WHERE mesajlasma_id=@odaId AND alici_id=@me AND okundu=0
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
      const roomResult = await pool
        .request()
        .input('me', sql.Int, currentUserId)
        .input('other', sql.Int, Number(withUserId))
        .query(`
          SELECT TOP 1 mesajlasma_id
          FROM dbo.Mesajlasma_Oda
          WHERE (kullanici1_id = @me AND kullanici2_id = @other)
             OR (kullanici1_id = @other AND kullanici2_id = @me)
        `);

      if (roomResult.recordset.length === 0 || !roomResult.recordset[0].mesajlasma_id) {
        // Oda yoksa işlem yapılacak bir şey yok
        console.log(`⚠️ markMessagesAsRead - Room not found for users: ${currentUserId} <-> ${withUserId}`);
        return;
      }

      odaId = Number(roomResult.recordset[0].mesajlasma_id);
    } else {
      // Hiçbiri verilmemişse hata
      throw new Error('mesajlasmaId veya withUserId zorunludur');
    }

    if (!odaId || Number.isNaN(odaId)) {
      console.warn(`⚠️ markMessagesAsRead - Invalid odaId: ${odaId}`);
      return;
    }

    // Okundu güncelle
    // UPDATE dbo.Mesajlasma SET okundu=1 WHERE mesajlasma_id=@odaId AND alici_id=@me AND okundu=0
    const updateResult = await pool
      .request()
      .input('mesajlasma_id', sql.Int, odaId)
      .input('me', sql.Int, currentUserId)
      .query(`
        UPDATE dbo.Mesajlasma
        SET okundu = 1
        WHERE mesajlasma_id = @mesajlasma_id
          AND alici_id = @me
          AND okundu = 0
      `);

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
    // Aktif yap
    await pool
      .request()
      .input('engelleyen_id', sql.Int, currentUserId)
      .input('engellenen_id', sql.Int, targetUserId)
      .query(`
        UPDATE dbo.Kullanici_Engel
        SET aktif = 1, tarih = GETDATE()
        WHERE engelleyen_id = @engelleyen_id AND engellenen_id = @engellenen_id
      `);
  } else {
    // Yeni kayıt ekle
    await pool
      .request()
      .input('engelleyen_id', sql.Int, currentUserId)
      .input('engellenen_id', sql.Int, targetUserId)
      .query(`
        INSERT INTO dbo.Kullanici_Engel (engelleyen_id, engellenen_id, tarih, aktif)
        VALUES (@engelleyen_id, @engellenen_id, GETDATE(), 1)
      `);
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

  await pool
    .request()
    .input('engelleyen_id', sql.Int, currentUserId)
    .input('engellenen_id', sql.Int, targetUserId)
    .query(`
      UPDATE dbo.Kullanici_Engel
      SET aktif = 0
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

  const result = await pool
    .request()
    .input('engelleyen_id', sql.Int, currentUserId)
    .input('engellenen_id', sql.Int, targetUserId)
    .query(`
      SELECT engel_id FROM dbo.Kullanici_Engel
      WHERE engelleyen_id = @engelleyen_id 
        AND engellenen_id = @engellenen_id 
        AND aktif = 1
    `);

  return result.recordset.length > 0;
}

