import React from "react";
import type { GroupMember } from "../types";
import styles from "../styles/groupChats.module.css";

interface MembersPanelProps {
  members: GroupMember[];
  isOpen: boolean;
  onClose: () => void;
  groupName?: string;
}

export const MembersPanel: React.FC<MembersPanelProps> = ({
  members,
  isOpen,
  onClose,
  groupName,
}) => {
  // Mock online state (random)
  const getOnlineState = (userId: number) => {
    return userId % 3 === 0; // Her 3. kullanıcı online
  };

  if (!isOpen) return null;

  return (
    <div className={styles.membersPanel}>
      <div className={styles.membersPanelHeader}>
        <h3 className={styles.membersPanelTitle}>Üyeler</h3>
        <button className={styles.membersPanelClose} onClick={onClose}>
          ✕
        </button>
      </div>

      <div className={styles.membersList}>
        {members.map((member) => (
          <div key={member.kullanici_id} className={styles.memberItem}>
            <div className={styles.memberAvatar}>
              {member.ad?.charAt(0).toUpperCase() || "?"}
            </div>
            <div className={styles.memberInfo}>
              <div className={styles.memberName}>
                {member.ad && member.soyad
                  ? `${member.ad} ${member.soyad}`
                  : `Kullanıcı ${member.kullanici_id}`}
              </div>
              <div className={styles.memberMeta}>
                <span className={styles.memberRole}>{member.rol}</span>
                {getOnlineState(member.kullanici_id) && (
                  <span className={styles.memberOnline}>Çevrimiçi</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {groupName && (
        <div className={styles.groupInfoCard}>
          <h4 className={styles.groupInfoTitle}>Grup Bilgisi</h4>
          <p className={styles.groupInfoName}>{groupName}</p>
          <p className={styles.groupInfoDescription}>Grup açıklaması placeholder</p>
        </div>
      )}
    </div>
  );
};










