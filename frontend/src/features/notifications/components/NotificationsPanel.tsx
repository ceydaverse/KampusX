import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../useNotifications";
import type { Notification } from "../types";
import styles from "./NotificationsPanel.module.css";

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
    markAll,
  } = useNotifications();

  // Panel açılınca bildirimleri yükle
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Dışarı tıklanınca kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleNotificationClick = async (notification: Notification) => {
    // Bildirimi okundu yap
    if (!notification.okundu) {
      await markAsRead(notification.bildirim_id);
    }

    // Soru detayına git
    if (notification.soru_id) {
      onClose();
      navigate(`/soru/${notification.soru_id}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAll();
    fetchNotifications();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Şimdi";
    if (minutes < 60) return `${minutes} dk önce`;
    if (hours < 24) return `${hours} sa önce`;
    if (days < 7) return `${days} gün önce`;
    return date.toLocaleDateString("tr-TR");
  };

  if (!isOpen) return null;

  return (
    <div className={styles.panel} ref={panelRef}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Bildirimler</h3>
        {notifications.some((n) => !n.okundu) && (
          <button
            className={styles.markAllButton}
            onClick={handleMarkAllAsRead}
            type="button"
          >
            Tümünü okundu yap
          </button>
        )}
      </div>
      <div className={styles.panelContent}>
        {loading ? (
          <div className={styles.loadingState}>
            <p>Yükleniyor...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Bildirim yok</p>
          </div>
        ) : (
          <div className={styles.notificationList}>
            {notifications.map((notification) => (
              <div
                key={notification.bildirim_id}
                className={`${styles.notificationItem} ${
                  !notification.okundu ? styles.notificationItemUnread : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className={styles.notificationContent}>
                  <p className={styles.notificationMessage}>
                    {notification.mesaj}
                  </p>
                  <span className={styles.notificationTime}>
                    {formatTime(notification.tarih)}
                  </span>
                </div>
                {!notification.okundu && (
                  <div className={styles.unreadDot}></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}




