import React from "react";
import styles from "./Header.module.css";

const Header: React.FC = () => {
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

      {/* Sağ: Giriş Yap / Üye Ol Butonu */}
      <div className={styles.authWrapper}>
        <button className={styles.authButton}>Giriş Yap / Üye Ol</button>
      </div>
    </header>
  );
};

export default Header;
