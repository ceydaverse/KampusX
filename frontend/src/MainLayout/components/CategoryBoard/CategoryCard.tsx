import React from "react";
import cardStyles from "./CategoryCard.module.css";
import boardStyles from "./CategoryBoard.module.css";

interface CategoryCardProps {
  id: string;
  title: string;
  color: "blue" | "pink";
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ id, title, color }) => {
  return (
    <div className={`${cardStyles.card} ${cardStyles[color]} ${boardStyles[id]}`}>
      {title}
    </div>
  );
};
