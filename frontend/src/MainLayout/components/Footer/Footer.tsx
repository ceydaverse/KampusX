import React from "react";
import { Link } from "react-router-dom";
import styles from "./Footer.module.css";

const Footer: React.FC = () => {
  return (
    <footer className={`${styles.footer} ${styles.footerContainer}`}>
      <div className={styles.container}>
        <div className={styles.content}>
          {/* Sol taraf: KAMPUSX ve açıklama */}
          <div className={styles.leftSection}>
            <h3 className={styles.logo}>KAMPUSX</h3>
            <p className={styles.description}>
              Üniversite öğrencileri için çevrim içi forum ve mesajlaşma platformu.
            </p>
          </div>

          {/* Orta taraf: Hızlı erişim linkleri */}
          <div className={styles.middleSection}>
            <h4 className={styles.sectionTitle}>Hızlı Erişim</h4>
            <ul className={styles.linksList}>
              <li>
                <Link to="/gundem" className={`${styles.link} ${styles.footerLink}`}>
                  Gündem
                </Link>
              </li>
              <li>
                <Link to="/" className={`${styles.link} ${styles.footerLink}`}>
                  Kategoriler
                </Link>
              </li>
              <li>
                <Link to="/kategori/grup-sohbetleri" className={`${styles.link} ${styles.footerLink}`}>
                  Grup Sohbetleri
                </Link>
              </li>
              <li>
                <Link to="/kategori/burs-is-ilanlari-kariyer" className={`${styles.link} ${styles.footerLink}`}>
                  Burslar & Kariyer
                </Link>
              </li>
              <li>
                <Link to="/hakkimizda" className={`${styles.link} ${styles.footerLink}`}>
                  Hakkımızda
                </Link>
              </li>
            </ul>
          </div>

          {/* Sağ taraf: İletişim ve sosyal medya */}
          <div className={styles.rightSection}>
            <h4 className={styles.sectionTitle}>İletişim</h4>
            <p className={styles.contact}>
              destek@kampusx.com
            </p>
            <div className={styles.socialLinks}>
              <span className={styles.socialItem}>Instagram</span>
              <span className={styles.socialSeparator}>|</span>
              <span className={styles.socialItem}>Twitter</span>
              <span className={styles.socialSeparator}>|</span>
              <span className={styles.socialItem}>LinkedIn</span>
            </div>
          </div>
        </div>

        {/* Alt satır: Copyright */}
        <div className={styles.copyright}>
          <span>© 2025 KampüsX • Tüm hakları saklıdır.</span>
          <Link to="/topluluk-kurallari" className={styles.rulesLink}>
            Topluluk Kuralları
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

