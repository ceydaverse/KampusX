import React from "react";
import Header from "../../MainLayout/components/Header/Header";
import Footer from "../../MainLayout/components/Footer/Footer";
import styles from "./AgendaPage.module.css";

export default function AgendaPage() {
  return (
    <div className={styles.page}>
      <Header user={null} />
      <div className={styles.placeholderArea}>
        <p className={styles.placeholderText}>
          Bu kategori için özel sayfa tasarımı yakında eklenecek.
        </p>
      </div>
      <Footer />
    </div>
  );
}

