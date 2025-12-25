import React, { useEffect, useState } from "react";
import { useAuth } from "../../../features/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { fetchQuestionById, fetchAnswers, createAnswer } from "../questionsApi";
import { LikeButton } from "./LikeButton";
import { Toast } from "../../../shared/components/Toast/Toast";
import type { Question, Answer } from "../types";
import styles from "../questions.module.css";

interface QuestionDetailModalProps {
  questionId: number | null;
  onClose: () => void;
  onAnswerCreated?: () => void;
}

export const QuestionDetailModal: React.FC<QuestionDetailModalProps> = ({
  questionId,
  onClose,
  onAnswerCreated,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    // questionId değiştiğinde state'i temizle
    if (!questionId) {
      setQuestion(null);
      setAnswers([]);
      setError(null);
      setLoading(false);
      return;
    }

    // Fetch başlamadan önce state'i temizle (eski sorunun cevapları ekranda kalmasın)
    setAnswers([]);
    setLoading(true);
    setError(null);

    // Cevapları çek
    const loadAnswers = async () => {
      try {
        const [questionData, answersData] = await Promise.all([
          fetchQuestionById(questionId),
          fetchAnswers(questionId),
        ]);
        setQuestion(questionData);
        setAnswers(answersData);
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || "Soru detayı yüklenirken hata oluştu";
        setError(msg);
        setAnswers([]);
      } finally {
        setLoading(false);
      }
    };

    loadAnswers();
  }, [questionId]);

  const loadQuestionAndAnswers = async () => {
    if (!questionId) return;

    setLoading(true);
    setError(null);
    setAnswers([]); // Fetch başlamadan önce temizle
    try {
      const [questionData, answersData] = await Promise.all([
        fetchQuestionById(questionId),
        fetchAnswers(questionId),
      ]);
      setQuestion(questionData);
      setAnswers(answersData);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Soru detayı yüklenirken hata oluştu";
      setError(msg);
      setAnswers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!user) {
      setToastMessage("Cevap yazmak için giriş yapmalısın.");
      setShowToast(true);
      return;
    }

    if (!answerText.trim() || answerText.trim().length < 3) {
      setToastMessage("Cevap en az 3 karakter olmalı");
      setShowToast(true);
      return;
    }

    if (!questionId) return;

    setSubmitting(true);
    try {
      await createAnswer(questionId, {
        cevap_metin: answerText.trim(),
        parent_cevap_id: null,
      });
      setAnswerText("");
      await loadQuestionAndAnswers();
      onAnswerCreated?.();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Cevap gönderilirken hata oluştu";
      setToastMessage(msg);
      setShowToast(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (!questionId) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Soru Detayı</h3>
          <button className={styles.closeButton} onClick={onClose} aria-label="Kapat">
            ✕
          </button>
        </div>

        {loading && <p className={styles.loading}>Yükleniyor...</p>}
        {error && <p className={styles.errorText}>{error}</p>}

        {!loading && !error && question && (
          <>
            <div className={styles.questionDetail}>
              <h4 className={styles.questionTitle}>{question.baslik}</h4>
              <p className={styles.questionText}>{question.soru_metin}</p>
              <div className={styles.questionMeta}>
                <span>{new Date(question.tarih).toLocaleString("tr-TR")}</span>
                <span>•</span>
                <span>Kullanıcı #{question.kullanici_id}</span>
                <span>•</span>
                <LikeButton
                  type="question"
                  id={question.soru_id}
                  initialLiked={question.isLikedByMe}
                  initialCount={question.likeCount || 0}
                  onUpdate={(liked, count) => {
                    // Like güncellendiğinde state'i güncelle
                    setQuestion((prev) => prev ? { ...prev, isLikedByMe: liked, likeCount: count } : null);
                  }}
                />
              </div>
            </div>

            <div className={styles.answersSection}>
              <h4 className={styles.answersTitle}>Cevaplar ({answers.length})</h4>
              {answers.length === 0 ? (
                <p className={styles.emptyState}>Henüz cevap yok. İlk cevabı sen ver! 💬</p>
              ) : (
                <div className={styles.answersList}>
                  {answers.map((answer) => (
                    <div key={answer.cevap_id} className={styles.answerItem}>
                      <p className={styles.answerText}>{answer.cevap_metin}</p>
                      <div className={styles.answerFooter}>
                        <div className={styles.answerMeta}>
                          {new Date(answer.tarih).toLocaleString("tr-TR")} • Kullanıcı #{answer.kullanici_id}
                        </div>
                        <LikeButton
                          type="answer"
                          id={answer.cevap_id}
                          initialLiked={answer.isLikedByMe}
                          initialCount={answer.likeCount || 0}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {user ? (
              <div className={styles.newAnswerSection}>
                <textarea
                  className={styles.textarea}
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Cevabınızı buraya yazın..."
                  rows={4}
                />
                <div className={styles.actions}>
                  <button
                    className={styles.primaryButton}
                    onClick={handleSubmitAnswer}
                    disabled={submitting || !answerText.trim()}
                  >
                    {submitting ? "Gönderiliyor..." : "Gönder"}
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.loginPrompt}>
                <p>
                  Cevap yazmak için{" "}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate("/auth");
                    }}
                    className={styles.linkButton}
                  >
                    giriş yapın
                  </button>
                </p>
              </div>
            )}
          </>
        )}

        <Toast
          message={toastMessage || ""}
          show={showToast}
          duration={3000}
          onClose={() => {
            setShowToast(false);
            setToastMessage(null);
          }}
        />
      </div>
    </div>
  );
};

