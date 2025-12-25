export interface Notification {
  bildirim_id: number;
  kullanici_id: number;
  soru_id?: number | null;
  cevap_id?: number | null;
  mesaj: string;
  tip: string;
  tarih: string;
  okundu: boolean;
  okundu_tarih?: string | null;
  actor?: {
    id: number;
    username?: string;
    ad?: string;
    soyad?: string;
  };
}










