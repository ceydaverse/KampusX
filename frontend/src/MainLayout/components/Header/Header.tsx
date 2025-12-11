import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Header.module.css";

// MainLayout'tan gelecek user tipi
interface ApiUser {
  id: number;
  ad: string;
  soyad: string;
  email: string;
  universite?: string | null;
  bolum?: string | null;
  cinsiyet?: string | null;
}

interface HeaderProps {
  user: ApiUser | null;
}

const Header: React.FC<HeaderProps> = ({ user }) => {
  const navigate = useNavigate();

  const handleAuthClick = () => {
    navigate("/auth");
  };

  return (
    <header className={styles.header}>
      {/* Sol: KAMPUSX */}
      <div className={styles.logo}>KAMPUSX</div>

      {/* Orta: arama çubuğu */}
      <div className={styles.searchWrapper}>
        <input
          className={styles.searchInput}
          placeholder="Arama çubuğu"
        />
      </div>

      {/* Sağ: Giriş Yap / Üye Ol veya Hesabım */}
      <div className={styles.authWrapper}>
        {user ? (
          // ✅ Kullanıcı giriş yaptıysa
          <button
            className={styles.authButton}
            type="button"
            // şimdilik tıklayınca bir şey yapmıyor
          >
            Hesabım
          </button>
        ) : (
          // ✅ Kullanıcı yoksa
          <button
            className={styles.authButton}
            type="button"
            onClick={handleAuthClick}
          >
            Giriş Yap / Üye Ol
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
