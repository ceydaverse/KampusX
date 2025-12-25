import { getPool, sql } from '../db';

/**
 * Takip durumunu getir
 * @param currentUserId - Giriş yapan kullanıcı ID
 * @param targetUserId - Takip durumu kontrol edilecek kullanıcı ID
 */
export async function getFollowStatus(
  currentUserId: number,
  targetUserId: number
): Promise<{
  isFollowing: boolean;
  isFollowedBy: boolean;
  isMutual: boolean;
}> {
  const pool = await getPool();

  // Kendi kendini takip edemez
  if (currentUserId === targetUserId) {
    return {
      isFollowing: false,
      isFollowedBy: false,
      isMutual: false,
    };
  }

  // currentUserId -> targetUserId takip durumu
  const followingResult = await pool
    .request()
    .input('takip_eden_id', sql.Int, currentUserId)
    .input('takip_edilen_id', sql.Int, targetUserId)
    .query(`
      SELECT COUNT(*) as count
      FROM dbo.Kullanici_Takip
      WHERE takip_eden_id = @takip_eden_id
        AND takip_edilen_id = @takip_edilen_id
    `);

  const isFollowing = (followingResult.recordset[0]?.count || 0) > 0;

  // targetUserId -> currentUserId takip durumu
  const followedByResult = await pool
    .request()
    .input('takip_eden_id', sql.Int, targetUserId)
    .input('takip_edilen_id', sql.Int, currentUserId)
    .query(`
      SELECT COUNT(*) as count
      FROM dbo.Kullanici_Takip
      WHERE takip_eden_id = @takip_eden_id
        AND takip_edilen_id = @takip_edilen_id
    `);

  const isFollowedBy = (followedByResult.recordset[0]?.count || 0) > 0;

  return {
    isFollowing,
    isFollowedBy,
    isMutual: isFollowing && isFollowedBy,
  };
}

/**
 * Kullanıcıyı takip et
 * @param currentUserId - Giriş yapan kullanıcı ID
 * @param targetUserId - Takip edilecek kullanıcı ID
 */
export async function followUser(
  currentUserId: number,
  targetUserId: number
): Promise<void> {
  const pool = await getPool();

  // Kendi kendini takip edemez
  if (currentUserId === targetUserId) {
    throw new Error('Kendi kendinizi takip edemezsiniz');
  }

  try {
    await pool
      .request()
      .input('takip_eden_id', sql.Int, currentUserId)
      .input('takip_edilen_id', sql.Int, targetUserId)
      .query(`
        INSERT INTO dbo.Kullanici_Takip (takip_eden_id, takip_edilen_id)
        VALUES (@takip_eden_id, @takip_edilen_id)
      `);
  } catch (err: any) {
    // UNIQUE constraint ihlali (zaten takip ediyor)
    if (err?.originalError?.number === 2627) {
      // Zaten takip ediyorsa başarılı kabul et
      return;
    }
    throw err;
  }
}

/**
 * Kullanıcıyı takipten çık
 * @param currentUserId - Giriş yapan kullanıcı ID
 * @param targetUserId - Takipten çıkılacak kullanıcı ID
 */
export async function unfollowUser(
  currentUserId: number,
  targetUserId: number
): Promise<void> {
  const pool = await getPool();

  await pool
    .request()
    .input('takip_eden_id', sql.Int, currentUserId)
    .input('takip_edilen_id', sql.Int, targetUserId)
    .query(`
      DELETE FROM dbo.Kullanici_Takip
      WHERE takip_eden_id = @takip_eden_id
        AND takip_edilen_id = @takip_edilen_id
    `);
}





