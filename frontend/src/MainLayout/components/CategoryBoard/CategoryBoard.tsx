import React from "react";
import styles from "./CategoryBoard.module.css";

const cards = [
  { id: "gundem",  title: "GÜNDEM", color: "blue" },
  { id: "ders",    title: "Ders & Akademik", color: "blue" },
  { id: "iliski",  title: "İlişkiler & Sosyal Yaşam", color: "blue" },
  { id: "grup",    title: "Grup Sohbetleri", color: "blue" },
  { id: "yurt",    title: "Konaklama & Yurt Hayatı", color: "pink" },
  { id: "eglence", title: "Eğlence", color: "pink" },
  { id: "kultur",  title: "Kültür & Sanat", color: "pink" },
  { id: "burs",    title: "Burslar & İş İlanları & Kariyer", color: "pink" },
  { id: "spor",    title: "Spor & Aktivite", color: "pink" },
  { id: "daha",    title: "Ve daha fazlası", color: "pink" },
];

export const CategoryBoard: React.FC = () => {
  return (
    <div className={styles.board}>
      {cards.map((card) => (
        <div
          key={card.id}
          className={`${styles.card} ${styles[card.color]} ${styles[card.id]}`}
        >
          {card.title}
        </div>
      ))}
    </div>
  );
};

