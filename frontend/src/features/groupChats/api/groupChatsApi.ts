import api from "../../../lib/api";
import type {
  GroupsResponse,
  MessagesResponse,
  MembersResponse,
  CreateMessageRequest,
  CreateMessageResponse,
  Group,
  GroupMessage,
  GroupMember,
} from "../types";

// Mock data kaldırıldı - hata durumunda kullanıcıya hata gösterilecek

/**
 * Kullanıcının üye olduğu grupları getir
 */
export async function fetchGroups(userId: number): Promise<Group[]> {
  try {
    console.log("🔵 fetchGroups API - Calling GET /api/groups with userId:", userId);
    const response = await api.get<GroupsResponse>("/api/groups", {
      params: { userId },
    });
    console.log("✅ fetchGroups API - Response:", response.data);
    return response.data.items || [];
  } catch (err: any) {
    console.error("❌ fetchGroups API - Error:", {
      message: err?.message,
      response: err?.response?.data,
      status: err?.response?.status,
      details: err?.response?.data?.details,
      fullError: err,
    });
    
    // 500 olsa bile UI bozulmasın - hata fırlat, mock data dönme
    // Caller'da error handling yapılacak
    throw err;
  }
}

/**
 * Grup mesajlarını getir
 */
export async function fetchMessages(
  grupId: number,
  params?: { limit?: number; before?: string }
): Promise<GroupMessage[]> {
  const response = await api.get<MessagesResponse>(`/api/groups/${grupId}/messages`, {
    params,
  });
  
  if (!response.data.success) {
    throw new Error(response.data.message || 'Mesajlar getirilemedi');
  }
  
  return response.data.items || [];
}

/**
 * Grup mesajı gönder
 */
export async function sendMessage(
  grupId: number,
  payload: CreateMessageRequest
): Promise<GroupMessage> {
  const response = await api.post<CreateMessageResponse>(
    `/api/groups/${grupId}/messages`,
    payload
  );
  
  if (!response.data.success) {
    throw new Error(response.data.message || 'Mesaj gönderilemedi');
  }
  
  return response.data.item;
}

/**
 * Grup üyelerini getir
 */
export async function fetchMembers(grupId: number): Promise<GroupMember[]> {
  const response = await api.get<MembersResponse>(`/api/groups/${grupId}/members`);
  
  if (!response.data.success) {
    throw new Error(response.data.message || 'Üyeler getirilemedi');
  }
  
  return response.data.items || [];
}

/**
 * Mesajları okundu işaretle (yeni endpoint - tüm mesajları okundu işaretle)
 */
export async function markRead(grupId: number): Promise<void> {
  try {
    await api.post(`/api/groups/${grupId}/read`);
  } catch (err) {
    console.error("Mark read failed:", err);
    // Hata olsa bile devam et (non-critical)
  }
}

/**
 * Kullanıcı ara
 */
export interface SearchUser {
  kullanici_id: number;
  ad: string;
  soyad: string;
  email: string;
}

export async function searchUsers(query: string): Promise<SearchUser[]> {
  try {
    const response = await api.get<{ success: boolean; items: SearchUser[] }>("/api/users/search", {
      params: { q: query },
    });
    return response.data.items;
  } catch (err) {
    console.error("Search users failed:", err);
    return [];
  }
}

/**
 * Yeni grup oluştur
 */
export interface CreateGroupRequest {
  creator_id: number;
  grup_adi: string;
  member_ids?: number[];
}

export interface CreateGroupResponse {
  success: boolean;
  grup_id: number;
  grup_adi: string;
}

export interface CreateGroupApiResponse {
  success: boolean;
  grup_id: number;
  grup_adi: string;
}

export async function createGroup(payload: CreateGroupRequest): Promise<{ grup_id: number; grup_adi: string }> {
  console.log("🔵 createGroup API - Calling POST /api/groups with:", payload);
  try {
    const response = await api.post<CreateGroupApiResponse>("/api/groups", payload);
    console.log("✅ createGroup API - Response:", response.data);
    
    if (!response.data.success) {
      throw new Error("Grup oluşturulamadı");
    }
    
    return {
      grup_id: response.data.grup_id,
      grup_adi: response.data.grup_adi,
    };
  } catch (err: any) {
    console.error("❌ createGroup API - Error:", {
      message: err?.message,
      response: err?.response?.data,
      status: err?.response?.status,
      fullError: err,
    });
    throw err;
  }
}

