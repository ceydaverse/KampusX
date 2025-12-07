import React from "react";
import styles from "./MainLayout.module.css";

// Default export edilen bileşenleri alıyoruz
import Header from "./components/Header/Header";
import AgendaPanel from "./components/AgendaPanel/AgendaPanel";
import { CategoryBoard } from "./components/CategoryBoard/CategoryBoard";


const MainLayout: React.FC = () => {
  return (
    <div className={styles.page}>
      {/* Üst kısım: başlık barı */}
      <Header />

      {/* Alt kısım: sol GÜNDEM, sağ Kategoriler */}
      <main className={styles.main}>
        <section className={styles.agendaSection}>
          <AgendaPanel />
        </section>

        <section className={styles.categorySection}>
          <CategoryBoard />
        </section>
      </main>
    </div>
  );
};

export default MainLayout;




