import React, { useCallback, useState, useEffect } from "react";
import { useGame } from "../../../context/GameContext";
import { PixelSprite } from "../../../components/ui/PixelSprite";
import { HPBar } from "../../../components/ui/HPBar";
import { XPBar } from "../../../components/ui/XPBar";
import { TypeBadge } from "../../../components/ui/TypeBadge";
import { BattleBackground } from "../../../components/ui/BattleBackground";
import { REGIONS } from "../../../lib/regions";
import { SwitchPokemonModal } from "./SwitchPokemonModal";
import { clsx } from "clsx";
import { useBattleAnimation } from "../hooks/useBattleAnimation";
import { PokeballCaptureAnimation } from "./PokeballCaptureAnimation";
import { Button } from "../../../components/ui/Button";
import { MegaButton } from "../components/MegaButton";
import {
  applyMegaEvolution,
  revertMegaEvolution,
  resetMegaStateAfterBattle,
} from "../../../engine/mega.engine";
import type { MegaEvolution } from "../../../lib/mega.service";
import { generateUid } from "../../../utils/random";

export interface BattleViewProps {
  onMoveClick?: (moveId: number) => void;
}

const ENEMY_SPRITE_POSITION: Record<string, string> = {
  "grass-route": "translate-y-[60px] -translate-x-[20px]",
  "cave-dirt": "translate-y-[55px] -translate-x-[15px]",
  "water-surf": "translate-y-[65px] -translate-x-[25px]",
  "pond-water": "translate-y-[65px] -translate-x-[25px]",
  "indoor-gray": "translate-y-[50px] -translate-x-[20px]",
  "indoor-blue": "translate-y-[50px] -translate-x-[20px]",
  "sand-route": "translate-y-[60px] -translate-x-[20px]",
  "tower-psychic": "translate-y-[50px] -translate-x-[20px]",
  "forest-green": "translate-y-[60px] -translate-x-[20px]",
  underwater: "translate-y-[70px] -translate-x-[30px]",
};

