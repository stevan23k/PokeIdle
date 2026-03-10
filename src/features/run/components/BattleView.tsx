import React, { useCallback, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
import { GymLeaderDialog } from "./GymLeaderDialog";
import { GymConditionModal } from "./GymConditionModal";
import { getGymsForRegion } from "../../../lib/regions.service";
import type { GymDefinition } from "../../../lib/regions";
import { getLeaderSpriteUrl } from "../../../lib/gymLeaders";

export interface BattleViewProps {
  onMoveClick?: (moveId: number) => void;
}

const ENEMY_SPRITE_POSITION: Record<string, string> = {
  "grass-route": "-translate-y-[20px] -translate-x-[60px]",
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

const PLAYER_SPRITE_POSITION: Record<string, string> = {
  "grass-route": "-translate-y-[60px] translate-x-[40px]",
  "cave-dirt": "translate-y-0 translate-x-0",
  "water-surf": "translate-y-0 translate-x-0",
  "pond-water": "translate-y-0 translate-x-0",
  "indoor-gray": "translate-y-0 translate-x-0",
  "indoor-blue": "translate-y-0 translate-x-0",
  "sand-route": "translate-y-0 translate-x-0",
  "tower-psychic": "translate-y-0 translate-x-0",
  "forest-green": "translate-y-0 translate-x-0",
  underwater: "translate-y-0 translate-x-0",
};

export function BattleView({ onMoveClick }: BattleViewProps) {
  const { run, setRun, training, setTraining } = useGame();
  const [gymDialogState, setGymDialogState] = useState<{
    lines: string[];
    variant: "intro" | "victory" | "defeat";
    leaderName: string;
    leaderPokemonId: number;
  } | null>(null);

  const [showConditionModal, setShowConditionModal] = useState(false);
  const [currentGym, setCurrentGym] = useState<GymDefinition | null>(null);
  const [pendingLeaderName, setPendingLeaderName] = useState<string | null>(
    null,
  );

  const [showLeaderSprite, setShowLeaderSprite] = useState(false);
  const [leaderSpriteOut, setLeaderSpriteOut] = useState(false);
  const [showEnemyHP, setShowEnemyHP] = useState(true);

  const [showBadgeModal, setShowBadgeModal] = useState<{
    badgeName: string;
    gymType: string;
    leaderName: string;
  } | null>(null);

  // Refs for dialogue tracking
  const gymIntroDialogShownRef = useRef(false);
  const gymVictoryDialogShownRef = useRef(false);
  const dialogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            pendingMegaEvolution: {
              pokemonUid: updatedPokemon.uid,
              fromId: prev.currentBattle.playerPokemon.pokemonId,
              fromName: prev.currentBattle.playerPokemon.name,
              toId: mega.mega_pokemon_id,
              toName: mega.mega_name,
              megaName:
                logMessage.split("¡")[1]?.split(" ha")[0] ?? mega.mega_name,
            },
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
    if (!battle) {
      gymIntroDialogShownRef.current = false;
      gymVictoryDialogShownRef.current = false;
      setCurrentGym(null);
      setPendingLeaderName(null);
      setGymDialogState(null);
      setShowConditionModal(false);
      // NO resetear showLeaderSprite aquí — lo maneja handleDialogFinish
      setShowEnemyHP(true);
      setRun((prev: any) => ({
        ...prev,
        pendingGymDialogue: false,
        pendingGymCondition: false,
        pendingGymIntro: false,
      }));
    }
  }, [!!battle]);

  // --- Gym Introduction Logic ---
  useEffect(() => {
    // console.log("[GymIntro] Effect disparado:", {
    //   pendingGymIntro: run.pendingGymIntro,
    //   battleType: battle?.type,
    //   hasBattle: !!battle,
    //   gymTeamLength: battle?.gymTeam?.length,
    //   gymIntroShown: gymIntroDialogShownRef.current,
    //   currentRegion: run.currentRegion,
    // });

    if (
      run.pendingGymIntro &&
      battle?.type === "gym" &&
      !gymIntroDialogShownRef.current
    ) {
      // console.log("[GymIntro] ✅ Condición cumplida, iniciando intro...");
      gymIntroDialogShownRef.current = true;
      gymVictoryDialogShownRef.current = false; // reset para nueva batalla

      // Intentar obtener nombre del líder desde battle.enemyTrainer inmediatamente
      if (battle?.enemyTrainer?.name) {
        setPendingLeaderName(battle.enemyTrainer.name);
      }

      // SET IMMEDIATELY (Visuals)
      setShowLeaderSprite(true);
      setLeaderSpriteOut(false);
      setShowEnemyHP(false);

      // console.log("[GymIntro] Setters llamados:", {
      //   showLeaderSprite: true,
      //   pendingLeaderName: battle?.enemyTrainer?.name ?? "(pendiente fetch)",
      // });

      // Limpiar el flag del engine inmediatamente y activar guard de diálogo
      setRun((prev: any) => ({
        ...prev,
        pendingGymIntro: false,
        pendingGymDialogue: true,
      }));

      // Timers for sequence
      const hpTimer = setTimeout(() => setShowEnemyHP(true), 1500);
      const startTime = Date.now();

      getGymsForRegion(run.currentRegion).then((gyms) => {
        // console.log(
        //   "[GymIntro] Gyms cargados:",
        //   gyms.length,
        //   "gymTeam[0]:",
        //   battle?.gymTeam?.[0]?.pokemonId,
        // );
        if (!battle?.gymTeam?.length) {
          // console.log("[GymIntro] ❌ gymTeam vacío, abortando");
          setRun((prev: any) => ({
            ...prev,
            pendingGymDialogue: false,
            pendingGymIntro: false,
          }));
          return;
        }
        const gym = gyms.find((g) => {
          return battle.gymTeam![0].pokemonId === g.pokemon?.[0]?.pokemonId;
        });
        // console.log(
        //   "[GymIntro] Gym encontrado:",
        //   gym?.leaderName ?? "NO ENCONTRADO",
        // );
        // console.log("[GymIntro] Gym data:", {
        //   hasDialogIntro: !!gym?.dialogIntro,
        //   dialogIntroLength: gym?.dialogIntro?.length,
        //   activeMechanic: battle?.activeMechanic,
        // });

        if (gym) {
          setCurrentGym(gym);
          setPendingLeaderName(gym.leaderName ?? null);
          if (gym.dialogIntro && gym.dialogIntro.length > 0) {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 500 - elapsed);
            dialogTimerRef.current = setTimeout(() => {
              // console.log("[GymIntro] dialogTimer ejecutando!");
              setGymDialogState({
                lines: gym.dialogIntro as string[],
                variant: "intro",
                leaderName: gym.leaderName ?? "Líder",
                leaderPokemonId: battle.enemyPokemon.pokemonId,
              });
            }, remaining);
          } else {
            // No hay diálogo, mostrar condición o desbloquear
            setShowEnemyHP(true);
            if (battle?.activeMechanic) {
              setRun((prev: any) => ({ ...prev, pendingGymCondition: true }));
              setShowConditionModal(true);
            } else {
              setRun((prev: any) => ({ ...prev, pendingGymDialogue: false }));
            }
          }
        } else {
          setShowEnemyHP(true);
          setRun((prev: any) => ({ ...prev, pendingGymDialogue: false }));
        }
      });

      return () => {
        clearTimeout(hpTimer);
        // NO cancelar dialogTimerRef — debe sobrevivir el cleanup de StrictMode
      };
    } else if (run.pendingGymIntro) {
      // console.log(
      //   "[GymIntro] ⚠️ pendingGymIntro=true pero condición no cumplida:",
      //   {
      //     battleType: battle?.type,
      //     gymIntroShown: gymIntroDialogShownRef.current,
      //   },
      // );
    }
  }, [
    run.pendingGymIntro,
    battle?.type,
    !!battle,
    battle?.gymTeam,
    run.currentRegion,
  ]);

  // --- Gym Victory/Defeat Callbacks ---
  useEffect(() => {
    if (!currentGym || battle?.type !== "gym") return;

    const isLastGymPokemon =
      battle.bossCurrentBar === battle.bossMaxBars &&
      enemyPokemon?.currentHP === 0;

    // Victoria
    if (
      battle.phase === "victory" &&
      isLastGymPokemon &&
      !gymVictoryDialogShownRef.current
    ) {
      gymVictoryDialogShownRef.current = true;
      if (currentGym.dialogDefeat && currentGym.dialogDefeat.length > 0) {
        setRun((prev: any) => ({ ...prev, pendingGymDialogue: true }));
        setShowLeaderSprite(true);
        setLeaderSpriteOut(false);
        setGymDialogState({
          lines: currentGym.dialogDefeat,
          variant: "defeat",
          leaderName: currentGym.leaderName ?? "Líder",
          leaderPokemonId: battle.enemyPokemon.pokemonId,
        });
      }
    }

    // Derrota
    if (battle.phase === "defeat") {
      if (currentGym.dialogVictory && currentGym.dialogVictory.length > 0) {
        setRun((prev: any) => ({ ...prev, pendingGymDialogue: true }));
        setShowLeaderSprite(true);
        setLeaderSpriteOut(false);
        setGymDialogState({
          lines: currentGym.dialogVictory,
          variant: "victory",
          leaderName: currentGym.leaderName ?? "Líder",
          leaderPokemonId: battle.enemyPokemon.pokemonId,
        });
      }
    }
  }, [
    battle?.phase,
    battle?.bossCurrentBar,
    enemyPokemon?.currentHP,
    currentGym,
  ]);

  const handleDialogFinish = () => {
    const variant = gymDialogState?.variant;
    setGymDialogState(null);

    if (variant === "intro") {
      setLeaderSpriteOut(true);
      setTimeout(() => setShowLeaderSprite(false), 500);
      setRun((prev: any) => ({
        ...prev,
        pendingGymDialogue: false,
      }));

      // Mostrar condición del gym si hay mecánica
      if (battle?.activeMechanic) {
        setRun((prev: any) => ({ ...prev, pendingGymCondition: true }));
        setShowConditionModal(true);
      }
    }

    if (variant === "defeat") {
      setRun((prev: any) => ({ ...prev, pendingGymDialogue: false }));

      // Mostrar modal de medalla
      if (currentGym) {
        setShowBadgeModal({
          badgeName: currentGym.badgeName ?? "Medalla",
          gymType: currentGym.type ?? "normal",
          leaderName: currentGym.leaderName ?? "Líder",
        });
      }
    }

    if (variant === "victory") {
      setRun((prev: any) => ({ ...prev, pendingGymDialogue: false }));
    }

    if (variant === "defeat" || variant === "victory") {
      setLeaderSpriteOut(true);
      setTimeout(() => setShowLeaderSprite(false), 500);
    }
  };

  const handleConditionClose = () => {
    setShowConditionModal(false);
    setRun((prev: any) => {
      const next: any = { ...prev, pendingGymCondition: false };
      if (next.currentBattle) {
        next.currentBattle = { ...next.currentBattle, phase: "active" };
      }
      return next;
    });
  };
  useEffect(() => {
    const pca = battle?.pendingCaptureAnim;
    if (!pca) {
      setCaptureAnim({ active: false, captured: null });
      setEnemyHidden(false);
      return;
    }
    if (pca.captured === null) {
      // Flujo manual: throw iniciado, resultado pendiente
      setCaptureAnim({ active: true, captured: null });
    } else {
      // Auto-captura o resultado directo: activar animación con resultado ya conocido
      setCaptureAnim({ active: true, captured: pca.captured });
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
        "flex-1 flex flex-col bg-surface-dark crt-screen relative overflow-hidden border-2 border-border border-b-0 min-h-[300px] z-0 battle-view-container",
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
        {/* Sprite del líder — FUERA del bloque condicional del enemigo */}
        {showLeaderSprite &&
          (battle?.enemyTrainer?.name ||
            currentGym?.leaderName ||
            pendingLeaderName) && (
            <div
              className={clsx(
                "w-40 h-40 sm:w-56 sm:h-56 flex items-end justify-center absolute",
                ENEMY_SPRITE_POSITION[bgId] ||
                  "translate-y-[60px] -translate-x-[20px]",
              )}
            >
              <img
                src={getLeaderSpriteUrl(
                  battle?.enemyTrainer?.name ||
                    currentGym?.leaderName ||
                    pendingLeaderName ||
                    "",
                )}
                alt={
                  battle?.enemyTrainer?.name ||
                  currentGym?.leaderName ||
                  pendingLeaderName ||
                  ""
                }
                className={clsx(
                  "w-32 h-32 sm:w-48 sm:h-48 object-contain transition-all duration-500",
                  !leaderSpriteOut && "animate-gym-leader-intro",
                  leaderSpriteOut
                    ? "opacity-0 translate-x-16"
                    : "opacity-100 translate-x-0",
                )}
                style={{ imageRendering: "pixelated" }}
                onLoad={() => {
                  if (!battle?.enemyReady) {
                    setRun((prev: any) => {
                      if (!prev.currentBattle) return prev;
                      return {
                        ...prev,
                        currentBattle: {
                          ...prev.currentBattle,
                          enemyReady: true,
                        },
                      };
                    });
                  }
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  if (!battle?.enemyReady) {
                    setRun((prev: any) => {
                      if (!prev.currentBattle) return prev;
                      return {
                        ...prev,
                        currentBattle: {
                          ...prev.currentBattle,
                          enemyReady: true,
                        },
                      };
                    });
                  }
                }}
              />
            </div>
          )}

        {/* Pokémon enemigo — solo cuando NO hay sprite del líder activo */}
        {enemyPokemon && (!showLeaderSprite || showEnemyHP) && (
          <div className="flex flex-col items-center relative">
            {/* Floating HP Bar Container above sprite */}
            <div className="flex flex-col items-center gap-1 mb-2 bg-surface-alt/80 p-2 border-2 border-border backdrop-blur-sm shadow-pixel z-20">
              {battle.enemyTrainer && (
                <div className="text-white font-display text-[0.55rem] tracking-widest bg-brand border border-border px-2 py-0.5 mb-1 opacity-90 shadow-sm w-full text-center">
                  {battle.enemyTrainer.name}
                </div>
              )}
              <div className="flex items-center gap-2 justify-between w-full">
                <span className="font-display text-xs truncate max-w-[140px] drop-shadow-sm text-foreground">
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

              {/* Status Badges */}
              <div className="flex flex-wrap gap-1 w-full mt-1">
                {enemyPokemon.status && (
                  <span className="text-[0.45rem] font-display text-white bg-danger px-1 py-0.5 shadow-sm">
                    {enemyPokemon.status}
                  </span>
                )}
              </div>

              <div className="w-48 sm:w-56 mt-1 space-y-1">
                {/* Multi-bar Boss HP */}
                {battle.isBossBattle && (
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[0.45rem] text-brand-light font-display">
                      POKÉMON {battle.bossCurrentBar}/{battle.bossMaxBars}
                    </span>
                  </div>
                )}
                <HPBar
                  currentHP={enemyPokemon.currentHP}
                  maxHP={enemyPokemon.maxHP}
                  showText={true}
                  statModifiers={enemyPokemon.statModifiers}
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
                battle?.turnCount === 0 &&
                  !showLeaderSprite &&
                  "animate-slide-in-enemy",
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
                  onLoad={() => {
                    if (!battle?.enemyReady) {
                      setRun((prev: any) => {
                        if (!prev.currentBattle) return prev;
                        return {
                          ...prev,
                          currentBattle: {
                            ...prev.currentBattle,
                            enemyReady: true,
                          },
                        };
                      });
                    }
                  }}
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
                <span className="font-display text-xs truncate max-w-[140px] drop-shadow-sm text-foreground">
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
              </div>

              <div className="w-full mt-1">
                <HPBar
                  currentHP={playerPokemon.currentHP}
                  maxHP={playerPokemon.maxHP}
                  showText={true}
                  statModifiers={playerPokemon.statModifiers}
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
                  PLAYER_SPRITE_POSITION[bgId] || "translate-y-0 translate-x-0",
                )}
              >
                <div className="absolute bottom-6 w-40 sm:w-56 h-12 rounded-[100%] bg-black/50 blur-xs -z-10"></div>
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
              <div className="mt-1 text-center font-body text-[0.55rem] text-foreground tracking-widest uppercase opacity-80">
                Progreso de exploración: {run.currentZoneProgress}%
              </div>
            </div>
          </div>
        )}

      {/* Encounter Info Bar */}
      <div className="absolute bottom-0 inset-x-0 bg-surface border-t-2 border-border px-3 py-1 flex justify-between items-center z-20">
        <span className="font-body italic text-[0.6rem] text-foreground">
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
        <div className="absolute inset-0 z-110 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-1000">
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

      {/* Gym Leader Dialog */}
      {gymDialogState && (
        <GymLeaderDialog
          leaderName={gymDialogState.leaderName}
          leaderPokemonId={gymDialogState.leaderPokemonId}
          lines={gymDialogState.lines}
          variant={gymDialogState.variant}
          onFinish={handleDialogFinish}
        />
      )}

      {/* Gym Condition Modal */}
      {showConditionModal && battle?.activeMechanic && (
        <GymConditionModal
          mechanic={battle.activeMechanic}
          onClose={handleConditionClose}
        />
      )}

      {/* Badge Modal */}
      {showBadgeModal && (
        <BadgeModal
          badgeName={showBadgeModal.badgeName}
          gymType={showBadgeModal.gymType}
          leaderName={showBadgeModal.leaderName}
          onClose={() => setShowBadgeModal(null)}
        />
      )}
    </div>
  );
}

