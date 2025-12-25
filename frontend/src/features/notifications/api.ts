import api from "../../lib/api";

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

export interface NotificationsResponse {
  success: boolean;
  items: Notification[];
}

export interface UnreadCountResponse {
  success: boolean;
  count?: number;
  unreadCount?: number;
}

/**
 * Bildirimleri getir
 */
export async function getNotifications(options?: {
  limit?: number;
  onlyUnread?: boolean;
}): Promise<Notification[]> {
  try {
    const params: any = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.onlyUnread) params.onlyUnread = options.onlyUnread;

    const response = await api.get<NotificationsResponse>("/api/notifications", { params });
    return response.data.items;
  } catch (err) {
    console.error("Get notifications failed:", err);
    return [];
  }
}

/**
 * Okunmamış bildirim sayısını getir
 */
export async function getUnreadCount(): Promise<number> {
  try {
    const response = await api.get<UnreadCountResponse>("/api/notifications/unread-count");
    const { count, unreadCount } = response.data;
    return typeof unreadCount === "number" ? unreadCount : (count ?? 0);
  } catch (err) {
    console.error("Get unread count failed:", err);
    return 0;
  }
}

/**
 * Bildirimi okundu yap
 */
export async function markNotificationAsRead(notificationId: number): Promise<void> {
  await api.patch(`/api/notifications/${notificationId}/read`);
}

/**
 * Tüm bildirimleri okundu yap
 */
export async function markAllAsRead(): Promise<number> {
  try {
    const response = await api.patch<{ success: boolean; updatedCount: number }>(
      "/api/notifications/read-all"
    );
    return response.data.updatedCount;
  } catch (err) {
    console.error("Mark all as read failed:", err);
    return 0;
  }
}




