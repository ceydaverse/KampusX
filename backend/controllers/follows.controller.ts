import { Request, Response } from 'express';
import {
  getFollowStatus,
  followUser,
  unfollowUser,
} from '../services/follows.service';

/**
 * GET /api/follows/status/:targetUserId
 * Takip durumunu getir
 */
export async function handleGetFollowStatus(req: Request, res: Response) {
  try {
    const userIdHeader = req.headers['x-user-id'] as string;

    if (!userIdHeader || Number.isNaN(Number(userIdHeader))) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı',
      });
    }

    const currentUserId = Number(userIdHeader);
    const targetUserId = Number(req.params.targetUserId);

    if (Number.isNaN(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz kullanıcı ID',
      });
    }

    const status = await getFollowStatus(currentUserId, targetUserId);

    return res.json({
      success: true,
      isFollowing: status.isFollowing,
      isFollowedBy: status.isFollowedBy,
      isMutual: status.isMutual,
    });
  } catch (err: any) {
    console.error('Get follow status error:', err);
    return res.status(500).json({
      success: false,
      message: 'Takip durumu getirilirken hata oluştu',
    });
  }
}

/**
 * POST /api/follows/:targetUserId
 * Kullanıcıyı takip et
 */
export async function handleFollowUser(req: Request, res: Response) {
  try {
    const userIdHeader = req.headers['x-user-id'] as string;

    if (!userIdHeader || Number.isNaN(Number(userIdHeader))) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı',
      });
    }

    const currentUserId = Number(userIdHeader);
    const targetUserId = Number(req.params.targetUserId);

    if (Number.isNaN(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz kullanıcı ID',
      });
    }

    await followUser(currentUserId, targetUserId);

    return res.json({
      success: true,
      message: 'Kullanıcı takip edildi',
    });
  } catch (err: any) {
    console.error('Follow user error:', err);
    
    if (err?.message?.includes('Kendi kendinizi')) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: err?.message || 'Kullanıcı takip edilirken hata oluştu',
    });
  }
}

/**
 * DELETE /api/follows/:targetUserId
 * Kullanıcıyı takipten çık
 */
export async function handleUnfollowUser(req: Request, res: Response) {
  try {
    const userIdHeader = req.headers['x-user-id'] as string;

    if (!userIdHeader || Number.isNaN(Number(userIdHeader))) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı',
      });
    }

    const currentUserId = Number(userIdHeader);
    const targetUserId = Number(req.params.targetUserId);

    if (Number.isNaN(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz kullanıcı ID',
      });
    }

    await unfollowUser(currentUserId, targetUserId);

    return res.json({
      success: true,
      message: 'Takipten çıkıldı',
    });
  } catch (err: any) {
    console.error('Unfollow user error:', err);
    return res.status(500).json({
      success: false,
      message: 'Takipten çıkılırken hata oluştu',
    });
  }
}









