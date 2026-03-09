import React from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isActive?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className = "", variant = "primary", size = "md", isActive, ...props },
    ref,
  ) => {
    let baseStyles =
      "inline-flex items-center justify-center font-display uppercase transition-all duration-75 active:translate-y-1";
    let variantStyles = "";
    let sizeStyles = "";

    // Variants
    switch (variant) {
      case "primary":
        variantStyles =
          "bg-brand text-[#141a1c] pixel-border-brand pixel-shadow hover:bg-brand-dark active:pixel-shadow-active";
        break;
      case "secondary":
        variantStyles =
          "bg-surface-light text-foreground pixel-border pixel-shadow hover:bg-surface-alt active:pixel-shadow-active";
        break;
      case "danger":
        variantStyles =
          "bg-danger text-[#141a1c] pixel-border-danger pixel-shadow hover:brightness-110 active:pixel-shadow-active";
        break;
      case "ghost":
        variantStyles =
          "bg-transparent text-muted hover:text-foreground hover:bg-surface-light active:translate-y-0";
        baseStyles = baseStyles.replace("active:translate-y-1", ""); // Ghost doesn't press down with shadow
        break;
    }

    // Sizes
    switch (size) {
      case "sm":
        sizeStyles = "px-2 py-1 text-xs";
        break;
      case "md":
        sizeStyles = "px-4 py-2 text-small";
        break;
      case "lg":
        sizeStyles = "px-6 py-4 text-heading";
        break;
    }

    if (props.disabled) {
      baseStyles += " opacity-50 cursor-not-allowed";
      variantStyles = variantStyles.replace("hover:bg-brand-dark", "");
      variantStyles = variantStyles.replace("hover:bg-surface-alt", "");
      variantStyles = variantStyles.replace("active:translate-y-1", "");
      variantStyles = variantStyles.replace("active:pixel-shadow-active", "");
    }

    const activeStyles =
      isActive && variant !== "ghost"
        ? "translate-y-1 pixel-shadow-active"
        : "";

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${activeStyles} ${className}`}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
