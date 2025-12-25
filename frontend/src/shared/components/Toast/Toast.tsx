import React, { useEffect, useState } from "react";
import styles from "./Toast.module.css";

interface ToastProps {
  message: string;
  show: boolean;
  duration?: number; // milliseconds
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  show,
  duration = 3000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      // Animasyon için kısa bir gecikme
      requestAnimationFrame(() => {
        setIsVisible(true);
      });

      // Otomatik kapanma
      const timer = setTimeout(() => {
        setIsVisible(false);
        // Animasyon bitince onClose çağır
        setTimeout(() => {
          onClose();
        }, 300); // CSS transition süresi ile eşleşmeli
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [show, duration, onClose]);

  if (!show && !isVisible) return null;

  return (
    <div
      className={`${styles.toast} ${isVisible ? styles.toastVisible : styles.toastHidden}`}
    >
      <span className={styles.toastIcon}>ℹ️</span>
      <span className={styles.toastMessage}>{message}</span>
    </div>
  );
};













