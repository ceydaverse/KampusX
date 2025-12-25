import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { fetchMyLikes } from "../accountApi";
import type { MyLikesResponse } from "../../questions/types";
import { QuestionDetailModal } from "../../questions/components/QuestionDetailModal";
import styles from "./LikesPage.module.css";

export default function LikesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"questions" | "answers">("questions");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MyLikesResponse | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // user.id kontrolü - eğer yoksa istek atma
    if (!user.id) {
      setError("Giriş yapmalısın");
      setLoading(false);
      return;
    }

    const loadLikes = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchMyLikes(user.id);
        setData(result);
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || "Beğeniler yüklenirken hata oluştu");
      } finally {
        setLoading(false);
      }
    };

    loadLikes();
  }, [user, navigate]);

  const handleQuestionClick = (soruId: number) => {
    // Soru detay modalını aç
    setSelectedQuestionId(soruId);
  };

  const handleAnswerClick = (soruId: number) => {
    // Cevap hangi soruya aitse, o sorunun detay modalını aç
    setSelectedQuestionId(soruId);
  };

  const handleCloseModal = () => {
    setSelectedQuestionId(null);
  };

  if (!user) {
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Beğendiklerim</h1>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "questions" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("questions")}
          >
            Sorular ({data?.questions.length || 0})
          </button>
          <button
            className={`${styles.tab} ${activeTab === "answers" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("answers")}
          >
            Cevaplar ({data?.answers.length || 0})
          </button>
        </div>

        {loading && <p className={styles.loading}>Yükleniyor...</p>}
        {error && <p className={styles.error}>{error}</p>}

        {!loading && !error && (
          <div className={styles.content}>
            {activeTab === "questions" && (
              <div className={styles.list}>
                {data?.questions.length === 0 ? (
                  <p className={styles.empty}>Beğendiğiniz soru bulunmuyor.</p>
                ) : (
                  data?.questions.map((item) => (
                    <div
                      key={item.soru_id}
                      className={styles.item}
                      onClick={() => handleQuestionClick(item.soru_id)}
                    >
                      <h3 className={styles.itemTitle}>{item.baslik}</h3>
                      <p className={styles.itemText}>{item.soru_metin}</p>
                      <div className={styles.itemMeta}>
                        {new Date(item.tarih).toLocaleString("tr-TR")}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "answers" && (
              <div className={styles.list}>
                {data?.answers.length === 0 ? (
                  <p className={styles.empty}>Beğendiğiniz cevap bulunmuyor.</p>
                ) : (
                  data?.answers.map((item) => (
                    <div
                      key={item.cevap_id}
                      className={styles.item}
                      onClick={() => handleAnswerClick(item.soru_id)}
                    >
                      <p className={styles.itemText}>{item.cevap_metin}</p>
                      <div className={styles.itemMeta}>
                        {new Date(item.tarih).toLocaleString("tr-TR")}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
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




