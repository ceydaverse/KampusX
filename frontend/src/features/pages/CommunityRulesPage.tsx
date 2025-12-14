import React from "react";
import Header from "../../MainLayout/components/Header/Header";
import Footer from "../../MainLayout/components/Footer/Footer";
import styles from "./CommunityRulesPage.module.css";

export default function CommunityRulesPage() {
  return (
    <div className={styles.page}>
      <Header user={null} />

      <main className={styles.content}>
        <h1 className={styles.title}>Topluluk Kuralları</h1>
        <p className={styles.intro}>
          KampusX, üniversite öğrencilerinin kendini güvende hissettiği,
          saygılı ve eğlenceli bir ortam olsun diye bazı temel kurallar belirledik.
          Aşağıdaki maddeleri kabul ederek platformu kullanmış olursun.
        </p>

        <section className={styles.section}>
          <h2>1. Saygılı iletişim</h2>
          <ul>
            <li>Hakaret, aşağılama, alay etme ve kişisel saldırı içeren mesajlar paylaşma.</li>
            <li>Fikir eleştirisi yapabilirsin ama kişilere saldırmak yasaktır.</li>
            <li>Üslubunda nezaket ve empatiyi korumaya özen göster.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>2. Nefret söylemi ve ayrımcılık yok</h2>
          <ul>
            <li>Irk, etnik köken, cinsiyet, cinsel yönelim, din, engellilik vb. temelli nefret söylemi yasaktır.</li>
            <li>Her türlü ayrımcı, dışlayıcı ve hedef gösterici içerik silinebilir ve hesabın kısıtlanabilir.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. Taciz, tehdit ve zorbalık yok</h2>
          <ul>
            <li>Israrcı mesajlar, takip etme, rahatsız etme, özel hayatı ihlal eden davranışlar yasaktır.</li>
            <li>Şiddet tehdidi veya dolaylı tehdit içeren içerikler platformdan kaldırılır.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. Gizlilik ve kişisel veriler</h2>
          <ul>
            <li>Başkasının gerçek adını, fotoğrafını, telefonunu, adresini veya özel bilgilerini izinsiz paylaşma.</li>
            <li>Okul numarası, öğrenci maili gibi bilgileri paylaşırken dikkatli ol.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>5. Spam, reklam ve tanıtım içerikleri</h2>
          <ul>
            <li>Sürekli aynı içeriği paylaşmak, link yağmuru yapmak, otomatik mesaj atmak yasaktır.</li>
            <li>Reklam ve tanıtım içerikleri sadece belirlenen alanlarda ve kurallara uygun şekilde paylaşılabilir.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>6. Hukuka aykırı içerikler</h2>
          <ul>
            <li>Yasa dışı madde, silah, şiddet, intihara teşvik vb. içeren paylaşımlar yasaktır.</li>
            <li>Telif hakkı ihlali oluşturan paylaşımlar (izinsiz film, ders notu, kitap PDF'i vb.) kaldırılabilir.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>7. Hesap ve güvenlik</h2>
          <ul>
            <li>Hesabını başkalarıyla paylaşma, başkasının adına hesap açma.</li>
            <li>Şifre güvenliğinden kullanıcı sorumludur.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>8. Moderasyon ve yaptırımlar</h2>
          <ul>
            <li>Kurallara uymayan içerikler moderatörler tarafından düzenlenebilir veya kaldırılabilir.</li>
            <li>Tekrarlayan ihlallerde uyarı, geçici uzaklaştırma veya kalıcı ban uygulanabilir.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>9. Topluluk kültürü</h2>
          <ul>
            <li>Yeni gelenlere yardımcı ol, sorulara yapıcı cevaplar ver.</li>
            <li>Kampüs hayatını daha keyifli ve verimli kılacak içerikler üretmeye çalış.</li>
          </ul>
        </section>

        <p className={styles.note}>
          Bu kurallar zaman zaman güncellenebilir. KampusX'i kullanmaya devam ederek güncel kuralları kabul etmiş sayılırsın.
        </p>
      </main>

      <Footer />
    </div>
  );
}

