import React, { useEffect, useState } from "react";
import styles from "./PageTransition.module.css";

interface PageTransitionProps {
  children: React.ReactNode;
  transitionKey?: string | number;
}

/**
 * PageTransition Component
 * Sayfa geçişlerine yumuşak fade-in + slide-in animasyonu ekler
 * 
 * Özellikler:
 * - Sayfa ilk yüklendiğinde fade-in + slide-in
 * - Route değişimlerinde animasyon tekrar oynar
 * - User state değişimlerinde (logout/login) animasyon tekrar oynar
 * - 300ms süre, ease-out easing
 */
export const PageTransition: React.FC<PageTransitionProps> = ({ children, transitionKey }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Her transitionKey değişiminde animasyonu sıfırla ve başlat
    setIsVisible(false);
    
    // requestAnimationFrame ile DOM güncellemesinden sonra animasyonu başlat
    // Çift requestAnimationFrame kullanarak tarayıcının render döngüsünü garanti ediyoruz
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
  }, [transitionKey]); // transitionKey değiştiğinde animasyon tekrar oynar

  return (
    <div
      className={`${styles.pageTransition} ${
        isVisible ? styles.pageTransitionVisible : styles.pageTransitionHidden
      }`}
    >
      {children}
    </div>
  );
};

