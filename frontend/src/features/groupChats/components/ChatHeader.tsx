import React from "react";
import type { Group, GroupMember } from "../types";
import styles from "../styles/groupChats.module.css";

interface ChatHeaderProps {
  group: Group | null;
  memberCount: number;
  onToggleMembers: () => void;
  onCloseChat?: () => void;
  onlineUserIds?: Set<number>;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  group,
  memberCount,
  onToggleMembers,
  onCloseChat,
  onlineUserIds = new Set(),
}) => {
  if (!group) return null;

  const onlineCount = onlineUserIds.size;

  return (
    <div className={styles.chatHeader}>
      <div className={styles.chatHeaderInfo}>
        <div className={styles.chatHeaderAvatar}>
          {group.grup_adi.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 className={styles.chatHeaderName}>{group.grup_adi}</h3>
            {onlineCount > 0 && (
              <span style={{ 
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#4CAF50',
              }} title={`${onlineCount} kişi online`} />
            )}
          </div>
          <span className={styles.chatHeaderMeta}>
            {memberCount} üye{onlineCount > 0 && ` · ${onlineCount} online`}
          </span>
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

