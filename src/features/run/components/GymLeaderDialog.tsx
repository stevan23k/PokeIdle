import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";

interface GymLeaderDialogProps {
  leaderName: string;
  leaderPokemonId: number; // For future sprite integration if needed
  lines: string[];
  onFinish: () => void;
  variant: "intro" | "victory" | "defeat";
}

import { getLeaderSpriteUrl } from "../../../lib/gymLeaders";

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
  const [spriteVisible, setSpriteVisible] = useState(false);

  useEffect(() => {
    // Pequeño delay para que la animación de entrada sea visible
    const t = setTimeout(() => setSpriteVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

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
        e.preventDefault();
        e.stopPropagation();
        handleAdvance();
      }
    };
    window.addEventListener("keydown", handleKey, true); // Use capture phase
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
      <div className={`border-4 ${variantColors[variant]} ${variantBg[variant]} bg-surface-dark shadow-[6px_6px_0_rgba(0,0,0,0.8)] flex flex-col sm:flex-row gap-3 items-end sm:items-stretch`}>
        
        {/* Sprite del líder */}
        <div className="shrink-0 flex items-end justify-center pl-3 pb-3 self-center sm:self-end">
          <img
            src={getLeaderSpriteUrl(leaderName)}
            alt={leaderName}
            className={clsx(
              "w-24 h-24 sm:w-32 sm:h-32 object-contain transition-all duration-500",
              spriteVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
            style={{ imageRendering: "pixelated" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>

        {/* Contenido del diálogo */}
        <div className="flex-1 p-4 flex flex-col gap-2">
          {/* Nombre del líder */}
          <div className={`font-display text-[0.55rem] tracking-[0.2em] uppercase ${
            variant === "intro" ? "text-brand" : variant === "victory" ? "text-danger" : "text-emerald-400"
          }`}>
            {leaderName}
          </div>

          {/* Texto con typewriter */}
          <p className="font-display text-[0.75rem] text-white leading-relaxed min-h-[2.5rem]">
            {displayed}
            {isTyping && <span className="animate-pulse">▋</span>}
          </p>

          {/* Indicador avanzar + barra de progreso */}
          <div className="flex items-center justify-between gap-2 mt-1">
            <div className="flex gap-1 flex-1">
              {lines.map((_, i) => (
                <div
                  key={i}
                  className={`h-0.5 flex-1 transition-colors ${
                    i <= currentLine
                      ? variant === "intro" ? "bg-brand"
                      : variant === "victory" ? "bg-danger"
                      : "bg-emerald-500"
                      : "bg-border"
                  }`}
                />
              ))}
            </div>
            {!isTyping && (
              <span className="font-display text-[0.5rem] text-muted animate-bounce tracking-widest shrink-0">
                {currentLine < lines.length - 1 ? "▶" : "▶▶"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.querySelector(".battle-view-container") || document.body,
  );
}

