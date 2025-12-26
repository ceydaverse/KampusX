import { Server as SocketIOServer, Socket } from 'socket.io';

/**
 * Presence sistemi: Kullanıcı online/offline durumunu yönetir
 */

interface UserPresence {
  socketIds: Set<string>;
  lastSeen: Date;
}

// In-memory presence map: userId -> UserPresence
const presenceMap = new Map<number, UserPresence>();

/**
 * Kullanıcıyı online olarak işaretle
 */
export function markUserOnline(userId: number, socketId: string): void {
  let presence = presenceMap.get(userId);
  
  if (!presence) {
    presence = {
      socketIds: new Set<string>(),
      lastSeen: new Date(),
    };
    presenceMap.set(userId, presence);
  }
  
  presence.socketIds.add(socketId);
  presence.lastSeen = new Date();
}

/**
 * Kullanıcıyı offline olarak işaretle
 */
export function markUserOffline(userId: number, socketId: string): void {
  const presence = presenceMap.get(userId);
  
  if (!presence) {
    return;
  }
  
  presence.socketIds.delete(socketId);
  
  // Eğer tüm socket'ler bağlantısı kesildiyse offline olarak işaretle
  if (presence.socketIds.size === 0) {
    presence.lastSeen = new Date();
  }
}

/**
 * Kullanıcının online olup olmadığını kontrol et
 */
export function isUserOnline(userId: number): boolean {
  const presence = presenceMap.get(userId);
  return presence ? presence.socketIds.size > 0 : false;
}

/**
 * Kullanıcının son görülme tarihini getir
 */
export function getUserLastSeen(userId: number): Date | null {
  const presence = presenceMap.get(userId);
  return presence?.lastSeen || null;
}

/**
 * Online kullanıcı ID'lerini getir
 */
export function getOnlineUserIds(): number[] {
  return Array.from(presenceMap.entries())
    .filter(([_, presence]) => presence.socketIds.size > 0)
    .map(([userId]) => userId);
}

/**
 * Grup üyelerinden online olanları getir
 */
export function getOnlineGroupMembers(memberIds: number[]): number[] {
  return memberIds.filter(userId => isUserOnline(userId));
}

/**
 * Presence sistemini Socket.IO ile entegre et
 */
export function setupPresenceSystem(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as number | undefined;

    if (!userId || Number.isNaN(userId)) {
      console.warn('⚠️ Presence: Socket connection without userId');
      return;
    }

    const socketId = socket.id;

    // Kullanıcıyı online olarak işaretle
    markUserOnline(userId, socketId);
    console.log(`✅ Presence: User ${userId} is now online (socket: ${socketId})`);

    // Diğer kullanıcılara online durumunu bildir
    socket.broadcast.emit('presence:update', {
      userId,
      status: 'online',
      lastSeen: new Date(),
    });

    // Disconnect olduğunda
    socket.on('disconnect', () => {
      markUserOffline(userId, socketId);
      console.log(`✅ Presence: User ${userId} socket ${socketId} disconnected`);

      // Eğer kullanıcının başka aktif socket'i yoksa offline olarak işaretle
      if (!isUserOnline(userId)) {
        const lastSeen = getUserLastSeen(userId);
        console.log(`✅ Presence: User ${userId} is now offline (lastSeen: ${lastSeen})`);

        // Diğer kullanıcılara offline durumunu bildir
        socket.broadcast.emit('presence:update', {
          userId,
          status: 'offline',
          lastSeen: lastSeen || new Date(),
        });
      }
    });
  });
}

/**
 * Grup odasına katıldığında presence snapshot gönder
 */
export function sendPresenceSnapshot(io: SocketIOServer, roomId: string, memberIds: number[]): void {
  const onlineMembers = getOnlineGroupMembers(memberIds);
  
  io.to(roomId).emit('presence:snapshot', {
    onlineUserIds: onlineMembers,
  });
}

