export interface Message {
  mesajlasma_id: number;
  gonderen_id: number;
  mesaj: string;
  tarih: Date;
  okundu: boolean;
}

export interface Conversation {
  conversation_id: number;
  user_id: number;
  user_name: string;
  last_message: string;
  last_message_time: Date;
  unread_count: number;
  isBlocked?: boolean;
  isMuted?: boolean;
}

