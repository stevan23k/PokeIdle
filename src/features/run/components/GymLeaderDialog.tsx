import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface GymLeaderDialogProps {
  leaderName: string;
  leaderPokemonId: number; // For future sprite integration if needed
  lines: string[];
  onFinish: () => void;
  variant: "intro" | "victory" | "defeat";
}

export function GymLeaderDialog({
  leaderName,
  leaderPokemonId,
  lines,
  onFinish,
  variant,
}: GymLeaderDialogProps) {
  const [currentLine, setCurrentLine] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  // Efecto typewriter
  useEffect(() => {
    setDisplayed("");
    setIsTyping(true);
    const text = lines[currentLine];
    if (!text) {
      setIsTyping(false);
      return;
    }
    
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 28); // velocidad de tipeo en ms
    return () => clearInterval(interval);
  }, [currentLine, lines]);

  // Avanzar con Z o click
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "z" || e.key === "Z" || e.key === "Enter" || e.key === " ") {
        handleAdvance();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentLine, isTyping, lines]);

  const handleAdvance = () => {
    if (isTyping) {
      // Si está tipeando, mostrar todo el texto de golpe
      setDisplayed(lines[currentLine]);
      setIsTyping(false);
      return;
    }
    if (currentLine < lines.length - 1) {
      setCurrentLine((prev) => prev + 1);
    } else {
      onFinish();
    }
  };

  const variantColors = {
    intro: "border-brand",
    victory: "border-danger",
    defeat: "border-emerald-500",
  };

  const variantBg = {
    intro: "bg-brand/10",
    victory: "bg-danger/10",
    defeat: "bg-emerald-900/20",
  };

  return createPortal(
    <div
      className="absolute inset-x-0 bottom-0 z-50 p-3 animate-in slide-in-from-bottom-4 duration-300"
      onClick={handleAdvance}
      style={{ cursor: "pointer" }}
    >
      <div className={`border-4 ${variantColors[variant]} ${variantBg[variant]} bg-surface-dark p-4 shadow-[6px_6px_0_rgba(0,0,0,0.8)]`}>
        {/* Nombre del líder */}
        <div className={`font-display text-[0.55rem] tracking-[0.2em] uppercase mb-2 ${
          variant === "intro" ? "text-brand" : variant === "victory" ? "text-danger" : "text-emerald-400"
        }`}>
          {leaderName}
        </div>

        {/* Texto con typewriter */}
        <p className="font-display text-[0.75rem] text-white leading-relaxed min-h-[2.5rem]">
          {displayed}
          {isTyping && <span className="animate-pulse">▋</span>}
        </p>

        {/* Indicador avanzar */}
        {!isTyping && (
          <div className="flex justify-end mt-2">
            <span className="font-display text-[0.5rem] text-muted animate-bounce tracking-widest">
              {currentLine < lines.length - 1 ? "Z / CLICK ▶" : "Z / CLICK ▶▶"}
            </span>
          </div>
        )}

        {/* Barra de progreso de líneas */}
        <div className="flex gap-1 mt-2">
          {lines.map((_, i) => (
            <div
              key={i}
              className={`h-0.5 flex-1 transition-colors ${
                i <= currentLine ? (variant === "intro" ? "bg-brand" : variant === "victory" ? "bg-danger" : "bg-emerald-500") : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>
    </div>,
    document.querySelector(".battle-view-container") || document.body,
  );
}
