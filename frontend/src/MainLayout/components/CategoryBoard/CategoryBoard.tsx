import React from "react";
import "./categoryboard.css";

/**
 * CategoryBoard Component
 * 4 sütunlu mozaik grid düzeninde kategori kartlarını gösterir
 * Canva tasarımına uygun mozaik düzen
 */
export const CategoryBoard: React.FC = () => {
  return (
    <div className="category-board">
      <div className="board">
        {/* Ders & Akademik */}
        <div className="board-item board-item--academic board-item--blue">
          <h4>Ders & Akademik</h4>
        </div>

        {/* İlişkiler & Sosyal Yaşam */}
        <div className="board-item board-item--social board-item--blue">
          <h4>İlişkiler & Sosyal Yaşam</h4>
        </div>

        {/* Grup Sohbetleri */}
        <div className="board-item board-item--group board-item--blue">
          <h4>Grup Sohbetleri</h4>
        </div>

        {/* Eğlence */}
        <div className="board-item board-item--fun board-item--pink">
          <h4>Eğlence</h4>
        </div>

        {/* Burslar & İş İlanları & Kariyer */}
        <div className="board-item board-item--career board-item--pink">
          <h4>Burslar & İş İlanları & Kariyer</h4>
        </div>

        {/* Kültür & Sanat */}
        <div className="board-item board-item--culture board-item--pink">
          <h4>Kültür & Sanat</h4>
        </div>

        {/* Spor & Aktivite */}
        <div className="board-item board-item--sport board-item--pink">
          <h4>Spor & Aktivite</h4>
        </div>

        {/* Konaklama & Yurt Hayatı */}
        <div className="board-item board-item--dorm board-item--pink">
          <h4>Konaklama & Yurt Hayatı</h4>
        </div>

        {/* Ve daha fazlası */}
        <div className="board-item board-item--more board-item--pink">
          <h4>Ve daha fazlası</h4>
        </div>
      </div>
    </div>
  );
};
