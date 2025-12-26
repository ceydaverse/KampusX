import React, { useState, useEffect, useRef } from "react";
import styles from "../styles/groupChats.module.css";

interface MessageComposerProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  socket?: any;
  groupId?: number | null;
}

const EMOJIS = ["😀", "😂", "❤️", "👍", "👏", "🎉", "🔥", "💯"];

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSubmit,
  disabled = false,
  placeholder = "Mesaj yazın...",
  socket,
  groupId,
}) => {
  const [message, setMessage] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stopTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingTimeRef = useRef<number>(0);

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSubmit(message.trim());
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Typing indicator gönder
  const handleMessageChange = (value: string) => {
    setMessage(value);

    if (!socket || !groupId) return;

    const now = Date.now();
    lastTypingTimeRef.current = now;

    // Stop typing timeout'unu temizle
    if (stopTypingTimeoutRef.current) {
      clearTimeout(stopTypingTimeoutRef.current);
      stopTypingTimeoutRef.current = null;
    }

    // 300ms debounce ile typing gönder
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("group:typing", { groupId });
    }, 300);

    // 1.2s yazılmazsa stopTyping gönder
    stopTypingTimeoutRef.current = setTimeout(() => {
      socket.emit("group:stopTyping", { groupId });
    }, 1200);
  };

  // Component unmount veya grup değişince stopTyping gönder
  useEffect(() => {
    return () => {
      if (socket && groupId && lastTypingTimeRef.current > 0) {
        socket.emit("group:stopTyping", { groupId });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (stopTypingTimeoutRef.current) {
        clearTimeout(stopTypingTimeoutRef.current);
      }
    };
  }, [socket, groupId]);

  const handleEmojiClick = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    setShowEmojis(false);
  };

  return (
    <div className={styles.messageComposer}>
      {showEmojis && (
        <div className={styles.emojiPicker}>
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              className={styles.emojiButton}
              onClick={() => handleEmojiClick(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      <div className={styles.composerInputContainer}>
        <button
          className={styles.emojiToggleButton}
          onClick={() => setShowEmojis(!showEmojis)}
          type="button"
        >
          😊
        </button>
        <textarea
          className={styles.composerTextarea}
          value={message}
          onChange={(e) => handleMessageChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
        />
        <button
          className={styles.sendButton}
          onClick={handleSubmit}
          disabled={disabled || !message.trim()}
        >
          Gönder
        </button>
      </div>
    </div>
  );
};










