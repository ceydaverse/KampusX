import React from "react";
import type { GroupMessage } from "../types";
import styles from "../styles/groupChats.module.css";

interface MessageBubbleProps {
  message: GroupMessage;
  isOwn: boolean;
  senderName?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  senderName,
}) => {
  const formatTime = (sentAt: string) => {
    return new Date(sentAt).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Read receipt gösterimi (sadece kendi mesajlarımız için)
  const renderReadReceipt = () => {
    if (!isOwn) return null;

    const readCount = message.readCount || 0;
    const isRead = message.isReadByMe || false;

    if (readCount === 0) {
      return <span className={styles.readReceipt}>✓</span>;
    }

    if (isRead && readCount > 0) {
      return (
        <span className={styles.readReceipt}>
          ✓✓ {readCount > 1 && `(${readCount})`}
        </span>
      );
    }

    return <span className={styles.readReceipt}>✓</span>;
  };

  return (
    <div
      className={`${styles.messageBubble} ${
        isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther
      }`}
    >
      {!isOwn && senderName && (
        <div className={styles.messageSender}>{senderName}</div>
      )}
      <div className={styles.messageContent}>
        <p className={styles.messageText}>{message.text}</p>
        <div className={styles.messageFooter}>
          <span className={styles.messageTime}>{formatTime(message.sentAt)}</span>
          {renderReadReceipt()}
        </div>
      </div>
    </div>
  );
};










