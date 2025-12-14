import React from "react";
import { Link } from "react-router-dom";
import styles from "./AgendaPanel.module.css";

const AgendaPanel: React.FC = () => {
  return (
    <aside className={styles.agendaPanel}>
      <Link 
        to="/kategori/gundem" 
        className={styles.agendaCard}
        style={{ textDecoration: "none", cursor: "pointer" }}
      >
        <h2 className={styles.agendaTitle}>GÜNDEM</h2>
        <div className={styles.cardBody}>
          {/* İçerik daha sonra tasarlanacak */}
        </div>
      </Link>
    </aside>
  );
};

export default AgendaPanel;

