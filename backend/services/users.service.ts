import { getPool, sql } from '../db';

export interface User {
  kullanici_id: number;
  ad: string;
  soyad: string;
  email: string;
  universite?: string | null;
  bolum?: string | null;
  kullanici_adi?: string | null;
  dogum_yili?: number | null;
  cinsiyet?: string | null;
}

export async function getUserById(kullaniciId: number): Promise<User | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('kullanici_id', sql.Int, kullaniciId)
    .query(`
      SELECT kullanici_id, ad, soyad, email, universite, bolum, kullanici_adi, dogum_yili, cinsiyet
      FROM dbo.Kullanicilar
      WHERE kullanici_id = @kullanici_id
    `);

  if (result.recordset.length === 0) {
    return null;
  }

  return result.recordset[0] as User;
}

interface UpdateUserInput {
  kullanici_id: number;
  ad: string;
  soyad: string;
  universite?: string | null;
  bolum?: string | null;
  kullanici_adi?: string | null;
  dogum_yili?: number | null;
  cinsiyet?: string | null;
}

/**
 * Kullanıcı arama (ad, soyad, email ile)
 */
export async function searchUsers(query: string, limit: number = 10): Promise<User[]> {
  const pool = await getPool();

  if (!query || query.trim().length === 0) {
    // Boş query ise en fazla limit kadar kullanıcı dön
    const result = await pool
      .request()
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit) kullanici_id, ad, soyad, email, universite, bolum, kullanici_adi, dogum_yili, cinsiyet
        FROM dbo.Kullanicilar
        ORDER BY kullanici_id DESC
      `);
    return result.recordset as User[];
  }

  const searchTerm = `%${query.trim()}%`;
  
  // Önce silindi kolonunun var olup olmadığını kontrol et (hata üretmesin)
  // Şimdilik silindi filtresini kapat - önce arama çalışsın
  const result = await pool
    .request()
    .input('search', sql.NVarChar(200), searchTerm)
    .input('limit', sql.Int, limit)
    .query(`
      SELECT TOP (@limit) 
        kullanici_id, 
        ad, 
        soyad, 
        email, 
        universite, 
        bolum, 
        kullanici_adi, 
        dogum_yili, 
        cinsiyet
      FROM dbo.Kullanicilar
      WHERE (ad LIKE @search
         OR soyad LIKE @search
         OR email LIKE @search
         OR kullanici_adi LIKE @search)
      ORDER BY 
        CASE 
          WHEN ad LIKE @search THEN 1
          WHEN soyad LIKE @search THEN 2
          WHEN email LIKE @search THEN 3
          ELSE 4
        END,
        kullanici_id DESC
    `);

  return result.recordset as User[];
}

export async function updateUser(input: UpdateUserInput): Promise<{ user: User; rowsAffected: number }> {
  const pool = await getPool();

  // Önce kullanıcının var olup olmadığını kontrol et
  const existing = await getUserById(input.kullanici_id);
  if (!existing) {
    throw new Error('Kullanıcı bulunamadı');
  }

  // UPDATE sorgusu
  const result = await pool
    .request()
    .input('kullanici_id', sql.Int, input.kullanici_id)
    .input('ad', sql.NVarChar(100), input.ad)
    .input('soyad', sql.NVarChar(100), input.soyad)
    .input('universite', sql.NVarChar(100), input.universite || null)
    .input('bolum', sql.NVarChar(100), input.bolum || null)
    .input('kullanici_adi', sql.NVarChar(100), input.kullanici_adi || null)
    .input('dogum_yili', sql.Int, input.dogum_yili || null)
    .input('cinsiyet', sql.NVarChar(50), input.cinsiyet || null)
    .query(`
      UPDATE dbo.Kullanicilar
      SET 
        ad = @ad,
        soyad = @soyad,
        universite = @universite,
        bolum = @bolum,
        kullanici_adi = @kullanici_adi,
        dogum_yili = @dogum_yili,
        cinsiyet = @cinsiyet
      OUTPUT INSERTED.kullanici_id, INSERTED.ad, INSERTED.soyad, INSERTED.email, 
             INSERTED.universite, INSERTED.bolum, INSERTED.kullanici_adi, 
             INSERTED.dogum_yili, INSERTED.cinsiyet
      WHERE kullanici_id = @kullanici_id AND silindi = 0
    `);

  // rowsAffected kontrolü
  const rowsAffected = result.rowsAffected[0];
  console.log('UPDATE rowsAffected:', rowsAffected);

  if (rowsAffected === 0) {
    throw new Error('Kullanıcı bulunamadı veya güncellenemedi');
  }

  if (result.recordset.length === 0) {
    throw new Error('Güncellenmiş kullanıcı bilgisi alınamadı');
  }

  return {
    user: result.recordset[0] as User,
    rowsAffected,
  };
}
