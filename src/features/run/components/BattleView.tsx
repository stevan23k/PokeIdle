import React from "react";
import { useGame } from "../../../context/GameContext";
import { PixelSprite } from "../../../components/ui/PixelSprite";
import { HPBar } from "../../../components/ui/HPBar";
import { XPBar } from "../../../components/ui/XPBar";
import { TypeBadge } from "../../../components/ui/TypeBadge";
import { BattleBackground } from "../../../components/ui/BattleBackground";
import { REGIONS } from "../../../lib/regions";
import { SwitchPokemonModal } from "./SwitchPokemonModal";
import { clsx } from "clsx";

export interface BattleViewProps {
  onMoveClick?: (moveId: number) => void;
}

export function BattleView({ onMoveClick }: BattleViewProps) {
  const { run, setRun, training } = useGame();

  const isTraining = training.isActive;
  const battle = isTraining
    ? training.currentBattle
    : run.isActive
      ? run.currentBattle
      : null;

  const playerPokemon =
    battle?.playerPokemon ||
    (isTraining ? training.pokemon : run.isActive ? run.team[0] : null);
  const enemyPokemon = battle?.enemyPokemon;

  if (!playerPokemon && !enemyPokemon && !run.isActive && !training.isActive)
    return null;

  const currentZone =
    !isTraining && run.isActive
      ? REGIONS[run.runId ? run.currentRegion : "kanto"]?.zones[
          run.currentZoneIndex
        ]
      : null;
  const bgId = isTraining
    ? "indoor-gray"
    : (currentZone?.battleBgId ?? "indoor-gray");

  return (
    <div className="flex-1 flex flex-col bg-surface-dark crt-screen relative overflow-hidden border-2 border-border border-b-0 min-h-[300px] z-0">
      {/* Background Sprite Sheet */}
      <BattleBackground backgroundId={bgId} className="absolute inset-0 z-0" />

      {/* Background line */}
      <div className="absolute inset-x-0 top-[110px] h-px bg-border opacity-30 z-0"></div>

      {/* Enemy Side (Top Right) */}
      <div className="flex-1 relative p-4 flex justify-end items-start z-10 mt-4 mr-4">
        {enemyPokemon && (
          <div className="flex flex-col items-center relative">
            {/* Floating HP Bar Container above sprite */}
            <div className="flex flex-col items-center gap-1 mb-2 bg-surface-alt/80 p-2 border-2 border-border backdrop-blur-sm shadow-pixel z-20">
              {battle.enemyTrainer && (
                <div className="text-white font-display text-[0.55rem] tracking-widest bg-brand border border-border px-2 py-0.5 mb-1 opacity-90 shadow-sm w-full text-center">
                  {battle.enemyTrainer.name}
                </div>
              )}
              <div className="flex items-center gap-2 justify-between w-full">
                <span className="font-display text-xs truncate max-w-[140px] drop-shadow-md text-white">
                  {enemyPokemon.name}
                </span>
                <div className="flex gap-1 ml-1">
                  {enemyPokemon.types.map((t) => (
                    <TypeBadge key={t} type={t} />
                  ))}
                </div>
                <span className="font-body text-xs font-bold text-brand-light ml-auto">
                  Nv.{enemyPokemon.level}
                </span>
              </div>

              {/* Stat Modifiers & Status Badges */}
              <div className="flex flex-wrap gap-1 w-full mt-1">
                {enemyPokemon.status && (
                  <span className="text-[0.45rem] font-display text-white bg-danger px-1 py-0.5 shadow-sm">
                    {enemyPokemon.status}
                  </span>
                )}
                {Object.entries(enemyPokemon.statModifiers).map(
                  ([stat, val]) => {
                    if (val === 0) return null;
                    const color = val > 0 ? "bg-brand" : "bg-danger";
                    return (
                      <span
                        key={stat}
                        className={`text-[0.45rem] font-display text-white ${color} px-1 py-0.5 shadow-sm uppercase`}
                      >
                        {stat} {val > 0 ? `+${val}` : val}
                      </span>
                    );
                  },
                )}
              </div>

              <div className="w-48 sm:w-56 mt-1 space-y-1">
                {/* Multi-bar Boss HP */}
                {battle.isBossBattle && (
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[0.45rem] text-brand-light font-display">
                      BARRA {battle.bossCurrentBar}/{battle.bossMaxBars}
                    </span>
                  </div>
                )}
                <HPBar
                  currentHP={enemyPokemon.currentHP}
                  maxHP={enemyPokemon.maxHP}
                  showText={false}
                  barColor={
                    battle.isBossBattle && battle.bossCurrentBar === 1
                      ? "bg-orange-500"
                      : undefined
                  }
                />
              </div>
            </div>

            {/* Sprite Container */}
            <div className="w-40 h-40 sm:w-56 sm:h-56 flex items-end justify-center relative mt-2 shrink-0">
              <div className="absolute bottom-2 w-32 sm:w-48 h-10 rounded-[100%] bg-black/50 blur-[3px] -z-10"></div>
              <PixelSprite
                pokemonId={enemyPokemon.pokemonId}
                variant="front"
                shiny={enemyPokemon.isShiny}
                size={160}
                showScanlines={true}
                alt={enemyPokemon.name}
                className={clsx(
                  "w-32 h-32 sm:w-48 sm:h-48 drop-shadow-lg",
                  enemyPokemon.currentHP === 0 &&
                    "opacity-0 translate-y-8 transition-all duration-500",
                )}
              />
            </div>
          </div>
        )}
      </div>

      {/* Player Side (Bottom Left) */}
      <div className="flex-1 relative p-4 pr-12 flex items-end z-10 mb-8 ml-4">
        {playerPokemon && (
          <div className="flex flex-col items-center relative">
            {/* Sprite Container */}
            <div className="w-48 h-48 sm:w-64 sm:h-64 flex items-end justify-center relative mb-2 shrink-0">
              <div className="absolute bottom-6 w-40 sm:w-56 h-12 rounded-[100%] bg-black/50 blur-[4px] -z-10"></div>
              <PixelSprite
                pokemonId={playerPokemon.pokemonId}
                variant="back"
                shiny={playerPokemon.isShiny}
                size={192}
                showScanlines={true}
                alt={playerPokemon.name}
                className={clsx(
                  "w-40 h-40 sm:w-56 sm:h-56 drop-shadow-xl",
                  playerPokemon.currentHP === 0 &&
                    "opacity-0 translate-y-8 transition-all duration-500",
                )}
              />
            </div>

            {/* Floating HP Bar Container below/over sprite */}
            <div className="flex flex-col items-center gap-1 bg-surface-alt/80 p-2 border-2 border-border backdrop-blur-sm shadow-pixel z-20 absolute -bottom-6">
              <div className="flex items-center gap-2 justify-between w-full mb-1">
                <span className="font-display text-xs truncate max-w-[140px] drop-shadow-md text-white">
                  {playerPokemon.name}
                </span>
                <div className="flex gap-1 ml-1">
                  {playerPokemon.types.map((t) => (
                    <TypeBadge key={t} type={t} />
                  ))}
                </div>
                <span className="font-body text-xs font-bold text-brand-light ml-auto">
                  Nv.{playerPokemon.level}
                </span>
              </div>
              <div className="w-48 sm:w-64">
                <HPBar
                  currentHP={playerPokemon.currentHP}
                  maxHP={playerPokemon.maxHP}
                  showText={true}
                />
                <div className="mt-1">
                  <XPBar
                    currentXP={playerPokemon.xp}
                    nextLevelXP={playerPokemon.xpToNext}
                    prevLevelXP={Math.pow(playerPokemon.level, 3)}
                  />
                </div>
              </div>
              {playerPokemon.status && (
                <span className="text-[0.5rem] font-display text-white bg-danger px-1.5 py-0.5 mt-1 self-end shadow-sm">
                  {playerPokemon.status}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Searching Overlay */}
      {!battle && run.isActive && !isTraining && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none">
          <div className="bg-surface-dark/60 backdrop-blur-md border border-brand/30 px-6 py-3 rounded-sm shadow-2xl animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-brand rounded-full animate-ping"></div>
              <span className="font-display text-[1rem] tracking-[0.2em] text-brand-light drop-shadow-sm uppercase">
                Buscando oponente...
              </span>
            </div>
            <div className="mt-2 h-1 bg-surface-dark/80 rounded-full overflow-hidden border border-border/20">
              <div
                className="h-full bg-brand transition-all duration-300"
                style={{ width: `${run.currentZoneProgress}%` }}
              ></div>
            </div>
            <div className="mt-1 text-center font-body text-[0.55rem] text-muted tracking-widest uppercase opacity-70">
              Progreso de exploración: {run.currentZoneProgress}%
            </div>
          </div>
        </div>
      )}

      {/* Encounter Info Bar */}
      <div className="absolute bottom-0 inset-x-0 bg-surface border-t-2 border-border px-3 py-1 flex justify-between items-center z-20">
        <span className="font-body italic text-[0.6rem] text-muted">
          {!battle && run.isActive && !isTraining
            ? "Explorando la zona..."
            : battle?.type === "wild"
              ? "Encuentro salvaje"
              : battle?.type === "trainer"
                ? "Batalla de entrenador"
                : battle?.type === "gym"
                  ? "Reto de Gimnasio"
                  : isTraining
                    ? "Entrenamiento"
                    : "Alto Mando"}
        </span>
        {battle && battle.turnCount > 0 && (
          <span className="font-display text-[0.5rem] tracking-widest text-brand">
            TURNO {battle.turnCount}
          </span>
        )}
      </div>

      {/* Manual Switch Modal on Faint */}
      {run.isManualBattle &&
        battle?.pendingManualSwitch &&
        battle.phase === "active" && (
          <SwitchPokemonModal
            onSelect={(pokemon) => {
              setRun((prev) => {
                if (!prev.currentBattle) return prev;
                return {
                  ...prev,
                  currentBattle: {
                    ...prev.currentBattle,
                    playerPokemon: pokemon,
                    pendingManualSwitch: false,
                  },
                  battleLog: [
                    ...prev.battleLog,
                    {
                      id: Date.now().toString(),
                      text: `¡Adelante ${pokemon.name}!`,
                      type: "normal" as const,
                    },
                  ].slice(-40),
                };
              });
            }}
          />
        )}
    </div>
  );
}
