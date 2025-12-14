import React from "react";
import { Link } from "react-router-dom";
import cardStyles from "./CategoryCard.module.css";
import boardStyles from "./CategoryBoard.module.css";

interface CategoryCardProps {
  id: string;
  title: string;
  color: "blue" | "pink";
  slug: string;
  effectClass?: string;
  onCategoryClick?: (key: string) => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ 
  id, 
  title, 
  color, 
  slug, 
  effectClass,
  onCategoryClick 
}) => {
  const handleClick = () => {
    if (onCategoryClick) {
      onCategoryClick(id);
    }
  };

  return (
    <Link 
      to={`/kategori/${slug}`} 
      className={`${cardStyles.card} ${cardStyles[color]} ${boardStyles[id]} ${effectClass || ""}`}
      style={{ textDecoration: "none", cursor: "pointer" }}
      onClick={handleClick}
    >
      {title}
    </Link>
  );
};

