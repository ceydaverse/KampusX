import React, { useEffect, useState } from "react";
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
  const [isScrolled, setIsScrolled] = useState(false);

  // Scroll shrink animasyonu
  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleAuthClick = () => {
    navigate("/auth");
  };

  const handleBrandClick = () => {
    navigate("/");
  };

  return (
    <div className={styles.headerWrapper}>
      <header
        className={`${styles.header} ${
          isScrolled ? styles.headerScrolled : ""
        }`}
      >
        {/* Sol: KAMPÜS81 */}
        <div className={styles.brand} onClick={handleBrandClick}>
          KAMPÜS81
        </div>

        {/* Orta: arama çubuğu */}
        <div className={styles.searchWrapper}>
          <div className={styles.searchBarWrapper}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.searchInput}
              placeholder="Arama çubuğu"
            />
          </div>
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
              <span className={styles.userIcon}>👤</span>
              Hesabım
            </button>
          ) : (
            // ✅ Kullanıcı yoksa
            <button
              className={styles.authButton}
              type="button"
              onClick={handleAuthClick}
            >
              <span className={styles.userIcon}>👤</span>
              Giriş Yap / Üye Ol
            </button>
          )}
        </div>
      </header>
    </div>
  );
};

export default Header;
