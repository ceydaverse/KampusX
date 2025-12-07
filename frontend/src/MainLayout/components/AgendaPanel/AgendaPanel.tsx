import React from "react";
import styles from "./AgendaPanel.module.css";

const AgendaPanel: React.FC = () => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>GÜNDEM</h2>
      <p className={styles.placeholder}>
        Kampüste olan biten her şey burada görünecek.
      </p>
    </div>
  );
};

export default AgendaPanel;

