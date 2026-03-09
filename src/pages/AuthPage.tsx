import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { ConfirmModal } from "../components/ui/ConfirmModal";

// ── GBA Palette (FireRed/LeafGreen) ───────────────────────────────────────────
const C = {
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

function BlinkCursor() {
  const [v, setV] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setV((x) => !x), 530);
    return () => clearInterval(t);
  }, []);
  return (
    <span
      style={{
        display: "inline-block",
        width: "9px",
        height: "13px",
        background: v ? C.blue : "transparent",
        verticalAlign: "middle",
        marginLeft: "3px",
      }}
    />
  );
}

function GBAInput({
  type,
  value,
  onChange,
  placeholder,
}: {
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      style={{
        background: focused ? "#e8f0ff" : "#f0f0e8",
        border: `3px solid ${focused ? C.blue : C.border}`,
        boxShadow: `inset 2px 2px 0 ${focused ? C.shadow : C.gray}`,
        padding: "8px 10px",
        display: "flex",
        alignItems: "center",
      }}
    >
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{
          background: "transparent",
          border: "none",
          outline: "none",
          width: "100%",
          fontFamily: "'Press Start 2P',monospace",
          fontSize: "8px",
          color: C.text,
          letterSpacing: "0.05em",
          lineHeight: "1.6",
        }}
      />
      {focused && <BlinkCursor />}
    </div>
  );
}

function GBAButton({
  onClick,
  children,
  variant = "primary",
  disabled = false,
  fullWidth = false,
  type = "button",
}: {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  fullWidth?: boolean;
  type?: "button" | "submit";
}) {
  const [pressed, setPressed] = useState(false);
  const bg = disabled
    ? C.gray
    : variant === "primary"
      ? C.blue
      : variant === "danger"
        ? C.red
        : C.shadow;
  return (
    <button
      type={type}
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

function GBATabs({
  active,
  onChange,
}: {
  active: "login" | "register";
  onChange: (m: "login" | "register") => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        border: `3px solid ${C.border}`,
        marginBottom: "16px",
      }}
    >
      {(["login", "register"] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          style={{
            flex: 1,
            padding: "8px 4px",
            background: active === tab ? C.blue : C.bgDark,
            border: "none",
            borderRight: tab === "login" ? `2px solid ${C.border}` : "none",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              fontFamily: "'Press Start 2P',monospace",
              fontSize: "7px",
              color: active === tab ? "white" : C.text,
              letterSpacing: "0.05em",
              textShadow: active === tab ? "1px 1px 0 rgba(0,0,0,0.4)" : "none",
              textTransform: "uppercase",
            }}
          >
            {tab === "login" ? "ENTRAR" : "REGISTRO"}
          </span>
        </button>
      ))}
    </div>
  );
}

