import React, { useEffect, useState } from "react";
import { useAuth } from "../../../features/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import styles from "../questions.module.css";
import type { Question } from "../types";
import { LikeButton } from "./LikeButton";
import { DeleteButton } from "./DeleteButton";
import { BookmarkButton } from "./BookmarkButton";
import { fetchSavedStatus } from "../questionsApi";

interface QuestionListProps {
  questions: Question[];
  loading: boolean;
  error: string | null;
  onQuestionDeleted?: (questionId: number) => void;
  onQuestionClick?: (questionId: number) => void;
  onViewAnswers?: (questionId: number) => void;
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
  onViewAnswers,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [savedQuestionIds, setSavedQuestionIds] = useState<Set<number>>(new Set());

  const handleViewAnswers = (e: React.MouseEvent, questionId: number) => {
    e.preventDefault();
    e.stopPropagation();
    // Event propagation'ı durdur ve özel callback'i çağır
    onViewAnswers?.(questionId);
  };

  // Toplu kaydetme durumunu çek
  useEffect(() => {
    if (questions.length > 0 && user?.id) {
      const questionIds = questions.map((q) => q.soru_id);
      fetchSavedStatus(questionIds)
        .then((savedIds) => {
          setSavedQuestionIds(new Set(savedIds));
        })
        .catch((err) => {
          console.error("Failed to fetch saved status:", err);
        });
    }
  }, [questions, user?.id]);

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
          {item.etiketler && (() => {
            const tags = item.etiketler
              .split(",")
              .map((t) => t.trim().replace(/^\[|\]$/g, "").trim())
              .filter((t) => t.length > 0)
              .slice(0, 5);
            const remainingCount = item.etiketler
              .split(",")
              .map((t) => t.trim().replace(/^\[|\]$/g, "").trim())
              .filter((t) => t.length > 0).length - 5;
            
            if (tags.length === 0) return null;
            
            return (
              <div className={styles.questionTags} onClick={(e) => e.stopPropagation()}>
                {tags.map((tag, idx) => (
                  <span key={idx} className={styles.tagChip}>
                    {tag}
                  </span>
                ))}
                {remainingCount > 0 && (
                  <span className={styles.tagChipMore}>+{remainingCount}</span>
                )}
              </div>
            );
          })()}
          <p className={styles.questionText}>{truncate(item.soru_metin)}</p>
          <div className={styles.questionFooter}>
            <div className={styles.questionMeta}>
              {new Date(item.tarih).toLocaleString("tr-TR")} • @{item.author?.username || `kullanici_${item.kullanici_id}`}
            </div>
            <div className={styles.questionActions} onClick={(e) => e.stopPropagation()}>
              <div className={styles.questionActionsLeft}>
                <button
                  className={styles.viewAnswersButton}
                  onClick={(e) => handleViewAnswers(e, item.soru_id)}
                  title="Cevapları gör"
                >
                  Cevapları Gör
                </button>
                <BookmarkButton
                  questionId={item.soru_id}
                  initialSaved={savedQuestionIds.has(item.soru_id)}
                  onUpdate={(saved) => {
                    if (saved) {
                      setSavedQuestionIds((prev) => new Set([...prev, item.soru_id]));
                    } else {
                      setSavedQuestionIds((prev) => {
                        const next = new Set(prev);
                        next.delete(item.soru_id);
                        return next;
                      });
                    }
                  }}
                />
              </div>
              <div className={styles.questionActionsRight}>
                <LikeButton
                  type="question"
                  id={item.soru_id}
                  initialLiked={item.isLikedByMe}
                  initialCount={item.likeCount || 0}
                />
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};