export function BattleView({ onMoveClick }: BattleViewProps) {
  const { run, setRun, training, setTraining } = useGame();

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

  const onResolveAnimation = useCallback(() => {
    if (isTraining) {
      setTraining((prev: any) => {
        // Guard uses fresh state from functional updater — never stale
        if (prev.currentBattle?.turnState !== "animating") return prev;
        return {
          ...prev,
          currentBattle: {
            ...prev.currentBattle,
            turnState: "apply_damage",
          },
        };
      });
    } else {
      setRun((prev: any) => {
        // Guard uses fresh state from functional updater — never stale
        if (prev.currentBattle?.turnState !== "animating") return prev;
        return {
          ...prev,
          currentBattle: {
            ...prev.currentBattle,
            turnState: "apply_damage",
          },
        };
      });
    }
  }, [isTraining, setTraining, setRun]);

  const { animState, playerRef, enemyRef } = useBattleAnimation(
    battle,
    onResolveAnimation,
  );

  const handleMegaEvolve = useCallback(
    async (mega: MegaEvolution) => {
      if (!battle || isTraining) return;
      try {
        const { updatedPokemon, megaState, logMessage } =
          await applyMegaEvolution(battle.playerPokemon, mega, run.megaState);
        setRun((prev) => {
          if (!prev.currentBattle) return prev;
          return {
            ...prev,
            megaState,
            team: prev.team.map((p) =>
              p.uid === updatedPokemon.uid ? updatedPokemon : p,
            ),
            currentBattle: {
              ...prev.currentBattle,
              playerPokemon: updatedPokemon,
              usedManualTurn: true,
            },
            battleLog: [
              ...prev.battleLog,
              {
                id: generateUid(),
                text: logMessage,
                type: "evolution" as const,
              },
            ].slice(-40),
          };
        });
      } catch (err) {
        console.error("[BattleView] Mega evolution failed:", err);
      }
    },
    [battle, isTraining, run.megaState, setRun],
  );

  // --- Pokeball capture animation state ---
  const [captureAnim, setCaptureAnim] = useState<{
    active: boolean;
    captured: boolean | null;
  }>({ active: false, captured: null });
  const [enemyHidden, setEnemyHidden] = useState(false);
  const [showGameOverOptions, setShowGameOverOptions] = useState(false);

  // Sync capture animation state from battle.pendingCaptureAnim
  useEffect(() => {
    if (battle?.phase === "defeat" || battle?.phase === "victory") {
      const battleForRevert = battle;
      if (run.megaState.isMega && battleForRevert) {
        const reverted = revertMegaEvolution(
          battleForRevert.playerPokemon,
          run.megaState,
        );
        setRun((prev) => ({
          ...prev,
          megaState: resetMegaStateAfterBattle(),
          team: prev.team.map((p) => (p.uid === reverted.uid ? reverted : p)),
          currentBattle: prev.currentBattle
            ? { ...prev.currentBattle, playerPokemon: reverted }
            : null,
        }));
      }
      if (battle?.phase === "defeat") {
        const timer = setTimeout(() => setShowGameOverOptions(true), 2500);
        return () => clearTimeout(timer);
      }
    } else {
      setShowGameOverOptions(false);
    }
  }, [battle?.phase]);
  useEffect(() => {
    const pca = battle?.pendingCaptureAnim;
    if (!pca) {
      setCaptureAnim({ active: false, captured: null });
      setEnemyHidden(false);
      return;
    }
    if (pca.captured === null) {
      // Throw started — show animation, result pending
      setCaptureAnim({ active: true, captured: null });
    } else {
      // Result arrived — update captured flag
      setCaptureAnim((prev) => ({ ...prev, captured: pca.captured }));
    }
  }, [battle?.pendingCaptureAnim]);

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

  // Effect Animation Logic
  const pendingAnim = battle?.pendingAnimation;

  const showEffectOnEnemy = pendingAnim?.target === "e";
  const showEffectOnPlayer = pendingAnim?.target === "p";

  const mechanicConfig: Record<
    string,
    { label: string; icon: string; color: string }
  > = {
    terreno_duro: {
      label: "TERRENO DURO",
      icon: "🪨",
      color: "text-amber-500",
    },
    lluvia_constante: {
      label: "LLUVIA CONSTANTE",
      icon: "🌧️",
      color: "text-blue-300",
    },
    campo_electrificado: {
      label: "CAMPO ELECTRIFICADO",
      icon: "⚡",
      color: "text-yellow-400",
    },
    esporas_aire: {
      label: "ESPORAS EN EL AIRE",
      icon: "🍄",
      color: "text-emerald-400",
    },
    niebla_toxica: {
      label: "NIEBLA TÓXICA",
      icon: "☠️",
      color: "text-purple-400",
    },
    inversion_stats: {
      label: "ESPACIO RARO",
      icon: "🌀",
      color: "text-fuchsia-400",
    },
    suelo_ardiente: {
      label: "SUELO ARDIENTE",
      icon: "🔥",
      color: "text-orange-500",
    },
    gravedad_aumentada: {
      label: "GRAVEDAD AUMENTADA",
      icon: "🌍",
      color: "text-stone-300",
    },
  };

  return (
    <div
      className={clsx(
        "flex-1 flex flex-col bg-surface-dark crt-screen relative overflow-hidden border-2 border-border border-b-0 min-h-[300px] z-0",
        animState.isScreenShaking && "anim-screen-shake",
      )}
    >
      {/* Background Sprite Sheet */}
      <BattleBackground backgroundId={bgId} className="absolute inset-0 z-0" />

      {/* Active Mechanic Banner */}
      {battle?.activeMechanic && mechanicConfig[battle.activeMechanic] && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/80 border-t border-b border-border px-4 py-1.5 shadow-pixel backdrop-blur-sm">
          <span className="text-base animate-pulse">
            {mechanicConfig[battle.activeMechanic].icon}
          </span>
          <span
            className={`font-display text-[0.65rem] ${mechanicConfig[battle.activeMechanic].color} tracking-widest leading-none drop-shadow-md`}
          >
            {mechanicConfig[battle.activeMechanic].label}
          </span>
        </div>
      )}

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
                  showText={true}
                  barColor={
                    battle.isBossBattle && battle.bossCurrentBar === 1
                      ? "bg-orange-500"
                      : undefined
                  }
                />
              </div>
            </div>

            {/* Sprite Container */}
            <div
              className={clsx(
                "w-40 h-40 sm:w-56 sm:h-56 flex items-end justify-center relative mt-2 shrink-0 transition-transform",
                ENEMY_SPRITE_POSITION[bgId] ||
                  "translate-y-[60px] -translate-x-[20px]",
                battle?.turnCount === 0 && "animate-slide-in-enemy",
              )}
            >
              <div
                ref={enemyRef}
                className={clsx(
                  "w-full h-full flex items-end justify-center",
                  animState.isEnemyAttacking && "anim-lunge-left",
                  animState.isEnemyDefending && "anim-shake",
                  animState.isEnemyFainting && "anim-faint-drop",
                )}
              >
                <div className="absolute bottom-2 w-32 sm:w-48 h-10 rounded-[100%] bg-black/50 blur-xs -z-10"></div>
                <PixelSprite
                  pokemonId={enemyPokemon.pokemonId}
                  variant="front"
                  shiny={enemyPokemon.isShiny}
                  size={160}
                  showScanlines={false}
                  alt={enemyPokemon.name}
                  className={clsx(
                    "w-32 h-32 sm:w-48 sm:h-48 drop-shadow-lg",
                    enemyPokemon.currentHP === 0 &&
                      "opacity-0 translate-y-8 transition-all duration-500",
                    enemyHidden && "opacity-0 transition-opacity duration-300",
                  )}
                />
                {/* Pokeball capture animation */}
                <PokeballCaptureAnimation
                  isActive={captureAnim.active}
                  captured={captureAnim.captured}
                  ballId={battle?.pendingCaptureAnim?.ballId}
                  onHideEnemy={() => setEnemyHidden(true)}
                  onShowEnemy={() => setEnemyHidden(false)}
                  onComplete={() => {
                    setCaptureAnim({ active: false, captured: null });
                    setEnemyHidden(false);
                    setRun((prev: any) => {
                      if (!prev.currentBattle) return prev;
                      return {
                        ...prev,
                        currentBattle: {
                          ...prev.currentBattle,
                          turnState: "apply_capture",
                        },
                      };
                    });
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Player Side (Bottom Left) */}
      <div className="flex-1 relative p-4 pr-12 flex items-end justify-start z-10 mb-12 ml-4">
        {playerPokemon && (
          <div className="flex flex-col items-center relative">
            {/* Floating HP Bar Container above sprite */}
            <div className="absolute bottom-full mb-12 flex flex-col items-center gap-1 bg-surface-alt/80 p-2 border-2 border-border backdrop-blur-sm shadow-pixel z-20 w-48 sm:w-64">
              <div className="flex items-center gap-2 justify-between w-full">
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

              {/* Status Badges */}
              <div className="flex flex-wrap gap-1 w-full mt-1">
                {playerPokemon.status && (
                  <span className="text-[0.45rem] font-display text-white bg-danger px-1.5 py-0.5 shadow-sm">
                    {playerPokemon.status}
                  </span>
                )}
                {Object.entries(playerPokemon.statModifiers).map(
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

              <div className="w-full mt-1">
                <HPBar
                  currentHP={playerPokemon.currentHP}
                  maxHP={playerPokemon.maxHP}
                  showText={true}
                />
                <div className="mt-2">
                  <XPBar
                    currentXP={playerPokemon.xp}
                    nextLevelXP={playerPokemon.xpToNext}
                    prevLevelXP={Math.pow(playerPokemon.level, 3)}
                  />
                </div>
              </div>
            </div>

            {/* Sprite Container */}
            <div className="w-48 h-48 sm:w-64 sm:h-64 flex items-end justify-center relative mb-2 shrink-0">
              <div
                ref={playerRef}
                className={clsx(
                  "w-full h-full flex items-end justify-center transition-transform",
                  animState.isPlayerAttacking && "anim-lunge-right",
                  animState.isPlayerDefending && "anim-shake",
                  animState.isPlayerFainting && "anim-faint-drop",
                )}
              >
                <div className="absolute bottom-6 w-40 sm:w-56 h-12 rounded-[100%] bg-black/50 blur-[4px] -z-10"></div>
                {run.isManualBattle && battle?.phase === "active" && (
                  <div className="absolute bottom-full mb-2 right-0 z-30">
                    <MegaButton
                      activePokemonId={battle.playerPokemon.pokemonId}
                      playerItems={run.items}
                      hasMegaBracelet={run.hasMegaBracelet}
                      usedThisBattle={run.megaState.usedThisBattle}
                      isPlayerTurn={
                        battle.turnState === "idle" && !battle.usedManualTurn
                      }
                      onMegaEvolve={handleMegaEvolve}
                    />
                  </div>
                )}
                <PixelSprite
                  pokemonId={playerPokemon.pokemonId}
                  variant="back"
                  shiny={playerPokemon.isShiny}
                  size={192}
                  showScanlines={false}
                  alt={playerPokemon.name}
                  className={clsx(
                    "w-40 h-40 sm:w-56 sm:h-56 drop-shadow-xl",
                    playerPokemon.currentHP === 0 &&
                      "opacity-0 translate-y-8 transition-all duration-500",
                  )}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Searching Overlay */}
      {!battle &&
        run.isActive &&
        !isTraining &&
        !run.isManualBattle &&
        !run.pendingLootSelection && (
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
              <div className="mt-1 text-center font-body text-[0.55rem] text-white tracking-widest uppercase opacity-80">
                Progreso de exploración: {run.currentZoneProgress}%
              </div>
            </div>
          </div>
        )}

      {/* Encounter Info Bar */}
      <div className="absolute bottom-0 inset-x-0 bg-surface border-t-2 border-border px-3 py-1 flex justify-between items-center z-20">
        <span className="font-body italic text-[0.6rem] text-white">
          {!battle && run.isActive && !isTraining
            ? run.pendingLootSelection
              ? "Seleccionando botín..."
              : "Explorando la zona..."
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
              setRun((prev: any) => {
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

      {/* Game Over Overlay */}
      {battle?.phase === "defeat" && (
        <div className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-1000">
          <div className="bg-danger/20 border-y-4 border-danger w-full py-8 mb-12 flex flex-col items-center">
            <h2 className="font-display text-3xl text-danger drop-shadow-[0_0_15px_rgba(255,0,0,0.5)] animate-pulse tracking-[0.3em]">
              GAME OVER
            </h2>
            <p className="font-body text-white text-xs mt-2 uppercase tracking-widest opacity-80">
              Tu equipo no puede continuar
            </p>
          </div>

          <div
            className={clsx(
              "flex flex-col gap-4 w-full max-w-xs transition-all duration-700",
              showGameOverOptions
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-12",
            )}
          >
            <Button
              onClick={() =>
                setRun((prev) => ({
                  ...prev,
                  isActive: false,
                  team: [],
                  currentBattle: null,
                }))
              }
              variant="primary"
              size="lg"
              className="w-full border-2 border-white shadow-[4px_4px_0_white]"
            >
              VOLVER AL INICIO
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="secondary"
              size="lg"
              className="w-full text-danger border-2 border-danger opacity-80 hover:opacity-100"
            >
              REINICIAR RUN
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
