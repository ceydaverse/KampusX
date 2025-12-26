import { Server as SocketIOServer } from "socket.io";


let ioRef: SocketIOServer | null = null;


export function setIO(io: SocketIOServer): void {
  ioRef = io;
  console.log("✅ Socket.IO instance set in realtime.ts");
}


export function getIO(): SocketIOServer | null {
  return ioRef;
}
