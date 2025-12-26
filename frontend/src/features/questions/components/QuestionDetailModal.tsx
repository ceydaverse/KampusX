import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../../../features/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { fetchQuestionById, fetchAnswers, createAnswer } from "../questionsApi";
import { LikeButton } from "./LikeButton";
import { Toast } from "../../../shared/components/Toast/Toast";
import { UserProfileModal } from "./UserProfileModal";
import type { Question, Answer } from "../types";
import styles from "../questions.module.css";

interface QuestionDetailModalProps {
  questionId: number | null;
  onClose: () => void;
  onAnswerCreated?: (questionId: number) => void;
  scrollToAnswers?: boolean;
}

export const QuestionDetailModal: React.FC<QuestionDetailModalProps> = ({
  questionId,
  onClose,
  onAnswerCreated,
  scrollToAnswers = false,
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
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  // Request guard: race condition önlemek için
  const reqSeqRef = useRef(0);
  // Answers section ref for scrolling
  const answersSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // questionId değiştiğinde state'i temizle
    if (!questionId) {
      setQuestion(null);
      setAnswers([]);
      setError(null);
      setLoading(false);
      return;
    }

    // Request guard: Her effect çalıştığında sequence sayacını artır
    reqSeqRef.current += 1;
    const currentSeq = reqSeqRef.current;

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
        
        // Request guard: Sadece en güncel request'in response'unu kabul et
        if (currentSeq === reqSeqRef.current) {
          setQuestion(questionData);
          setAnswers(answersData);
        }
      } catch (err: any) {
        // Request guard: Sadece en güncel request'in hata response'unu kabul et
        if (currentSeq === reqSeqRef.current) {
          const msg = err?.response?.data?.message || err?.message || "Soru detayı yüklenirken hata oluştu";
          setError(msg);
          setAnswers([]);
          setLoading(false);
        }
      } finally {
        // Request guard: Sadece en güncel request'in loading state'ini güncelle
        if (currentSeq === reqSeqRef.current) {
          setLoading(false);
        }
      }
    };

    loadAnswers();
  }, [questionId]);

  // scrollToAnswers prop'u değiştiğinde veya cevaplar yüklendiğinde scroll yap
  useEffect(() => {
    if (scrollToAnswers && !loading && answers.length > 0 && answersSectionRef.current) {
      // DOM'un render edilmesi için kısa bir delay
      const timer = setTimeout(() => {
        answersSectionRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [scrollToAnswers, loading, answers.length]);

  const loadQuestionAndAnswers = async () => {
    if (!questionId) return;

    // Request guard: Cevap gönderildikten sonra yeniden yükleme için de guard ekle
    reqSeqRef.current += 1;
    const currentSeq = reqSeqRef.current;

    setLoading(true);
    setError(null);
    setAnswers([]); // Fetch başlamadan önce temizle
    try {
      const [questionData, answersData] = await Promise.all([
        fetchQuestionById(questionId),
        fetchAnswers(questionId),
      ]);
      
      // Request guard: Sadece en güncel request'in response'unu kabul et
      if (currentSeq === reqSeqRef.current) {
        setQuestion(questionData);
        setAnswers(answersData);
      }
    } catch (err: any) {
      // Request guard: Sadece en güncel request'in hata response'unu kabul et
      if (currentSeq === reqSeqRef.current) {
        const msg = err?.response?.data?.message || err?.message || "Soru detayı yüklenirken hata oluştu";
        setError(msg);
        setAnswers([]);
      }
    } finally {
      // Request guard: Sadece en güncel request'in loading state'ini güncelle
      if (currentSeq === reqSeqRef.current) {
        setLoading(false);
      }
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
      onAnswerCreated?.(questionId);
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
              {question.etiketler && (() => {
                const tags = question.etiketler
                  .split(",")
                  .map((t) => t.trim().replace(/^\[|\]$/g, "").trim())
                  .filter((t) => t.length > 0)
                  .slice(0, 6);
                const remainingCount = question.etiketler
                  .split(",")
                  .map((t) => t.trim().replace(/^\[|\]$/g, "").trim())
                  .filter((t) => t.length > 0).length - 6;
                
                if (tags.length === 0) return null;
                
                return (
                  <div className={styles.questionTags}>
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
              <p className={styles.questionText}>{question.soru_metin}</p>
              <div className={styles.questionMeta}>
                <span>{new Date(question.tarih).toLocaleString("tr-TR")}</span>
                <span>•</span>
                <span
                  className={styles.authorLink}
                  onClick={() => {
                    setSelectedUserId(question.kullanici_id);
                    setProfileModalOpen(true);
                  }}
                >
                  @{question.author?.username || `kullanici_${question.kullanici_id}`}
                </span>
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

            <div className={styles.answersSection} id="answers" ref={answersSectionRef}>
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
                          {new Date(answer.tarih).toLocaleString("tr-TR")} •{" "}
                          <span
                            className={styles.authorLink}
                            onClick={() => {
                              setSelectedUserId(answer.kullanici_id);
                              setProfileModalOpen(true);
                            }}
                          >
                            @{answer.author?.username || `kullanici_${answer.kullanici_id}`}
                          </span>
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
        <UserProfileModal
          userId={selectedUserId}
          isOpen={profileModalOpen}
          onClose={() => {
            setProfileModalOpen(false);
            setSelectedUserId(null);
          }}
        />
      </div>
    </div>
  );
};