function BadgeModal({
  badgeName,
  gymType,
  leaderName,
  onClose,
}: {
  badgeName: string;
  gymType: string;
  leaderName: string;
  onClose: () => void;
}) {
  const TYPE_COLORS: Record<string, string> = {
    rock: "#B8A038",
    water: "#6890F0",
    electric: "#F8D030",
    grass: "#78C850",
    poison: "#A040A0",
    psychic: "#F85888",
    fire: "#F08030",
    ground: "#E0C068",
    normal: "#A8A878",
  };
  const color = TYPE_COLORS[gymType] ?? "#A8A878";

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.key === "z" ||
        e.key === "Z" ||
        e.key === "Enter" ||
        e.key === " "
      ) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/85 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="bg-surface-dark border-4 w-full max-w-sm mx-4 flex flex-col items-center overflow-hidden animate-in zoom-in duration-300"
        style={{ borderColor: color }}
      >
        {/* Header */}
        <div
          className="w-full py-3 px-6 flex items-center justify-center"
          style={{ backgroundColor: color + "22" }}
        >
          <span
            className="font-display text-[0.5rem] tracking-[0.3em] uppercase"
            style={{ color }}
          >
            ¡MEDALLA OBTENIDA!
          </span>
        </div>

        {/* Badge icon */}
        <div className="py-8 flex flex-col items-center gap-4">
          <div
            className="w-20 h-20 rounded-full border-4 flex items-center justify-center animate-pulse"
            style={{
              borderColor: color,
              backgroundColor: color + "33",
              boxShadow: `0 0 30px ${color}66`,
            }}
          >
            <span className="text-4xl">🏅</span>
          </div>
          <div className="text-center px-6">
            <h2
              className="font-display text-lg tracking-widest uppercase mb-1"
              style={{ color }}
            >
              {badgeName}
            </h2>
            <p className="font-body text-[0.6rem] text-muted">
              Obtenida de {leaderName}
            </p>
          </div>
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="w-full py-4 border-t-4 font-display text-[0.6rem] tracking-[0.2em] uppercase transition-all hover:opacity-80"
          style={{ borderColor: color, color, backgroundColor: color + "11" }}
        >
          Z / CLICK — CONTINUAR
        </button>
      </div>
    </div>,
    document.body,
  );
}
