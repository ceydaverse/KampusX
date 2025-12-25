import React, { useState } from "react";
import { deleteQuestion } from "../questionsApi";
import styles from "../questions.module.css";

interface DeleteButtonProps {
  questionId: number;
  onDeleted?: (e?: React.MouseEvent) => void;
}

export const DeleteButton: React.FC<DeleteButtonProps> = ({
  questionId,
  onDeleted,
}) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Bu soruyu silmek istediğinize emin misiniz?")) {
      return;
    }

    setLoading(true);
    try {
      await deleteQuestion(questionId);
      onDeleted?.(e);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Soru silinirken hata oluştu";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={styles.deleteButton}
      onClick={handleClick}
      disabled={loading}
      title="Soruyu sil"
    >
      🗑️
    </button>
  );
};

