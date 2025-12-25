import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { login, register, type AuthResponse } from "../authApi";
import { useAuth } from "../AuthProvider";
import { saveToken } from "../authStorage";
import "../styles/auth.css";

type ActiveTab = "login" | "register";

interface AuthFormProps {
  activeTab: ActiveTab;
  onTabChange?: (tab: ActiveTab) => void;
}

type FormState = {
  // ortak
  email: string;
  password: string;

  // register extra
  ad: string;
  soyad: string;
  kullanici_adi: string;
};

const initialState: FormState = {
  email: "",
  password: "",
  ad: "",
  soyad: "",
  kullanici_adi: "",
};

const AuthForm: React.FC<AuthFormProps> = ({ activeTab, onTabChange }) => {
  const isRegister = activeTab === "register";

  const [formData, setFormData] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const { login: loginUser } = useAuth();

  // ✅ redirect paramını oku (/auth?redirect=/kategori/ders-akademi)
  const [searchParams] = useSearchParams();
  const redirectTo = useMemo(() => {
    const r = searchParams.get("redirect");
    return r && r.startsWith("/") ? r : "/";
  }, [searchParams]);

  const setField =
    (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const resetAlerts = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const validate = (): string | null => {
    if (!formData.email.trim()) return "Email zorunludur.";
    if (!formData.password.trim()) return "Şifre zorunludur.";

    if (isRegister) {
      if (!formData.ad.trim()) return "Ad zorunludur.";
      if (!formData.soyad.trim()) return "Soyad zorunludur.";
      if (!formData.kullanici_adi.trim()) return "Kullanıcı adı zorunludur.";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAlerts();

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        // ----------- KAYIT OL -----------
        const response: AuthResponse = await register({
          ad: formData.ad.trim(),
          soyad: formData.soyad.trim(),
          kullanici_adi: formData.kullanici_adi.trim(),
          email: formData.email.trim(),
          password: formData.password,
          // opsiyonel alanlar (backend beklemiyorsa authApi içinde ignore edilebilir)
          universite: null,
          bolum: null,
          cinsiyet: null,
          dogum_yili: null,
        });

        if (response.success) {
          setSuccessMessage("Kayıt başarılı! Artık giriş yapabilirsiniz.");
          // login tabına geçir
          onTabChange?.("login");
          // şifreyi koruyup email’i koruyarak kullanıcıyı hızlı girişe yöneltmek için
          setFormData((prev) => ({
            ...prev,
            password: "",
          }));
        } else {
          setError(response.message || "Kayıt başarısız.");
        }
      } else {
        // ----------- GİRİŞ YAP -----------
        const response: AuthResponse = await login({
          email: formData.email.trim(),
          password: formData.password,
        });

        if (response.success && response.user) {
          const user = response.user;

          // token varsa kaydet
          if (response.token) {
            saveToken(response.token);
          }

          // AuthProvider state güncelle (Header vs için)
          loginUser(user);

          setSuccessMessage(`Hoş geldin ${user.ad} ${user.soyad}!`);
          // İstersen alert istemiyorsan kaldırabilirsin
          alert(`Hoş geldin ${user.ad} ${user.soyad}!`);

          // geldiğin sayfaya dön
          navigate(redirectTo, { replace: true });
        } else {
          setError(response.message || "Giriş başarısız.");
        }
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Beklenmeyen bir hata oluştu.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2 className="auth-title">{isRegister ? "Kayıt Ol" : "Giriş Yap"}</h2>

        {error && <div className="auth-alert auth-alert-error">{error}</div>}
        {successMessage && (
          <div className="auth-alert auth-alert-success">{successMessage}</div>
        )}

        {isRegister && (
          <>
            <div className="auth-field">
              <label>Ad</label>
              <input
                type="text"
                value={formData.ad}
                onChange={setField("ad")}
                placeholder="Ad"
                autoComplete="given-name"
              />
            </div>

            <div className="auth-field">
              <label>Soyad</label>
              <input
                type="text"
                value={formData.soyad}
                onChange={setField("soyad")}
                placeholder="Soyad"
                autoComplete="family-name"
              />
            </div>

            <div className="auth-field">
              <label>Kullanıcı Adı</label>
              <input
                type="text"
                value={formData.kullanici_adi}
                onChange={setField("kullanici_adi")}
                placeholder="kullanici_adi"
                autoComplete="username"
              />
            </div>
          </>
        )}

        <div className="auth-field">
          <label>Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={setField("email")}
            placeholder="ornek@mail.com"
            autoComplete={isRegister ? "email" : "username"}
          />
        </div>

        <div className="auth-field">
          <label>Şifre</label>
          <input
            type="password"
            value={formData.password}
            onChange={setField("password")}
            placeholder="••••••••"
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
        </div>

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? "Lütfen bekleyin..." : isRegister ? "Kayıt Ol" : "Giriş Yap"}
        </button>

        <div className="auth-footer">
          {isRegister ? (
            <span>
              Zaten hesabın var mı?{" "}
              <button
                type="button"
                className="auth-link"
                onClick={() => {
                  resetAlerts();
                  onTabChange?.("login");
                }}
              >
                Giriş Yap
              </button>
            </span>
          ) : (
            <span>
              Hesabın yok mu?{" "}
              <button
                type="button"
                className="auth-link"
                onClick={() => {
                  resetAlerts();
                  onTabChange?.("register");
                }}
              >
                Kayıt Ol
              </button>
            </span>
          )}
        </div>
      </form>
    </div>
  );
};

export default AuthForm;
