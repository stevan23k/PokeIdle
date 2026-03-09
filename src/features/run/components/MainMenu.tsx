import React, { useState, useEffect } from "react";
import { useGame } from "../../../context/GameContext";
import { ConfirmModal } from "../../../components/ui/ConfirmModal";
import { useAuth } from "../../../context/AuthContext";

const C = {
  bg: "#4a5a52",
  bgDark: "#2a3a32",
  win: "#d0dbd4",
  border: "#0e1418",
  shadow: "#2c3832",
  blue: "#304c8c",
  blueLight: "#5c7cba",
  red: "#a42c2c",
  yellow: "#c09c28",
  gray: "#7a8a80",
  text: "#141a1c",
  textMuted: "#4c5c54",
  green: "#307438",
};

function PixelWindow({
  children,
  title,
  style,
}: {
  children: React.ReactNode;
  title?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style}>
      <div style={{ background: C.border, padding: "4px" }}>
        <div style={{ background: C.shadow, padding: "3px" }}>
          <div style={{ background: C.win }}>
            {title && (
              <div style={{ background: C.blue, padding: "7px 14px" }}>
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
            )}
            <div style={{ padding: "16px" }}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GBAButton({
  onClick,
  children,
  variant = "primary",
  disabled = false,
  fullWidth = false,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "success";
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  const bg = disabled
    ? C.gray
    : variant === "primary"
      ? C.blue
      : variant === "danger"
        ? C.red
        : variant === "success"
          ? C.green
          : C.shadow;
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
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
          fontFamily: "'Press Start 2P',monospace",
          fontSize: "9px",
          color: "white",
          letterSpacing: "0.08em",
          textShadow: "2px 2px 0 rgba(0,0,0,0.4)",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
    </button>
  );
}

// ── Cursor arrow (GBA selector style) ────────────────────────────────────────
function SelectArrow({ visible }: { visible: boolean }) {
  const [blink, setBlink] = useState(true);
  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => setBlink((b) => !b), 400);
    return () => clearInterval(t);
  }, [visible]);
  if (!visible)
    return <span style={{ display: "inline-block", width: "16px" }} />;
  return (
    <span
      style={{
        display: "inline-block",
        width: "16px",
        color: C.blue,
        fontFamily: "'Press Start 2P',monospace",
        fontSize: "10px",
        opacity: blink ? 1 : 0.3,
        transition: "opacity 0.1s",
      }}
    >
      ▶
    </span>
  );
}

