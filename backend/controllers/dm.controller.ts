import { Request, Response } from 'express';
import { io } from '../index';
import {
  getConversations,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  muteUser,
  unmuteUser,
  blockUser,
  unblockUser,
  isBlocked,
} from '../services/dm.service';
import { createNotification } from '../services/notifications.service';

/**
 * GET /api/dm/conversations
 * Kullanıcının konuşmalarını getir
 * req.user.id = @me olarak kabul et (varsa), yoksa x-user-id header'ını kullan
 */
export async function handleGetConversations(req: Request, res: Response) {
  try {
    // req.user.id varsa onu kullan (gelecekte auth middleware ile)
    // yoksa x-user-id header'ını kullan
    const currentUserId = (req as any).user?.id 
      ? Number((req as any).user.id)
      : Number(req.headers['x-user-id']);

    if (!currentUserId || Number.isNaN(currentUserId)) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı',
      });
    }

    const conversations = await getConversations(currentUserId);

    return res.json({
      success: true,
      items: conversations,
    });
  } catch (err: any) {
    console.error('Get conversations error:', err);
    // Hata durumunda bile 200 dön ama boş array ile
    return res.json({
      success: true,
      items: [],
    });
  }
}

/**
 * GET /api/dm/messages?withUserId=XX
 * İki kullanıcı arasındaki mesajları getir
 * req.user.id = @me olarak kabul et (varsa), yoksa x-user-id header'ını kullan
 */
export async function handleGetMessages(req: Request, res: Response) {
  try {
    // req.user.id varsa onu kullan (gelecekte auth middleware ile)
    // yoksa x-user-id header'ını kullan
    const currentUserId = (req as any).user?.id 
      ? Number((req as any).user.id)
      : Number(req.headers['x-user-id']);

    if (!currentUserId || Number.isNaN(currentUserId)) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı',
      });
    }

    // withUserId query paramını doğru oku (number parse et)
    const withUserIdParam = req.query.withUserId;
    if (!withUserIdParam) {
      return res.status(400).json({
        success: false,
        message: 'withUserId query parametresi zorunludur',
      });
    }

    const withUserId = Number(withUserIdParam);
    if (Number.isNaN(withUserId)) {
      return res.status(400).json({
        success: false,
        message: 'withUserId geçerli bir sayı olmalıdır',
      });
    }

    const result = await getMessages(currentUserId, withUserId);

    return res.json({
      success: true,
      mesajlasmaId: result.mesajlasmaId,
      items: result.items,
    });
  } catch (err: any) {
    console.error('❌ Get messages error:', {
      message: err?.message,
      originalError: err?.originalError?.message,
      code: err?.code,
      sqlState: err?.sqlState,
      sqlMessage: err?.sqlMessage,
      stack: err?.stack,
    });
    // Hata durumunda bile 200 dön ama boş array ile (500 dönmesin)
    return res.json({
      success: true,
      mesajlasmaId: null,
      items: [],
    });
  }
}

/**
 * POST /api/dm/messages
 * Mesaj gönder
 */
