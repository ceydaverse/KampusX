import React, { useEffect, useState } from "react";
import api from "../../../lib/api";
import { useAuth } from "../../../features/auth/AuthProvider";
import { getFollowStatus, followUser, unfollowUser } from "../../follows/api/followsApi";
import type { QuestionAuthor } from "../types";
import styles from "../questions.module.css";

interface UserProfileModalProps {
  userId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfile {
  id: number;
  username: string;
  ad?: string;
  soyad?: string;
  universite?: string | null;
  bolum?: string | null;
  email?: string;
  dogum_yili?: number | null;
  cinsiyet?: string | null;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  userId,
  isOpen,
  onClose,
}) => {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followStatus, setFollowStatus] = useState<{
    isFollowing: boolean;
    isFollowedBy: boolean;
    isMutual: boolean;
  } | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) {
      setProfile(null);
      setError(null);
      setFollowStatus(null);
      return;
    }

    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/api/users/${userId}`);
        if (response.data.success && response.data.user) {
          setProfile(response.data.user);
        } else {
          throw new Error(response.data.message || "Profil yüklenemedi");
        }
      } catch (err: any) {
        // 404 hatası için özel mesaj
        if (err?.response?.status === 404) {
          setError("Profil bulunamadı.");
        } else {
          setError(err?.response?.data?.message || err?.message || "Profil yüklenemedi.");
        }
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    const loadFollowStatus = async () => {
      // Sadece giriş yapmış kullanıcı ve kendi profili değilse
      if (currentUser?.id && currentUser.id !== userId) {
        try {
          const status = await getFollowStatus(userId);
          setFollowStatus(status);
        } catch (err) {
          console.error("Failed to load follow status:", err);
          // Hata olsa bile devam et
        }
      } else {
        setFollowStatus(null);
      }
    };

    loadProfile();
    loadFollowStatus();
  }, [isOpen, userId, currentUser?.id]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Kullanıcı Profili</h3>
          <button className={styles.closeButton} onClick={onClose} aria-label="Kapat">
            ✕
          </button>
        </div>

        {loading && (
          <div className={styles.loading}>
            <p>Yükleniyor...</p>
          </div>
        )}

        {error && (
          <div className={styles.errorText}>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && profile && (
          <div className={styles.profileContent}>
            <div className={styles.profileHeader}>
              <div className={styles.profileAvatar}>
                {profile.username.charAt(0).toUpperCase()}
              </div>
              <div className={styles.profileUsername}>@{profile.username}</div>
            </div>

            {/* Takip butonu - sadece giriş yapmış kullanıcı ve kendi profili değilse */}
            {currentUser?.id && currentUser.id !== userId && followStatus !== null && (
              <div className={styles.followSection}>
                {followStatus.isMutual ? (
                  <div className={styles.mutualFollow}>
                    <span>🤝</span>
                    <span>Takipleşiyorsunuz</span>
                  </div>
                ) : (
                  <button
                    className={`${styles.followButton} ${
                      followStatus.isFollowing ? styles.followButtonFollowing : ""
                    }`}
                    onClick={async () => {
                      if (followLoading) return;
                      
                      setFollowLoading(true);
                      try {
                        if (followStatus.isFollowing) {
                          await unfollowUser(userId);
                          setFollowStatus({
                            ...followStatus,
                            isFollowing: false,
                            isMutual: false,
                          });
                        } else {
                          await followUser(userId);
                          setFollowStatus({
                            ...followStatus,
                            isFollowing: true,
                            isMutual: followStatus.isFollowedBy,
                          });
                        }
                      } catch (err: any) {
                        console.error("Follow/unfollow error:", err);
                        // Hata mesajı gösterilebilir ama şimdilik sadece log
                      } finally {
                        setFollowLoading(false);
                      }
                    }}
                    disabled={followLoading}
                  >
                    {followLoading
                      ? "Yükleniyor..."
                      : followStatus.isFollowing
                      ? "Takip Ediliyor"
                      : "Takip Et"}
                  </button>
                )}
              </div>
            )}

            <div className={styles.profileInfo}>
              {profile.ad && profile.soyad && (
                <div className={styles.profileField}>
                  <span className={styles.profileLabel}>Ad Soyad:</span>
                  <span className={styles.profileValue}>
                    {profile.ad} {profile.soyad}
                  </span>
                </div>
              )}

              {profile.universite && (
                <div className={styles.profileField}>
                  <span className={styles.profileLabel}>Üniversite:</span>
                  <span className={styles.profileValue}>{profile.universite}</span>
                </div>
              )}

              {profile.bolum && (
                <div className={styles.profileField}>
                  <span className={styles.profileLabel}>Bölüm:</span>
                  <span className={styles.profileValue}>{profile.bolum}</span>
                </div>
              )}

              {profile.dogum_yili && (
                <div className={styles.profileField}>
                  <span className={styles.profileLabel}>Doğum Yılı:</span>
                  <span className={styles.profileValue}>{profile.dogum_yili}</span>
                </div>
              )}

              {profile.cinsiyet && (
                <div className={styles.profileField}>
                  <span className={styles.profileLabel}>Cinsiyet:</span>
                  <span className={styles.profileValue}>{profile.cinsiyet}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

