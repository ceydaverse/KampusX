import React from "react";
import "../styles/auth.css";

interface AuthTabsProps {
  activeTab: "login" | "register";
  onChangeTab: (tab: "login" | "register") => void;
}

/**
 * AuthTabs Component
 * Giriş Yap ve Kayıt Ol sekmelerini yöneten component
 */
const AuthTabs: React.FC<AuthTabsProps> = ({ activeTab, onChangeTab }) => {
  return (
    <div className="auth-tabs">
      <button
        className={`auth-tab ${activeTab === "login" ? "auth-tab--active" : ""}`}
        onClick={() => onChangeTab("login")}
      >
        Giriş Yap
      </button>
      <button
        className={`auth-tab ${activeTab === "register" ? "auth-tab--active" : ""}`}
        onClick={() => onChangeTab("register")}
      >
        Kayıt Ol
      </button>
    </div>
  );
};

export default AuthTabs;