export function AuthPage() {
  const {
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    loginAsGuest,
    loading,
    error,
    clearError,
  } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "success">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [showGuestWarning, setShowGuestWarning] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();
    if (!email || !password) {
      setLocalError("Completa todos los campos.");
      return;
    }
    if (mode === "register") {
      if (password !== confirmPassword) {
        setLocalError("Las contraseñas no coinciden.");
        return;
      }
      if (password.length < 6) {
        setLocalError("Mínimo 6 caracteres.");
        return;
      }
      await registerWithEmail(email, password);
      if (!error) setMode("success");
    } else {
      await loginWithEmail(email, password);
    }
  };

  if (mode === "success") {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 crt-screen"
        style={{ background: C.bg }}
      >
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>
        <PixelWindow
          title="REGISTRO OK"
          style={{ maxWidth: "360px", width: "100%" }}
        >
          <p
            style={{
              fontFamily: "'Press Start 2P',monospace",
              fontSize: "8px",
              color: C.text,
              lineHeight: 2.2,
              marginBottom: "16px",
            }}
          >
            Revisa tu correo:
            <br />
            <br />
            <span style={{ color: C.blue }}>{email}</span>
          </p>
          <GBAButton onClick={() => setMode("login")} fullWidth>
            VOLVER
          </GBAButton>
        </PixelWindow>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        @keyframes gbaBounce { from { transform:translateY(0); } to { transform:translateY(-6px); } }
        @keyframes gbaIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes titleBlink { 0%,89%,100%{opacity:1} 90%,98%{opacity:0.5} }
        * { box-sizing: border-box; }
        input::placeholder { font-family:'Press Start 2P',monospace; font-size:7px; color:${C.gray}; }
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
          <span
            style={{
              fontFamily: "'Press Start 2P',monospace",
              fontSize: "6px",
              color: "rgba(255,255,255,0.65)",
              letterSpacing: "0.1em",
            }}
          >
            ROGUELIKE TRAINER
          </span>
        </div>

        {/* Body */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "calc(100vh - 54px)",
            padding: "24px 16px",
            gap: "18px",
            animation: "gbaIn 0.4s ease 0.1s both",
          }}
        >
          {/* Sprites */}
          <div style={{ display: "flex", gap: "6px", alignItems: "flex-end" }}>
            {[1, 4, 7, 25].map((id, i) => (
              <img
                key={id}
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${id}.gif`}
                alt=""
                style={{
                  width: "40px",
                  height: "40px",
                  imageRendering: "pixelated",
                  filter: "drop-shadow(2px 2px 0 rgba(0,0,0,0.25))",
                  animation: `gbaBounce ${1.1 + i * 0.15}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>
          <span
            style={{
              fontFamily: "'Press Start 2P',monospace",
              fontSize: "7px",
              color: C.textMuted,
              letterSpacing: "0.2em",
            }}
          >
            ★ PORTAL DEL ENTRENADOR ★
          </span>

          {/* Form window */}
          <PixelWindow style={{ width: "100%", maxWidth: "380px" }}>
            <GBATabs
              active={mode as any}
              onChange={(m) => {
                setMode(m);
                setLocalError(null);
                clearError();
              }}
            />

            {(error || localError) && (
              <div
                style={{
                  background: "#ffd0c8",
                  border: `3px solid ${C.red}`,
                  boxShadow: `2px 2px 0 ${C.border}`,
                  padding: "8px 10px",
                  marginBottom: "14px",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Press Start 2P',monospace",
                    fontSize: "7px",
                    color: C.red,
                    lineHeight: 1.9,
                    display: "block",
                  }}
                >
                  {localError || error}
                </span>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {[
                {
                  label: "CORREO",
                  type: "email",
                  val: email,
                  set: setEmail,
                  ph: "trainer@poke.com",
                },
                {
                  label: "CONTRASEÑA",
                  type: "password",
                  val: password,
                  set: setPassword,
                  ph: "••••••••",
                },
                ...(mode === "register"
                  ? [
                      {
                        label: "CONFIRMAR",
                        type: "password",
                        val: confirmPassword,
                        set: setConfirmPassword,
                        ph: "••••••••",
                      },
                    ]
                  : []),
              ].map((f) => (
                <div key={f.label}>
                  <label
                    style={{
                      display: "block",
                      fontFamily: "'Press Start 2P',monospace",
                      fontSize: "7px",
                      color: C.textMuted,
                      marginBottom: "6px",
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {f.label}
                  </label>
                  <GBAInput
                    type={f.type}
                    value={f.val}
                    onChange={f.set}
                    placeholder={f.ph}
                  />
                </div>
              ))}
              <div style={{ marginTop: "4px" }}>
                <GBAButton type="submit" fullWidth disabled={loading}>
                  {loading
                    ? "CARGANDO..."
                    : mode === "login"
                      ? "COMENZAR"
                      : "REGISTRAR"}
                </GBAButton>
              </div>
            </form>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: "16px 0",
              }}
            >
              <div style={{ flex: 1, height: "2px", background: C.border }} />
              <span
                style={{
                  fontFamily: "'Press Start 2P',monospace",
                  fontSize: "6px",
                  color: C.textMuted,
                  textTransform: "uppercase" as const,
                }}
              >
                O
              </span>
              <div style={{ flex: 1, height: "2px", background: C.border }} />
            </div>

            <button
              type="button"
              onClick={() => loginWithGoogle()}
              disabled={loading}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLElement).style.transform =
                  "translate(2px,2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "";
                (e.currentTarget as HTMLElement).style.boxShadow =
                  `3px 3px 0 ${C.border}`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "";
                (e.currentTarget as HTMLElement).style.boxShadow =
                  `3px 3px 0 ${C.border}`;
              }}
              style={{
                width: "100%",
                background: "white",
                border: `3px solid ${C.border}`,
                boxShadow: `3px 3px 0 ${C.border}`,
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#4285f4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09"
                />
                <path
                  fill="#34a853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23"
                />
                <path
                  fill="#fbbc05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22z"
                />
                <path
                  fill="#ea4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53"
                />
              </svg>
              <span
                style={{
                  fontFamily: "'Press Start 2P',monospace",
                  fontSize: "8px",
                  color: C.text,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase" as const,
                }}
              >
                GOOGLE
              </span>
            </button>
          </PixelWindow>

          {/* Guest box */}
          <div
            style={{
              width: "100%",
              maxWidth: "380px",
              border: `3px solid ${C.border}`,
              boxShadow: `3px 3px 0 ${C.border}`,
              background: C.win,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: "'Press Start 2P',monospace",
                  fontSize: "7px",
                  color: C.textMuted,
                  lineHeight: 1.9,
                  marginBottom: "2px",
                }}
              >
                MODO INVITADO
              </p>
              <p
                style={{
                  fontFamily: "'Press Start 2P',monospace",
                  fontSize: "6px",
                  color: C.gray,
                  lineHeight: 1.8,
                }}
              >
                Sin guardado en la nube
              </p>
            </div>
            <GBAButton
              variant="secondary"
              onClick={() => setShowGuestWarning(true)}
            >
              JUGAR
            </GBAButton>
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
        isOpen={showGuestWarning}
        title="ADVERTENCIA"
        message={
          <div className="flex flex-col gap-4">
            <p>
              Modo <strong>Invitado</strong> — tu progreso no se guardará al
              cerrar el navegador.
            </p>
          </div>
        }
        confirmText="JUGAR COMO INVITADO"
        cancelText="CANCELAR"
        onConfirm={loginAsGuest}
        onClose={() => setShowGuestWarning(false)}
      />
    </>
  );
}
