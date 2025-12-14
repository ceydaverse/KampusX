import React from "react";
import { CategoryCard } from "./CategoryCard";
import { launchFireworks } from "../../../shared/utils/fireworks";
import styles from "./CategoryBoard.module.css";

/**
 * CategoryBoard Component
 * 4 sütunlu mozaik grid düzeninde kategori kartlarını gösterir
 * Canva tasarımına uygun mozaik düzen
 */
export const CategoryBoard: React.FC = () => {
  const CATEGORY_EFFECT_CLASS: Record<string, string> = {
    eglence: styles.themeFun,
    iliski: styles.socialHeart,
    burs: styles.careerProgressBar,
    grup: styles.typingIndicator,
    yurt: styles.housingCard,
    yemek: styles.foodCard,
    daha: styles.funCard,
  };

  const handleCategoryClick = (key: string) => {
    if (key === "eglence") {
      launchFireworks();
    }
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
    { id: "daha", title: "Ve daha fazlası", color: "pink" as const, slug: "ve-daha-fazlasi" },
  ];

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
