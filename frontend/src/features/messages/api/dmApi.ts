import api from "../../../lib/api";

export interface Conversation {
  conversation_id: number;
  user_id: number;
  user_name: string;
  last_message?: string;
  last_message_time?: string;
  unreadCount: number;
  isBlocked?: boolean;
  isMuted?: boolean;
}

export interface DirectMessage {
  mesaj_id: number;
  gonderen_id: number;
  alici_id: number;
  mesaj: string;
  tarih: string;
  okundu_by_sender?: boolean;
  okundu_by_receiver?: boolean;
}

export interface ConversationsResponse {
  success: boolean;
  items: Conversation[];
}

export interface MessagesResponse {
  success: boolean;
  items: DirectMessage[];
}

export interface SendMessageRequest {
  toUserId: number;
  text: string;
}

export interface SendMessageResponse {
  success: boolean;
  item: DirectMessage;
}

export interface MarkReadRequest {
  withUserId: number;
}

export interface MarkReadResponse {
  success: boolean;
  updatedCount: number;
}

export interface MuteUserRequest {
  targetUserId: number;
  until?: string | null;
}

export interface BlockUserRequest {
  targetUserId: number;
}

/**
 * Konuşmaları getir
 * API response'u normalize eder: Backend'den gelen formatı frontend formatına çevirir
 */
export async function getConversations(): Promise<Conversation[]> {
  try {
    const response = await api.get<ConversationsResponse>("/api/dm/conversations");
    
    // Response'u normalize et
    const raw = response.data;
    const items = Array.isArray(raw) ? raw : (raw?.items ?? []);
    
    // Backend formatından frontend formatına dönüştür
    return items.map((item: any) => ({
      conversation_id: item.mesajlasmaId ?? item.conversation_id ?? 0,
      user_id: item.otherUserId ?? item.user_id ?? 0,
      user_name: item.otherUserName ?? item.user_name ?? item.kullanici_adi ?? item.adSoyad ?? item.ad ?? "Bilinmeyen",
      last_message: item.lastMessageText ?? item.last_message ?? "",
      last_message_time: item.lastMessageAt 
        ? new Date(item.lastMessageAt)
        : (item.last_message_time ? new Date(item.last_message_time) : new Date()),
      unread_count: item.unreadCount ?? item.unread_count ?? 0,
      isBlocked: item.isBlocked ?? false,
      isMuted: item.isMuted ?? false,
    }));
  } catch (err) {
    console.error("Get conversations failed:", err);
    return [];
  }
}

/**
 * Mesajları getir
 */
export async function getMessages(withUserId: number): Promise<DirectMessage[]> {
  try {
    const response = await api.get<MessagesResponse>("/api/dm/messages", {
      params: { withUserId },
    });
    return response.data.items;
  } catch (err) {
    console.error("Get messages failed:", err);
    return [];
  }
}

/**
 * Mesaj gönder
 */
export async function sendMessage(toUserId: number, text: string): Promise<DirectMessage> {
  const response = await api.post<SendMessageResponse>("/api/dm/messages", {
    toUserId,
    text,
  });
  return response.data.item;
}

/**
 * Mesajları okundu işaretle
 */
export async function markRead(withUserId: number): Promise<number> {
  try {
    const response = await api.post<MarkReadResponse>("/api/dm/messages/read", {
      withUserId,
    });
    return response.data.updatedCount;
  } catch (err) {
    console.error("Mark read failed:", err);
    return 0;
  }
}

/**
 * Kullanıcıyı sessize al
 */
export async function muteUser(targetUserId: number, until?: Date | null): Promise<void> {
  await api.post("/api/dm/mute", {
    targetUserId,
    until: until ? until.toISOString() : null,
  });
}

/**
 * Sessize almayı kaldır
 */
export async function unmuteUser(targetUserId: number): Promise<void> {
  await api.delete(`/api/dm/mute/${targetUserId}`);
}

/**
 * Kullanıcıyı engelle
 */
export async function blockUser(targetUserId: number): Promise<void> {
  await api.post("/api/dm/block", {
    targetUserId,
  });
}

/**
 * Engeli kaldır
 */
export async function unblockUser(targetUserId: number): Promise<void> {
  await api.delete(`/api/dm/block/${targetUserId}`);
}




