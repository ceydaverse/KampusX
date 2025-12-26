import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTrendingFeed, type TrendingQuestion } from '../feedApi';
import styles from './TrendingFeedPanel.module.css';

/**
 * Tarihi relative format'a çevir (örn: "2 saat önce", "3 gün önce")
 */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} gün önce`;
  } else if (diffHours > 0) {
    return `${diffHours} saat önce`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} dakika önce`;
  } else {
    return 'Az önce';
  }
}

interface TrendingFeedPanelProps {
  limit?: number;
}

export const TrendingFeedPanel: React.FC<TrendingFeedPanelProps> = ({ limit = 10 }) => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<TrendingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadTrending = async () => {
      setLoading(true);
      setError(null);
      try {
        const items = await fetchTrendingFeed(limit);
        if (!cancelled) {
          setQuestions(items);
        }
      } catch (err: any) {
        if (!cancelled) {
          const msg = err?.response?.data?.message || err?.message || 'Trend sorular yüklenirken hata oluştu.';
          setError(msg);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadTrending();

    return () => {
      cancelled = true;
    };
  }, [limit]);

  const handleViewQuestion = (soruId: number) => {
    navigate(`/soru/${soruId}`);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>Şu an için trend soru bulunmuyor.</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.feedList}>
        {questions.map((question) => (
          <div key={question.soru_id} className={styles.feedCard}>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>{question.baslik}</h3>
              <div className={styles.cardMeta}>
                <span className={styles.metaItem}>
                  ❤️ {question.begeni_sayisi}
                </span>
                <span className={styles.metaItem}>
                  💬 {question.cevap_sayisi}
                </span>
                <span className={styles.metaItem}>
                  · {formatRelativeTime(question.tarih)}
                </span>
              </div>
            </div>
            <button
              className={styles.viewButton}
              onClick={() => handleViewQuestion(question.soru_id)}
            >
              Soruyu Gör
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
