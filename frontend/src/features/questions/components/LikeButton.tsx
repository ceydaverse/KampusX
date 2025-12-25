import React, { useState } from "react";
import { useAuth } from "../../../features/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { toggleQuestionLike, toggleAnswerLike } from "../questionsApi";
import styles from "../questions.module.css";

interface LikeButtonProps {
  type: "question" | "answer";
  id: number;
  initialLiked?: boolean;
  initialCount?: number;
  onUpdate?: (liked: boolean, count: number) => void;
}

export const LikeButton: React.FC<LikeButtonProps> = ({
  type,
  id,
  initialLiked = false,
  initialCount = 0,
  onUpdate,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      const result = type === "question"
        ? await toggleQuestionLike(id)
        : await toggleAnswerLike(id);

      setLiked(result.liked);
      setCount(result.likeCount);
      onUpdate?.(result.liked, result.likeCount);
    } catch (err: any) {
      console.error("Like toggle error:", err);
      // Hata durumunda state'i geri al
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={styles.likeButton}
      onClick={handleClick}
      disabled={loading}
      title={!user ? "Beğenmek için giriş yapın" : liked ? "Beğeniyi kaldır" : "Beğen"}
    >
      <span className={styles.likeIcon}>{liked ? "❤️" : "🤍"}</span>
      <span className={styles.likeCount}>{count}</span>
    </button>
  );
};













