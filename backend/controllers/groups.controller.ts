import { Request, Response } from 'express';
import {
  getGroupsByUserId,
  getGroupMessages,
  createGroupMessage,
  getGroupMembers,
  markMessagesAsRead,
  createGroup,
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
    console.error('SQL ERROR (GET GROUPS):', {
      userId: req.query.userId,
      message: err?.message,
      code: err?.code || err?.number,
      original: err?.originalError?.message,
      stack: err?.stack,
    });
    
    return res.status(500).json({
      success: false,
      message: 'Gruplar getirilirken hata oluştu',
      ...(process.env.NODE_ENV !== 'production' && {
        detail: err?.originalError?.message || err?.message,
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
    const grupId = Number(req.params.grupId);

    if (Number.isNaN(grupId)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz grup ID',
      });
    }

    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const before = req.query.before ? new Date(req.query.before as string) : undefined;

    const messages = await getGroupMessages(grupId, limit, before);

    return res.json({
      success: true,
      items: messages,
    });
  } catch (err: any) {
    console.error('Get group messages error:', err);
    return res.status(500).json({
      success: false,
      message: 'Mesajlar getirilirken hata oluştu',
    });
  }
}

/**
 * POST /api/groups/:grupId/messages
 * Grup mesajı ekle
 */
export async function handleCreateGroupMessage(req: Request, res: Response) {
  try {
    const grupId = Number(req.params.grupId);

    if (Number.isNaN(grupId)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz grup ID',
      });
    }

    const { gonderen_id, mesaj } = req.body;

    if (!gonderen_id || Number.isNaN(Number(gonderen_id))) {
      return res.status(400).json({
        success: false,
        message: 'gonderen_id zorunludur',
      });
    }

    if (!mesaj || typeof mesaj !== 'string' || mesaj.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'mesaj zorunludur ve boş olamaz',
      });
    }

    if (mesaj.trim().length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'Mesaj en fazla 5000 karakter olabilir',
      });
    }

    const newMessage = await createGroupMessage(grupId, Number(gonderen_id), mesaj.trim());

    return res.status(201).json({
      success: true,
      item: newMessage,
    });
  } catch (err: any) {
    console.error('Create group message error:', err);
    return res.status(500).json({
      success: false,
      message: 'Mesaj gönderilirken hata oluştu',
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
    const { creator_id, grup_adi, member_ids } = req.body;

    console.log("🔵 handleCreateGroup - Request body:", {
      creator_id,
      grup_adi,
      member_ids,
    });

    // Validation
    if (!creator_id || Number.isNaN(Number(creator_id))) {
      return res.status(400).json({
        success: false,
        message: 'creator_id zorunludur',
      });
    }

    if (!grup_adi || typeof grup_adi !== 'string' || grup_adi.trim().length < 3) {
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
      creator_id: Number(creator_id),
      grup_adi: grup_adi.trim(),
      member_ids: memberIdsArray,
    });

    const result = await createGroup({
      creator_id: Number(creator_id),
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
      fullError: err,
    });
    return res.status(500).json({
      success: false,
      message: err?.message || 'Grup oluşturulurken hata oluştu',
    });
  }
}

export async function handleMarkMessagesAsRead(req: Request, res: Response) {
  try {
    const grupId = Number(req.params.grupId);

    if (Number.isNaN(grupId)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz grup ID',
      });
    }

    const { kullanici_id, last_mesaj_id } = req.body;

    if (!kullanici_id || Number.isNaN(Number(kullanici_id))) {
      return res.status(400).json({
        success: false,
        message: 'kullanici_id zorunludur',
      });
    }

    if (!last_mesaj_id || Number.isNaN(Number(last_mesaj_id))) {
      return res.status(400).json({
        success: false,
        message: 'last_mesaj_id zorunludur',
      });
    }

    await markMessagesAsRead(grupId, Number(kullanici_id), Number(last_mesaj_id));

    return res.json({
      success: true,
      message: 'Mesajlar okundu olarak işaretlendi',
    });
  } catch (err: any) {
    console.error('Mark messages as read error:', err);
    return res.status(500).json({
      success: false,
      message: 'Mesajlar işaretlenirken hata oluştu',
    });
  }
}

