import React from "react";

export type CardVariant = "default" | "alt" | "danger" | "brand";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  noPadding?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", variant = "default", noPadding = false, children, ...props }, ref) => {
    let variantStyles = "";
    
    switch (variant) {
      case "default":
        variantStyles = "bg-surface pixel-border pixel-shadow-sm";
        break;
      case "alt":
        variantStyles = "bg-surface-alt pixel-border pixel-shadow-sm";
        break;
      case "danger":
        variantStyles = "bg-surface-alt pixel-border-danger pixel-shadow-sm";
        break;
      case "brand":
        variantStyles = "bg-brand pixel-border-brand pixel-shadow-sm";
        break;
    }

    const paddingStyles = noPadding ? "" : "p-4";

    return (
      <div
        ref={ref}
        className={`${variantStyles} ${paddingStyles} flex flex-col ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
