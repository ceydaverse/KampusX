import { Request, Response } from 'express';
import {
  getGroupsByUserId,
  getGroupMessages,
  createGroupMessage,
  getGroupMembers,
  markMessagesAsRead,
  markAllGroupMessagesAsRead,
  createGroup,
  isUserGroupMember,
} from '../services/groups.service';

/**
 * GET /api/groups?userId=1
 * Kullanıcının üye olduğu grupları getir
 */
export async function handleGetGroups(req: Request, res: Response) {
  try {
    const userIdRaw = req.query.userId;
    const userId = userIdRaw ? Number(userIdRaw) : null;

    // userId validation
    if (!Number.isFinite(userId) || userId === null) {
      return res.status(400).json({
        success: false,
        message: 'userId geçersiz',
      });
    }

    const groups = await getGroupsByUserId(userId);

    return res.json({
      success: true,
      items: groups,
    });
  } catch (err: any) {
    console.error('[handleGetGroups] ERROR:', {
      userId: req.query.userId,
      message: err?.message,
      code: err?.code || err?.number,
      original: err?.originalError?.message,
      stack: err?.stack,
      sqlNumber: err?.originalError?.number,
      sqlState: err?.originalError?.state,
      sqlLine: err?.originalError?.lineNumber,
    });
    
    return res.status(500).json({
      success: false,
      message: 'Gruplar getirilirken hata oluştu',
      ...(process.env.NODE_ENV !== 'production' && {
        detail: err?.originalError?.message || err?.message,
        sqlNumber: err?.originalError?.number,
      }),
    });
  }
}

/**
 * GET /api/groups/:grupId/messages?limit=50&before=<iso?>
 * Grup mesajlarını getir
 */
export async function handleGetGroupMessages(req: Request, res: Response) {
  try {
    // Auth kontrolü
    const userIdHeader = req.headers['x-user-id'] as string;
    if (!userIdHeader) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const userId = Number(userIdHeader);
    if (Number.isNaN(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const grupId = Number(req.params.grupId);

    if (Number.isNaN(grupId)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz grup ID',
      });
    }

    // Yetki kontrolü - kullanıcı grubun üyesi mi?
    const isMember = await isUserGroupMember(grupId, userId);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Bu grubun üyesi değilsiniz',
      });
    }

    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const before = req.query.before ? new Date(req.query.before as string) : undefined;

    console.log('[handleGetGroupMessages] grupId:', grupId, 'userId:', userId, 'limit:', limit, 'before:', before);

    // Mesajları getir (currentUserId ile read receipt bilgisi)
    const messages = await getGroupMessages(grupId, limit, before, userId);

    return res.json({
      success: true,
      items: messages,
    });
  } catch (err: any) {
    console.error('❌ GET GROUP MESSAGES ERROR:', {
      message: err?.message,
      code: err?.code || err?.number,
      original: err?.originalError?.message,
      stack: err?.stack,
      grupId: req.params.grupId,
    });

    return res.status(500).json({
      success: false,
      message: 'Mesajlar getirilirken hata oluştu',
      ...(process.env.NODE_ENV !== 'production' && {
        detail: err?.originalError?.message || err?.message,
      }),
    });
  }
}

/**
 * POST /api/groups/:grupId/messages
 * Grup mesajı ekle
 */
export async function handleCreateGroupMessage(req: Request, res: Response) {
  try {
    // Auth kontrolü
    const userIdHeader = req.headers['x-user-id'] as string;
    if (!userIdHeader) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const userId = Number(userIdHeader);
    if (Number.isNaN(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const grupId = Number(req.params.grupId);

    if (Number.isNaN(grupId)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz grup ID',
      });
    }

    // Yetki kontrolü - kullanıcı grubun üyesi mi?
    const isMember = await isUserGroupMember(grupId, userId);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Bu grubun üyesi değilsiniz',
      });
    }

    // Request body'den mesajı al (text alanı)
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'text zorunludur ve boş olamaz',
      });
    }

    if (text.trim().length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'Mesaj en fazla 5000 karakter olabilir',
      });
    }

    // Mesajı oluştur (senderId header'dan gelen userId)
    const newMessage = await createGroupMessage(grupId, userId, text.trim());

    // Socket.IO ile yeni mesaj event'ini yayınla
    const { getIO } = await import('../socket/realtime');
    const io = getIO();
    if (io) {
      io.to(`group-${grupId}`).emit('group:newMessage', {
        groupId: grupId,
        messageId: newMessage.messageId,
        senderId: userId,
        text: text.trim(),
        sentAt: newMessage.sentAt,
      });
    }

    return res.status(201).json({
      success: true,
      item: newMessage,
    });
  } catch (err: any) {
    console.error('❌ CREATE GROUP MESSAGE ERROR:', {
      message: err?.message,
      code: err?.code || err?.number,
      original: err?.originalError?.message,
      stack: err?.stack,
      grupId: req.params.grupId,
      body: req.body,
    });

    return res.status(500).json({
      success: false,
      message: 'Mesaj gönderilirken hata oluştu',
      ...(process.env.NODE_ENV !== 'production' && {
        detail: err?.originalError?.message || err?.message,
      }),
    });
  }
}

