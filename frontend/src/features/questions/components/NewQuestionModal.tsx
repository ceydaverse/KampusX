import React, { useEffect, useState } from "react";
import styles from "../questions.module.css";

interface Category {
  kategori_id: number;
  kategori_adi: string;
}

interface NewQuestionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { 
    baslik: string; 
    soru_metin: string;
    kategori_id: number;
    etiketler?: string[];
  }) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  categories?: Category[];
}

const MIN_TITLE = 3;
const MIN_TEXT = 5;

export const NewQuestionModal: React.FC<NewQuestionModalProps> = ({
  open,
  onClose,
  onSubmit,
  loading,
  error,
  categories = [],
}) => {
  const [baslik, setBaslik] = useState("");
  const [soruMetin, setSoruMetin] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setBaslik("");
      setSoruMetin("");
      setSelectedCategoryId(null);
      setTagsInput("");
      setLocalError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    // Validasyon
    if (baslik.trim().length < MIN_TITLE) {
      setLocalError(`Başlık en az ${MIN_TITLE} karakter olmalı`);
      return;
    }
    if (soruMetin.trim().length < MIN_TEXT) {
      setLocalError(`Soru metni en az ${MIN_TEXT} karakter olmalı`);
      return;
    }
    if (!selectedCategoryId) {
      setLocalError("Kategori seçilmelidir");
      return;
    }

    // Etiketleri parse et (virgülle ayrılmış)
    const etiketler = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    setLocalError(null);
    await onSubmit({ 
      baslik: baslik.trim(), 
      soru_metin: soruMetin.trim(),
      kategori_id: selectedCategoryId,
      etiketler: etiketler.length > 0 ? etiketler : undefined,
    });
  };

  if (!open) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3 className={styles.modalTitle}>Soru Aç</h3>

        <div className={styles.modalField}>
          <label htmlFor="kategori">
            Kategori <span style={{ color: "#ff6b6b" }}>*</span>
          </label>
          <select
            id="kategori"
            className={styles.select}
            value={selectedCategoryId || ""}
            onChange={(e) => setSelectedCategoryId(Number(e.target.value) || null)}
          >
            <option value="">Kategori seçiniz</option>
            {categories.map((cat) => (
              <option key={cat.kategori_id} value={cat.kategori_id}>
                {cat.kategori_adi}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.modalField}>
          <label htmlFor="baslik">Başlık</label>
          <input
            id="baslik"
            className={styles.input}
            value={baslik}
            onChange={(e) => setBaslik(e.target.value)}
            placeholder="Sorunun başlığı"
          />
        </div>

        <div className={styles.modalField}>
          <label htmlFor="soruMetin">Soru</label>
          <textarea
            id="soruMetin"
            className={styles.textarea}
            value={soruMetin}
            onChange={(e) => setSoruMetin(e.target.value)}
            placeholder="Detayları buraya yaz"
          />
        </div>

        <div className={styles.modalField}>
          <label htmlFor="etiketler">
            Etiketler <span style={{ fontSize: "0.85rem", color: "#999" }}>(opsiyonel)</span>
          </label>
          <input
            id="etiketler"
            className={styles.input}
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="etiket1, etiket2, etiket3"
          />
          <small className={styles.helpText}>
            Etiketleri virgülle ayırarak yazın
          </small>
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
            disabled={loading || !selectedCategoryId}
          >
            {loading ? "Gönderiliyor..." : "Gönder"}
          </button>
        </div>
      </div>
    </div>
  );
};



