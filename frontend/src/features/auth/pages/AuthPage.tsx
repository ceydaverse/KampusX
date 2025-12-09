import React, { useState } from "react";
import AuthTabs from "../components/AuthTabs";
import AuthForm from "../components/AuthForm";
import "../styles/auth.css";

/**
 * AuthPage Component
 * /auth rotasında açılacak ana sayfa component'i
 * Giriş Yap ve Kayıt Ol sekmelerini yönetir
 */
const AuthPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"login" | "register">("register");

  const handleTabChange = (tab: "login" | "register") => {
    setActiveTab(tab);
  };

  return (
    <div className="auth-page">
      {/* Üst mavi bar */}
      <div className="auth-header">
        <h1 className="auth-logo">KAMPUSX</h1>
      </div>

      {/* Ana içerik */}
      <div className="auth-container">
        <h2 className="auth-title">Giriş Yap / Kayıt Ol</h2>

        {/* Sekmeler */}
        <AuthTabs activeTab={activeTab} onChangeTab={handleTabChange} />

        {/* Form kartı */}
        <div className="auth-card">
          <AuthForm activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

