import React, { useEffect, useState } from "react";

interface PokeballCaptureAnimationProps {
  isActive: boolean;
  captured: boolean | null;
  ballId?: string;
  onHideEnemy?: () => void;   // called when enemy should disappear (ball about to land)
  onShowEnemy?: () => void;   // called when enemy reappears (failed capture)
  onComplete?: () => void;    // called when full animation is done
}

// Timeline:
// 0ms       → throwing (ball arcs from player to enemy, ~600ms)
// 600ms     → absorbing (white flash, enemy hides, ~400ms)
// 1000ms    → falling (ball drops to ground, ~500ms)
// 1500ms    → bouncing (2-3 bounces + shake, ~900ms)
// 2400ms    → resolve: resting (caught) OR breaking (failed → show enemy after 1s delay)

type Phase = "idle" | "throwing" | "absorbing" | "falling" | "bouncing" | "resting" | "breaking" | "done";

export function PokeballCaptureAnimation({
  isActive,
  captured,
  ballId = "poke-ball",
  onHideEnemy,
  onShowEnemy,
  onComplete,
}: PokeballCaptureAnimationProps) {
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    if (!isActive) {
      setPhase("idle");
      return;
    }

    setPhase("throwing");
    const timers: ReturnType<typeof setTimeout>[] = [];

    // 600ms: ball reaches enemy → flash + hide enemy
    timers.push(setTimeout(() => {
      setPhase("absorbing");
      onHideEnemy?.();
    }, 600));

    // 1000ms: ball starts falling
    timers.push(setTimeout(() => setPhase("falling"), 1000));

    // 1500ms: ball hits ground → bouncing
    timers.push(setTimeout(() => setPhase("bouncing"), 1500));

    // 2400ms: resolve based on result
    timers.push(setTimeout(() => {
      if (captured === true) {
        setPhase("resting");
        // battle ends naturally — component unmounts
      } else if (captured === false) {
        setPhase("breaking");
        // 1s delay before showing enemy again
        timers.push(setTimeout(() => {
          onShowEnemy?.();
          setPhase("done");
          onComplete?.();
        }, 1000));
      }
      // captured === null: result not yet known, stay bouncing
    }, 2400));

    return () => timers.forEach(clearTimeout);
  }, [isActive]);

  // If result arrives while still bouncing (captured was null at start)
  useEffect(() => {
    if (phase !== "bouncing" || captured === null) return;
    const t = setTimeout(() => {
      if (captured === true) {
        setPhase("resting");
      } else {
        setPhase("breaking");
        const t2 = setTimeout(() => {
          onShowEnemy?.();
          setPhase("done");
          onComplete?.();
        }, 1000);
        return () => clearTimeout(t2);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [phase, captured]);

  if (phase === "idle" || phase === "done") return null;

  // Ball should stay at ground position after throw
  const ballAtGround = ["falling", "bouncing", "resting", "breaking"].includes(phase);

  return (
    <>
      <style>{`
        @keyframes pb-throw {
          0%   { transform: translate(120px, 60px) scale(0.5) rotate(0deg); opacity: 1; }
          60%  { transform: translate(10px, -20px) scale(0.95) rotate(-200deg); opacity: 1; }
          100% { transform: translate(0px, 0px) scale(1) rotate(-360deg); opacity: 1; }
        }
        @keyframes pb-absorb-flash {
          0%   { opacity: 0; transform: scale(0.5); }
          40%  { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(0.8); }
        }
        @keyframes pb-fall {
          0%   { transform: translateY(0px); }
          100% { transform: translateY(55px); }
        }
        @keyframes pb-bounce {
          0%   { transform: translateY(55px) scaleY(1) scaleX(1); }
          15%  { transform: translateY(20px) scaleY(1.1) scaleX(0.95); }
          28%  { transform: translateY(55px) scaleY(0.85) scaleX(1.1); }
          40%  { transform: translateY(30px) scaleY(1.05) scaleX(0.97); }
          52%  { transform: translateY(55px) scaleY(0.92) scaleX(1.05); }
          65%  { transform: translateY(40px) scaleY(1.02) scaleX(0.99); }
          80%  { transform: translateY(55px) scaleY(0.97) scaleX(1.02); }
          100% { transform: translateY(55px) scaleY(1) scaleX(1); }
        }
        @keyframes pb-shake {
          0%, 100% { transform: translateY(55px) rotate(0deg); }
          20%      { transform: translateY(55px) rotate(-18deg); }
          40%      { transform: translateY(55px) rotate(18deg); }
          60%      { transform: translateY(55px) rotate(-12deg); }
          80%      { transform: translateY(55px) rotate(12deg); }
        }
        @keyframes pb-break {
          0%   { transform: translateY(55px) scale(1) rotate(0deg); opacity: 1; }
          40%  { transform: translateY(45px) scale(1.4) rotate(25deg); opacity: 0.8; }
          100% { transform: translateY(20px) scale(0) rotate(70deg); opacity: 0; }
        }
        @keyframes pb-rest-pulse {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 3px rgba(255,80,80,0.4)); }
          50%      { filter: brightness(1.3) drop-shadow(0 0 8px rgba(255,80,80,0.9)); }
        }
        @keyframes pb-caught-text {
          0%   { opacity: 0; transform: translateX(-50%) translateY(6px); }
          30%  { opacity: 1; transform: translateX(-50%) translateY(0px); }
          80%  { opacity: 1; transform: translateX(-50%) translateY(0px); }
          100% { opacity: 0.6; transform: translateX(-50%) translateY(0px); }
        }
      `}</style>

      <div className="absolute inset-0 pointer-events-none z-30">
        <div className="relative w-full h-full">

          {/* Absorb flash */}
          {phase === "absorbing" && (
            <div
              className="absolute bg-white rounded-full"
              style={{
                animation: "pb-absorb-flash 0.4s ease-out forwards",
                top: "15%", left: "15%", right: "15%", bottom: "15%",
              }}
            />
          )}

          {/* Pokeball */}
          <div
            className="absolute"
            style={{
              bottom: "8%",
              left: "50%",
              marginLeft: "-16px",
              width: 32,
              height: 32,
              // Keep ball at ground position when not throwing
              transform: ballAtGround && phase !== "falling" && phase !== "bouncing" && phase !== "breaking"
                ? "translateY(55px)"
                : undefined,
              animation:
                phase === "throwing"  ? "pb-throw 0.6s cubic-bezier(0.2, 0.8, 0.4, 1) forwards" :
                phase === "falling"   ? "pb-fall 0.5s ease-in forwards" :
                phase === "bouncing"  ? "pb-bounce 0.9s ease-out forwards, pb-shake 1s ease-in-out 0.5s forwards" :
                phase === "resting"   ? "pb-shake 0.6s ease-in-out, pb-rest-pulse 1.2s ease-in-out 0.6s infinite" :
                phase === "breaking"  ? "pb-break 0.5s ease-in forwards" :
                "none",
            }}
          >
            <img
              src={`/sprites/items/${ballId}.png`}
              alt={ballId}
              width={32}
              height={32}
              style={{ imageRendering: "pixelated", display: "block" }}
              onError={(e) => { (e.target as HTMLImageElement).src = "/sprites/items/poke-ball.png"; }}
            />
          </div>

          {/* ¡CAPTURADO! text */}
          {phase === "resting" && (
            <div
              className="absolute font-display text-[0.6rem] tracking-widest text-white"
              style={{
                bottom: "calc(8% + 52px)",
                left: "50%",
                animation: "pb-caught-text 1.5s ease-out forwards",
                textShadow: "0 0 8px #ff4444, 0 1px 2px rgba(0,0,0,0.8)",
                whiteSpace: "nowrap",
              }}
            >
              ¡CAPTURADO!
            </div>
          )}
        </div>
      </div>
    </>
  );
}