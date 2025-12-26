export interface Group {
  grup_id: number;
  grup_adi: string;
  lastMessage?: {
    mesaj: string;
    tarih: Date;
    gonderen_kullanici: number;
  } | null;
  unreadCount: number;
  memberCount?: number;
}

// Standardize edilmiş mesaj formatı (backend DTO ile uyumlu)
export interface GroupMessage {
  messageId: number;
  groupId: number;
  senderId: number;
  text: string;
  sentAt: string; // ISO string
  // Opsiyonel ek bilgiler
  senderUsername?: string | null;
  readCount?: number;
  isReadByMe?: boolean;
}

export interface GroupMember {
  kullanici_id: number;
  ad?: string | null;
  soyad?: string | null;
  rol: string;
}

export interface GroupsResponse {
  success: boolean;
  items: Group[];
}

export interface MessagesResponse {
  success: boolean;
  items: GroupMessage[];
}

export interface MembersResponse {
  success: boolean;
  items: GroupMember[];
}

export interface CreateMessageRequest {
  text: string; // senderId artık header'dan geliyor
}

export interface CreateMessageResponse {
  success: boolean;
  item: GroupMessage;
}

export interface MarkReadRequest {
  kullanici_id: number;
  last_mesaj_id: number;
}










