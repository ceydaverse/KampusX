import React, { createContext, useContext, useRef, useEffect, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../features/auth/AuthProvider";
import { getToken } from "../features/auth/authStorage";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);

  useEffect(() => {
    if (!user?.id) {
      // Kullanıcı yoksa socket bağlantısı kurma
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Socket instance'ı yarat (tek seferlik, useRef ile)
    if (!socketRef.current) {
      // Socket URL - önce VITE_SOCKET_URL, sonra VITE_API_URL, son olarak varsayılan
      // Kesinlikle http:// kullan (wss:// kullanma)
      let SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || "http://localhost:5001";
      // wss:// veya https:// varsa http://'ye çevir
      if (SOCKET_URL.startsWith("wss://") || SOCKET_URL.startsWith("https://")) {
        SOCKET_URL = SOCKET_URL.replace(/^wss?:\/\//, "http://").replace(/^https:\/\//, "http://");
      }
      const token = getToken() || String(user.id);

      const socket = io(SOCKET_URL, {
        auth: {
          token: token,
          userId: user.id,
        },
        withCredentials: true,
        transports: ["websocket", "polling"],
      });

      socketRef.current = socket;

      // Bağlantı eventleri
      socket.on("connect", () => {
        console.log("✅ Socket.IO connected:", socket.id);
        setIsConnected(true);
      });

      socket.on("disconnect", (reason) => {
        console.warn("⚠️ Socket.IO disconnected:", reason);
        setIsConnected(false);
      });

      socket.on("connect_error", (err) => {
        console.warn("⚠️ Socket.IO connection error:", err.message);
        setIsConnected(false);
      });
    }

    // Cleanup: Provider unmount olunca disconnect et
    return () => {
      if (socketRef.current) {
        console.log("🔌 SocketProvider cleanup: disconnecting socket");
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

