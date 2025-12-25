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
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
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
        <p className={styles.messageText}>{message.mesaj}</p>
        <span className={styles.messageTime}>{formatTime(message.tarih)}</span>
      </div>
    </div>
  );
};









