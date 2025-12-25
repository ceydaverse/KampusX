import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../../MainLayout/components/Header/Header";
import { launchFireworks } from "../../shared/utils/fireworks";
import styles from "./CategoryPage.module.css";
import questionStyles from "../questions/questions.module.css";
import { QuestionList } from "../questions/components/QuestionList";
import { NewQuestionModal } from "../questions/components/NewQuestionModal";
import { createQuestion, fetchQuestions } from "../questions/questionsApi";
import { fetchCategories, type Category } from "./categoriesApi";
import type { Question } from "../questions/types";

// Slug -> ana_kategori_id mapping
// Not: Bu ID'ler DB'deki dbo.Kategoriler tablosundaki ana_kategori_id değerlerine göre ayarlanmalıdır
const ANA_KATEGORI_ID_BY_SLUG: Record<string, number> = {
  "ders-akademi": 1,
  "iliskiler-sosyal-yasam": 2,
  "konaklama-yurt-hayati": 3,
  "eglence": 4,
  // Diğer kategoriler için mapping eklenebilir
  "yemek-mekan-onerileri": 5,
  "universite-sehir-hakkinda": 6,
  "burs-is-ilanlari-kariyer": 7,
  "grup-sohbetleri": 8,
  "ve-daha-fazlasi": 9,
};

// Fallback için eski filtreler (DB'den gelmezse kullanılır)
const CATEGORY_FILTERS_FALLBACK: Record<string, string[]> = {
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
  const [selectedAltCategoryId, setSelectedAltCategoryId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [altCategories, setAltCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(false);
  const [kategoriId, setKategoriId] = useState<number | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  
  // Slug'ı güvenli şekilde al
  const kategoriSlug = slug ?? "ders-akademi";
  const shouldHideTemplate = HIDE_TEMPLATE_FOR.includes(kategoriSlug);
  
  // Slug'dan ana_kategori_id bul
  const anaKategoriId = ANA_KATEGORI_ID_BY_SLUG[kategoriSlug] || null;

  // Konfeti animasyonu - sadece Eğlence kategorisinde
  useEffect(() => {
    if (kategoriSlug === "eglence") {
      launchFireworks();
    }
  }, [kategoriSlug]);



  // Slug'a göre tema class'ı seç
  const themeClass =
    PAGE_THEME_CLASS[kategoriSlug] ?? styles.pageThemeDersAkademi;

  // Alt kategorileri yükle (ana_kategori_id ile)
  useEffect(() => {
    const loadAltCategories = async () => {
      if (!anaKategoriId) {
        setCategoryError("Ana kategori bulunamadı");
        setAltCategories([]);
        setKategoriId(null);
        setSelectedAltCategoryId(null);
        return;
      }

      setLoadingCategories(true);
      setCategoryError(null);
      try {
        const items = await fetchCategories(anaKategoriId);
        setAltCategories(items);
        
        // İlk alt kategoriyi otomatik seç (sadece yeni yüklemede)
        if (items.length > 0) {
          const firstCategory = items[0];
          setSelectedAltCategoryId(firstCategory.kategori_id);
          setKategoriId(firstCategory.kategori_id);
        } else {
          setCategoryError("Bu kategori için alt kategori bulunamadı");
          setKategoriId(null);
          setSelectedAltCategoryId(null);
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.message || "Kategoriler yüklenirken bir hata oluştu.";
        setCategoryError(msg);
        setAltCategories([]);
        setKategoriId(null);
        setSelectedAltCategoryId(null);
      } finally {
        setLoadingCategories(false);
      }
    };
    
    loadAltCategories();
  }, [anaKategoriId, kategoriSlug]);

  // selectedAltCategoryId değiştiğinde kategoriId'yi güncelle
  useEffect(() => {
    if (selectedAltCategoryId) {
      setKategoriId(selectedAltCategoryId);
    }
  }, [selectedAltCategoryId]);

  // Soruları yükle (kategori_id bulunduğunda)
  const loadQuestions = useCallback(async () => {
    if (!kategoriId) {
      setQuestions([]);
      return;
    }
    
    setLoadingQuestions(true);
    setQuestionsError(null);
    try {
      const items = await fetchQuestions(kategoriId);
      setQuestions(items);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Sorular yüklenirken bir hata oluştu.";
      setQuestionsError(msg);
    } finally {
      setLoadingQuestions(false);
    }
  }, [kategoriId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const resolveUserId = () => {
    try {
      const stored = localStorage.getItem("kampusxUser");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.id) return Number(parsed.id);
      }
    } catch (err) {
      console.error("Kullanıcı bilgisi okunamadı:", err);
    }
    // TODO: Auth eklendiğinde gerçek kullanıcıyı kullan
    return 15;
  };

  const handleCreateQuestion = async (payload: {
    baslik: string;
    soru_metin: string;
  }) => {
    if (!kategoriId) {
      setCreateError("Kategori bulunamadı");
      return;
    }
    
    setCreating(true);
    setCreateError(null);
    try {
      const newItem = await createQuestion({
        kategori_id: kategoriId,
        kullanici_id: resolveUserId(),
        baslik: payload.baslik,
        soru_metin: payload.soru_metin,
      });
      setQuestions((prev) => [newItem, ...prev]);
      setModalOpen(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || "Soru gönderilirken hata oluştu.";
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  // Tüm kategoriler için aynı layout
  return (
    <div
      className={`${styles.page} ${styles.pageBackground} ${themeClass} ${styles.fadeInUp}`}
    >
      <Header />

      <main className={styles.content}>
        {/* Üstte alt kategori butonları - sadece template gösteriliyorsa */}
        {!shouldHideTemplate && altCategories.length > 0 && (
          <div className={styles.filterChips}>
            {altCategories.map((category) => (
              <button
                key={category.kategori_id}
                className={`${styles.filterChip} ${
                  category.kategori_id === selectedAltCategoryId ? styles.filterChipActive : ""
                } ${styles.chipHoverGlow}`}
                onClick={() => {
                  setSelectedAltCategoryId(category.kategori_id);
                  setKategoriId(category.kategori_id);
                }}
              >
                {category.kategori_adi}
              </button>
            ))}
          </div>
        )}
        
        {/* Fallback: DB'den gelmezse eski filtreler */}
        {!shouldHideTemplate && altCategories.length === 0 && !loadingCategories && CATEGORY_FILTERS_FALLBACK[kategoriSlug] && (
          <div className={styles.filterChips}>
            {CATEGORY_FILTERS_FALLBACK[kategoriSlug].map((filter) => (
              <button
                key={filter}
                className={`${styles.filterChip} ${styles.chipHoverGlow}`}
                disabled
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
                <span className={styles.cardBadge}>
                  {questions.length} soru
                </span>
                <button
                  type="button"
                  className={questionStyles.openButton}
                  onClick={() => setModalOpen(true)}
                  disabled={!kategoriId || loadingCategories}
                >
                  Soru Aç
                </button>
              </div>
              <div className={styles.cardBody}>
                {categoryError ? (
                  <p className={styles.cardText} style={{ color: "#ff6b6b" }}>
                    {categoryError}
                  </p>
                ) : (
                  <QuestionList
                    questions={questions}
                    loading={loadingQuestions || loadingCategories}
                    error={questionsError}
                  />
                )}
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
      <NewQuestionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateQuestion}
        loading={creating}
        error={createError}
      />
    </div>
  );
}

