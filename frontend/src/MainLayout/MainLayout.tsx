import React from "react";
import styles from "./MainLayout.module.css";

// Default export edilen bileşenleri alıyoruz
import Header from "./components/Header/Header";
import { CategoryBoard } from "./components/CategoryBoard/CategoryBoard";
import Footer from "./components/Footer/Footer";

const MainLayout: React.FC = () => {
  return (
    <div className={styles.page}>
      {/* Üst kısım: başlık barı */}
      <Header />

      {/* Alt kısım: Kategoriler */}
      <main className={styles.main}>
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