/**
 * GET /api/groups/:grupId/members
 * Grup üyelerini getir
 */
export async function handleGetGroupMembers(req: Request, res: Response) {
  try {
    const grupId = Number(req.params.grupId);

    if (Number.isNaN(grupId)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz grup ID',
      });
    }

    const members = await getGroupMembers(grupId);

    return res.json({
      success: true,
      items: members,
    });
  } catch (err: any) {
    console.error('Get group members error:', err);
    return res.status(500).json({
      success: false,
      message: 'Üyeler getirilirken hata oluştu',
    });
  }
}

/**
 * POST /api/groups/:grupId/read
 * Mesajları okundu işaretle
 */
/**
 * POST /api/groups
 * Yeni grup oluştur
 */
export async function handleCreateGroup(req: Request, res: Response) {
  try {
    // Auth'dan kullanıcı ID'sini al (x-user-id header'dan)
    const userIdHeader = req.headers['x-user-id'] as string;
    if (!userIdHeader) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const creatorUserId = Number(userIdHeader);
    if (Number.isNaN(creatorUserId) || creatorUserId <= 0) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { grup_adi, member_ids } = req.body;

    console.log("🔵 handleCreateGroup - Request body:", {
      grup_adi,
      member_ids,
    });
    console.log("🔵 handleCreateGroup - Creator userId from header:", creatorUserId);

    // Validation - grup_adi zorunlu
    if (!grup_adi || typeof grup_adi !== 'string' || grup_adi.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Grup adı zorunludur ve boş olamaz',
      });
    }

    if (grup_adi.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Grup adı en az 3 karakter olmalıdır',
      });
    }

    // member_ids validation (opsiyonel ama array olmalı)
    let memberIdsArray: number[] = [];
    if (member_ids) {
      if (!Array.isArray(member_ids)) {
        return res.status(400).json({
          success: false,
          message: 'member_ids bir array olmalıdır',
        });
      }
      memberIdsArray = member_ids
        .map((id: any) => Number(id))
        .filter((id: number) => !Number.isNaN(id) && id > 0);
    }

    console.log("🔵 handleCreateGroup - Calling createGroup service with:", {
      creator_id: creatorUserId,
      grup_adi: grup_adi.trim(),
      member_ids: memberIdsArray,
    });

    const result = await createGroup({
      creator_id: creatorUserId,
      grup_adi: grup_adi.trim(),
      member_ids: memberIdsArray,
    });

    console.log("✅ handleCreateGroup - Group created successfully:", result);

    return res.status(201).json({
      success: true,
      grup_id: result.grup_id,
      grup_adi: result.grup_adi,
    });
  } catch (err: any) {
    console.error('❌ handleCreateGroup - Error:', {
      message: err?.message,
      stack: err?.stack,
      sqlError: err?.originalError?.message,
      sqlNumber: err?.originalError?.number,
      fullError: err,
    });
    
    return res.status(500).json({
      success: false,
      message: err?.message || 'Grup oluşturulurken hata oluştu',
      ...(process.env.NODE_ENV !== 'production' && {
        detail: err?.originalError?.message || err?.message,
      }),
    });
  }
}

/**
 * POST /api/groups/:grupId/read
 * Bu gruptaki tüm mesajları okundu işaretle
 */
export async function handleMarkMessagesAsRead(req: Request, res: Response) {
  try {
    // Auth kontrolü
    const userIdHeader = req.headers['x-user-id'] as string;
    if (!userIdHeader) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const userId = Number(userIdHeader);
    if (Number.isNaN(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const grupId = Number(req.params.grupId);

    if (Number.isNaN(grupId)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz grup ID',
      });
    }

    // Yetki kontrolü - kullanıcı grubun üyesi mi?
    const isMember = await isUserGroupMember(grupId, userId);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Bu grubun üyesi değilsiniz',
      });
    }

    console.log('[handleMarkMessagesAsRead] grupId:', grupId, 'userId:', userId);

    // Tüm mesajları okundu işaretle
    const markedCount = await markAllGroupMessagesAsRead(grupId, userId);

    // Socket.IO ile okundu güncellemesini bildir
    const { getIO } = await import('../socket/realtime');
    const io = getIO();
    if (io) {
      io.to(`group-${grupId}`).emit('group:readUpdate', {
        groupId: grupId,
      });
    }

    return res.json({
      success: true,
      message: 'Mesajlar okundu olarak işaretlendi',
      markedCount,
    });
  } catch (err: any) {
    console.error('Mark messages as read error:', err);
    return res.status(500).json({
      success: false,
      message: 'Mesajlar işaretlenirken hata oluştu',
    });
  }
}

