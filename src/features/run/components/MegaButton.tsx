import { useState } from "react";
import type { MegaEvolution } from "../../../lib/mega.service";
import { canMegaEvolveSync } from "../../../lib/mega.service";
import { formatMegaName } from "../../../engine/mega.engine";

interface MegaButtonProps {
  activePokemonId: number;
  playerItems: Record<string, number>;
  hasMegaBracelet: boolean;
  usedThisBattle: boolean;
  isPlayerTurn: boolean;
  onMegaEvolve: (mega: MegaEvolution) => void;
}

export function MegaButton({
  activePokemonId,
  playerItems,
  hasMegaBracelet,
  usedThisBattle,
  isPlayerTurn,
  onMegaEvolve,
}: MegaButtonProps) {
  const [showPicker, setShowPicker] = useState(false);

  const availableMegas = canMegaEvolveSync(
    activePokemonId,
    playerItems,
    hasMegaBracelet,
    usedThisBattle,
  );

  if (availableMegas.length === 0 || !isPlayerTurn) return null;

  const handleClick = () => {
    if (availableMegas.length === 1) {
      onMegaEvolve(availableMegas[0]);
    } else {
      setShowPicker(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        title="¡Mega Evolucionar!"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-linear-to-br from-orange-500 to-amber-300 border-2 border-orange-600 rounded-sm font-display text-white text-xs tracking-widest uppercase shadow-[0_0_15px_rgba(249,115,22,0.6)] animate-pulse hover:brightness-110 hover:scale-105 transition-all duration-150 cursor-pointer"
      >
        <span className="text-base leading-none drop-shadow">⚡</span>
        <span className="drop-shadow-md">MEGA</span>
      </button>

      {showPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowPicker(false)}
        >
          <div
            className="bg-white/90 backdrop-blur-md border-2 border-orange-400 rounded-sm shadow-2xl p-5 min-w-[220px] flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display text-xs text-center tracking-widest uppercase text-orange-700">
              ¿Qué forma Mega?
            </p>
            {availableMegas.map((mega) => (
              <button
                key={mega.mega_name}
                onClick={() => {
                  setShowPicker(false);
                  onMegaEvolve(mega);
                }}
                className="flex flex-col items-center gap-0.5 px-4 py-2.5 bg-linear-to-br from-orange-500 to-amber-300 border border-orange-600 rounded-sm hover:brightness-110 hover:scale-[1.02] transition-all duration-100 cursor-pointer"
              >
                <span className="font-display text-sm text-white tracking-wide drop-shadow">
                  {formatMegaName(mega.mega_name)}
                </span>
                <span className="font-body text-[0.6rem] text-white/80 uppercase tracking-widest">
                  {mega.required_item}
                </span>
              </button>
            ))}
            <button
              onClick={() => setShowPicker(false)}
              className="mt-1 font-body text-xs text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