export async function handleSendMessage(req: Request, res: Response) {
  try {
    const userIdHeader = req.headers['x-user-id'] as string;
    const { toUserId, text } = req.body;

    if (!userIdHeader || Number.isNaN(Number(userIdHeader))) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı',
      });
    }

    if (!toUserId || Number.isNaN(Number(toUserId))) {
      return res.status(400).json({
        success: false,
        message: 'toUserId zorunludur',
      });
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Mesaj metni zorunludur',
      });
    }

    const currentUserId = Number(userIdHeader);
    const messageResult = await sendMessage(currentUserId, Number(toUserId), text.trim());
    
    // Socket.IO emit: DB insert başarılı olduktan sonra
    try {
      const roomId = (messageResult as any).roomId || (messageResult as any).mesajlasma_id;
      if (roomId && io) {
        const roomName = `dm-${roomId}`;
        io.to(roomName).emit('dm:newMessage', {
          mesaj_id: messageResult.mesaj_id,
          mesajlasma_id: roomId,
          gonderen_id: messageResult.gonderen_id,
          alici_id: messageResult.alici_id,
          mesaj: messageResult.mesaj,
          tarih: messageResult.tarih,
          okundu: false,
        });
        console.log(`✅ Socket emit: dm:newMessage to room ${roomName}`);
      }
    } catch (socketErr: any) {
      // Socket hatası mesaj gönderimini engellemez, sadece logla
      console.error('⚠️ Socket emit error (message still saved):', socketErr);
    }

    // Bildirim oluştur ve gönder (alıcı için)
    try {
      await createNotification({
        kullanici_id: messageResult.alici_id,
        soru_id: null,
        cevap_id: null,
        mesaj: 'Yeni mesajın var',
        tip: 'dm',
      });
    } catch (notifErr: any) {
      console.error('⚠️ Notification create/emit error (message still sent):', notifErr?.message || notifErr);
    }

    return res.status(201).json({
      success: true,
      item: messageResult,
    });
  } catch (err: any) {
    console.error('[DM][POST /messages]', {
      message: err?.message,
      number: err?.originalError?.number,
      code: err?.code || err?.originalError?.code,
      proc: err?.originalError?.procName,
      line: err?.originalError?.lineNumber,
      serverName: err?.originalError?.serverName,
      originalError: err?.originalError?.message,
      stack: err?.stack,
      toUserId: req.body?.toUserId,
      textLength: req.body?.text?.length,
      currentUserId: req.headers['x-user-id'],
      endpoint: 'POST /api/dm/messages',
      aliciId: req.body?.toUserId,
      messageLength: req.body?.text?.length || 0,
      currentUserId: req.headers['x-user-id'],
    });
    
    if (err?.message === 'Kullanıcı engelli' || err?.message === 'Bu kullanıcıya mesaj gönderemezsiniz') {
      return res.status(403).json({
        success: false,
        message: err.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: err?.message || 'Mesaj gönderilirken hata oluştu',
    });
  }
}

/**
 * POST /api/dm/messages/read
 * Mesajları okundu işaretle
 * Body: { mesajlasmaId } veya { withUserId } gelebilir. İkisini de destekle.
 * req.user.id = @me olarak kabul et (varsa), yoksa x-user-id header'ını kullan
 */
export async function handleMarkRead(req: Request, res: Response) {
  try {
    // req.user.id varsa onu kullan (gelecekte auth middleware ile)
    // yoksa x-user-id header'ını kullan
    const currentUserId = (req as any).user?.id 
      ? Number((req as any).user.id)
      : Number(req.headers['x-user-id']);

    if (!currentUserId || Number.isNaN(currentUserId)) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı',
      });
    }

    const { mesajlasmaId, withUserId } = req.body;

    // mesajlasmaId veya withUserId'den biri olmalı
    if (!mesajlasmaId && !withUserId) {
      return res.status(400).json({
        success: false,
        message: 'mesajlasmaId veya withUserId zorunludur',
      });
    }

    // Number parse et
    const parsedMesajlasmaId = mesajlasmaId ? Number(mesajlasmaId) : null;
    const parsedWithUserId = withUserId ? Number(withUserId) : null;

    if (parsedMesajlasmaId !== null && Number.isNaN(parsedMesajlasmaId)) {
      return res.status(400).json({
        success: false,
        message: 'mesajlasmaId geçerli bir sayı olmalıdır',
      });
    }

    if (parsedWithUserId !== null && Number.isNaN(parsedWithUserId)) {
      return res.status(400).json({
        success: false,
        message: 'withUserId geçerli bir sayı olmalıdır',
      });
    }

    await markMessagesAsRead(currentUserId, parsedMesajlasmaId, parsedWithUserId);

    return res.json({
      success: true,
    });
  } catch (err: any) {
    console.error('❌ Mark read error:', {
      message: err?.message,
      originalError: err?.originalError?.message,
      code: err?.code,
      sqlState: err?.sqlState,
      sqlMessage: err?.sqlMessage,
      stack: err?.stack,
    });
    // Hata durumunda bile 200 dön (500 dönmesin)
    return res.json({
      success: true,
    });
  }
}

