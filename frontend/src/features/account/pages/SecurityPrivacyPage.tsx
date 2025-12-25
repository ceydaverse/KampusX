import React, { useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import Header from "../../../MainLayout/components/Header/Header";
import styles from "./SecurityPrivacyPage.module.css";

interface Session {
  id: string;
  device: string;
  lastActive: string;
  current?: boolean;
}

export default function SecurityPrivacyPage() {
  const { user } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showFreezeConfirm, setShowFreezeConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Form states
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibleToFollowersOnly: false,
    dmRestriction: "everyone", // "everyone" | "followers"
    searchable: true,
    emailOnNewLogin: false,
  });

  // Dummy sessions data
  const [sessions] = useState<Session[]>([
    {
      id: "1",
      device: "Windows - Chrome",
      lastActive: "Şimdi",
      current: true,
    },
    {
      id: "2",
      device: "Android - Chrome Mobile",
      lastActive: "2 saat önce",
    },
    {
      id: "3",
      device: "MacOS - Safari",
      lastActive: "3 gün önce",
    },
  ]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Backend hazır değil, sadece toast göster
    alert("Yakında: Şifre değiştirme özelliği eklenecek");
    setShowPasswordModal(false);
    setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
  };

  const handleFreezeAccount = () => {
    if (window.confirm("Hesabınızı dondurmak istediğinize emin misiniz?")) {
      alert("Yakında: Hesap dondurma özelliği eklenecek");
      setShowFreezeConfirm(false);
    }
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText === "SİL" && window.confirm("Hesabınızı silmek istediğinize emin misiniz? Bu işlem geri alınamaz!")) {
      alert("Yakında: Hesap silme özelliği eklenecek");
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
    }
  };

  const handleLogoutAllSessions = () => {
    if (window.confirm("Tüm oturumlardan çıkış yapmak istediğinize emin misiniz?")) {
      alert("Yakında: Tüm oturumlardan çıkış özelliği eklenecek");
    }
  };

  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>Güvenlik & Gizlilik</h1>

          {/* Şifre & Giriş Güvenliği */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Şifre & Giriş Güvenliği</h2>
            <div className={styles.card}>
              <button
                className={styles.primaryButton}
                onClick={() => setShowPasswordModal(true)}
              >
                Şifre Değiştir
              </button>
            </div>
          </section>

          {/* Oturumlar / Cihazlar */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Oturumlar / Cihazlar</h2>
            <div className={styles.card}>
              <div className={styles.sessionsList}>
                {sessions.map((session) => (
                  <div key={session.id} className={styles.sessionItem}>
                    <div className={styles.sessionInfo}>
                      <div className={styles.sessionDevice}>
                        {session.device}
                        {session.current && (
                          <span className={styles.currentBadge}>Mevcut</span>
                        )}
                      </div>
                      <div className={styles.sessionTime}>{session.lastActive}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                className={styles.secondaryButton}
                onClick={handleLogoutAllSessions}
              >
                Diğer tüm oturumlardan çıkış yap
              </button>
            </div>
          </section>

          {/* Gizlilik */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Gizlilik</h2>
            <div className={styles.card}>
              <div className={styles.settingItem}>
                <div className={styles.settingLabel}>
                  <span>Profilimi sadece takipçiler görsün</span>
                </div>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={privacySettings.profileVisibleToFollowersOnly}
                    onChange={(e) =>
                      setPrivacySettings({
                        ...privacySettings,
                        profileVisibleToFollowersOnly: e.target.checked,
                      })
                    }
                  />
                  <span className={styles.toggleSlider}></span>
                </label>
              </div>

              <div className={styles.settingItem}>
                <div className={styles.settingLabel}>
                  <span>DM almayı kısıtla</span>
                </div>
                <select
                  className={styles.select}
                  value={privacySettings.dmRestriction}
                  onChange={(e) =>
                    setPrivacySettings({
                      ...privacySettings,
                      dmRestriction: e.target.value,
                    })
                  }
                >
                  <option value="everyone">Herkes</option>
                  <option value="followers">Sadece takip ettiklerim</option>
                </select>
              </div>

              <div className={styles.settingItem}>
                <div className={styles.settingLabel}>
                  <span>Aramalarda görünür ol</span>
                </div>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={privacySettings.searchable}
                    onChange={(e) =>
                      setPrivacySettings({
                        ...privacySettings,
                        searchable: e.target.checked,
                      })
                    }
                  />
                  <span className={styles.toggleSlider}></span>
                </label>
              </div>
            </div>
          </section>

          {/* Bildirim & Güvenlik */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Bildirim & Güvenlik</h2>
            <div className={styles.card}>
              <div className={styles.settingItem}>
                <div className={styles.settingLabel}>
                  <span>Yeni giriş olunca e-posta bildirimi</span>
                </div>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={privacySettings.emailOnNewLogin}
                    onChange={(e) =>
                      setPrivacySettings({
                        ...privacySettings,
                        emailOnNewLogin: e.target.checked,
                      })
                    }
                  />
                  <span className={styles.toggleSlider}></span>
                </label>
              </div>

              <div className={styles.settingItem}>
                <div className={styles.settingLabel}>
                  <span>2FA (İki Adımlı Doğrulama)</span>
                </div>
                <span className={styles.comingSoonBadge}>Yakında</span>
              </div>
            </div>
          </section>

          {/* Hesap Yönetimi */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Hesap Yönetimi</h2>
            <div className={styles.card}>
              <button
                className={styles.warningButton}
                onClick={() => setShowFreezeConfirm(true)}
              >
                Hesabı Dondur
              </button>
              <div className={styles.dangerZone}>
                <h3 className={styles.dangerTitle}>Tehlikeli Alan</h3>
                <p className={styles.dangerDescription}>
                  Hesabınızı silmek istiyorsanız, aşağıya "SİL" yazın.
                </p>
                <input
                  type="text"
                  className={styles.deleteInput}
                  placeholder="SİL yazın"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                />
                <button
                  className={styles.dangerButton}
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteConfirmText !== "SİL"}
                >
                  Hesabı Sil
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Şifre Değiştir Modal */}
      {showPasswordModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPasswordModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Şifre Değiştir</h3>
              <button
                className={styles.modalClose}
                onClick={() => setShowPasswordModal(false)}
              >
                ✕
              </button>
            </div>
            <form className={styles.modalForm} onSubmit={handlePasswordSubmit}>
              <div className={styles.formGroup}>
                <label>Eski Şifre</label>
                <input
                  type="password"
                  value={passwordForm.oldPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, oldPassword: e.target.value })
                  }
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Yeni Şifre</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                  }
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Yeni Şifre Tekrar</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  required
                />
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setShowPasswordModal(false)}
                >
                  İptal
                </button>
                <button type="submit" className={styles.primaryButton}>
                  Değiştir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hesap Dondur Confirm */}
      {showFreezeConfirm && (
        <div className={styles.modalOverlay} onClick={() => setShowFreezeConfirm(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Hesabı Dondur</h3>
              <button
                className={styles.modalClose}
                onClick={() => setShowFreezeConfirm(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalContent}>
              <p>Hesabınızı dondurmak istediğinize emin misiniz?</p>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setShowFreezeConfirm(false)}
              >
                İptal
              </button>
              <button
                type="button"
                className={styles.warningButton}
                onClick={handleFreezeAccount}
              >
                Dondur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hesap Sil Confirm */}
      {showDeleteConfirm && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Hesabı Sil</h3>
              <button
                className={styles.modalClose}
                onClick={() => setShowDeleteConfirm(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalContent}>
              <p style={{ color: "#ff6b6b", fontWeight: 600 }}>
                Bu işlem geri alınamaz! Hesabınız ve tüm verileriniz kalıcı olarak silinecek.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setShowDeleteConfirm(false)}
              >
                İptal
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={handleDeleteAccount}
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





