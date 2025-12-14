import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../../MainLayout/components/Header/Header";
import { launchFireworks } from "../../shared/utils/fireworks";
import styles from "./CategoryPage.module.css";

const CATEGORY_FILTERS: Record<string, string[]> = {
  "ders-akademi": [
    "Ders & Ders Notları",
    "İlişkiler & Sosyal Yaşam",
    "Sınav Tarihleri",
  ],
  "eglence": ["Oyun", "Mizah", "Konser", "Festival"],
  "yemek-mekan-onerileri": ["Restoran", "Tatlı", "Uygun fiyatlı kafe"],
  "konaklama-yurt-hayati": ["Yurt", "Ev", "Öğretmen evi", "Otel"],
  "universite-sehir-hakkinda": ["Kampüs ulaşım", "Yeni gelenler için", "Üni eğitim"],
  "iliskiler-sosyal-yasam": ["Aşk", "Arkadaşlık", "Aile", "İş"],
  "grup-sohbetleri": ["Genel", "Bölüm", "Kulüp", "Etkinlik"],
  "burs-is-ilanlari-kariyer": ["Burslar", "İş İlanları", "Staj", "Kariyer"],
  "ve-daha-fazlasi": ["Diğer", "Öneriler", "Yardım"],
};

const THEME_CLASS_MAP: Record<string, string> = {
  "ders-akademi": "themeAcademic",
  "eglence": "themeFun",
  "iliskiler-sosyal-yasam": "themeSocial",
  "burs-is-ilanlari-kariyer": "themeCareer",
  "grup-sohbetleri": "themeChat",
  "konaklama-yurt-hayati": "themeHousing",
  "yemek-mekan-onerileri": "themeFood",
  "gundem": "themeNews",
};

const PAGE_THEME_CLASS: Record<string, string> = {
  "ders-akademi": "pageThemeDersAkademi",
  "eglence": "pageThemeEglence",
  "yemek-mekan-onerileri": "pageThemeYemekMekan",
  "konaklama-yurt-hayati": "pageThemeKonaklama",
  "universite-sehir-hakkinda": "pageThemeUniversiteSehir",
  "iliskiler-sosyal-yasam": "pageThemeIliskiler",
};

// Bu kategoriler için iki kartlı template gösterilmeyecek
const HIDE_TEMPLATE_FOR: string[] = [
  "gundem",
  "ve-daha-fazlasi",
  "grup-sohbetleri",
];

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  
  // Slug'ı güvenli şekilde al
  const kategoriSlug = slug ?? "ders-akademi";
  const shouldHideTemplate = HIDE_TEMPLATE_FOR.includes(kategoriSlug);

  // Konfeti animasyonu - sadece Eğlence kategorisinde
  useEffect(() => {
    if (kategoriSlug === "eglence") {
      launchFireworks();
    }
  }, [kategoriSlug]);

  // Tema class'ını belirle
  const themeClassName =
    kategoriSlug && THEME_CLASS_MAP[kategoriSlug]
      ? styles[THEME_CLASS_MAP[kategoriSlug]]
      : "";

  // Slug'a göre filtreleri seç
  const filters =
    kategoriSlug && CATEGORY_FILTERS[kategoriSlug]
      ? CATEGORY_FILTERS[kategoriSlug]
      : CATEGORY_FILTERS["ders-akademi"];

  // İlk filtreyi aktif yap
  useEffect(() => {
    if (filters.length > 0 && activeFilter === null) {
      setActiveFilter(filters[0]);
    }
  }, [filters, activeFilter]);

  // Slug'a göre tema class'ı seç
  const themeClass =
    PAGE_THEME_CLASS[kategoriSlug] ?? styles.pageThemeDersAkademi;

  // Tüm kategoriler için aynı layout
  return (
    <div
      className={`${styles.page} ${styles.pageBackground} ${themeClass} ${styles.fadeInUp}`}
    >
      <Header user={null} />

      <main className={styles.content}>
        {/* Üstte alt kategori butonları - sadece template gösteriliyorsa */}
        {!shouldHideTemplate && filters.length > 0 && (
          <div className={styles.filterChips}>
            {filters.map((filter) => (
              <button
                key={filter}
                className={`${styles.filterChip} ${
                  filter === activeFilter ? styles.filterChipActive : ""
                } ${styles.chipHoverGlow}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        )}

        {/* İki kartlı layout veya placeholder */}
        {!shouldHideTemplate ? (
          <div className={styles.columns}>
            <section
              className={`${styles.leftCard} ${styles.cardGlass} ${styles.softShadow} ${styles.hoverLift}`}
            >
              <div className={styles.cardHeader}>
                <span className={`${styles.cardIcon} ${styles.iconBounce}`}>
                  ❓
                </span>
                <span className={styles.cardTitle}>soru cevap</span>
                <span className={styles.cardBadge}>12 soru</span>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.cardText}>
                  Henüz soru yok. İlk soruyu sen sor! 👀
                </p>
                <p className={styles.cardSubText}>
                  Yardım istediğin dersleri, konuları veya kaynakları paylaşabilirsin.
                </p>
              </div>
            </section>

            <section
              className={`${styles.rightCard} ${styles.cardGlass} ${styles.softShadow} ${styles.hoverLift}`}
            >
              <div className={styles.cardHeader}>
                <span className={`${styles.cardIcon} ${styles.iconBounce}`}>
                  📌
                </span>
                <span className={styles.cardTitle}>akış sayfası</span>
                <span className={styles.cardBadge}>0 paylaşım</span>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.cardText}>
                  Şu an için bir akış yok. Yeni paylaşımlar geldikçe burada görünecek.
                </p>
              </div>
            </section>
          </div>
        ) : (
          <div className={styles.placeholderArea}>
            <p className={styles.placeholderText}>
              Bu kategori için özel sayfa tasarımı yakında eklenecek.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

