import React from "react";
import { useAuth } from "../../../features/auth/AuthProvider";
import styles from "../questions.module.css";
import type { Question } from "../types";
import { LikeButton } from "./LikeButton";
import { DeleteButton } from "./DeleteButton";

interface QuestionListProps {
  questions: Question[];
  loading: boolean;
  error: string | null;
  onQuestionDeleted?: (questionId: number) => void;
  onQuestionClick?: (questionId: number) => void;
}

const truncate = (value: string, limit = 120) => {
  if (!value) return "";
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
};

export const QuestionList: React.FC<QuestionListProps> = ({
  questions,
  loading,
  error,
  onQuestionDeleted,
  onQuestionClick,
}) => {
  const { user } = useAuth();

  if (loading) {
    return <p className={styles.emptyState}>Sorular yükleniyor...</p>;
  }

  if (error) {
    return <p className={styles.emptyState}>{error}</p>;
  }

  if (!questions.length) {
    return <p className={styles.emptyState}>Henüz soru yok. İlk soruyu sen sor! 👀</p>;
  }

  return (
    <div className={styles.questionList}>
      {questions.map((item) => (
        <article
          key={item.soru_id}
          className={styles.questionItem}
          onClick={() => onQuestionClick?.(item.soru_id)}
        >
          <div className={styles.questionHeader}>
            <h4 className={styles.questionTitle}>{item.baslik}</h4>
            {user && user.id === item.kullanici_id && (
              <DeleteButton
                questionId={item.soru_id}
                onDeleted={(e) => {
                  e?.stopPropagation();
                  onQuestionDeleted?.(item.soru_id);
                }}
              />
            )}
          </div>
          <p className={styles.questionText}>{truncate(item.soru_metin)}</p>
          <div className={styles.questionFooter}>
            <div className={styles.questionMeta}>
              {new Date(item.tarih).toLocaleString("tr-TR")} • Kullanıcı #{item.kullanici_id}
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <LikeButton
                type="question"
                id={item.soru_id}
                initialLiked={item.isLikedByMe}
                initialCount={item.likeCount || 0}
              />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};


