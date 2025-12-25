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
  gonderen_id: number;
  mesaj: string;
}

export interface CreateMessageResponse {
  success: boolean;
  item: GroupMessage;
}

export interface MarkReadRequest {
  kullanici_id: number;
  last_mesaj_id: number;
}










