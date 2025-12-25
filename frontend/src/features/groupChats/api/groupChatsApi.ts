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

/**
 * Mock data fallback
 */
const MOCK_GROUPS: Group[] = [
  {
    grup_id: 1,
    grup_adi: "Final Çalışma Grubu",
    lastMessage: {
      mesaj: "Yarın saat 14:00'te buluşalım mı?",
      tarih: new Date(Date.now() - 1000 * 60 * 30), // 30 dakika önce
    },
    unreadCount: 2,
  },
  {
    grup_id: 2,
    grup_adi: "Staj Yardımlaşma",
    lastMessage: {
      mesaj: "Staj başvuruları başladı!",
      tarih: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 saat önce
    },
    unreadCount: 0,
  },
];

const MOCK_MESSAGES: GroupMessage[] = [
  {
    mesaj_id: 1,
    grup_id: 1,
    gonderen_id: 2,
    mesaj: "Merhaba herkese!",
    tarih: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    mesaj_id: 2,
    grup_id: 1,
    gonderen_id: 1,
    mesaj: "Merhaba! Nasılsın?",
    tarih: new Date(Date.now() - 1000 * 60 * 60),
  },
];

const MOCK_MEMBERS: GroupMember[] = [
  {
    kullanici_id: 1,
    ad: "Ahmet",
    soyad: "Yılmaz",
    rol: "admin",
  },
  {
    kullanici_id: 2,
    ad: "Ayşe",
    soyad: "Demir",
    rol: "uye",
  },
  {
    kullanici_id: 3,
    ad: "Mehmet",
    soyad: "Kaya",
    rol: "uye",
  },
];

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
  try {
    const response = await api.get<MessagesResponse>(`/api/groups/${grupId}/messages`, {
      params,
    });
    return response.data.items;
  } catch (err) {
    console.warn("Messages API failed, using mock data:", err);
    return MOCK_MESSAGES.filter((m) => m.grup_id === grupId);
  }
}

/**
 * Grup mesajı gönder
 */
export async function sendMessage(
  grupId: number,
  payload: CreateMessageRequest
): Promise<GroupMessage> {
  try {
    const response = await api.post<CreateMessageResponse>(
      `/api/groups/${grupId}/messages`,
      payload
    );
    return response.data.item;
  } catch (err) {
    console.error("Send message failed:", err);
    throw err;
  }
}

/**
 * Grup üyelerini getir
 */
export async function fetchMembers(grupId: number): Promise<GroupMember[]> {
  try {
    const response = await api.get<MembersResponse>(`/api/groups/${grupId}/members`);
    return response.data.items;
  } catch (err) {
    console.warn("Members API failed, using mock data:", err);
    return MOCK_MEMBERS;
  }
}

/**
 * Mesajları okundu işaretle
 */
export async function markRead(
  grupId: number,
  payload: { kullanici_id: number; last_mesaj_id: number }
): Promise<void> {
  try {
    await api.post(`/api/groups/${grupId}/read`, payload);
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

