import React from "react";
import { CategoryCard } from "./CategoryCard";
import styles from "./CategoryBoard.module.css";

/**
 * CategoryBoard Component
 * 4 sütunlu mozaik grid düzeninde kategori kartlarını gösterir
 * Canva tasarımına uygun mozaik düzen
 */
export const CategoryBoard: React.FC = () => {
  const CATEGORY_EFFECT_CLASS: Record<string, string> = {
    // eglence: themeFun kaldırıldı - düz yeşil tasarım
    // iliski: heartBeat animasyonu kaldırıldı
    burs: styles.careerProgressBar,
    grup: styles.typingIndicator,
    yurt: styles.housingCard,
    yemek: styles.foodCard,
    // daha: funCard kaldırıldı - kart UI'dan kaldırıldı
  };

  const handleCategoryClick = (key: string) => {
    // eglence için fireworks kaldırıldı
  };

  const categories = [
    { id: "ders", title: "Ders & Akademik", color: "blue" as const, slug: "ders-akademi" },
    { id: "iliski", title: "İlişkiler & Sosyal Yaşam", color: "blue" as const, slug: "iliskiler-sosyal-yasam" },
    { id: "grup", title: "Grup Sohbetleri", color: "blue" as const, slug: "grup-sohbetleri" },
    { id: "yurt", title: "Konaklama & Yurt Hayatı", color: "pink" as const, slug: "konaklama-yurt-hayati" },
    { id: "eglence", title: "Eğlence", color: "pink" as const, slug: "eglence" },
    { id: "yemek", title: "Yemek & Mekan Önerileri", color: "pink" as const, slug: "yemek-mekan-onerileri" },
    { id: "burs", title: "Burslar & İş İlanları & Kariyer", color: "pink" as const, slug: "burs-is-ilanlari-kariyer" },
    { id: "uni", title: "Üniversite & Şehir Hakkında", color: "pink" as const, slug: "universite-sehir-hakkinda" },
    // "Ve daha fazlası" kartı UI'dan kaldırıldı
  ].filter(category => category.id !== "daha");

  return (
    <div className={styles.categoryBoard}>
      <div className={styles.board}>
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            id={category.id}
            title={category.title}
            color={category.color}
            slug={category.slug}
            effectClass={CATEGORY_EFFECT_CLASS[category.id]}
            onCategoryClick={handleCategoryClick}
          />
        ))}
      </div>
    </div>
  );
};
