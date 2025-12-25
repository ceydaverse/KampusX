import React, { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import Header from "../../../MainLayout/components/Header/Header";
import api from "../../../lib/api";
import styles from "./ProfilePage.module.css";

interface UserProfile {
  id: number;
  ad: string;
  soyad: string;
  email: string;
  universite?: string | null;
  bolum?: string | null;
  kullanici_adi?: string | null;
  dogum_yili?: number | null;
  cinsiyet?: string | null;
}

interface ProfileResponse {
  success: boolean;
  user?: UserProfile;
  message?: string;
}

export default function ProfilePage() {
  const { user: authUser, setUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    ad: "",
    soyad: "",
    universite: "",
    bolum: "",
    kullanici_adi: "",
    dogum_yili: "",
    cinsiyet: "",
  });

  // Profil bilgilerini yükle
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<ProfileResponse>("/api/users/me");
        if (response.data.success && response.data.user) {
          const userData = response.data.user;
          setProfile(userData);
          setFormData({
            ad: userData.ad || "",
            soyad: userData.soyad || "",
            universite: userData.universite || "",
            bolum: userData.bolum || "",
            kullanici_adi: userData.kullanici_adi || "",
            dogum_yili: userData.dogum_yili ? String(userData.dogum_yili) : "",
            cinsiyet: userData.cinsiyet || "",
          });
        } else {
          setError(response.data.message || "Profil bilgileri yüklenemedi");
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.message || "Profil bilgileri yüklenirken hata oluştu.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);

    // Eski formData'yı sakla (hata durumunda geri döndürmek için)
    const oldFormData = { ...formData };

    const payload = {
      ad: formData.ad,
      soyad: formData.soyad,
      universite: formData.universite || null,
      bolum: formData.bolum || null,
      kullanici_adi: formData.kullanici_adi || null,
      dogum_yili: formData.dogum_yili ? Number(formData.dogum_yili) : null,
      cinsiyet: formData.cinsiyet || null,
    };

    // Network debug
    console.log("SAVE payload", payload);

    try {
      const response = await api.put<ProfileResponse>("/api/users/me", payload);

      // Network debug
      console.log("SAVE response", response.data);

      // Sadece başarılı response gelirse state güncelle
      if (response.data.success && response.data.user) {
        const updatedUser = response.data.user;
        
        // Form state'ini response ile güncelle
        setFormData({
          ad: updatedUser.ad || "",
          soyad: updatedUser.soyad || "",
          universite: updatedUser.universite || "",
          bolum: updatedUser.bolum || "",
          kullanici_adi: updatedUser.kullanici_adi || "",
          dogum_yili: updatedUser.dogum_yili ? String(updatedUser.dogum_yili) : "",
          cinsiyet: updatedUser.cinsiyet || "",
        });

        setProfile(updatedUser);
        setIsEditing(false);

        // localStorage'daki user bilgisini güncelle
        if (authUser) {
            const updatedAuthUser = {
              ...authUser,
              ad: updatedUser.ad,
              soyad: updatedUser.soyad,
              universite: updatedUser.universite,
              bolum: updatedUser.bolum,
              kullanici_adi: updatedUser.kullanici_adi,
              dogum_yili: updatedUser.dogum_yili,
              cinsiyet: updatedUser.cinsiyet,
            };
          setUser(updatedAuthUser);
        }
      } else {
        // Hata durumunda eski haline döndür
        setFormData(oldFormData);
        setSaveError(response.data.message || "Kayıt başarısız");
        alert(response.data.message || "Kayıt başarısız");
      }
    } catch (err: any) {
      // Hata durumunda eski haline döndür
      setFormData(oldFormData);
      const msg =
        err?.response?.data?.message || err?.message || "Kayıt sırasında hata oluştu.";
      setSaveError(msg);
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        ad: profile.ad || "",
        soyad: profile.soyad || "",
        universite: profile.universite || "",
        bolum: profile.bolum || "",
        kullanici_adi: profile.kullanici_adi || "",
        dogum_yili: profile.dogum_yili ? String(profile.dogum_yili) : "",
        cinsiyet: profile.cinsiyet || "",
      });
    }
    setIsEditing(false);
    setSaveError(null);
  };

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.card}>
          <h1 className={styles.title}>Kişisel Bilgiler</h1>

          {loading ? (
            <div className={styles.loading}>Yükleniyor...</div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : profile ? (
            <>
              <div className={styles.form}>
                <div className={styles.formGroup}>
                  <label htmlFor="ad">Ad</label>
                  <input
                    type="text"
                    id="ad"
                    name="ad"
                    value={formData.ad}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="soyad">Soyad</label>
                  <input
                    type="text"
                    id="soyad"
                    name="soyad"
                    value={formData.soyad}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="email">E-posta</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={profile.email}
                    disabled
                    className={`${styles.input} ${styles.inputDisabled}`}
                  />
                  <small className={styles.helpText}>E-posta değiştirilemez</small>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="kullanici_adi">Kullanıcı Adı</label>
                  <input
                    type="text"
                    id="kullanici_adi"
                    name="kullanici_adi"
                    value={formData.kullanici_adi}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={styles.input}
                    placeholder="Kullanıcı adınız"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="universite">Üniversite</label>
                  <input
                    type="text"
                    id="universite"
                    name="universite"
                    value={formData.universite}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={styles.input}
                    placeholder="Üniversite adı"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="bolum">Bölüm</label>
                  <input
                    type="text"
                    id="bolum"
                    name="bolum"
                    value={formData.bolum}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={styles.input}
                    placeholder="Bölüm adı"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="dogum_yili">Doğum Yılı</label>
                  <input
                    type="number"
                    id="dogum_yili"
                    name="dogum_yili"
                    value={formData.dogum_yili}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={styles.input}
                    placeholder="2000"
                    min={1900}
                    max={new Date().getFullYear() - 10}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="cinsiyet">Cinsiyet</label>
                  <select
                    id="cinsiyet"
                    name="cinsiyet"
                    value={formData.cinsiyet}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={styles.input}
                  >
                    <option value="">Seçiniz</option>
                    <option value="Kadın">Kadın</option>
                    <option value="Erkek">Erkek</option>
                    <option value="Diğer">Diğer</option>
                    <option value="Belirtmek istemiyorum">Belirtmek istemiyorum</option>
                  </select>
                </div>
              </div>

              {saveError && <div className={styles.error}>{saveError}</div>}

              <div className={styles.actions}>
                {!isEditing ? (
                  <button
                    type="button"
                    className={styles.editButton}
                    onClick={() => setIsEditing(true)}
                  >
                    Değiştir
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className={styles.cancelButton}
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      İptal
                    </button>
                    <button
                      type="button"
                      className={styles.saveButton}
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? "Kaydediliyor..." : "Kaydet"}
                    </button>
                  </>
                )}
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}

