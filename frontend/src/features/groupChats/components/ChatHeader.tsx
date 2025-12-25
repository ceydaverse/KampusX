import React from "react";
import type { Group, GroupMember } from "../types";
import styles from "../styles/groupChats.module.css";

interface ChatHeaderProps {
  group: Group | null;
  memberCount: number;
  onToggleMembers: () => void;
  onCloseChat?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  group,
  memberCount,
  onToggleMembers,
  onCloseChat,
}) => {
  if (!group) return null;

  return (
    <div className={styles.chatHeader}>
      <div className={styles.chatHeaderInfo}>
        <div className={styles.chatHeaderAvatar}>
          {group.grup_adi.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className={styles.chatHeaderName}>{group.grup_adi}</h3>
          <span className={styles.chatHeaderMeta}>{memberCount} üye</span>
        </div>
      </div>
      <div className={styles.chatHeaderActions}>
        <button className={styles.membersButton} onClick={onToggleMembers}>
          Üyeler
        </button>
        {onCloseChat && (
          <button
            className={styles.closeChatButton}
            onClick={onCloseChat}
            aria-label="Sohbeti kapat"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

