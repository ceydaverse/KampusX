import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { login, register, type ApiUser, type AuthResponse } from "../authApi";
import { useAuth } from "../AuthProvider";
import { saveToken } from "../authStorage";

import "../styles/auth.css";

interface AuthFormProps {
  activeTab: "login" | "register";
  onTabChange?: (tab: "login" | "register") => void;
}


/**
 * AuthForm Component
 * Form alanlarını ve butonları gösteren component
 * activeTab prop'una göre login veya register formunu gösterir
 */
const AuthForm: React.FC<AuthFormProps> = ({ activeTab, onTabChange }) => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    rememberMe: false,
    acceptTerms: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const { login: loginUser } = useAuth();

  // ✅ redirect paramını oku (/auth?redirect=/kategori/ders-akademi)
  const [searchParams] = useSearchParams();
  const redirectTo = useMemo(() => {
    const r = searchParams.get("redirect");
    // güvenlik: sadece relative path kabul et
    return r && r.startsWith("/") ? r : "/";
  }, [searchParams]);

  const isRegister = activeTab === "register";

  // "Ad Soyad"ı ikiye bölmek için helper
  const splitName = (name: string): { ad: string; soyad: string } => {
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return { ad: "", soyad: "" };
    if (parts.length === 1) return { ad: parts[0], soyad: "" };
    const ad = parts[0];
    const soyad = parts.slice(1).join(" ");
    return { ad, soyad };
  };

  // Input değişikliklerini handle eden fonksiyon
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Form submit handler (backend çağrısı burada)
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Register modundaysak ekstra kontroller
    if (isRegister) {
      if (!formData.acceptTerms) {
        setError("Kullanım koşullarını kabul etmelisiniz.");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Şifre ve şifre tekrarı aynı olmalıdır.");
        return;
      }
      if (!formData.fullName.trim()) {
        setError("Ad Soyad alanı boş olamaz.");
        return;
      }
    }

    setLoading(true);

    try {
      if (isRegister) {
        // ----------- KAYIT OL -----------
        const { ad, soyad } = splitName(formData.fullName);

        const response = await register({
          ad,
          soyad,
          email: formData.email,
          password: formData.password,
          // opsiyonel alanları şimdilik null gönderiyoruz
          universite: null,
          bolum: null,
          cinsiyet: null,
          dogum_yili: null,
        });

        if (response.success) {
          setSuccessMessage("Kayıt başarılı! Artık giriş yapabilirsiniz.");

          // ✅ Login tabına geç
          onTabChange?.("login");

          // ✅ Popup göster
          alert("Kayıt başarılı! Şimdi email ve şifrenizle giriş yapabilirsiniz.");
        } else {
          setError(response.message || "Kayıt başarısız.");
        }
      } else {
        // ----------- GİRİŞ YAP -----------
        const response = await login({
          email: formData.email,
          password: formData.password,
        });

        if (response.success && response.user) {
          const user = response.user;

          // ✅ Token varsa kaydet (opsiyonel)
          if (response.token) {
            saveToken(response.token);
          }

          // ✅ AuthProvider state'ini güncelle (Header'da görünmesi için)
          loginUser(user);

          setSuccessMessage(`Hoş geldin ${user.ad} ${user.soyad}!`);

          // ✅ Popup göster
          alert(`Hoş geldin ${user.ad} ${user.soyad}!`);

          // ✅ Geldiğin sayfaya geri dön (redirect)
          navigate(redirectTo, { replace: true });
        } else {
          setError(response.message || "Giriş başarısız.");
        }
      }
    } catch (err: any) {
      const msg = err?.message || "Sunucuya bağlanırken bir hata oluştu.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Tab değiştiğinde form'u sıfırla
  useEffect(() => {
    setFormData({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      rememberMe: false,
      acceptTerms: false,
    });
    setError(null);
    setSuccessMessage(null);
  }, [activeTab]);

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-form-content">
        {/* Sol taraf: Input alanları */}
        <div className="auth-form-inputs">
          {isRegister && (
            <div className="auth-input-group">
              <label htmlFor="fullName">Adı Soyadı</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Adınız ve soyadınız"
              />
            </div>
          )}

          <div className="auth-input-group">
            <label htmlFor="email">e-posta Adresi</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="ornek@email.com"
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="password">Şifre</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Şifrenizi girin"
            />
          </div>

          {isRegister && (
            <div className="auth-input-group">
              <label htmlFor="confirmPassword">Şifre Tekrar</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Şifrenizi tekrar girin"
              />
            </div>
          )}
        </div>

        {/* Sağ taraf: Sosyal login butonları (şimdilik sadece görüntü) */}
        <div className="auth-social-buttons">
          <button type="button" className="social-btn social-btn--google">
            G
          </button>
          <button type="button" className="social-btn social-btn--facebook">
            F
          </button>
          <button type="button" className="social-btn social-btn--facebook">
            F
          </button>
          <button type="button" className="social-btn social-btn--apple">
            Apple
          </button>
        </div>
      </div>

      {/* Hata / başarı mesajları */}
      {error && <div className="auth-alert auth-alert--error">{error}</div>}
      {successMessage && (
        <div className="auth-alert auth-alert--success">{successMessage}</div>
      )}

      {/* Checkbox alanı */}
      <div className="auth-checkbox-group">
        {isRegister ? (
          <>
            <label className="auth-checkbox-label">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
              />
              <span>
                Kullanım Koşulları ve Gizlilik Politikasını okudum ve kabul
                ediyorum.
              </span>
            </label>
            <p className="auth-help-text">Zaten hesabım var mı?</p>
          </>
        ) : (
          <>
            <label className="auth-checkbox-label">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
              />
              <span>Beni hatırla</span>
            </label>
            <p className="auth-help-text">Hesabın yok mu?</p>
          </>
        )}
      </div>

      {/* Alt butonlar */}
      <div className="auth-form-actions">
        {isRegister ? (
          <>
            <button
              type="submit"
              className="btn-primary-pink"
              disabled={loading}
            >
              {loading ? "İşlem yapılıyor..." : "Hesap Oluştur"}
            </button>
            <button
              type="button"
              className="btn-outline-blue"
              onClick={() => onTabChange?.("login")}
            >
              Giriş Yap
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn-primary-pink"
              onClick={() => onTabChange?.("register")}
            >
              Kayıt Ol
            </button>
            <button
              type="submit"
              className="btn-outline-blue"
              disabled={loading}
            >
              {loading ? "İşlem yapılıyor..." : "Giriş Yap"}
            </button>
          </>
        )}
      </div>
    </form>
  );
};

export default AuthForm;
