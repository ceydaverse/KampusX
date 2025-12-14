import React, { useEffect, useState } from "react";
import styles from "./MainLayout.module.css";

// Default export edilen bileşenleri alıyoruz
import Header from "./components/Header/Header";
import AgendaPanel from "./components/AgendaPanel/AgendaPanel";
import { CategoryBoard } from "./components/CategoryBoard/CategoryBoard";
import Footer from "./components/Footer/Footer";

// Backend'den gelen user tipi
interface ApiUser {
  id: number;
  ad: string;
  soyad: string;
  email: string;
  universite?: string | null;
  bolum?: string | null;
  cinsiyet?: string | null;
}

const MainLayout: React.FC = () => {
  const [user, setUser] = useState<ApiUser | null>(null);

  // Sayfa açıldığında localStorage'dan kullanıcıyı çek
  useEffect(() => {
    const stored = localStorage.getItem("kampusxUser");
    if (stored) {
      try {
        const parsed: ApiUser = JSON.parse(stored);
        setUser(parsed);
      } catch (err) {
        console.error("Kullanıcı bilgisi parse edilemedi:", err);
      }
    }
  }, []);

  return (
    <div className={styles.page}>
      {/* Üst kısım: başlık barı */}
      {/* ✅ Header'a user prop'u geçiyoruz */}
      <Header user={user} />

      {/* Alt kısım: sol GÜNDEM, sağ Kategoriler */}
      <main className={styles.main}>
        <section className={styles.agendaSection}>
          <AgendaPanel />
        </section>

        <section className={styles.categorySection}>
          <CategoryBoard />
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default MainLayout;
