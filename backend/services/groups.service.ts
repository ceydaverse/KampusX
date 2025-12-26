import { getPool, sql } from '../db';
import { T } from '../constants/tables';

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
}

export interface GroupMember {
  kullanici_id: number;
  ad?: string;
  soyad?: string;
  rol: string;
}

/**
 * Kullanıcının üye olduğu grupları getir
 */
export async function getGroupsByUserId(userId: number): Promise<Group[]> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('userId', sql.Int, userId)
    .query(`
      SELECT
        g.grup_id,
        g.grup_adi,
        lm.mesaj AS lastMessageText,
        lm.tarih AS lastMessageAt,
        ISNULL(uc.unreadCount, 0) AS unreadCount
      FROM ${T.Gruplar} g
      INNER JOIN ${T.GrupUyeler} gu ON gu.grup_id = g.grup_id
      OUTER APPLY (
        SELECT TOP 1 gm.mesaj, gm.tarih
        FROM ${T.GrupMesajlar} gm
        WHERE gm.grup_id = g.grup_id
        ORDER BY gm.tarih DESC
      ) lm
      OUTER APPLY (
        SELECT COUNT(*) AS unreadCount
        FROM ${T.GrupMesajOkunma} gmo
        INNER JOIN ${T.GrupMesajlar} gm2 ON gm2.mesaj_id = gmo.mesaj_id
        WHERE gm2.grup_id = g.grup_id
          AND gmo.kullanici_id = @userId
          AND gmo.okundu = 0
      ) uc
      WHERE gu.kullanici_id = @userId
      ORDER BY lm.tarih DESC
    `);

  return result.recordset.map((row: any) => ({
    grup_id: row.grup_id,
    grup_adi: row.grup_adi,
    lastMessage: row.lastMessageText
      ? {
          mesaj: row.lastMessageText,
          tarih: row.lastMessageAt ? new Date(row.lastMessageAt) : new Date(),
        }
      : null,
    unreadCount: Number(row.unreadCount) || 0,
  }));
}

/**
 * Grup mesajlarını getir
 */
export async function getGroupMessages(
  grupId: number,
  limit: number = 50,
  before?: Date
): Promise<GroupMessage[]> {
  const pool = await getPool();

  let query = `
    SELECT TOP (@limit)
      mesaj_id,
      grup_id,
      gonderen_id,
      mesaj,
      tarih
    FROM ${T.GrupMesajlar}
    WHERE grup_id = @grup_id
  `;

  const request = pool
    .request()
    .input('grup_id', sql.Int, grupId)
    .input('limit', sql.Int, limit);

  if (before) {
    request.input('before', sql.DateTime, before);
    query += ` AND tarih < @before`;
  }

  query += ` ORDER BY tarih DESC`;

  const result = await request.query(query);

  // Tarihe göre ters sırala (en eski en üstte)
  return result.recordset
    .map((row: any) => ({
      mesaj_id: row.mesaj_id,
      grup_id: row.grup_id,
      gonderen_id: row.gonderen_id,
      mesaj: row.mesaj,
      tarih: new Date(row.tarih),
    }))
    .reverse();
}

/**
 * Grup mesajı ekle
 */
