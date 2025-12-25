import React, { useState } from "react";
import { useAuth } from "../../../features/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { createAnswer, fetchAnswers } from "../questionsApi";
import { LikeButton } from "./LikeButton";
import { NewAnswerModal } from "./NewAnswerModal";
import type { Answer } from "../types";
import styles from "../questions.module.css";

interface AnswerListProps {
  questionId: number;
  onAnswerCreated?: () => void;
}

export const AnswerList: React.FC<AnswerListProps> = ({
  questionId,
  onAnswerCreated,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  React.useEffect(() => {
    loadAnswers();
  }, [questionId]);

  const loadAnswers = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await fetchAnswers(questionId);
      setAnswers(items);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Cevaplar yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnswer = async (payload: { cevap_metin: string; parent_cevap_id?: number | null }) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    try {
      await createAnswer(questionId, payload);
      setShowReplyModal(false);
      setReplyingTo(null);
      loadAnswers();
      onAnswerCreated?.();
    } catch (err: any) {
      throw err;
    }
  };

  const handleReplyClick = (answerId: number) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setReplyingTo(answerId);
    setShowReplyModal(true);
  };

  const renderAnswer = (answer: Answer, depth = 0) => {
    return (
      <div key={answer.cevap_id} className={styles.answerItem} style={{ marginLeft: `${depth * 24}px` }}>
        <p className={styles.answerText}>{answer.cevap_metin}</p>
        <div className={styles.answerFooter}>
          <div className={styles.answerMeta}>
            {new Date(answer.tarih).toLocaleString("tr-TR")} • @{answer.author?.username || `kullanici_${answer.kullanici_id}`}
          </div>
          <div className={styles.answerActions}>
            <button
              className={styles.replyButton}
              onClick={() => handleReplyClick(answer.cevap_id)}
              disabled={!user}
            >
              Yanıtla
            </button>
            <LikeButton
              type="answer"
              id={answer.cevap_id}
              initialLiked={answer.isLikedByMe}
              initialCount={answer.likeCount || 0}
            />
          </div>
        </div>
        {answer.children && answer.children.length > 0 && (
          <div className={styles.answerChildren}>
            {answer.children.map((child) => renderAnswer(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.answerList}>
      <h3 className={styles.answerListTitle}>Cevaplar ({answers.length})</h3>

      {loading && <p className={styles.emptyState}>Cevaplar yükleniyor...</p>}
      {error && <p className={styles.emptyState}>{error}</p>}

      {!loading && !error && (
        <>
          {answers.length === 0 ? (
            <p className={styles.emptyState}>Henüz cevap yok. İlk cevabı sen ver! 💬</p>
          ) : (
            <div className={styles.answers}>
              {answers.map((answer) => renderAnswer(answer))}
            </div>
          )}

          <div className={styles.newAnswerSection}>
            {user ? (
              <NewAnswerModal
                open={showReplyModal}
                onClose={() => {
                  setShowReplyModal(false);
                  setReplyingTo(null);
                }}
                onSubmit={handleCreateAnswer}
                parentAnswerId={replyingTo}
              />
            ) : (
              <p className={styles.loginPrompt}>
                Cevap yazmak için <button onClick={() => navigate("/auth")}>giriş yapın</button>
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};




