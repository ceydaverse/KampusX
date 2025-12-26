import { getPool, sql } from '../db';
import { T } from '../constants/tables';

// Grup_Mesaj_Okunma tablosunun kolon adlarını keşfet (ilk çalıştırmada)
// DB şeması: mesaj_id, kullanici_id, okuma_tarihi (okundu kolonu yok)
let grupMesajOkunmaColumns: { mesaj_id: string; kullanici_id: string; okuma_tarihi: string } | null = null;

async function discoverGrupMesajOkunmaColumns(): Promise<{ mesaj_id: string; kullanici_id: string; okuma_tarihi: string }> {
  if (grupMesajOkunmaColumns) return grupMesajOkunmaColumns;

  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT c.name 
    FROM sys.columns c
    JOIN sys.tables t ON t.object_id = c.object_id
    WHERE t.name = 'Grup_Mesaj_Okunma'
    ORDER BY c.column_id
  `);

  const columnNames = result.recordset.map((r: any) => r.name);
  console.log('[Grup_Mesaj_Okunma] Tablo kolonları:', columnNames);

  // Kolon adlarını eşleştir (muhtemel isimler)
  const mesajIdCol = columnNames.find((n: string) => 
    n.toLowerCase() === 'mesaj_id' || n.toLowerCase() === 'mesajid'
  ) || 'mesaj_id';
  
  const kullaniciIdCol = columnNames.find((n: string) => 
    n.toLowerCase() === 'kullanici_id' || n.toLowerCase() === 'kullaniciid'
  ) || 'kullanici_id';
  
  const okumaTarihiCol = columnNames.find((n: string) => 
    n.toLowerCase() === 'okuma_tarihi' || n.toLowerCase() === 'okumatarihi' || 
    n.toLowerCase() === 'okundu_tarihi' || n.toLowerCase() === 'okunma_tarihi'
  ) || 'okuma_tarihi';

  grupMesajOkunmaColumns = {
    mesaj_id: mesajIdCol,
    kullanici_id: kullaniciIdCol,
    okuma_tarihi: okumaTarihiCol,
  };

  console.log('[Grup_Mesaj_Okunma] Kullanılan kolon eşlemeleri:', grupMesajOkunmaColumns);
  return grupMesajOkunmaColumns;
}

export interface Group {
  grup_id: number;
  grup_adi: string;
  lastMessage?: {
    mesaj: string;
    tarih: Date;
  } | null;
  unreadCount: number;
}

export interface GroupMessage {
  mesaj_id: number;
  grup_id: number;
  gonderen_id: number;
  mesaj: string;
  tarih: Date;
  gonderen_kullanici_adi?: string | null;
  okuyan_sayisi?: number;
  benim_okudum?: boolean;
}

export interface GroupMember {
  kullanici_id: number;
  ad?: string;
  soyad?: string;
  rol: string;
}

/**
 * Kullanıcının üye olduğu grupları getir (unread count, lastMessage, memberCount ile)
 */
export async function getGroupsByUserId(userId: number): Promise<Group[]> {
  const pool = await getPool();

  // Grup_Mesaj_Okunma tablosunun kolon adlarını keşfet
  const cols = await discoverGrupMesajOkunmaColumns();

  console.log('[getGroupsByUserId] userId:', userId);

  // Unread count, lastMessage, memberCount hesaplama
  const result = await pool
    .request()
    .input('userId', sql.Int, userId)
    .query(`
      SELECT
        g.grup_id,
        g.grup_adi,
        g.olusturan_kullanici,
        g.olusturma_tarihi,
        -- Member count
        ISNULL((
          SELECT COUNT(*)
          FROM ${T.GrupUyeler} gu_count
          WHERE gu_count.grup_id = g.grup_id
        ), 0) AS memberCount,
        -- Last message (OUTER APPLY ile - birden fazla kolon alabiliriz)
        lm.mesaj AS lastMessageText,
        lm.gonderim_tarihi AS lastMessageDate,
        lm.gonderen_kullanici AS lastMessageSenderId,
        -- Unread count: Okunmamış mesaj sayısı
        ISNULL((
          SELECT COUNT(*)
          FROM ${T.GrupMesajlar} gm
          WHERE gm.grup_id = g.grup_id
            AND gm.gonderen_kullanici != @userId  -- Gönderen kendisi değilse
            AND NOT EXISTS (
              SELECT 1
              FROM ${T.GrupMesajOkunma} gmo
              WHERE gmo.[${cols.mesaj_id}] = gm.mesaj_id
                AND gmo.[${cols.kullanici_id}] = @userId
                AND gmo.[${cols.okuma_tarihi}] IS NOT NULL
            )
        ), 0) AS unreadCount
      FROM ${T.Gruplar} g
      INNER JOIN ${T.GrupUyeler} gu ON gu.grup_id = g.grup_id AND gu.kullanici_id = @userId
      -- Last message için OUTER APPLY (mesaj yoksa NULL) - alias çakışmasını önlemek için farklı alias kullan
      OUTER APPLY (
        SELECT TOP 1
          last_mesaj.mesaj,
          last_mesaj.gonderim_tarihi,
          last_mesaj.gonderen_kullanici
        FROM ${T.GrupMesajlar} last_mesaj
        WHERE last_mesaj.grup_id = g.grup_id
        ORDER BY last_mesaj.gonderim_tarihi DESC
      ) AS lm
      WHERE 1=1
      ORDER BY g.olusturma_tarihi DESC
    `);

  return result.recordset.map((row: any) => {
    // Last message parse et (OUTER APPLY ile doğrudan kolonlar geliyor)
    let lastMessage: { mesaj: string; tarih: Date; gonderen_kullanici: number } | null = null;
    if (row.lastMessageText) {
      lastMessage = {
        mesaj: String(row.lastMessageText || ''),
        tarih: new Date(row.lastMessageDate),
        gonderen_kullanici: Number(row.lastMessageSenderId),
      };
    }

    return {
      grup_id: row.grup_id,
      grup_adi: row.grup_adi,
      lastMessage,
      unreadCount: Number(row.unreadCount) || 0,
      memberCount: Number(row.memberCount) || 0,
    };
  });
}

/**
 * Kullanıcının grubun üyesi olup olmadığını kontrol et
 */
export async function isUserGroupMember(grupId: number, kullaniciId: number): Promise<boolean> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('grup_id', sql.Int, grupId)
    .input('kullanici_id', sql.Int, kullaniciId)
    .query(`
      SELECT 1
      FROM ${T.GrupUyeler}
      WHERE grup_id = @grup_id AND kullanici_id = @kullanici_id
    `);

  return result.recordset.length > 0;
}

/**
 * Grup mesajlarını getir
 */
export async function getGroupMessages(
  grupId: number,
  limit: number = 50,
  before?: Date,
  currentUserId?: number
): Promise<GroupMessage[]> {
  const pool = await getPool();

  // Kolon adlarını keşfet
  const cols = await discoverGrupMesajOkunmaColumns();

  // DB kolon adları: gonderen_kullanici, gonderim_tarihi
  // Grup_Mesaj_Okunma: mesaj_id, kullanici_id, okuma_tarihi (okundu kolonu yok)
  let query = `
    SELECT TOP (@limit)
      gm.mesaj_id,
      gm.grup_id,
      gm.gonderen_kullanici,
      gm.mesaj,
      gm.gonderim_tarihi,
      k.kullanici_adi AS gonderen_kullanici_adi,
      ISNULL(COUNT(DISTINCT gmo.[${cols.kullanici_id}]), 0) AS okuyan_sayisi
  `;

  if (currentUserId) {
    query += `,
      CASE 
        WHEN EXISTS(
          SELECT 1 
          FROM ${T.GrupMesajOkunma} gmo_check
          WHERE gmo_check.[${cols.mesaj_id}] = gm.mesaj_id 
            AND gmo_check.[${cols.kullanici_id}] = @current_user_id
            AND gmo_check.[${cols.okuma_tarihi}] IS NOT NULL
        ) THEN 1
        ELSE 0
      END AS benim_okudum
    `;
  } else {
    query += `, 0 AS benim_okudum`;
  }

  query += `
    FROM ${T.GrupMesajlar} gm
    JOIN ${T.Kullanicilar} k ON k.kullanici_id = gm.gonderen_kullanici
    LEFT JOIN ${T.GrupMesajOkunma} gmo ON gmo.[${cols.mesaj_id}] = gm.mesaj_id AND gmo.[${cols.okuma_tarihi}] IS NOT NULL
    WHERE gm.grup_id = @grup_id
  `;

  const request = pool
    .request()
    .input('grup_id', sql.Int, grupId)
    .input('limit', sql.Int, limit);

  if (currentUserId) {
    request.input('current_user_id', sql.Int, currentUserId);
  }

  if (before) {
    request.input('before', sql.DateTime, before);
    query += ` AND gm.gonderim_tarihi < @before`;
  }

  query += `
    GROUP BY 
      gm.mesaj_id,
      gm.grup_id,
      gm.gonderen_kullanici,
      gm.mesaj,
      gm.gonderim_tarihi,
      k.kullanici_adi
    ORDER BY gm.gonderim_tarihi ASC
  `;

  const result = await request.query(query);

  // Mesajları map'le
  const messages: GroupMessage[] = result.recordset.map((row: any) => ({
  mesaj_id: Number(row.mesaj_id),
  grup_id: Number(row.grup_id),
  gonderen_id: Number(row.gonderen_kullanici),
  mesaj: String(row.mesaj || ''),
  tarih: new Date(row.gonderim_tarihi),

  // opsiyoneller (interface’te var)
  gonderen_kullanici_adi: row.gonderen_kullanici_adi ?? null,
  okuyan_sayisi: Number(row.okuyan_sayisi) || 0,
  benim_okudum: row.benim_okudum === 1 || row.benim_okudum === true,
}));

  // Mesajları çektikten sonra, kullanıcı için okundu kayıtlarını ekle
  // Eğer kullanıcı mesajı daha önce okumadıysa ve gönderen kendisi değilse
  if (currentUserId && messages.length > 0) {
    try {
      await markMessagesAsReadAfterFetch(grupId, currentUserId, messages.map(m => m.mesaj_id));

    } catch (err: any) {
      // Okundu kaydı hatası mesaj listesini engellemez, sadece logla
      console.error('[getGroupMessages] Okundu kaydı eklenirken hata:', err?.message);
    }
  }

 return messages;
}

/**
 * Mesajları çektikten sonra okundu kayıtlarını ekle
 * Eğer kullanıcı mesajı daha önce okumadıysa ve gönderen kendisi değilse INSERT at
 */
async function markMessagesAsReadAfterFetch(
  grupId: number,
  kullaniciId: number,
  mesajIds: number[]
): Promise<void> {
  if (mesajIds.length === 0) return;

  const pool = await getPool();
  const cols = await discoverGrupMesajOkunmaColumns();

  // SQL injection'dan korunmak için her mesaj ID'si için ayrı parametre kullan
  const request = pool.request().input('kullanici_id', sql.Int, kullaniciId);
  
  const mesajIdsPlaceholders = mesajIds.map((id, idx) => {
    const paramName = `mesaj_id_${idx}`;
    request.input(paramName, sql.Int, id);
    return `@${paramName}`;
  }).join(', ');
  
  await request.query(`
    INSERT INTO ${T.GrupMesajOkunma} ([${cols.mesaj_id}], [${cols.kullanici_id}], [${cols.okuma_tarihi}])
    SELECT 
      gm.mesaj_id,
      @kullanici_id,
      GETDATE()
    FROM ${T.GrupMesajlar} gm
    WHERE gm.mesaj_id IN (${mesajIdsPlaceholders})
      AND gm.gonderen_kullanici != @kullanici_id  -- Gönderen kendisi değilse
      AND NOT EXISTS (
        SELECT 1
        FROM ${T.GrupMesajOkunma} gmo
        WHERE gmo.[${cols.mesaj_id}] = gm.mesaj_id
          AND gmo.[${cols.kullanici_id}] = @kullanici_id
          AND gmo.[${cols.okuma_tarihi}] IS NOT NULL
      )
  `);
}

/**
 * Grup mesajı ekle
 */
export async function createGroupMessage(
  grupId: number,
  gonderenId: number,
  mesaj: string
): Promise<{ messageId: number; groupId: number; senderId: number; text: string; sentAt: string }> {
  const pool = await getPool();

  // DB kolon adları: gonderen_kullanici, gonderim_tarihi
  // SCOPE_IDENTITY ile mesaj_id'yi al
  const insertResult = await pool
    .request()
    .input('grup_id', sql.Int, grupId)
    .input('gonderen_kullanici', sql.Int, gonderenId)
    .input('mesaj', sql.NVarChar(sql.MAX), mesaj)
    .query(`
      INSERT INTO ${T.GrupMesajlar} (grup_id, gonderen_kullanici, mesaj, gonderim_tarihi)
      VALUES (@grup_id, @gonderen_kullanici, @mesaj, GETDATE());
      
      SELECT SCOPE_IDENTITY() AS mesaj_id;
    `);

  const mesajId = insertResult.recordset[0]?.mesaj_id;
  
  if (!mesajId) {
    throw new Error('Mesaj oluşturulamadı: mesaj_id alınamadı');
  }

  // Yeni eklenen mesajı çek (gonderim_tarihi dahil)
  const selectResult = await pool
    .request()
    .input('mesaj_id', sql.Int, mesajId)
    .query(`
      SELECT mesaj_id, grup_id, gonderen_kullanici, mesaj, gonderim_tarihi
      FROM ${T.GrupMesajlar}
      WHERE mesaj_id = @mesaj_id
    `);

  const inserted = selectResult.recordset[0];
  
  if (!inserted) {
    throw new Error('Mesaj oluşturuldu ama okunamadı');
  }

  // Standardize edilmiş response formatı
  return {
    messageId: inserted.mesaj_id,
    groupId: inserted.grup_id,
    senderId: inserted.gonderen_kullanici,
    text: inserted.mesaj || '',
    sentAt: new Date(inserted.gonderim_tarihi).toISOString(),
  };
}

/**
 * Grup üyelerini getir
 */
export async function getGroupMembers(grupId: number): Promise<GroupMember[]> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('grup_id', sql.Int, grupId)
    .query(`
      SELECT 
        gu.kullanici_id,
        gu.rol,
        k.ad,
        k.soyad
      FROM ${T.GrupUyeler} gu
      LEFT JOIN ${T.Kullanicilar} k ON gu.kullanici_id = k.kullanici_id
      WHERE gu.grup_id = @grup_id
      ORDER BY gu.rol DESC, k.ad ASC
    `);

  return result.recordset.map((row: any) => ({
    kullanici_id: row.kullanici_id,
    ad: row.ad || null,
    soyad: row.soyad || null,
    rol: row.rol || 'uye',
  }));
}

/**
 * Mesajları okundu işaretle (yeni endpoint için - tüm mesajları okundu işaretle)
 * @returns İşaretlenen mesaj sayısı
 */
export async function markAllGroupMessagesAsRead(
  grupId: number,
  kullaniciId: number
): Promise<number> {
  const pool = await getPool();

  // Kolon adlarını keşfet
  const cols = await discoverGrupMesajOkunmaColumns();

  console.log('[markAllGroupMessagesAsRead] grupId:', grupId, 'kullaniciId:', kullaniciId);

  // INSERT ile IF NOT EXISTS mantığı (okuma_tarihi yoksa INSERT at)
  const result = await pool
    .request()
    .input('grup_id', sql.Int, grupId)
    .input('kullanici_id', sql.Int, kullaniciId)
    .query(`
      INSERT INTO ${T.GrupMesajOkunma} ([${cols.mesaj_id}], [${cols.kullanici_id}], [${cols.okuma_tarihi}])
      SELECT 
        gm.mesaj_id,
        @kullanici_id,
        GETDATE()
      FROM ${T.GrupMesajlar} gm
      WHERE gm.grup_id = @grup_id
        AND gm.gonderen_kullanici != @kullanici_id  -- Gönderen kendisi değilse
        AND NOT EXISTS (
          SELECT 1
          FROM ${T.GrupMesajOkunma} gmo
          WHERE gmo.[${cols.mesaj_id}] = gm.mesaj_id
            AND gmo.[${cols.kullanici_id}] = @kullanici_id
            AND gmo.[${cols.okuma_tarihi}] IS NOT NULL
        )
    `);

  const markedCount = result.rowsAffected[0] || 0;
  console.log('[markAllGroupMessagesAsRead] İşaretlenen mesaj sayısı:', markedCount);
  return markedCount;
}

/**
 * Mesajları okundu işaretle (eski endpoint için - lastMesajId'ye kadar)
 */
export async function markMessagesAsRead(
  grupId: number,
  kullaniciId: number,
  lastMesajId: number
): Promise<void> {
  const pool = await getPool();

  // Kolon adlarını keşfet
  const cols = await discoverGrupMesajOkunmaColumns();

  await pool
    .request()
    .input('grup_id', sql.Int, grupId)
    .input('kullanici_id', sql.Int, kullaniciId)
    .input('last_mesaj_id', sql.Int, lastMesajId)
    .query(`
      INSERT INTO ${T.GrupMesajOkunma} ([${cols.mesaj_id}], [${cols.kullanici_id}], [${cols.okuma_tarihi}])
      SELECT 
        gm.mesaj_id,
        @kullanici_id,
        GETDATE()
      FROM ${T.GrupMesajlar} gm
      WHERE gm.grup_id = @grup_id
        AND gm.mesaj_id <= @last_mesaj_id
        AND gm.gonderen_kullanici != @kullanici_id  -- Gönderen kendisi değilse
        AND NOT EXISTS (
          SELECT 1
          FROM ${T.GrupMesajOkunma} gmo
          WHERE gmo.[${cols.mesaj_id}] = gm.mesaj_id
            AND gmo.[${cols.kullanici_id}] = @kullanici_id
            AND gmo.[${cols.okuma_tarihi}] IS NOT NULL
        )
    `);
}

interface CreateGroupInput {
  creator_id: number;
  grup_adi: string;
  member_ids?: number[];
}

/**
 * Yeni grup oluştur
 */
export async function createGroup(input: CreateGroupInput): Promise<{ grup_id: number; grup_adi: string }> {
  const pool = await getPool();

  // Validation
  if (!input.grup_adi || input.grup_adi.trim().length < 3) {
    throw new Error('Grup adı en az 3 karakter olmalıdır');
  }

  if (!input.creator_id || Number.isNaN(input.creator_id)) {
    throw new Error('Creator ID zorunludur');
  }

  // Duplicate member id'leri temizle ve creator_id'yi çıkar
  const memberIds = input.member_ids
    ? [...new Set(input.member_ids.filter((id) => id !== input.creator_id && !Number.isNaN(id)))]
    : [];

  // Transaction başlat
  const transaction = pool.transaction();
  await transaction.begin();

  try {
    // 1. Grup oluştur (olusturan_kullanici ile)
    const createGroupRequest = transaction.request();
    const createGroupResult = await createGroupRequest
      .input('grup_adi', sql.NVarChar(200), input.grup_adi.trim())
      .input('olusturan_kullanici', sql.Int, input.creator_id)
      .query(`
        INSERT INTO ${T.Gruplar} (grup_adi, olusturan_kullanici, olusturma_tarihi)
        OUTPUT INSERTED.grup_id, INSERTED.grup_adi
        VALUES (@grup_adi, @olusturan_kullanici, GETDATE())
      `);

    if (createGroupResult.recordset.length === 0) {
      throw new Error('Grup oluşturulamadı');
    }

    const grupId = createGroupResult.recordset[0].grup_id;

    // 2. Creator'ı admin olarak ekle (duplicate kontrolü ile)
    const addCreatorRequest = transaction.request();
    try {
      await addCreatorRequest
        .input('grup_id', sql.Int, grupId)
        .input('kullanici_id', sql.Int, input.creator_id)
        .input('rol', sql.NVarChar(50), 'admin')
        .query(`
          INSERT INTO ${T.GrupUyeler} (grup_id, kullanici_id, rol)
          VALUES (@grup_id, @kullanici_id, @rol)
        `);
    } catch (creatorErr: any) {
      // Duplicate key hatası ignore edilebilir (zaten üye)
      if (creatorErr?.originalError?.number !== 2627) {
        throw creatorErr;
      }
    }

    // 3. Diğer üyeleri ekle (varsa)
    if (memberIds.length > 0) {
      for (const memberId of memberIds) {
        const addMemberRequest = transaction.request();
        try {
          await addMemberRequest
            .input('grup_id', sql.Int, grupId)
            .input('kullanici_id', sql.Int, memberId)
            .input('rol', sql.NVarChar(50), 'uye')
            .query(`
              INSERT INTO ${T.GrupUyeler} (grup_id, kullanici_id, rol)
              VALUES (@grup_id, @kullanici_id, @rol)
            `);
        } catch (memberErr: any) {
          // Duplicate key hatası ignore edilebilir
          if (memberErr?.originalError?.number !== 2627) {
            throw memberErr;
          }
        }
      }
    }

    // Transaction commit
    await transaction.commit();

    return {
      grup_id: grupId,
      grup_adi: input.grup_adi.trim(),
    };
  } catch (err: any) {
    // Hata durumunda rollback
    await transaction.rollback();
    throw err;
  }
}
