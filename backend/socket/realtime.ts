import { Server as SocketIOServer } from "socket.io";

/**
 * Socket.IO instance'ını servislerden erişilebilir yapmak için
 * Tek instance tutulur ve getIO() ile erişilir
 */
let ioRef: SocketIOServer | null = null;

/**
 * Socket.IO server instance'ını set et
 */
export function setIO(io: SocketIOServer): void {
  ioRef = io;
  console.log("✅ Socket.IO instance set in realtime.ts");
}

/**
 * Socket.IO server instance'ını get et
 */
export function getIO(): SocketIOServer | null {
  return ioRef;
}
