import React from "react";
import { clsx } from "clsx";

const CATEGORY_COLORS: Record<string, string> = {
  physical: "#FF4422",
  special: "#6699FF",
  status: "#999999",
};

const CATEGORY_LABELS: Record<string, string> = {
  physical: "FÍSICO",
  special: "ESPECIAL",
  status: "ESTADO",
};

interface MoveCategoryBadgeProps {
  category: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}

export function MoveCategoryBadge({
  category,
  size = "sm",
  className,
}: MoveCategoryBadgeProps) {
  const cat = category.toLowerCase();
  const color = CATEGORY_COLORS[cat] || "#777";
  const label = CATEGORY_LABELS[cat] || category.toUpperCase();

  return (
    <div
      className={clsx(
        "inline-flex items-center justify-center pixel-border shadow-sm overflow-hidden bg-surface-dark transition-all group-hover:scale-110",
        size === "xs" ? "w-16 h-5" : size === "sm" ? "w-20 h-6" : "w-24 h-7",
        className,
      )}
    >
      <img
        src={`/sprites/categories/${cat}.png`}
        alt={label}
        className="w-full h-full object-contain image-rendering-pixelated"
        onError={(e) => {
          (e.target as HTMLImageElement).parentElement!.style.backgroundColor = color;
          (e.target as HTMLImageElement).replaceWith(label);
        }}
      />
    </div>
  );
}
