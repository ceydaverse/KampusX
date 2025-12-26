import { Server as SocketIOServer, Socket } from 'socket.io';
import { sendPresenceSnapshot } from './presence';

/**
 * Socket.IO Group handlers
 * Typing indicator ve grup odası yönetimi için
 */

/**
 * Grup socket event handlers setup
 * DM socket handler'ına benzer şekilde çalışır
 */
export function setupGroupSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as number | undefined;

    // Grup odasına katıl
    socket.on('group:join', async (payload: { groupId: number }) => {
      try {
        const { groupId } = payload;

        if (!groupId || Number.isNaN(Number(groupId))) {
          return;
        }

        const roomId = `group-${groupId}`;
        await socket.join(roomId);
        socket.emit('group:joined', { groupId, success: true });
      } catch (err: any) {
        socket.emit('group:joinError', { message: err?.message || 'Join failed' });
      }
    });

    // Grup odasından ayrıl
    socket.on('group:leave', async (payload: { groupId: number }) => {
      try {
        const { groupId } = payload;

        if (!groupId || Number.isNaN(Number(groupId))) {
          return;
        }

        const roomId = `group-${groupId}`;
        await socket.leave(roomId);
      } catch (err: any) {
        // Hata olsa bile devam et
      }
    });

    // Typing indicator başladı
    socket.on('group:typing', (payload: { groupId: number }) => {
      try {
        const { groupId } = payload;

        if (!groupId || !userId || Number.isNaN(Number(groupId))) {
          return;
        }

        const roomId = `group-${groupId}`;
        // Kendi socket'ine değil, odadaki diğer kullanıcılara gönder
        socket.to(roomId).emit('group:typing', {
          groupId,
          userId,
        });
      } catch (err: any) {
        // Hata olsa bile devam et
      }
    });

    // Typing indicator durdu
    socket.on('group:stopTyping', (payload: { groupId: number }) => {
      try {
        const { groupId } = payload;

        if (!groupId || !userId || Number.isNaN(Number(groupId))) {
          return;
        }

        const roomId = `group-${groupId}`;
        // Kendi socket'ine değil, odadaki diğer kullanıcılara gönder
        socket.to(roomId).emit('group:stopTyping', {
          groupId,
          userId,
        });
      } catch (err: any) {
        // Hata olsa bile devam et
      }
    });

    // Read update event'i (okundu güncellemesi)
    socket.on('group:readUpdate', (payload: { groupId: number }) => {
      try {
        const { groupId } = payload;

        if (!groupId || Number.isNaN(Number(groupId))) {
          return;
        }

        const roomId = `group-${groupId}`;
        // Okundu güncellemesini odadaki diğer kullanıcılara gönder
        socket.to(roomId).emit('group:readUpdate', {
          groupId,
        });
      } catch (err: any) {
        // Hata olsa bile devam et
      }
    });
  });
}

