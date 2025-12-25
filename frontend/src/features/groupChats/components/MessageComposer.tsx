import React, { useState } from "react";
import styles from "../styles/groupChats.module.css";

interface MessageComposerProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const EMOJIS = ["😀", "😂", "❤️", "👍", "👏", "🎉", "🔥", "💯"];

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSubmit,
  disabled = false,
  placeholder = "Mesaj yazın...",
}) => {
  const [message, setMessage] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);

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
          onChange={(e) => setMessage(e.target.value)}
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










