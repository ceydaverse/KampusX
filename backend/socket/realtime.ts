import { Server as SocketIOServer } from 'socket.io';

/**
 * Socket.IO instance singleton
 * Merkezi Socket.IO yönetimi için
 */
let io: SocketIOServer | null = null;

/**
 * Socket.IO instance'ını al
 * @returns Socket.IO server instance veya null (henüz initialize edilmediyse)
 */
export function getIO(): SocketIOServer | null {
  return io;
}

/**
 * Socket.IO instance'ını set et
 * @param socketIO Socket.IO server instance
 */
export function setIO(socketIO: SocketIOServer): void {
  io = socketIO;
}