// ── Menu row ──────────────────────────────────────────────────────────────────
function MenuRow({
  label,
  sublabel,
  tag,
  onClick,
  active,
  icon,
  danger,
}: {
  label: string;
  sublabel?: string;
  tag?: string;
  onClick: () => void;
  active?: boolean;
  icon?: string;
  danger?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const isActive = active || hovered;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        background: isActive ? (danger ? "#ffd8d0" : "#e8f0ff") : "transparent",
        border: `2px solid ${isActive ? (danger ? C.red : C.blue) : "transparent"}`,
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        cursor: "pointer",
        textAlign: "left",
        transition: "none",
      }}
    >
      <SelectArrow visible={isActive} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontFamily: "'Press Start 2P',monospace",
              fontSize: "9px",
              color: danger ? C.red : C.text,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </span>
          {tag && (
            <span
              style={{
                fontFamily: "'Press Start 2P',monospace",
                fontSize: "6px",
                color: "white",
                background: C.yellow.replace("#f8d030", "#d09020"),
                padding: "2px 5px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {tag}
            </span>
          )}
        </div>
        {sublabel && (
          <p
            style={{
              fontFamily: "'Press Start 2P',monospace",
              fontSize: "6px",
              color: C.textMuted,
              marginTop: "4px",
              lineHeight: 1.8,
              letterSpacing: "0.03em",
            }}
          >
            {sublabel}
          </p>
        )}
      </div>
      {icon && <span style={{ fontSize: "16px", flexShrink: 0 }}>{icon}</span>}
    </button>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
function GBADivider() {
  return (
    <div style={{ height: "2px", background: C.border, margin: "4px 0" }} />
  );
}

export function MainMenu({
  onStartNew,
  onContinue,
  onStartTraining,
  onContinueTraining,
  onOpenGacha,
  onOpenStats,
}: {
  onStartNew: () => void;
  onContinue: () => void;
  onStartTraining: () => void;
  onContinueTraining: () => void;
  onOpenGacha: () => void;
  onOpenStats?: () => void;
}) {
  const { run, setRun, training, setTraining, meta } = useGame();
  const { logout, isGuest } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showTrainingConfirm, setShowTrainingConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleStartNewClick = () => {
    if (run.isActive || run.team.length > 0) setShowConfirm(true);
    else onStartNew();
  };

  const handleConfirmNew = () => {
    setShowConfirm(false);
    setRun((prev) => ({
      ...prev,
      isActive: false,
      currentBattle: null,
      team: [],
    }));
    onStartNew();
  };

  const maxLevel = Math.max(...(run.team?.map((p) => p.level) ?? [0]), 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        @keyframes gbaIn { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)} }
        @keyframes titleBlink { 0%,89%,100%{opacity:1}90%,98%{opacity:0.5} }
        @keyframes rayFloat { from{transform:translateY(0)}to{transform:translateY(-8px)} }
        * { box-sizing: border-box; }
      `}</style>

      <div
        className="fixed inset-0 z-50 overflow-auto crt-screen"
        style={{
          background: C.bg,
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      >
        {/* Dot pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, ${C.bgDark}55 1px, transparent 1px)`,
            backgroundSize: "16px 16px",
            opacity: 0.5,
          }}
        />

        {/* Top bar */}
        <div
          style={{
            background: C.red,
            borderBottom: `4px solid ${C.border}`,
            boxShadow: `0 4px 0 ${C.shadow}`,
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <svg width="22" height="22" viewBox="0 0 22 22">
              <circle
                cx="11"
                cy="11"
                r="10"
                fill="white"
                stroke={C.border}
                strokeWidth="2"
              />
              <path d="M1 11 H21" stroke={C.border} strokeWidth="2" />
              <circle
                cx="11"
                cy="11"
                r="4"
                fill="white"
                stroke={C.border}
                strokeWidth="2"
              />
              <path d="M1 11 A10 10 0 0 1 21 11" fill={C.red} />
            </svg>
            <span
              style={{
                fontFamily: "'Press Start 2P',monospace",
                fontSize: "13px",
                color: "white",
                textShadow: "3px 3px 0 rgba(0,0,0,0.4)",
                animation: "titleBlink 8s ease infinite",
                letterSpacing: "0.05em",
              }}
            >
              PokéIdle
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontFamily: "'Press Start 2P',monospace",
                fontSize: "6px",
                color: "rgba(255,255,255,0.65)",
              }}
            >
              {isGuest ? "INVITADO" : "CONECTADO"}
            </span>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: isGuest ? C.yellow : "#60d060",
                border: `2px solid ${C.border}`,
              }}
            />
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "calc(100vh - 54px)",
            padding: "24px 16px 32px",
            gap: "18px",
            animation: "gbaIn 0.4s ease 0.1s both",
          }}
        >
          {/* Title */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontFamily: "'Press Start 2P',monospace",
                fontSize: "7px",
                color: C.textMuted,
                letterSpacing: "0.2em",
              }}
            >
              ★ MENÚ PRINCIPAL ★
            </span>
          </div>

          {/* Active run info box */}
          {run.isActive && (
            <div
              style={{
                width: "100%",
                maxWidth: "380px",
                border: `3px solid ${C.green}`,
                boxShadow: `3px 3px 0 ${C.border}`,
                background: "#e8f8e8",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <div>
                <p
                  style={{
                    fontFamily: "'Press Start 2P',monospace",
                    fontSize: "7px",
                    color: C.green,
                    marginBottom: "4px",
                    letterSpacing: "0.05em",
                  }}
                >
                  PARTIDA ACTIVA
                </p>
                <div style={{ display: "flex", gap: "16px" }}>
                  {[
                    { l: "ZONA", v: run.currentZoneIndex + 1 },
                    { l: "MEDALLAS", v: `${run.gymsBadges?.length ?? 0}/8` },
                    { l: "NV MÁX", v: maxLevel || "—" },
                  ].map((s) => (
                    <div key={s.l}>
                      <p
                        style={{
                          fontFamily: "'Press Start 2P',monospace",
                          fontSize: "5px",
                          color: C.textMuted,
                          marginBottom: "2px",
                        }}
                      >
                        {s.l}
                      </p>
                      <p
                        style={{
                          fontFamily: "'Press Start 2P',monospace",
                          fontSize: "8px",
                          color: C.text,
                        }}
                      >
                        {s.v}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <GBAButton variant="success" onClick={onContinue}>
                ▶ IR
              </GBAButton>
            </div>
          )}

          {/* Main menu window */}
          <PixelWindow
            title="ACCIONES"
            style={{ width: "100%", maxWidth: "380px" }}
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: "2px" }}
            >
              {run.isActive && (
                <MenuRow
                  label="Continuar Partida"
                  sublabel={`Zona ${run.currentZoneIndex + 1} — ${run.gymsBadges?.length ?? 0} medallas`}
                  tag="ACTIVA"
                  onClick={onContinue}
                  icon="⚔️"
                />
              )}
              <MenuRow
                label="Nueva Partida"
                sublabel="Empieza desde cero"
                onClick={handleStartNewClick}
                icon="🗺️"
              />
              <GBADivider />
              <MenuRow
                label="Entrenamiento"
                sublabel={`Modo infinito — ${meta.pokeCoins} coins`}
                onClick={() =>
                  training.isActive
                    ? setShowTrainingConfirm(true)
                    : onStartTraining()
                }
                icon="🏋️"
              />
              <GBADivider />
              <MenuRow
                label="Invocación"
                sublabel="Pokémon raros y legendarios"
                onClick={onOpenGacha}
                icon="✨"
              />
              <MenuRow
                label="Estadísticas"
                sublabel="Historial y logros"
                onClick={onOpenStats ?? (() => {})}
                icon="📊"
              />
              <GBADivider />
              <MenuRow
                danger
                label="Cerrar Sesión"
                sublabel="Salir de la cuenta actual"
                onClick={logout}
                icon="🚪"
              />
            </div>
          </PixelWindow>

          {/* Coins strip */}
          <div
            style={{
              width: "100%",
              maxWidth: "380px",
              border: `3px solid ${C.border}`,
              boxShadow: `3px 3px 0 ${C.border}`,
              background: C.win,
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>🪙</span>
              <div>
                <p
                  style={{
                    fontFamily: "'Press Start 2P',monospace",
                    fontSize: "6px",
                    color: C.textMuted,
                    marginBottom: "2px",
                  }}
                >
                  POKÉCOINS
                </p>
                <p
                  style={{
                    fontFamily: "'Press Start 2P',monospace",
                    fontSize: "10px",
                    color: C.text,
                  }}
                >
                  {meta.pokeCoins}
                </p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.querySelector("span")!.style.color = C.red)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.querySelector("span")!.style.color = C.gray)
              }
            >
              <span
                style={{
                  fontFamily: "'Press Start 2P',monospace",
                  fontSize: "6px",
                  color: C.gray,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  transition: "color 0.1s",
                }}
              >
                SALIR ×
              </span>
            </button>
          </div>

          <span
            style={{
              fontFamily: "'Press Start 2P',monospace",
              fontSize: "6px",
              color: C.gray,
              letterSpacing: "0.1em",
            }}
          >
            v0.9 — FAN GAME
          </span>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        title="¿Sobreescribir Partida?"
        message="Tienes una partida en curso. Empezar una nueva borrará todo el progreso. ¿Continuar?"
        confirmText="Sí, Nueva Partida"
        cancelText="Cancelar"
        onConfirm={handleConfirmNew}
        onClose={() => setShowConfirm(false)}
      />

      <ConfirmModal
        isOpen={showTrainingConfirm}
        title="Sesión de Entrenamiento"
        message="Tienes una sesión activa. ¿Qué deseas hacer?"
        confirmText="Continuar Entrenamiento"
        cancelText="Empezar de Cero"
        onConfirm={() => {
          setShowTrainingConfirm(false);
          onContinueTraining();
        }}
        onClose={() => {
          setShowTrainingConfirm(false);
          setTraining((prev) => ({
            ...prev,
            isActive: false,
            currentBattle: null,
          }));
          onStartTraining();
        }}
      />
    </>
  );
}
