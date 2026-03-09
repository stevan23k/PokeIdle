import React, { useState, useEffect } from "react";
import { clsx } from "clsx";

export const C = {
  bg: "#4a5a52",
  bgDark: "#2a3a32",
  win: "#d0dbd4",
  border: "#0e1418",
  shadow: "#2c3832",
  blue: "#304c8c",
  blueLight: "#5c7cba",
  red: "#a42c2c",
  redLight: "#c84848",
  yellow: "#c09c28",
  gray: "#7a8a80",
  text: "#141a1c",
  textMuted: "#4c5c54",
  green: "#307438",
  orange: "#d86818",
  purple: "#784090",
};

export function PixelWindow({
  children,
  title,
  style,
  className,
  fullHeight = false,
  contentPadding = 16,
}: {
  children: React.ReactNode;
  title?: string;
  style?: React.CSSProperties;
  className?: string;
  fullHeight?: boolean;
  contentPadding?: number | string;
}) {
  return (
    <div
      style={style}
      className={clsx(className, fullHeight && "flex flex-col min-h-0")}
    >
      <div
        className={clsx(fullHeight && "flex-1 flex flex-col min-h-0")}
        style={{ background: C.border, padding: "4px" }}
      >
        <div
          className={clsx(fullHeight && "flex-1 flex flex-col min-h-0")}
          style={{ background: C.shadow, padding: "3px" }}
        >
          <div
            className={clsx(fullHeight && "flex-1 flex flex-col min-h-0")}
            style={{ background: C.win }}
          >
            {title && (
              <div style={{ background: C.border, padding: "2px" }}>
                <div style={{ background: C.blue, padding: "5px 12px" }}>
                  <span
                    style={{
                      fontFamily: "'Press Start 2P',monospace",
                      fontSize: "9px",
                      color: "white",
                      textShadow: "2px 2px 0 rgba(0,0,0,0.4)",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {title}
                  </span>
                </div>
              </div>
            )}
            <div
              className={clsx(fullHeight && "flex-1 flex flex-col min-h-0")}
              style={{ padding: contentPadding }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GBAButton({
  onClick,
  children,
  variant = "primary",
  disabled = false,
  fullWidth = false,
  type = "button",
  className,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "success" | "accent";
  disabled?: boolean;
  fullWidth?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const bg = disabled
    ? C.gray
    : variant === "primary"
      ? C.blue
      : variant === "danger"
        ? C.red
        : variant === "success"
          ? C.green
          : variant === "accent"
            ? "#d09020"
            : variant === "secondary"
              ? C.shadow
              : C.win; // "window" variant or default
  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => {
        setPressed(false);
        setHovered(false);
      }}
      className={className}
      style={{
        width: fullWidth ? "100%" : undefined,
        background: bg,
        border: `3px solid ${C.border}`,
        boxShadow: pressed
          ? "inset 2px 2px 0 rgba(0,0,0,0.3)"
          : `3px 3px 0 ${C.border}`,
        padding: "10px 18px",
        cursor: disabled ? "default" : "pointer",
        transform: pressed ? "translate(2px,2px)" : "none",
        display: "block",
      }}
    >
      <span
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        {hovered && !disabled && (
          <span
            style={{
              position: "absolute",
              left: "-18px",
              color: C.yellow,
              animation: "gbaHoverArrow 0.4s steps(2, end) infinite",
              fontFamily: "'Press Start 2P',monospace",
              fontSize: "10px",
              filter: "drop-shadow(2px 2px 0 rgba(0,0,0,0.4))",
            }}
          >
            ▶
          </span>
        )}
        <span
          style={{
            fontFamily: "'Press Start 2P',monospace",
            fontSize: "9px",
            color:
              variant === "secondary" ||
              variant === "primary" ||
              variant === "danger" ||
              variant === "success" ||
              variant === "accent"
                ? "white"
                : C.text,
            letterSpacing: "0.08em",
            textShadow:
              variant === "secondary" ||
              variant === "primary" ||
              variant === "danger" ||
              variant === "success" ||
              variant === "accent"
                ? "2px 2px 0 rgba(0,0,0,0.4)"
                : "none",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {children}
        </span>
      </span>
    </button>
  );
}
