import React from "react";
import { createPortal } from "react-dom";
import { MousePointer2, Cpu, X } from "lucide-react";
import { PixelWindow, GBAButton, C } from "../../../components/ui/GBAUI";

interface StartConfigModalProps {
  onSelect: (config: {
    isManualBattle: boolean;
    autoCapture: boolean;
    autoItems: boolean;
  }) => void;
  onCancel: () => void;
  starterName: string;
}

export function StartConfigModal({
  onSelect,
  onCancel,
  starterName,
}: StartConfigModalProps) {
  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(4px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      className="crt-screen"
    >
      <PixelWindow
        title="CONFIG"
        style={{ width: "100%", maxWidth: "600px", position: "relative" }}
        className="animate-in fade-in zoom-in duration-200"
      >
        <button
          onClick={onCancel}
          style={{
            position: "absolute",
            top: "-16px",
            right: "-16px",
            width: "40px",
            height: "40px",
            background: C.red,
            border: `4px solid ${C.border}`,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            cursor: "pointer",
            boxShadow: `2px 2px 0 ${C.shadow}`,
          }}
        >
          <X size={20} />
        </button>

        <h2
          style={{
            fontFamily: "'Press Start 2P',monospace",
            fontSize: "14px",
            color: C.text,
            marginBottom: "8px",
            textAlign: "center",
            letterSpacing: "0.1em",
          }}
        >
          CONFIGURACIÓN
        </h2>
        <p
          style={{
            fontFamily: "'Press Start 2P',monospace",
            fontSize: "8px",
            color: C.textMuted,
            textAlign: "center",
            marginBottom: "40px",
            paddingBottom: "16px",
            borderBottom: `2px dashed ${C.gray}`,
          }}
        >
          STARTER: <span style={{ color: C.blue }}>{starterName}</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* MODO IDLE */}
          <button
            onClick={() =>
              onSelect({
                isManualBattle: false,
                autoCapture: true,
                autoItems: true,
              })
            }
            className="group flex flex-col items-center p-6 bg-surface border-4 transition-all"
            style={{
              background: C.win,
              border: `4px solid ${C.border}`,
              boxShadow: `4px 4px 0 ${C.border}`,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.green)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                background: C.bgDark,
                border: `2px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "20px",
              }}
            >
              <Cpu size={32} color="white" />
            </div>
            <h3
              style={{
                fontFamily: "'Press Start 2P',monospace",
                fontSize: "10px",
                color: C.text,
                marginBottom: "16px",
                letterSpacing: "0.1em",
              }}
            >
              MODO IDLE
            </h3>
            <div className="space-y-4 w-full">
              {[
                { label: "COMBATES AUTO" },
                { label: "CAPTURA (ON)" },
                { label: "CURACIÓN (ON)" },
              ].map((f) => (
                <div
                  key={f.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontFamily: "'Press Start 2P',monospace",
                    fontSize: "6.5px",
                    color: C.textMuted,
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      background: C.green,
                      border: `1px solid ${C.border}`,
                    }}
                  />
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
            <span
              style={{
                marginTop: "24px",
                fontSize: "7px",
                fontFamily: "'Press Start 2P',monospace",
                color: C.green,
              }}
            >
              PROGRESO RÁPIDO
            </span>
          </button>

          {/* MODO MANUAL */}
          <button
            onClick={() =>
              onSelect({
                isManualBattle: true,
                autoCapture: false,
                autoItems: false,
              })
            }
            className="group flex flex-col items-center p-6 bg-surface border-4 transition-all"
            style={{
              background: C.win,
              border: `4px solid ${C.border}`,
              boxShadow: `4px 4px 0 ${C.border}`,
              cursor: "pointer",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = C.blueLight)
            }
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                background: C.bgDark,
                border: `2px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "20px",
              }}
            >
              <MousePointer2 size={32} color="white" />
            </div>
            <h3
              style={{
                fontFamily: "'Press Start 2P',monospace",
                fontSize: "10px",
                color: C.text,
                marginBottom: "16px",
                letterSpacing: "0.1em",
              }}
            >
              MODO MANUAL
            </h3>
            <div className="space-y-4 w-full">
              {[
                { label: "TOTAL CONTROL" },
                { label: "CAPTURA MANUAL" },
                { label: "GESTIÓN MANUAL" },
              ].map((f) => (
                <div
                  key={f.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontFamily: "'Press Start 2P',monospace",
                    fontSize: "6.5px",
                    color: C.textMuted,
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      background: C.blueLight,
                      border: `1px solid ${C.border}`,
                    }}
                  />
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
            <span
              style={{
                marginTop: "24px",
                fontSize: "7px",
                fontFamily: "'Press Start 2P',monospace",
                color: C.blueLight,
              }}
            >
              EXPERIENCIA CLÁSICA
            </span>
          </button>
        </div>

        <div
          style={{
            marginTop: "32px",
            paddingTop: "24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
            borderTop: `2px dashed ${C.border}`,
          }}
        >
          <p
            style={{
              fontFamily: "'Press Start 2P',monospace",
              fontSize: "6px",
              color: C.textMuted,
              textAlign: "center",
              lineHeight: "1.8",
              maxWidth: "400px",
            }}
          >
            Podrás cambiar el estilo de juego en cualquier momento desde tu
            mochila.
          </p>
          <GBAButton onClick={onCancel} variant="secondary">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <X size={10} /> CANCELAR
            </div>
          </GBAButton>
        </div>
      </PixelWindow>
    </div>,
    document.body,
  );
}
