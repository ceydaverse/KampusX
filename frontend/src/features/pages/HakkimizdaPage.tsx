import React from "react";
import Header from "../../MainLayout/components/Header/Header";
import Footer from "../../MainLayout/components/Footer/Footer";
import styles from "./HakkimizdaPage.module.css";

export default function HakkimizdaPage() {
  return (
    <div className={styles.page}>
      <Header user={null} />

      <main className={styles.content}>
        <section className={styles.hero}>
          <h1 className={styles.title}>KampusX Hakkında</h1>
          <p className={styles.subtitle}>
            KampusX, üniversite öğrencilerinin aynı kampüste ya da farklı şehirlerde
            olsalar bile tek bir çatı altında buluşabildiği, soru sorup cevap alabildiği,
            gündemi takip ettiği ve yeni insanlarla tanıştığı çevrim içi forum ve
            mesajlaşma platformudur.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Neden KampusX?</h2>
          <p className={styles.sectionText}>
            Kampüs hayatı sadece derslerden ibaret değil. Ders notları, sınav tarihleri,
            burs ve iş ilanları, kulüp etkinlikleri, sosyal hayat, barınma sorunları ve
            daha fazlası… KampusX, tüm bu başlıkları tek bir yerde toplayarak öğrencilerin
            hem akademik hem sosyal hayatını kolaylaştırmayı hedefler.
          </p>
        </section>

        <section className={styles.sectionGrid}>
          <div className={styles.card}>
            <h3>Akademik Destek</h3>
            <p>
              Ders notları, ödev ve proje yardımı, sınav dönemleri için ipuçları…
              Öğrenciler birbirine destek olarak daha güçlü bir öğrenme ortamı oluşturur.
            </p>
          </div>
          <div className={styles.card}>
            <h3>Sosyal Bağlantılar</h3>
            <p>
              İlişkiler & sosyal yaşam, etkinlik önerileri, kulüp duyuruları ve
              grup sohbetleri ile yeni insanlarla tanışmak çok daha kolay.
            </p>
          </div>
          <div className={styles.card}>
            <h3>Kariyer ve Fırsatlar</h3>
            <p>
              Burslar, part-time iş ilanları, staj fırsatları ve mezunlarla bağlantı kurma
              imkanı sayesinde kariyerine kampüs yıllarında yön verebilirsin.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Nasıl Bir Topluluk Hayal Ediyoruz?</h2>
          <p className={styles.sectionText}>
            KampusX'te; saygılı iletişim kuran, birbirini destekleyen, farklı görüşlere
            açık ve kapsayıcı bir topluluk kültürü hedefliyoruz. Topluluk kuralları ile
            güvenli bir ortamı korurken, öğrencilerin kendini özgürce ifade edebildiği
            bir alan sunuyoruz.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Gelecek Planlarımız</h2>
          <p className={styles.sectionText}>
            Önümüzdeki dönemde, bölüm bazlı özel kanallar, etkinlik takvimi,
            mentor-menti eşleştirme sistemi ve yapay zeka destekli içerik önerileri gibi
            yeni özellikler eklemeyi planlıyoruz. KampusX'i öğrencilerle birlikte
            büyüyen yaşayan bir platform olarak görüyoruz.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Bize Ulaş</h2>
          <p className={styles.sectionText}>
            KampusX hakkında önerin, eleştirin ya da iş birliği fikrin mi var?
            Bize her zaman <strong>destek@kampusx.com</strong> adresinden ulaşabilirsin.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}


