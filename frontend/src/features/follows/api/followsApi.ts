import api from "../../../lib/api";

export interface FollowStatus {
  isFollowing: boolean;
  isFollowedBy: boolean;
  isMutual: boolean;
}

export interface FollowStatusResponse {
  success: boolean;
  isFollowing: boolean;
  isFollowedBy: boolean;
  isMutual: boolean;
}

/**
 * Takip durumunu getir
 * GET /api/follows/status/:targetUserId
 */
export async function getFollowStatus(targetUserId: number): Promise<FollowStatus> {
  const response = await api.get<FollowStatusResponse>(`/api/follows/status/${targetUserId}`);
  
  if (!response.data.success) {
    throw new Error("Takip durumu getirilemedi");
  }
  
  return {
    isFollowing: response.data.isFollowing,
    isFollowedBy: response.data.isFollowedBy,
    isMutual: response.data.isMutual,
  };
}

/**
 * Kullanıcıyı takip et
 * POST /api/follows/:targetUserId
 */
export async function followUser(targetUserId: number): Promise<void> {
  const response = await api.post<{ success: boolean; message?: string }>(`/api/follows/${targetUserId}`);
  
  if (!response.data.success) {
    throw new Error(response.data.message || "Takip edilemedi");
  }
}

/**
 * Kullanıcıyı takipten çık
 * DELETE /api/follows/:targetUserId
 */
export async function unfollowUser(targetUserId: number): Promise<void> {
  const response = await api.delete<{ success: boolean; message?: string }>(`/api/follows/${targetUserId}`);
  
  if (!response.data.success) {
    throw new Error(response.data.message || "Takipten çıkılamadı");
  }
}










