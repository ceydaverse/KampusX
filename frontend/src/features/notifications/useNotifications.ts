import { useState, useEffect, useCallback } from "react";
import { getUnreadCount, getNotifications, markNotificationAsRead, markAllAsRead } from "./api";
import { useAuth } from "../auth/AuthProvider";
import { useSocket } from "../../providers/SocketProvider";
import { checkBackendHealth, getBackendStatus } from "../../lib/api";

export function useNotifications() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { socket } = useSocket();

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    // Backend down ise istek atma
    const isBackendUp = await checkBackendHealth();
    if (!isBackendUp) {
      console.warn("⚠️ Backend down, skipping unread count fetch");
      return;
    }

    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  }, [user?.id]);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    // Backend down ise istek atma
    const isBackendUp = await checkBackendHealth();
    if (!isBackendUp) {
      console.warn("⚠️ Backend down, skipping notifications fetch");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const items = await getNotifications({ limit: 30 });
      setNotifications(items);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const markAsRead = useCallback(
    async (notificationId: number) => {
      try {
        await markNotificationAsRead(notificationId);
        // Optimistic update
        setNotifications((prev) =>
          prev.map((n) =>
            n.bildirim_id === notificationId ? { ...n, okundu: true } : n
          )
        );
        // Unread count'u güncelle
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
      }
    },
    []
  );

  const markAll = useCallback(async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, okundu: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  }, []);

  // Socket ile gerçek zamanlı bildirim dinleme
  useEffect(() => {
    if (!socket || !user?.id) return;

    const handler = (notif: any) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.bildirim_id === notif.bildirim_id)) return prev;
        return [notif, ...prev];
      });
      setUnreadCount((prev) => prev + 1);
    };

    socket.off("notification:new");
    socket.on("notification:new", handler);

    return () => {
      socket.off("notification:new", handler);
    };
  }, [socket, user?.id]);

  // İlk yükleme ve login sonrası
  useEffect(() => {
    fetchUnreadCount();
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id, fetchUnreadCount, fetchNotifications]);

  // Polling: Her 20 saniyede bir unread count'u güncelle (backend up ise)
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(async () => {
      // Backend down ise polling'i durdur
      const isBackendUp = getBackendStatus();
      if (isBackendUp === false) {
        console.warn("⚠️ Backend down, skipping polling");
        return;
      }
      fetchUnreadCount();
    }, 20000); // 20 saniye

    return () => clearInterval(interval);
  }, [user?.id, fetchUnreadCount]);

  return {
    unreadCount,
    notifications,
    loading,
    fetchUnreadCount,
    fetchNotifications,
    markAsRead,
    markAll,
  };
}