/**
 * POST /api/dm/mute
 * Kullanıcıyı sessize al
 */
export async function handleMuteUser(req: Request, res: Response) {
  try {
    const userIdHeader = req.headers['x-user-id'] as string;
    const { targetUserId, until } = req.body;

    if (!userIdHeader || Number.isNaN(Number(userIdHeader))) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı',
      });
    }

    if (!targetUserId || Number.isNaN(Number(targetUserId))) {
      return res.status(400).json({
        success: false,
        message: 'targetUserId zorunludur',
      });
    }

    const currentUserId = Number(userIdHeader);
    const untilDate = until ? new Date(until) : null;

    await muteUser(currentUserId, Number(targetUserId), untilDate);

    return res.json({
      success: true,
      message: 'Kullanıcı sessize alındı',
    });
  } catch (err: any) {
    console.error('Mute user error:', err);
    return res.status(500).json({
      success: false,
      message: 'Kullanıcı sessize alınırken hata oluştu',
    });
  }
}

/**
 * DELETE /api/dm/mute/:targetUserId
 * Sessize almayı kaldır
 */
export async function handleUnmuteUser(req: Request, res: Response) {
  try {
    const userIdHeader = req.headers['x-user-id'] as string;
    const targetUserId = req.params.targetUserId ? Number(req.params.targetUserId) : null;

    if (!userIdHeader || Number.isNaN(Number(userIdHeader))) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı',
      });
    }

    if (!targetUserId || Number.isNaN(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'targetUserId zorunludur',
      });
    }

    const currentUserId = Number(userIdHeader);
    await unmuteUser(currentUserId, targetUserId);

    return res.json({
      success: true,
      message: 'Sessize alma kaldırıldı',
    });
  } catch (err: any) {
    console.error('Unmute user error:', err);
    return res.status(500).json({
      success: false,
      message: 'Sessize alma kaldırılırken hata oluştu',
    });
  }
}

/**
 * POST /api/dm/block
 * Kullanıcıyı engelle
 */
export async function handleBlockUser(req: Request, res: Response) {
  try {
    const userIdHeader = req.headers['x-user-id'] as string;
    const { targetUserId } = req.body;

    if (!userIdHeader || Number.isNaN(Number(userIdHeader))) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı',
      });
    }

    if (!targetUserId || Number.isNaN(Number(targetUserId))) {
      return res.status(400).json({
        success: false,
        message: 'targetUserId zorunludur',
      });
    }

    const currentUserId = Number(userIdHeader);
    await blockUser(currentUserId, Number(targetUserId));

    return res.json({
      success: true,
      message: 'Kullanıcı engellendi',
    });
  } catch (err: any) {
    console.error('Block user error:', err);
    return res.status(500).json({
      success: false,
      message: 'Kullanıcı engellenirken hata oluştu',
    });
  }
}

/**
 * DELETE /api/dm/block/:targetUserId
 * Engeli kaldır
 */
export async function handleUnblockUser(req: Request, res: Response) {
  try {
    const userIdHeader = req.headers['x-user-id'] as string;
    const targetUserId = req.params.targetUserId ? Number(req.params.targetUserId) : null;

    if (!userIdHeader || Number.isNaN(Number(userIdHeader))) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı',
      });
    }

    if (!targetUserId || Number.isNaN(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'targetUserId zorunludur',
      });
    }

    const currentUserId = Number(userIdHeader);
    await unblockUser(currentUserId, targetUserId);

    return res.json({
      success: true,
      message: 'Engel kaldırıldı',
    });
  } catch (err: any) {
    console.error('Unblock user error:', err);
    return res.status(500).json({
      success: false,
      message: 'Engel kaldırılırken hata oluştu',
    });
  }
}




