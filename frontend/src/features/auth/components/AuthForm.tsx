import React, { useState } from "react";
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
  // Form state'leri
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    rememberMe: false,
    acceptTerms: false,
  });

  // Input değişikliklerini handle eden fonksiyon
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Form submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Active Tab:", activeTab);
    console.log("Form Data:", formData);
    // Backend çağrısı burada yapılacak (şimdilik sadece console.log)
  };

  // Tab değiştiğinde form'u sıfırla
  React.useEffect(() => {
    setFormData({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      rememberMe: false,
      acceptTerms: false,
    });
  }, [activeTab]);

  const isRegister = activeTab === "register";

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

        {/* Sağ taraf: Sosyal login butonları */}
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
              <span>Kullanım Koşulları ve Gizlilik Politikasını okudum ve kabul ediyorum.</span>
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
            <button type="submit" className="btn-primary-pink">
              Hesap Oluştur
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
            <button type="submit" className="btn-outline-blue">
              Giriş Yap
            </button>
          </>
        )}
      </div>
    </form>
  );
};

export default AuthForm;

