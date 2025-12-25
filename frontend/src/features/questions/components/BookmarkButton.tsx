import React, { useState } from "react";
import { useAuth } from "../../../features/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { saveQuestion, unsaveQuestion } from "../questionsApi";
import styles from "../questions.module.css";

interface BookmarkButtonProps {
  questionId: number;
  initialSaved?: boolean;
  onUpdate?: (saved: boolean) => void;
}

export const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  questionId,
  initialSaved = false,
  onUpdate,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Soru kartına tıklamayı engelle

    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    const previousSaved = saved;
    
    // Optimistic update
    setSaved(!saved);
    onUpdate?.(!saved);

    try {
      if (previousSaved) {
        await unsaveQuestion(questionId);
      } else {
        await saveQuestion(questionId);
      }
    } catch (err: any) {
      console.error("Bookmark toggle error:", err);
      // Hata durumunda state'i geri al
      setSaved(previousSaved);
      onUpdate?.(previousSaved);
      
      // Toast göster (eğer projede toast varsa)
      alert(err?.response?.data?.message || "İşlem başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={styles.bookmarkButton}
      onClick={handleClick}
      disabled={loading}
      title={!user ? "Kaydetmek için giriş yapın" : saved ? "Kayıttan çıkar" : "Kaydet"}
    >
      <span className={styles.bookmarkIcon}>{saved ? "🔖" : "📌"}</span>
      <span className={styles.bookmarkText}>{saved ? "Kaydedildi" : "Kaydet"}</span>
    </button>
  );
};









