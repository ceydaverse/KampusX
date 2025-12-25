import React, { useState } from "react";
import type { Group } from "../types";
import styles from "../styles/groupChats.module.css";

interface GroupSidebarProps {
  groups: Group[];
  selectedGroupId: number | null;
  onSelectGroup: (grupId: number) => void;
  onCreateGroup?: () => void;
}

export const GroupSidebar: React.FC<GroupSidebarProps> = ({
  groups,
  selectedGroupId,
  onSelectGroup,
  onCreateGroup,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGroups = groups.filter((group) =>
    group.grup_adi.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Şimdi";
    if (minutes < 60) return `${minutes} dk`;
    if (hours < 24) return `${hours}s`;
    if (days === 1) return "Dün";
    if (days < 7) return `${days} gün`;
    return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>Grup Sohbetleri</h2>
        <p className={styles.sidebarSubtitle}>Kampüs gruplarınız</p>
      </div>

      <div className={styles.searchContainer}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Grup ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.groupList}>
        {filteredGroups.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Grup bulunamadı</p>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div
              key={group.grup_id}
              className={`${styles.groupItem} ${
                selectedGroupId === group.grup_id ? styles.groupItemActive : ""
              }`}
              onClick={() => onSelectGroup(group.grup_id)}
            >
              <div className={styles.groupAvatar}>
                {group.grup_adi.charAt(0).toUpperCase()}
              </div>
              <div className={styles.groupContent}>
                <div className={styles.groupHeader}>
                  <span className={styles.groupName}>{group.grup_adi}</span>
                  {group.lastMessage && (
                    <span className={styles.groupTime}>
                      {formatTime(new Date(group.lastMessage.tarih))}
                    </span>
                  )}
                </div>
                <div className={styles.groupFooter}>
                  <span className={styles.groupLastMessage}>
                    {group.lastMessage?.mesaj || "Henüz mesaj yok"}
                  </span>
                  {group.unreadCount > 0 && (
                    <span className={styles.unreadBadge}>{group.unreadCount}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <button className={styles.newGroupButton} onClick={onCreateGroup}>
        + Yeni Grup
      </button>
    </div>
  );
};









