import { Server as SocketIOServer, Socket } from 'socket.io';

/**
 * Socket.IO DM (Direct Message) handlers
 * 
 * Socket auth: Client auth: { token } gönderecek
 * Token doğrulama: Basit userId kontrolü (JWT yoksa localStorage'dan userId alınır)
 */

/**
 * Socket auth middleware
 * Client'tan gelen token'ı doğrula ve socket.data.userId'yi set et
 */
export function setupSocketAuth(io: SocketIOServer) {
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const userId = socket.handshake.auth?.userId;

      // Token varsa doğrula (şimdilik basit: token string ise userId olarak kabul et)
      // Ya da userId direkt gönderilebilir
      if (userId && !Number.isNaN(Number(userId))) {
        socket.data.userId = Number(userId);
        return next();
      }

      if (token) {
        // Token string olarak userId içerebilir (basit implementasyon)
        // Ya da JWT decode edilebilir
        const decodedUserId = Number(token);
        if (!Number.isNaN(decodedUserId)) {
          socket.data.userId = decodedUserId;
          return next();
        }
      }

      // Auth başarısız
      return next(new Error('Authentication failed'));
    } catch (err: any) {
      console.error('Socket auth error:', err);
      return next(new Error('Authentication error'));
    }
  });
}

/**
 * Socket event handlers setup
 */
export function setupSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`✅ Socket connected: userId=${userId}, socketId=${socket.id}`);

    // User room'a katıl (bildirimler için)
    if (userId) {
      socket.join(`user-${userId}`);
      console.log(`✅ User ${userId} joined user room: user-${userId}`);
    }

    // Odaya katıl
    socket.on('dm:join', async (payload: { mesajlasmaId: number }) => {
      try {
        const { mesajlasmaId } = payload;
        
        if (!mesajlasmaId || Number.isNaN(Number(mesajlasmaId))) {
          console.warn(`⚠️ dm:join - Invalid mesajlasmaId: ${mesajlasmaId}`);
          return;
        }

        const roomId = `dm-${mesajlasmaId}`;
        await socket.join(roomId);
        console.log(`✅ User ${userId} joined room: ${roomId}`);
        
        // Confirmation gönder
        socket.emit('dm:joined', { mesajlasmaId, success: true });
      } catch (err: any) {
        console.error('❌ dm:join error:', err);
        socket.emit('dm:joinError', { message: err?.message || 'Join failed' });
      }
    });

    // Odadan ayrıl
    socket.on('dm:leave', async (payload: { mesajlasmaId: number }) => {
      try {
        const { mesajlasmaId } = payload;
        
        if (!mesajlasmaId || Number.isNaN(Number(mesajlasmaId))) {
          return;
        }

        const roomId = `dm-${mesajlasmaId}`;
        await socket.leave(roomId);
        console.log(`✅ User ${userId} left room: ${roomId}`);
      } catch (err: any) {
        console.error('❌ dm:leave error:', err);
      }
    });

    // Mesaj okundu işaretle
    socket.on('dm:markRead', async (payload: { mesajlasmaId: number, fromUserId: number }) => {
      try {
        const { mesajlasmaId, fromUserId } = payload;
        
        if (!mesajlasmaId || !fromUserId) {
          return;
        }

        // DB'de okundu işaretle (DM service'deki markMessagesAsRead kullanılabilir)
        // Şimdilik sadece socket emit yapalım
        
        const roomId = `dm-${mesajlasmaId}`;
        io.to(roomId).emit('dm:read', {
          mesajlasmaId,
          readerId: userId,
        });
        
        console.log(`✅ User ${userId} marked messages as read in room: ${roomId}`);
      } catch (err: any) {
        console.error('❌ dm:markRead error:', err);
      }
    });

    // Bağlantı kesildiğinde
    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: userId=${userId}, socketId=${socket.id}`);
    });
  });
}