export async function createGroupMessage(
  grupId: number,
  gonderenId: number,
  mesaj: string
): Promise<GroupMessage> {
  const pool = await getPool();

  // Mesajı ekle
  const insertResult = await pool
    .request()
    .input('grup_id', sql.Int, grupId)
    .input('gonderen_id', sql.Int, gonderenId)
    .input('mesaj', sql.NVarChar(sql.MAX), mesaj)
    .query(`
      INSERT INTO ${T.GrupMesajlar} (grup_id, gonderen_id, mesaj, tarih)
      OUTPUT INSERTED.mesaj_id, INSERTED.grup_id, INSERTED.gonderen_id, INSERTED.mesaj, INSERTED.tarih
      VALUES (@grup_id, @gonderen_id, @mesaj, GETDATE())
    `);

  const inserted = insertResult.recordset[0];

  // Grup üyelerini al
  const membersResult = await pool
    .request()
    .input('grup_id', sql.Int, grupId)
    .query(`
      SELECT kullanici_id
      FROM ${T.GrupUyeler}
      WHERE grup_id = @grup_id
    `);

  // Okunma kayıtlarını oluştur (gönderen için okundu=1, diğerleri için 0)
  const members = membersResult.recordset;
  const mesajId = inserted.mesaj_id;

  for (const member of members) {
    const okundu = member.kullanici_id === gonderenId ? 1 : 0;
    await pool
      .request()
      .input('mesaj_id', sql.Int, mesajId)
      .input('kullanici_id', sql.Int, member.kullanici_id)
      .input('okundu', sql.Bit, okundu)
      .query(`
        INSERT INTO ${T.GrupMesajOkunma} (mesaj_id, kullanici_id, okundu)
        VALUES (@mesaj_id, @kullanici_id, @okundu)
      `);
  }

  return {
    mesaj_id: inserted.mesaj_id,
    grup_id: inserted.grup_id,
    gonderen_id: inserted.gonderen_id,
    mesaj: inserted.mesaj,
    tarih: new Date(inserted.tarih),
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
 * Mesajları okundu işaretle
 */
export async function markMessagesAsRead(
  grupId: number,
  kullaniciId: number,
  lastMesajId: number
): Promise<void> {
  const pool = await getPool();

  await pool
    .request()
    .input('grup_id', sql.Int, grupId)
    .input('kullanici_id', sql.Int, kullaniciId)
    .input('last_mesaj_id', sql.Int, lastMesajId)
    .query(`
      UPDATE ${T.GrupMesajOkunma}
      SET okundu = 1
      WHERE kullanici_id = @kullanici_id
        AND mesaj_id IN (
          SELECT mesaj_id
          FROM ${T.GrupMesajlar}
      WHERE grup_id = @grup_id
        AND mesaj_id <= @last_mesaj_id
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

  console.log("🔵 createGroup service - Input:", input);

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

  console.log("🔵 createGroup service - Processed memberIds:", memberIds);

  // Transaction başlat
  const transaction = pool.transaction();
  await transaction.begin();

  try {
    // 1. Grup oluştur
    const createGroupRequest = transaction.request();
    const createGroupResult = await createGroupRequest
      .input('grup_adi', sql.NVarChar(200), input.grup_adi.trim())
      .query(`
        INSERT INTO ${T.Gruplar} (grup_adi)
        OUTPUT INSERTED.grup_id, INSERTED.grup_adi
        VALUES (@grup_adi)
      `);

    if (createGroupResult.recordset.length === 0) {
      throw new Error('Grup oluşturulamadı');
    }

    const grupId = createGroupResult.recordset[0].grup_id;
    console.log("✅ createGroup service - Group created with ID:", grupId);

    // 2. Creator'ı admin olarak ekle
    const addCreatorRequest = transaction.request();
    await addCreatorRequest
      .input('grup_id', sql.Int, grupId)
      .input('kullanici_id', sql.Int, input.creator_id)
      .input('rol', sql.NVarChar(50), 'admin')
      .query(`
        INSERT INTO ${T.GrupUyeler} (grup_id, kullanici_id, rol)
        VALUES (@grup_id, @kullanici_id, @rol)
      `);

    console.log("✅ createGroup service - Creator added as admin");

    // 3. Diğer üyeleri ekle (varsa)
    if (memberIds.length > 0) {
      // Her üye için ayrı insert (SQL Server'da bulk insert için daha güvenli)
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
          console.log(`✅ createGroup service - Member ${memberId} added`);
        } catch (memberErr: any) {
          // Duplicate key hatası ignore edilebilir
          if (memberErr?.originalError?.number !== 2627) {
            throw memberErr;
          }
          console.log(`⚠️ createGroup service - Member ${memberId} already exists, skipping`);
        }
      }
    }

    // Transaction commit
    await transaction.commit();
    console.log("✅ createGroup service - Transaction committed successfully");

    return {
      grup_id: grupId,
      grup_adi: input.grup_adi.trim(),
    };
  } catch (err: any) {
    // Hata durumunda rollback
    console.error("❌ createGroup service - Error, rolling back:", {
      message: err?.message,
      stack: err?.stack,
      sqlError: err?.originalError?.message,
      sqlNumber: err?.originalError?.number,
      fullError: err,
    });
    await transaction.rollback();
    throw err;
  }
}

