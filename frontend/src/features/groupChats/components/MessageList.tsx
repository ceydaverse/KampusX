import React, { useEffect, useRef, useState } from "react";
import type { GroupMessage } from "../types";
import { MessageBubble } from "./MessageBubble";
import styles from "../styles/groupChats.module.css";

interface MessageListProps {
  messages: GroupMessage[];
  currentUserId: number | null;
  memberNames: Record<number, string>;
  onScrollToBottom?: () => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  memberNames,
  onScrollToBottom,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

  // Tarih ayırıcıları ekle
  const messagesWithDates = React.useMemo(() => {
    const result: Array<GroupMessage | { type: "date"; date: Date }> = [];
    let lastDate: Date | null = null;

    messages.forEach((message) => {
      const messageDate = new Date(message.tarih);
      const dateStr = messageDate.toDateString();

      if (!lastDate || lastDate.toDateString() !== dateStr) {
        result.push({ type: "date", date: messageDate });
        lastDate = messageDate;
      }
      result.push(message);
    });

    return result;
  }, [messages]);

  // Scroll kontrolü
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsUserScrolledUp(!isNearBottom);
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Yeni mesaj geldiğinde otomatik scroll (kullanıcı en alttaysa)
  useEffect(() => {
    if (!isUserScrolledUp && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, isUserScrolledUp]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollButton(false);
    setIsUserScrolledUp(false);
    onScrollToBottom?.();
  };

  const formatDateLabel = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Bugün";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Dün";
    } else {
      return date.toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  };

  return (
    <div className={styles.messagesContainer} ref={messagesContainerRef}>
      {messagesWithDates.map((item, index) => {
        if ("type" in item && item.type === "date") {
          return (
            <div key={`date-${item.date.getTime()}`} className={styles.dateDivider}>
              <span>{formatDateLabel(item.date)}</span>
            </div>
          );
        }

        const message = item as GroupMessage;
        const isOwn = message.gonderen_id === currentUserId;
        const senderName = memberNames[message.gonderen_id] || `Kullanıcı ${message.gonderen_id}`;

        return (
          <MessageBubble
            key={message.mesaj_id}
            message={message}
            isOwn={isOwn}
            senderName={!isOwn ? senderName : undefined}
          />
        );
      })}
      <div ref={messagesEndRef} />
      {showScrollButton && (
        <button className={styles.scrollToBottomButton} onClick={scrollToBottom}>
          ⬇ Aşağı İn
        </button>
      )}
    </div>
  );
};










