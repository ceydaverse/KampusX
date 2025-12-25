import React, { useEffect, useState } from "react";
import styles from "../questions.module.css";

interface NewAnswerModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { cevap_metin: string; parent_cevap_id?: number | null }) => Promise<void>;
  parentAnswerId?: number | null;
  loading?: boolean;
  error?: string | null;
}

const MIN_TEXT = 3;

export const NewAnswerModal: React.FC<NewAnswerModalProps> = ({
  open,
  onClose,
  onSubmit,
  parentAnswerId,
  loading,
  error,
}) => {
  const [cevapMetin, setCevapMetin] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCevapMetin("");
      setLocalError(null);
    }
  }, [open, parentAnswerId]);

  const handleSubmit = async () => {
    if (cevapMetin.trim().length < MIN_TEXT) {
      setLocalError(`Cevap en az ${MIN_TEXT} karakter olmalı`);
      return;
    }
    setLocalError(null);
    await onSubmit({
      cevap_metin: cevapMetin.trim(),
      parent_cevap_id: parentAnswerId || null,
    });
  };

  if (!open) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3 className={styles.modalTitle}>
          {parentAnswerId ? "Cevaba Yanıt Ver" : "Cevap Yaz"}
        </h3>

        <div className={styles.modalField}>
          <label htmlFor="cevapMetin">Cevap</label>
          <textarea
            id="cevapMetin"
            className={styles.textarea}
            value={cevapMetin}
            onChange={(e) => setCevapMetin(e.target.value)}
            placeholder="Cevabınızı buraya yazın"
            rows={6}
          />
        </div>

        {(localError || error) && (
          <div className={styles.errorText}>{localError || error}</div>
        )}

        <div className={styles.actions}>
          <button className={styles.ghostButton} onClick={onClose} disabled={loading}>
            İptal
          </button>
          <button
            className={styles.primaryButton}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Gönderiliyor..." : "Gönder"}
          </button>
        </div>
      </div>
    </div>
  );
};












