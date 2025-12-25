import React, { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import Header from "../../../MainLayout/components/Header/Header";
import { QuestionList } from "../components/QuestionList";
import { QuestionDetailModal } from "../components/QuestionDetailModal";
import { fetchSavedQuestions } from "../questionsApi";
import type { Question } from "../types";
import styles from "../questions.module.css";
import pageStyles from "../../account/pages/ProfilePage.module.css";

export default function SavedQuestionsPage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      setError("Giriş yapmanız gerekiyor");
      return;
    }

    const loadSavedQuestions = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchSavedQuestions();
        setQuestions(data);
      } catch (err: any) {
        console.error("Failed to load saved questions:", err);
        setError(err?.response?.data?.message || "Kaydedilen sorular yüklenirken hata oluştu");
      } finally {
        setLoading(false);
      }
    };

    loadSavedQuestions();
  }, [user?.id]);

  const handleQuestionClick = (questionId: number) => {
    setSelectedQuestionId(questionId);
  };

  const handleQuestionDeleted = (questionId: number) => {
    setQuestions((prev) => prev.filter((q) => q.soru_id !== questionId));
    if (selectedQuestionId === questionId) {
      setSelectedQuestionId(null);
    }
  };

  const handleCloseModal = () => {
    setSelectedQuestionId(null);
  };

  return (
    <div className={pageStyles.page}>
      <Header />
      <div className={pageStyles.main}>
        <div style={{ maxWidth: "900px", width: "100%" }}>
          <h1 className={pageStyles.title}>Kaydedilenler</h1>
          {!user ? (
            <p className={styles.emptyState}>Giriş yapmanız gerekiyor</p>
          ) : (
            <QuestionList
              questions={questions}
              loading={loading}
              error={error}
              onQuestionClick={handleQuestionClick}
              onQuestionDeleted={handleQuestionDeleted}
            />
          )}
        </div>
      </div>
      {selectedQuestionId && (
        <QuestionDetailModal
          questionId={selectedQuestionId}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

