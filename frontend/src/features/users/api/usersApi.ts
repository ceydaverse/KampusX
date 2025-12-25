import api from "../../../lib/api";

export interface SearchUser {
  kullanici_id: number;
  ad: string;
  soyad: string;
  email: string;
}

export interface SearchUsersResponse {
  success: boolean;
  items: SearchUser[];
}

/**
 * Kullanıcı ara
 * GET /api/users/search?q=...
 */
export async function searchUsers(query: string, limit: number = 10): Promise<SearchUser[]> {
  try {
    console.log("[DM SEARCH] q=", query);
    console.log("[DM SEARCH] GET /api/users/search", query);
    
    const response = await api.get("/api/users/search", {
      params: { q: query, limit },
    });
    
    console.log("[DM SEARCH] status=", response.status, "data=", response.data);
    
    // Güvenli response parse
    const data = response.data;
    let list: SearchUser[] = [];
    
    if (Array.isArray(data)) {
      list = data;
    } else if (data && typeof data === 'object') {
      list = data.users ?? data.items ?? data.data ?? [];
    }
    
    // Eğer success field varsa kontrol et
    if (data.success === false) {
      throw new Error(data.message || "Arama başarısız");
    }
    
    return list;
  } catch (err: any) {
    const status = err?.response?.status;
    const errorData = err?.response?.data;
    console.error("[DM SEARCH] error", status, errorData, err);
    throw err;
  }
}

