import React from "react";
import { useGame } from "../../../context/GameContext";
import { clsx } from "clsx";

export function BattleLog() {
  const { run, training } = useGame();

  const isTraining = training.isActive;
  const logs = isTraining ? training.battleLog : run.battleLog;
  const isActive = isTraining || run.isActive;

  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isActive) return null;

  return (
    <div className="h-44 border-2 border-border bg-surface-dark crt-screen relative flex flex-col overflow-hidden">
      <div className="bg-surface border-b border-border px-2 py-1.5 z-10 sticky top-0 flex items-center justify-between">
        <span className="font-display text-[0.55rem] text-white tracking-[0.2em] uppercase drop-shadow-sm">
          REGISTRO DE BATALLA
        </span>
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto p-3 pr-4 flex flex-col gap-2 z-10 relative scroll-smooth"
      >
        {logs.length === 0 && (
          <div className="text-center text-white/50 font-body text-[0.6rem] italic mt-2 uppercase tracking-widest">
            Esperando eventos...
          </div>
        )}
        {logs.map((entry) => {
          let colorClass = "text-white/70";

          switch (entry.type) {
            case "attack":
              colorClass = "text-success";
              break;
            case "danger":
              colorClass =
                "text-danger drop-shadow-[0_0_2px_rgba(255,59,59,0.5)]";
              break;
            case "crit":
              colorClass = "text-accent";
              break;
            case "super":
              colorClass =
                "text-accent-blue drop-shadow-[0_0_2px_rgba(74,144,217,0.5)]";
              break;
            case "not-very":
              colorClass = "text-white/40";
              break;
            case "capture":
              colorClass =
                "text-brand font-bold drop-shadow-[0_0_2px_rgba(204,0,0,0.5)]";
              break;
            case "level":
              colorClass =
                "text-accent font-bold drop-shadow-[0_0_5px_rgba(255,215,0,0.5)]";
              break;
            case "evolution":
              colorClass =
                "text-accent font-bold drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]";
              break;
            case "faint":
              colorClass = "text-danger font-bold";
              break;
            case "badge":
              colorClass = "text-accent font-bold tracking-widest";
              break;
            default:
              colorClass = "text-foreground";
              break;
          }

          return (
            <div
              key={entry.id}
              className={clsx(
                "font-body text-[0.65rem] leading-snug wrap-break-word border-l-2 pl-2 border-transparent hover:bg-surface hover:border-border transition-colors py-0.5",
                colorClass,
              )}
            >
              {entry.type === "crit" ? (
                <span className="font-display text-[0.5rem] mr-1">[CRIT]</span>
              ) : (
                ""
              )}
              {entry.type === "super" ? (
                <span className="font-display text-[0.5rem] mr-1">
                  [S.EFEC]
                </span>
              ) : (
                ""
              )}
              {entry.type === "not-very" ? (
                <span className="font-display text-[0.5rem] mr-1">
                  [N.EFEC]
                </span>
              ) : (
                ""
              )}
              {entry.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
