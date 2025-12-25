import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../../features/auth/AuthProvider";
import { searchUsers, createGroup, type SearchUser } from "../api/groupChatsApi";
import styles from "../styles/groupChats.module.css";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (grupId: number) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [grupAdi, setGrupAdi] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  // ESC ile kapatma
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Modal açıldığında state'i temizle
  useEffect(() => {
    if (isOpen) {
      setGrupAdi("");
      setSearchQuery("");
      setSearchResults([]);
      setSelectedMembers([]);
      setError(null);
    }
  }, [isOpen]);

  // Kullanıcı arama (debounce)
  useEffect(() => {
    if (!isOpen) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchUsers(searchQuery);
        // Zaten seçili olanları filtrele
        const selectedIds = new Set(selectedMembers.map((m) => m.kullanici_id));
        setSearchResults(results.filter((u) => !selectedIds.has(u.kullanici_id)));
      } catch (err) {
        console.error("Search failed:", err);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, selectedMembers, isOpen]);

  const handleAddMember = (user: SearchUser) => {
    if (!selectedMembers.find((m) => m.kullanici_id === user.kullanici_id)) {
      setSelectedMembers([...selectedMembers, user]);
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  const handleRemoveMember = (userId: number) => {
    setSelectedMembers(selectedMembers.filter((m) => m.kullanici_id !== userId));
  };

  const handleSubmit = async () => {
    if (!grupAdi.trim() || grupAdi.trim().length < 3) {
      setError("Grup adı en az 3 karakter olmalıdır");
      return;
    }

    if (!user?.id) {
      setError("Giriş yapmanız gerekiyor");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      creator_id: user.id,
      grup_adi: grupAdi.trim(),
      member_ids: selectedMembers.map((m) => m.kullanici_id),
    };

    console.log("🔵 CreateGroupModal - Payload:", payload);

    try {
      const result = await createGroup(payload);
      console.log("✅ CreateGroupModal - API Response:", result);

      onSuccess(result.grup_id);
      onClose();
    } catch (err: any) {
      console.error("❌ CreateGroupModal - Error:", {
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status,
        fullError: err,
      });
      setError(err?.response?.data?.message || err?.message || "Grup oluşturulurken hata oluştu");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.createGroupModal}
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Yeni Grup Oluştur</h3>
          <button className={styles.closeButton} onClick={onClose} aria-label="Kapat">
            ✕
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Grup Adı</label>
            <input
              type="text"
              className={styles.modalInput}
              placeholder="Örn: Final Çalışma Grubu"
              value={grupAdi}
              onChange={(e) => {
                setGrupAdi(e.target.value);
                setError(null);
              }}
              maxLength={200}
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel}>Üye Ekle</label>
            <input
              type="text"
              className={styles.modalInput}
              placeholder="Kullanıcı ara: ad/soyad/email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {loading && (
              <div className={styles.searchLoading}>
                <p>Aranıyor...</p>
              </div>
            )}

            {!loading && searchResults.length > 0 && (
              <div className={styles.searchResults}>
                {searchResults.map((user) => (
                  <div
                    key={user.kullanici_id}
                    className={styles.searchResultItem}
                    onClick={() => handleAddMember(user)}
                  >
                    <div className={styles.searchResultInfo}>
                      <div className={styles.searchResultName}>
                        {user.ad} {user.soyad}
                      </div>
                      <div className={styles.searchResultEmail}>{user.email}</div>
                    </div>
                    <button
                      className={styles.addButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddMember(user);
                      }}
                    >
                      Ekle
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!loading && searchQuery.trim().length > 0 && searchResults.length === 0 && (
              <div className={styles.searchEmpty}>
                <p>Kullanıcı bulunamadı</p>
              </div>
            )}
          </div>

          {selectedMembers.length > 0 && (
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Seçilen Üyeler</label>
              <div className={styles.selectedMembers}>
                {selectedMembers.map((member) => (
                  <div key={member.kullanici_id} className={styles.memberChip}>
                    <span>
                      {member.ad} {member.soyad}
                    </span>
                    <button
                      className={styles.chipRemove}
                      onClick={() => handleRemoveMember(member.kullanici_id)}
                      aria-label="Kaldır"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div className={styles.modalError}>{error}</div>}
        </div>

        <div className={styles.modalActions}>
          <button className={styles.cancelButton} onClick={onClose} disabled={submitting}>
            İptal
          </button>
          <button
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={submitting || !grupAdi.trim() || grupAdi.trim().length < 3}
          >
            {submitting ? "Oluşturuluyor..." : "Oluştur"}
          </button>
        </div>
      </div>
    </div>
  );
};

