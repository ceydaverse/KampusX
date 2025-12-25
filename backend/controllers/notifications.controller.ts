import { Request, Response } from 'express';
import {
  getNotificationsByUserId,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notifications.service';

/**
 * Helper: Request'ten currentUserId'yi al
 */
function getCurrentUserId(req: Request): number | null {
  const userId = req.headers['x-user-id'];
  if (!userId) return null;
  const parsed = Number(userId);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Helper: Login kontrolü
 */
function requireAuth(req: Request): number {
  const userId = getCurrentUserId(req);
  if (!userId) {
    throw new Error('UNAUTHORIZED');
  }
  return userId;
}

/**
 * GET /api/notifications
 * Kullanıcının bildirimlerini getir
 * HATA OLSA BİLE 500 DÖNME - 200 dön: { success:true, items:[] }
 */
export async function handleGetNotifications(req: Request, res: Response) {
  try {
    const currentUserId = requireAuth(req);
    const limit = req.query.limit ? Number(req.query.limit) : 30;
    const onlyUnread = req.query.onlyUnread === 'true';

    if (Number.isNaN(limit) || limit < 1 || limit > 100) {
      // Limit hatası için bile 200 dön ama boş array ile
      return res.json({
        success: true,
        items: [],
      });
    }

    const notifications = await getNotificationsByUserId(currentUserId, {
      limit,
      onlyUnread,
    });

    return res.json({
      success: true,
      items: notifications,
    });
  } catch (err: any) {
    // KRİTİK: Her türlü hata durumunda 200 dön, boş array ile
    console.error('Get notifications error:', err);
    return res.json({
      success: true,
      items: [],
    });
  }
}

/**
 * GET /api/notifications/unread-count
 * Okunmamış bildirim sayısını getir
 * HATA OLSA BİLE 500 DÖNME - 200 dön: { success:true, unreadCount:0 }
 */
export async function handleGetUnreadCount(req: Request, res: Response) {
  try {
    const currentUserId = requireAuth(req);
    const count = await getUnreadCount(currentUserId);

    return res.json({
      success: true,
      unreadCount: count,
    });
  } catch (err: any) {
    // KRİTİK: Her türlü hata durumunda 200 dön, unreadCount: 0 ile
    console.error('Get unread count error:', err);
    return res.json({
      success: true,
      unreadCount: 0,
    });
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Bildirimi okundu yap
 */
export async function handleMarkNotificationAsRead(req: Request, res: Response) {
  try {
    const currentUserId = requireAuth(req);
    const notificationId = req.params.id ? Number(req.params.id) : null;

    if (!notificationId || Number.isNaN(notificationId)) {
      return res.status(400).json({
        success: false,
        message: 'Bildirim ID zorunludur',
      });
    }

    const updated = await markNotificationAsRead(notificationId, currentUserId);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Bildirim bulunamadı veya size ait değil',
      });
    }

    return res.json({
      success: true,
      message: 'Bildirim okundu olarak işaretlendi',
    });
  } catch (err: any) {
    if (err?.message === 'UNAUTHORIZED') {
      return res.status(401).json({
        success: false,
        message: 'Giriş yapmalısınız',
      });
    }
    console.error('Mark notification as read error:', err);
    return res.status(500).json({
      success: false,
      message: 'Bildirim okundu işaretlenirken hata oluştu',
    });
  }
}

/**
 * PATCH /api/notifications/read-all
 * Tüm bildirimleri okundu yap
 */
export async function handleMarkAllAsRead(req: Request, res: Response) {
  try {
    const currentUserId = requireAuth(req);
    const updatedCount = await markAllNotificationsAsRead(currentUserId);

    return res.json({
      success: true,
      updatedCount,
      message: `${updatedCount} bildirim okundu olarak işaretlendi`,
    });
  } catch (err: any) {
    if (err?.message === 'UNAUTHORIZED') {
      return res.status(401).json({
        success: false,
        message: 'Giriş yapmalısınız',
      });
    }
    console.error('Mark all as read error:', err);
    return res.status(500).json({
      success: false,
      message: 'Bildirimler okundu işaretlenirken hata oluştu',
    });
  }
}




