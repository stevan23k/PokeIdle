import { useRef, useState, useEffect } from "react";
import { useGame } from "../../../context/GameContext";
import { useGameLoop } from "./useGameLoop";
import {
  calculateDamage,
  chooseBestMove,
  applyDamage,
  determineAttackOrder,
  getAccuracyMultiplier,
} from "../../../engine/combat.engine";
import { calculateCaptureChance } from "../../../engine/capture.engine";
import {
  calculateXPGain,
  distributeTeamXP,
  levelUpPokemon,
  xpToNextLevel,
} from "../../../engine/xp.engine";
import {
  optimizeTeam,
  getNextActivePokemon,
} from "../../../engine/team.engine";
import { selectEnemyMove } from "../../../engine/ai.engine";
import { getWildEncounter, rollZoneItem } from "../../../engine/region.engine";
import {
  getBestAvailableHealingItem,
  useItemOnPokemon,
} from "../../../engine/items.engine";
import {
  getZonesForRegion,
  getGymsForRegion,
  getEliteFourForRegion,
} from "../../../lib/regions.service";
import type {
  Zone,
  GymDefinition,
  EliteFourDefinition,
} from "../../../lib/regions";
import {
  getPokemonData,
  learnMovesOnLevelUp,
  getPokemonSpecies,
  getEvolutionChain,
  fetchEggMoves,
  COMMON_SELF_BOOSTS,
} from "../services/pokeapi.service";
import { ITEMS, generateLootOptions } from "../../../lib/items";
import { generateUid } from "../../../utils/random";
import type { ActiveMove, PokemonStats } from "../types/game.types";
import {
  calculateTeamBST,
  getBossMultiplier,
  scaleGymPokemon,
} from "../../../engine/boss.engine";
import { calculateMoneyGain } from "../../../engine/economy.engine";
import {
  handleStanceChange,
  applyOnEntryAbility,
  applyOnTurnAbility,
  applyAbilityDamageModifier,
} from "../../../engine/abilities.engine";
import {
  applyMegaEvolution,
  revertMegaEvolution,
  resetMegaStateAfterBattle,
} from "../../../engine/mega.engine";
import { canMegaEvolveSync } from "../../../lib/mega.service";

export function useEngineTick() {
  // console.log("[useEngineTick] Hook active");
  const { run, setRun, training, setTraining, setMeta, notify } = useGame();

  // Protective refs to always have the freshest data in async callbacks
  const teamRef = useRef(run.team);
  const trainingRef = useRef(training);

  useEffect(() => {
    teamRef.current = run.team;
  }, [run.team]);
  useEffect(() => {
    trainingRef.current = training;
  }, [training]);
  const fetchingRef = useRef(false);
  const turnStateRef = useRef<string>("idle");
  const processedAnimRef = useRef<string | null>(null);
  const processedStateRef = useRef<string | null>(null);

  const [regionZones, setRegionZones] = useState<Zone[]>([]);
  const [regionGyms, setRegionGyms] = useState<GymDefinition[]>([]);
  const [regionEliteFour, setRegionEliteFour] =
    useState<EliteFourDefinition | null>(null);

  // Keep turnStateRef in sync with battle state
  useEffect(() => {
    if (run.currentBattle?.turnState) {
      turnStateRef.current = run.currentBattle.turnState;
    }
  }, [run.currentBattle?.turnState]);

  // Load region data
  useEffect(() => {
    let active = true;
    fetchingRef.current = true;

    Promise.all([
      getZonesForRegion(run.currentRegion),
      getGymsForRegion(run.currentRegion),
      getEliteFourForRegion(run.currentRegion),
    ])
      .then(([zones, gyms, e4]) => {
        if (!active) return;
        setRegionZones(zones);
        setRegionGyms(gyms);
        setRegionEliteFour(e4);
        fetchingRef.current = false;
      })
      .catch((err) => {
        console.error("[useEngineTick] Failed to load region data", err);
        if (active) fetchingRef.current = false;
      });

    return () => {
      active = false;
    };
  }, [run.currentRegion]);

  const tick = async () => {
    if (
      !run.isActive ||
      fetchingRef.current ||
      run.isPaused ||
      run.pendingLootSelection ||
      run.pendingMoveLearn ||
      run.pendingEvolution ||
      run.pendingZoneTransition ||
      (run as any).pendingGymCondition
    ) {
      return;
    }

    const currentZone = regionZones[run.currentZoneIndex];
    if (regionZones.length === 0 || (!currentZone && !run.eliteFourProgress)) {
      // Zones not loaded yet, wait
      return;
    }
    if (currentZone?.isGym && regionGyms.length === 0) {
      // Gyms not loaded yet, wait
      return;
    }

    if (run.team.length > 0 && run.team.every((p) => p.currentHP === 0)) {
      if (run.currentBattle) {
        setRun((p) => {
          console.log("[useEngineTick] Clearing battle due to defeat");
          return {
            ...p,
            currentBattle: null,
            battleLog: [
              ...p.battleLog,
              {
                id: generateUid(),
                text: "Todo el equipo ha sido derrotado...",
                type: "danger" as any,
              },
            ].slice(-40),
          };
        });
        setMeta((m) => ({
          ...m,
          totalRuns: m.totalRuns + 1,
          runHistory: [
            {
              runId: run.runId,
              startedAt: run.startedAt,
              endedAt: Date.now(),
              starterId: run.starterId,
              badges: run.gymsBadges.length,
              zoneReached:
                regionZones[run.currentZoneIndex]?.name || "Desconocido",
              totalCaptured: run.totalCaptured,
              totalBattlesWon: run.totalBattlesWon,
              totalFainted: run.totalFainted,
              moneyEarned: run.money,
              maxLevel: Math.max(...run.team.map((p) => p.level), 0),
              duration: Date.now() - run.startedAt,
              reasonEnded: "defeat",
              inheritanceProgress: run.inheritanceProgress,
            },
            ...m.runHistory,
          ],
          highestLevelReached: Math.max(
            m.highestLevelReached,
            ...run.team.map((p) => p.level),
          ),
          totalTimePlayed: m.totalTimePlayed + (Date.now() - run.startedAt),
          maxWinStreakEver: Math.max(m.maxWinStreakEver, run.maxWinStreak),
        }));
      }
      return;
    }

    if (run.eliteFourDefeated) {
      if (run.currentBattle) {
        setRun((p) => ({ ...p, currentBattle: null }));
        setMeta((m) => {
          const newBadges = 8;
          const isBest = !m.bestRun || newBadges > m.bestRun.badges;
          return {
            ...m,
            totalRuns: m.totalRuns + 1,
            runHistory: [
              {
                runId: run.runId,
                startedAt: run.startedAt,
                endedAt: Date.now(),
                starterId: run.starterId,
                badges: newBadges,
                zoneReached: "Campeón",
                totalCaptured: run.totalCaptured,
                totalBattlesWon: run.totalBattlesWon,
                totalFainted: run.totalFainted,
                moneyEarned: run.money,
                maxLevel: Math.max(...run.team.map((p) => p.level), 0),
                duration: Date.now() - run.startedAt,
                reasonEnded: "victory",
                inheritanceProgress: run.inheritanceProgress,
              },
              ...m.runHistory,
            ],
            highestLevelReached: Math.max(
              m.highestLevelReached,
              ...run.team.map((p) => p.level),
            ),
            totalTimePlayed: m.totalTimePlayed + (Date.now() - run.startedAt),
            maxWinStreakEver: Math.max(m.maxWinStreakEver, run.maxWinStreak),
            bestRun: isBest
              ? { badges: newBadges, runId: run.runId }
              : m.bestRun,
          };
        });
      }
      return;
    }

    if (!run.currentBattle) {
      // Progress zone
      const nextProgress =
        run.currentZoneProgress +
        (run.speedMultiplier === "SKIP" || run.isManualBattle ? 100 : 10);

      if (nextProgress >= 100) {
        // Find encounter
        fetchingRef.current = true;
        try {
          // ── ELITE FOUR MODE ────────────────────────────────────────────────────
          // currentZone es undefined cuando currentZoneIndex >= regionZones.length
          // (después de derrotar a Giovanni y avanzar más allá de la última zona)
          if (!currentZone && !run.eliteFourDefeated && regionEliteFour) {
            const allMembers = [
              ...regionEliteFour.trainers,
              regionEliteFour.champion,
            ];
            const currentMember = allMembers[run.eliteFourProgress ?? 0];
            if (!currentMember) {
              fetchingRef.current = false;
              return;
            }

            const teamMaxLevel = Math.max(...run.team.map((p) => p.level), 5);
            const spawnSlot = currentMember.pokemon[0];
            const spawnLevel = Math.max(spawnSlot.level, teamMaxLevel);
            // referenceBst escala suavemente: 540 (Lorelei) → 620 (Campeón)
            const referenceBst = 540 + (run.eliteFourProgress ?? 0) * 20;

            const baseEnemy = await getPokemonData(
              spawnSlot.pokemonId,
              spawnLevel,
              false,
            );
            const teamAverageBst = calculateTeamBST(run.team);
            const multiplier = getBossMultiplier(teamAverageBst, referenceBst);
            const enemy = scaleGymPokemon(baseEnemy, multiplier, false);

            const activePlayer = getNextActivePokemon(run.team);
            if (!activePlayer) {
              fetchingRef.current = false;
              return;
            }

            const isChampion =
              run.eliteFourProgress >= regionEliteFour.trainers.length;

            setRun((prev) => {
              if (prev.currentBattle) return prev;
              return {
                ...prev,
                currentZoneProgress: 0,
                currentBattle: {
                  type: "elite",
                  phase: "active",
                  turnState: "idle",
                  playerPokemon: activePlayer!,
                  enemyPokemon: enemy,
                  turnCount: 0,
                  isBossBattle: true,
                  bossMaxBars: currentMember.pokemon.length,
                  bossCurrentBar: 1,
                  gymTeam: currentMember.pokemon,
                },
                battleLog: [
                  ...prev.battleLog,
                  {
                    id: generateUid(),
                    text: isChampion
                      ? `¡El Campeón ${currentMember.name} te desafía!`
                      : `¡${currentMember.name} del Alto Mando te desafía!`,
                    type: "badge" as any,
                  },
                ].slice(-40),
              };
            });

            // Trigger On-Entry Abilities (Elite Four) - Note: this runs AFTER setRun in a follow-up tick or here if we use a helper.
            // Actually, for simplicity, I'll add a helper call or just use a simpler method.
            // But setRun is async. Best is to handle it inside setRun or in the idle state turnCount 0.
            // Wait, turnCount 0 is a good place.
            return;
          }

          if (!currentZone) {
            fetchingRef.current = false;
            return;
          }

          const requiredBattles = currentZone.isGym
            ? (currentZone.trainerCount ?? 0)
            : currentZone.trainerCount || 3;
          // For gyms with no wild encounters, we should jump straight to the boss
          const hasEncounters = (currentZone.wildPokemon?.length ?? 0) > 0;
          const isBossTime =
            (currentZone.isGym && !hasEncounters) ||
            run.zoneBattlesWon >= requiredBattles;
          let enemy;
          let isBoss = false;
          let activeMechanic:
            | import("../types/game.types").GymMechanic
            | undefined = undefined;
          let battleType: "wild" | "gym" = "wild";
          let gymForBattle: GymDefinition | null = null;

          if (isBossTime) {
            const teamMaxLevel = Math.max(...run.team.map((p) => p.level), 5);

            // ── GYM ZONE ──────────────────────────────────────────────────────────
            if (currentZone.isGym && currentZone.gymId != null) {
              const gym =
                regionGyms.find((g) => g.id === currentZone.gymId) ?? null;

              if (gym) {
                gymForBattle = gym;
                battleType = "gym";
                activeMechanic =
                  gym.mechanic as import("../types/game.types").GymMechanic;

                // Sequential spawning starts with the first Pokémon (index 0)
                // The Ace is the last one in the team array.
                const spawnSlot = gym.pokemon[0];
                const spawnLevel = Math.max(spawnSlot.level, teamMaxLevel);

                let baseEnemy = await getPokemonData(
                  spawnSlot.pokemonId,
                  spawnLevel,
                  false,
                );

                const teamAverageBst = calculateTeamBST(run.team);
                const multiplier = getBossMultiplier(
                  teamAverageBst,
                  gym.referenceBst || 400,
                );
                enemy = scaleGymPokemon(baseEnemy, multiplier, false);
                // Don't prefix "BOSS" — it's a gym leader's Pokémon
                enemy = { ...enemy, name: enemy.name }; // keep original name
                isBoss = true;
              } else {
                // Gym data not loaded yet — skip this tick, will retry next tick
                fetchingRef.current = false;
                return;
              }
            } else {
              // ── ROUTE BOSS ────────────────────────────────────────────────────────
              const encounter = getWildEncounter(currentZone);
              if (!encounter) {
                console.warn(
                  "[useEngineTick] No encounter available for boss fallback",
                );
                fetchingRef.current = false;
                return;
              }
              let baseEnemy = await getPokemonData(
                encounter.pokemonId,
                teamMaxLevel + 1,
                false,
              );
              const teamAverageBst = calculateTeamBST(run.team);
              const multiplier = getBossMultiplier(
                teamAverageBst,
                currentZone.referenceBst || 280,
              );
              enemy = scaleGymPokemon(baseEnemy, multiplier, true);
              isBoss = true;
            }
          } else {
            // ── WILD ENCOUNTER ────────────────────────────────────────────────────
            const encounter = getWildEncounter(currentZone);
            if (!encounter) {
              console.warn(
                "[useEngineTick] No encounters allowed for zone:",
                currentZone.id,
              );
              fetchingRef.current = false;
              return;
            }
            const level =
              Math.floor(
                Math.random() * (encounter.maxLevel - encounter.minLevel + 1),
              ) + encounter.minLevel;
            const isShiny = Math.random() < 1 / 4096;
            enemy = await getPokemonData(encounter.pokemonId, level, isShiny);
          }

          let activePlayer = getNextActivePokemon(run.team);
          if (!activePlayer) return;

          setRun((prev) => {
            // Safety check: if a battle was already spawned by another tick, don't overwrite it
            if (prev.currentBattle) {
              console.log(
                "[useEngineTick] Spawn cancelled - battle already exists",
              );
              return prev;
            }

            console.log("[useEngineTick] Spawning Battle:", {
              type: battleType,
              boss: isBoss,
            });

            const nextState = {
              ...prev,
              currentZoneProgress: 0,
              currentBattle: {
                type: battleType,
                phase: (battleType === "gym" ? "intro" : "active") as "intro" | "active",
                turnState: "idle" as const,
                playerPokemon: activePlayer!,
                enemyPokemon: enemy,
                enemyTrainer:
                  battleType === "gym" && gymForBattle
                    ? {
                        name: gymForBattle.leaderName,
                        class: "Líder de Gimnasio",
                        icon: "",
                        team: [],
                        defeatCount: 0,
                      }
                    : undefined,
                turnCount: 0,
                isBossBattle: isBoss,
                activeMechanic: activeMechanic,
                bossMaxBars:
                  battleType === "gym" && gymForBattle
                    ? gymForBattle.pokemon.length
                    : 1,
                bossCurrentBar: 1,
                gymTeam:
                  battleType === "gym" && gymForBattle
                    ? gymForBattle.pokemon
                    : undefined,
              },
              battleLog: [
                ...prev.battleLog,
                {
                  id: generateUid(),
                  text:
                    battleType === "gym"
                      ? `¡El líder ${gymForBattle?.leaderName ?? "del Gimnasio"} te desafía!`
                      : isBoss
                        ? `¡EL BOSS ${enemy.name} TE DESAFÍA!`
                        : `¡Un salvaje ${enemy.name} ha aparecido!`,
                  type:
                    battleType === "gym"
                      ? "badge"
                      : isBoss
                        ? "danger"
                        : ("normal" as any),
                },
              ].slice(-40),
            };

            if (battleType === "gym") {
              (nextState as any).pendingGymIntro = true;
            }

            console.log("[Engine] Gym battle spawned:", {
              pendingGymIntro: (nextState as any).pendingGymIntro,
              gymTeamLength: nextState.currentBattle?.gymTeam?.length,
              firstPokemonId: nextState.currentBattle?.gymTeam?.[0]?.pokemonId,
              battleType: nextState.currentBattle?.type,
            });

            return nextState;
          });
        } catch (e) {
          console.error("Failed to spawn encounter", e);
        } finally {
          fetchingRef.current = false;
        }
      } else {
        setRun((prev) => ({ ...prev, currentZoneProgress: nextProgress }));
      }
      return;
    }

    // --- AUTO-ITEMS CHECK ---
    if (
      run.autoItems &&
      !run.isManualBattle &&
      run.currentBattle &&
      run.currentBattle.playerPokemon.currentHP /
        run.currentBattle.playerPokemon.maxHP <
        run.autoHealThreshold
    ) {
      const bestItem = getBestAvailableHealingItem(run.items);
      if (bestItem) {
        fetchingRef.current = true;
        try {
          const { success, newPokemon, resultLog, newInventory } =
            await useItemOnPokemon(
              run.currentBattle.playerPokemon,
              bestItem,
              run.items,
            );

          if (success) {
            setRun((prev) => {
              if (!prev.currentBattle) return prev;
              const nextBattle = {
                ...prev.currentBattle,
                playerPokemon: newPokemon,
              };
              const itemDef = ITEMS[bestItem];
              return {
                ...prev,
                items: newInventory,
                itemUsage: {
                  ...prev.itemUsage,
                  [bestItem]: (prev.itemUsage[bestItem] || 0) + 1,
                },
                team: prev.team.map((p) =>
                  p.uid === newPokemon.uid ? newPokemon : p,
                ),
                currentBattle: nextBattle,
                battleLog: [
                  ...prev.battleLog,
                  {
                    id: generateUid(),
                    text: `Usada ${itemDef.name} en ${newPokemon.name}. ${resultLog}`,
                    type: "normal" as any,
                  },
                ].slice(-40),
              };
            });
            setMeta((prev) => ({
              ...prev,
              totalItemsUsed: {
                ...prev.totalItemsUsed,
                [ITEMS[bestItem].category]:
                  (prev.totalItemsUsed[ITEMS[bestItem].category] || 0) + 1,
              },
            }));
            fetchingRef.current = false;
            return; // Skip the rest of the tick for this frame
          }
        } catch (e) {
          console.error("AutoItem failed", e);
        } finally {
          fetchingRef.current = false;
        }
      }
    }

    // --- AUTO-MEGA EXECUTION ---
    if (
      !run.isManualBattle &&
      run.megaState?.pendingAutoMega &&
      run.currentBattle &&
      !run.megaState.isMega
    ) {
      const mega = run.megaState.pendingAutoMega;
      fetchingRef.current = true;
      try {
        const { updatedPokemon, megaState, logMessage } =
          await applyMegaEvolution(
            run.currentBattle.playerPokemon,
            mega,
            run.megaState,
          );
        setRun((prev) => {
          if (!prev.currentBattle) return prev;
          return {
            ...prev,
            megaState: { ...megaState, pendingAutoMega: undefined },
            currentBattle: {
              ...prev.currentBattle,
              playerPokemon: updatedPokemon,
            },
            team: prev.team.map((p) =>
              p.uid === updatedPokemon.uid ? updatedPokemon : p,
            ),
            battleLog: [
              ...prev.battleLog,
              { id: generateUid(), text: logMessage, type: "mega" as any },
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
      } catch (e) {
        console.error("[AutoMega] Failed:", e);
        setRun((prev) => ({
          ...prev,
          megaState: { ...prev.megaState, pendingAutoMega: undefined },
        }));
      } finally {
        fetchingRef.current = false;
      }
      return;
    }

    // --- ACTIVE BATTLE ---
    // We do functional state update to ensure latest state
    setRun((state) => {
      if (!state.isActive || !state.currentBattle) return state;

      const bState = { ...state.currentBattle };

      // Bloquear turnos durante diálogo de gym intro
      if ((state as any).pendingGymIntro || (state as any).pendingGymDialogue) {
        return state;
      }

      const logs = [...state.battleLog];

      const actor = bState.turnQueue?.[0] || "";
      const stateKey = `${bState.turnState}-${bState.turnCount}-${actor}`;

      // We'll log at the end if we actually returned something new
      let shouldReturnNewState = false;

      const pushLog = (text: string, type: any = "normal") => {
        logs.push({ id: generateUid(), text, type });
      };

      let nextState = { ...state, currentBattle: bState, battleLog: logs };

      // --- SYNC TEAM HP ---
      // Ensure the team array always reflects current HP from battle state
      if (nextState.currentBattle?.playerPokemon) {
        const active = nextState.currentBattle.playerPokemon;
        nextState.team = nextState.team.map((p) =>
          p.uid === active.uid
            ? { ...p, currentHP: active.currentHP, status: active.status }
            : p,
        );
      }

      // --- DEFEAT CHECK ---
      const activePokemon = getNextActivePokemon(nextState.team);
      if (!activePokemon && nextState.currentBattle?.phase !== "defeat") {
        if (nextState.currentBattle) {
          nextState.currentBattle.phase = "defeat";
          nextState.battleLog = [
            ...nextState.battleLog,
            {
              id: Date.now().toString(),
              text: "¡Tu equipo ha sido derrotado!",
              type: "danger" as const,
            },
          ].slice(-40);
        } else {
          // If no battle is active but team is dead, ensure we are not "active"
          nextState.isActive = false;
        }
        return nextState;
      }

      if (!bState) {
        turnStateRef.current = "idle";
        return nextState;
      }

      if (bState.playerPokemon.currentHP === 0) {
        if (!nextState.isManualBattle) {
          const nextP = getNextActivePokemon(nextState.team);
          if (nextP) {
            pushLog(`¡Adelante ${nextP.name}!`, "normal");
            bState.playerPokemon = nextP;

            // Trigger On-Entry Ability (Player Swap-in)
            const pEntry = applyOnEntryAbility(nextP, bState.enemyPokemon);
            if (pEntry.updatedDefender) {
              bState.enemyPokemon = {
                ...bState.enemyPokemon,
                ...pEntry.updatedDefender,
              };
            }
            if (pEntry.log) pushLog(pEntry.log, "normal");
          }
        } else {
          // In manual battle, we show a selection modal
          bState.pendingManualSwitch = true;
        }
        nextState.currentBattle = bState;
        nextState.battleLog = logs.slice(-40);
        return nextState;
      }

      if (bState.turnState === "apply_capture") {
        const pca = bState.pendingCaptureAnim;
        if (!pca || pca.captured === null) return state;

        if (pca.captured) {
          pushLog(`¡${bState.enemyPokemon.name} fue atrapado!`, "capture");
          nextState.totalCaptured += 1;

          // --- ZONE PROGRESSION (on capture) ---
          if (bState.isBossBattle) {
            // Solo otorgar badge/avance si es el último Pokémon del miembro actual
            const isLastGymPokemon =
              (bState.type !== "gym" && bState.type !== "elite") ||
              !bState.gymTeam ||
              !bState.bossCurrentBar ||
              !bState.bossMaxBars ||
              bState.bossCurrentBar >= bState.bossMaxBars;

            // ── BADGE AWARD (gym battles only) ───────────────────────────────────
            if (bState.type === "gym" && isLastGymPokemon) {
              const currentZoneForBadge =
                regionZones[nextState.currentZoneIndex];
              if (currentZoneForBadge?.gymId != null) {
                const gym = regionGyms.find(
                  (g) => g.id === currentZoneForBadge.gymId,
                );
                if (gym && !nextState.gymsBadges.includes(gym.id)) {
                  nextState.gymsBadges = [...nextState.gymsBadges, gym.id];
                  pushLog(`¡Has obtenido la ${gym.badgeName}!`, "badge");

                  // Award gym reward items
                  for (const reward of gym.rewardItems) {
                    if (Math.random() <= reward.chance) {
                      nextState.items = {
                        ...nextState.items,
                        [reward.itemId]:
                          (nextState.items[reward.itemId] ?? 0) + 1,
                      };
                    }
                  }
                }
              }
            }

            // ── ELITE FOUR PROGRESSION (on capture) ─────────────────────────────
            if (bState.type === "elite" && isLastGymPokemon) {
              const allMembersCount =
                (regionEliteFour?.trainers.length ?? 4) + 1;
              const currentProgress = nextState.eliteFourProgress ?? 0;
              const nextProgress = currentProgress + 1;

              if (nextProgress >= allMembersCount) {
                nextState.eliteFourDefeated = true;
                pushLog(
                  "¡Has derrotado al Campeón! ¡Eres el nuevo Campeón Pokémon!",
                  "badge",
                );
              } else {
                nextState.eliteFourProgress = nextProgress;
                nextState.currentZoneProgress = 0;
                nextState.pendingZoneTransition = true;
                (nextState as any)._eliteFourTransition = true;

                const allMembers = [
                  ...(regionEliteFour?.trainers ?? []),
                  ...(regionEliteFour?.champion
                    ? [regionEliteFour.champion]
                    : []),
                ];
                const nextMember = allMembers[nextProgress];
                if (nextMember) {
                  const isNextChampion =
                    nextProgress >= (regionEliteFour?.trainers.length ?? 4);
                  pushLog(
                    isNextChampion
                      ? `¡Siguiente: El Campeón ${nextMember.name}!`
                      : `¡Siguiente rival del Alto Mando: ${nextMember.name}!`,
                    "badge",
                  );
                }
              }
            }

            if (isLastGymPokemon && bState.type === "gym") {
              const region = { zones: regionZones };
              if (nextState.currentZoneIndex + 1 < region.zones.length) {
                nextState.currentZoneIndex += 1;
                nextState.maxZoneIndex = Math.max(
                  nextState.maxZoneIndex,
                  nextState.currentZoneIndex,
                );
                nextState.zoneBattlesWon = 0;
                nextState.pendingZoneTransition = true;
              }
            }

            // ── ROUTE BOSS PROGRESSION (on capture) ────────────────────────────────
            if (
              isLastGymPokemon &&
              bState.type === "wild" &&
              bState.isBossBattle
            ) {
              const region = { zones: regionZones };
              if (nextState.currentZoneIndex + 1 < region.zones.length) {
                nextState.currentZoneIndex += 1;
                nextState.maxZoneIndex = Math.max(
                  nextState.maxZoneIndex,
                  nextState.currentZoneIndex,
                );
                nextState.zoneBattlesWon = 0;
                nextState.pendingZoneTransition = true;
              }
            }
          } else {
            nextState.zoneBattlesWon += 1;
          }

          bState.enemyPokemon = {
            ...bState.enemyPokemon,
            caughtAt: currentZone?.name || "Zona Desconocida",
            currentHP: bState.enemyPokemon.maxHP,
            status: null,
            moves: bState.enemyPokemon.moves.map((m: any) => ({
              ...m,
              currentPP: m.maxPP,
            })),
          };

          const res = optimizeTeam(
            nextState.team,
            nextState.pc,
            bState.enemyPokemon,
          );
          nextState.team = res.newTeam;
          nextState.pc = res.newPC;

          {
            // Revertir mega si estaba activa
            const battleForRevert = nextState.currentBattle;
            if (nextState.megaState?.isMega && battleForRevert) {
              const reverted = revertMegaEvolution(
                battleForRevert.playerPokemon,
                nextState.megaState,
              );
              nextState.team = nextState.team.map((p) =>
                p.uid === reverted.uid ? reverted : p,
              );
              nextState.currentBattle = {
                ...battleForRevert,
                playerPokemon: reverted,
              };
            }
            nextState.megaState = resetMegaStateAfterBattle();
          }

          (nextState as any).currentBattle = null;
          nextState.pendingLootSelection = generateLootOptions([], {
            team: nextState.team,
            pc: nextState.pc,
          });

          // Genetics update
          setMeta((m) => {
            const existing = m.unlockedStarters.find(
              (s) => s.id === bState.enemyPokemon.pokemonId,
            );

            if (existing) {
              let updated = false;
              const newMaxIvs = { ...existing.maxIvs };
              const newMaxEvs = { ...existing.maxEvs };

              (
                ["hp", "attack", "defense", "spAtk", "spDef", "speed"] as const
              ).forEach((stat) => {
                const enemyStat =
                  bState.enemyPokemon.ivs[stat as keyof PokemonStats];
                if (enemyStat > newMaxIvs[stat as keyof PokemonStats]) {
                  newMaxIvs[stat as keyof PokemonStats] = enemyStat;
                  updated = true;
                }
                const enemyEvStat =
                  bState.enemyPokemon.evs[stat as keyof PokemonStats];
                if (enemyEvStat > newMaxEvs[stat as keyof PokemonStats]) {
                  newMaxEvs[stat as keyof PokemonStats] = enemyEvStat;
                  updated = true;
                }
              });

              const newNatures = new Set(existing.unlockedNatures);
              if (!newNatures.has(bState.enemyPokemon.nature)) {
                newNatures.add(bState.enemyPokemon.nature);
                updated = true;
              }

              if (!updated) return m;

              const pokemonId = bState.enemyPokemon.pokemonId;
              const pokemonName = bState.enemyPokemon.name;
              nextState.inheritanceProgress[pokemonId] = {
                pokemonId,
                pokemonName,
                ivs: Object.fromEntries(
                  Object.entries(bState.enemyPokemon.ivs).map(([k, v]) => [
                    k,
                    [existing.maxIvs[k as keyof PokemonStats] || 0, v],
                  ]),
                ),
                evs: Object.fromEntries(
                  Object.entries(bState.enemyPokemon.evs).map(([k, v]) => [
                    k,
                    [existing.maxEvs[k as keyof PokemonStats] || 0, v],
                  ]),
                ),
                newNatures: existing.unlockedNatures.includes(
                  bState.enemyPokemon.nature,
                )
                  ? []
                  : [bState.enemyPokemon.nature],
              };

              return {
                ...m,
                unlockedStarters: m.unlockedStarters.map((s) =>
                  s.id === pokemonId
                    ? {
                        ...s,
                        maxIvs: newMaxIvs,
                        maxEvs: newMaxEvs,
                        unlockedNatures: Array.from(newNatures),
                      }
                    : s,
                ),
              };
            } else {
              const newUniqueIds = m.capturedUniqueIds.includes(
                bState.enemyPokemon.pokemonId,
              )
                ? m.capturedUniqueIds
                : [...m.capturedUniqueIds, bState.enemyPokemon.pokemonId];

              let shinyUpdate = {};
              if (bState.enemyPokemon.isShiny) {
                const shinyInfo = {
                  id: bState.enemyPokemon.pokemonId,
                  runId: nextState.runId,
                  timestamp: Date.now(),
                };
                shinyUpdate = {
                  firstShiny: m.firstShiny || shinyInfo,
                  lastShiny: shinyInfo,
                };
              }

              const pokemonId = bState.enemyPokemon.pokemonId;
              const pokemonName = bState.enemyPokemon.name;

              nextState.inheritanceProgress[pokemonId] = {
                pokemonId,
                pokemonName,
                ivs: Object.fromEntries(
                  Object.entries(bState.enemyPokemon.ivs).map(([k, v]) => [
                    k,
                    [0, v],
                  ]),
                ),
                evs: Object.fromEntries(
                  Object.entries(bState.enemyPokemon.evs).map(([k, v]) => [
                    k,
                    [0, v],
                  ]),
                ),
                newNatures: [bState.enemyPokemon.nature],
              };

              return {
                ...m,
                ...shinyUpdate,
                capturedUniqueIds: newUniqueIds,
                unlockedStarters: [
                  ...m.unlockedStarters,
                  {
                    id: bState.enemyPokemon.pokemonId,
                    name: bState.enemyPokemon.name,
                    maxIvs: bState.enemyPokemon.ivs,
                    maxEvs: bState.enemyPokemon.evs,
                    unlockedNatures: [bState.enemyPokemon.nature],
                  },
                ].sort((a, b) => a.id - b.id),
              };
            }
          });

          bState.pendingCaptureAnim = null;
          processedAnimRef.current = null;

          (nextState as any).currentBattle = null;
          return nextState;
        } else {
          pushLog(`¡${bState.enemyPokemon.name} se liberó!`, "normal");
          bState.pendingCaptureAnim = null;
          bState.turnState = "idle";
          turnStateRef.current = "idle";
          processedAnimRef.current = null;
          nextState.currentBattle = bState;
          return nextState;
        }
      }

      // For animation state machine:
      // If idle, we determine if a move has been selected.
      if (!bState.turnState || bState.turnState === "idle") {
        // No proceder hasta que el sprite enemigo haya cargado
        /* 
        if (!bState.enemyReady && bState.turnCount === 0) {
          console.log("[useEngineTick] Waiting for enemyReady. showLeaderSprite should be false.");
          return state;
        } 
        */
        // AUTO-MEGA (solo idle, solo si no es manual, solo turno 0 de la batalla)
        if (
          !nextState.isManualBattle &&
          nextState.hasMegaBracelet &&
          !nextState.megaState.usedThisBattle &&
          bState.turnCount === 0
        ) {
          const availableMegas = canMegaEvolveSync(
            bState.playerPokemon.pokemonId,
            nextState.items,
            nextState.hasMegaBracelet,
            nextState.megaState.usedThisBattle,
          );

          if (availableMegas.length > 0) {
            nextState.megaState = {
              ...nextState.megaState,
              pendingAutoMega: availableMegas[0],
            };
          }
        }

        // Manual Battle Handling
        let pMove: ActiveMove | null | undefined;
        let usedManualTurn = false;

        if (nextState.isManualBattle) {
          if (!bState.manualActionQueue) return nextState; // Wait for input

          if (bState.manualActionQueue?.type === "move") {
            pMove = bState.playerPokemon.moves.find(
              (m: any) =>
                String(m.moveId) === String(bState.manualActionQueue?.id),
            );
            usedManualTurn = true;
          } else if (bState.manualActionQueue?.type === "item") {
            // Item was already applied in ItemBag — just consume the turn
            usedManualTurn = true;
          } else if (bState.manualActionQueue?.type === "switch") {
            const targetUid = bState.manualActionQueue.id;
            const nextP = nextState.team.find((p) => p.uid === targetUid);

            if (
              nextP &&
              nextP.currentHP > 0 &&
              nextP.uid !== bState.playerPokemon.uid
            ) {
              pushLog(`¡Adelante ${nextP.name}!`, "normal");
              bState.playerPokemon = nextP;
              usedManualTurn = true;
            }
          }
          bState.manualActionQueue = undefined;
        }

        if (!pMove && !usedManualTurn) {
          pMove = chooseBestMove(
            bState.playerPokemon,
            bState.enemyPokemon,
            bState.activeMechanic,
          );
        }

        const eMove = selectEnemyMove(
          bState.enemyPokemon,
          bState.playerPokemon,
          bState.activeMechanic,
        );

        if (!pMove && !usedManualTurn) {
          if (!nextState.isManualBattle) {
            pushLog(
              `${bState.playerPokemon.name} no tiene movimientos útiles. ¡Cambia de Pokémon!`,
              "danger",
            );
            nextState.battleLog = logs.slice(-40);
            return nextState;
          } else {
            pushLog(
              `${bState.playerPokemon.name} no puede atacar. Cambia de Pokémon.`,
              "danger",
            );
            nextState.battleLog = logs.slice(-40);
            return nextState; // Wait for switch input
          }
        }

        // We have moves selected. Determine order and queue up actions.
        const order = determineAttackOrder(
          bState.playerPokemon,
          pMove,
          bState.enemyPokemon,
          eMove,
          bState.activeMechanic,
        );
        bState.turnQueue = order === "player-first" ? ["p", "e"] : ["e", "p"];

        // Store the chosen moves properly on the state
        bState.playerCurrentMove = pMove;
        bState.enemyCurrentMove = eMove;
        bState.usedManualTurn = usedManualTurn;

        // console.log("[useEngineTick] Action selected:", {
        //   pMove: pMove?.moveName,
        //   eMove: eMove?.moveName,
        //   order: bState.turnQueue
        // });

        bState.turnState = "turn_start";
        turnStateRef.current = "turn_start";

        // Trigger On-Entry Abilities (Battle Start)
        if (bState.turnCount === 0 && !bState.onEntryTriggered) {
          const pEntry = applyOnEntryAbility(
            bState.playerPokemon,
            bState.enemyPokemon,
          );
          if (pEntry.updatedDefender) {
            bState.enemyPokemon = {
              ...bState.enemyPokemon,
              ...pEntry.updatedDefender,
            };
          }
          if (pEntry.log) pushLog(pEntry.log, "normal");

          const eEntry = applyOnEntryAbility(
            bState.enemyPokemon,
            bState.playerPokemon,
          );
          if (eEntry.updatedDefender) {
            bState.playerPokemon = {
              ...bState.playerPokemon,
              ...eEntry.updatedDefender,
            };
          }
          if (eEntry.log) pushLog(eEntry.log, "normal");

          bState.onEntryTriggered = true;
        }

        processedStateRef.current = stateKey;
        nextState.currentBattle = bState;
        nextState.battleLog = logs.slice(-40);
        return nextState;
      }

      if (bState.turnState === "animating") {
        turnStateRef.current = "animating";
        processedStateRef.current = stateKey;
        return state;
      }

      let nextEnemyHP = bState.enemyPokemon.currentHP;
      let nextPlayerHP = bState.playerPokemon.currentHP;

      // --- ENTER COMBAT MECHANICS (Suelo Ardiente) ---
      if (bState.activeMechanic === "suelo_ardiente") {
        if (
          !bState.playerPokemon.status &&
          !bState.playerPokemon.types.some((t) =>
            ["fire", "rock", "ground"].includes(t.toLowerCase()),
          )
        ) {
          bState.playerPokemon.status = "BRN";
          pushLog(
            `¡El Suelo Ardiente quema a ${bState.playerPokemon.name}!`,
            "danger",
          );
        }
        if (
          !bState.enemyPokemon.status &&
          !bState.enemyPokemon.types.some((t) =>
            ["fire", "rock", "ground"].includes(t.toLowerCase()),
          )
        ) {
          bState.enemyPokemon.status = "BRN";
          pushLog(
            `¡El Suelo Ardiente quema a ${bState.enemyPokemon.name}!`,
            "normal",
          );
        }
      }

      if (bState.turnState === "turn_start") {
        // Turn-based abilities
        const playerTurnRes = applyOnTurnAbility(bState.playerPokemon);
        if (playerTurnRes.updatedPokemon !== bState.playerPokemon) {
          bState.playerPokemon = playerTurnRes.updatedPokemon;
          if (playerTurnRes.log) pushLog(playerTurnRes.log, "normal");
        }
        const enemyTurnRes = applyOnTurnAbility(bState.enemyPokemon);
        if (enemyTurnRes.updatedPokemon !== bState.enemyPokemon) {
          bState.enemyPokemon = enemyTurnRes.updatedPokemon;
          if (enemyTurnRes.log) pushLog(enemyTurnRes.log, "normal");
        }

        // We are in turn_start, and need to process the next actor in the queue
        const currentActor = (bState.turnQueue || [])[0]; // "p" or "e"

        if (currentActor) {
          // --- ACTION CALCULATE PHASE ---
          const isPlayer = currentActor === "p";
          let attacker = isPlayer ? bState.playerPokemon : bState.enemyPokemon;
          const defender = isPlayer
            ? bState.enemyPokemon
            : bState.playerPokemon;
          const move = isPlayer
            ? bState.playerCurrentMove
            : bState.enemyCurrentMove;
          const usedManual = isPlayer ? bState.usedManualTurn : false;

          let resolvedMove = move;

          // console.log(`[ENGINE] ${isPlayer ? "Player" : "Enemy"} turn logic:`, {
          //   move: resolvedMove?.moveName,
          //   hp: attacker.currentHP,
          //   oppHp: defender.currentHP,
          //   queue: bState.turnQueue
          // });

          if (isPlayer && !resolvedMove && !usedManual) {
            // Fallback: re-select best move in case playerCurrentMove was lost between ticks
            resolvedMove = chooseBestMove(
              bState.playerPokemon,
              bState.enemyPokemon,
              bState.activeMechanic,
            );
            if (resolvedMove) {
              bState.playerCurrentMove = resolvedMove;
            }
          }

          // If the player used a manual switch or item and didn't select a move, skip attack calc
          if (isPlayer && usedManual && !resolvedMove) {
            // console.log("[useEngineTick] Player used manual item/switch, skipping attack");
            (bState.turnQueue || []).shift(); // Remove "p"
            if (bState.turnQueue && bState.turnQueue.length > 0) {
              bState.turnState = "turn_start";
              turnStateRef.current = "turn_start";
            } else {
              bState.turnState = "idle";
              turnStateRef.current = "idle";
            }
            nextState.currentBattle = bState;
            nextState.battleLog = logs.slice(-40);
            return nextState; // Loop will continue on next tick for enemy
          }

          if (
            resolvedMove &&
            attacker.currentHP > 0 &&
            defender.currentHP > 0
          ) {
            let canAttack = true;

            // Esporas en el Aire mechanic
            if (bState.activeMechanic === "esporas_aire" && !attacker.status) {
              const isImmune = attacker.types.some((t: string) =>
                ["poison", "steel"].includes(t.toLowerCase()),
              );
              const moveType = resolvedMove?.type.toLowerCase();
              const clearsSpores =
                moveType === "fire" ||
                moveType === "ice" ||
                moveType === "poison";
              if (!isImmune && !clearsSpores && Math.random() < 0.1) {
                attacker.status = "SLP";
                pushLog(
                  `¡Las Esporas en el Aire durmieron a ${attacker.name}!`,
                  isPlayer ? "danger" : "normal",
                );
              }
            }

            // Status checks
            if (attacker.status === "SLP") {
              if (Math.random() < 0.3) {
                attacker.status = null;
                pushLog(
                  `¡${attacker.name} se despertó!`,
                  isPlayer ? "normal" : "danger",
                );
              } else {
                pushLog(
                  `¡${attacker.name} está profundamente dormido!`,
                  "normal",
                );
                canAttack = false;
              }
            } else if (attacker.status === "FRZ") {
              if (Math.random() < 0.2) {
                attacker.status = null;
                pushLog(
                  `¡${attacker.name} se descongeló!`,
                  isPlayer ? "normal" : "danger",
                );
              } else {
                pushLog(`¡${attacker.name} está congelado!`, "normal");
                canAttack = false;
              }
            } else if (attacker.status === "PAR") {
              if (Math.random() < 0.25) {
                pushLog(
                  `¡${attacker.name} está paralizado y no puede moverse!`,
                  isPlayer ? "danger" : "normal",
                );
                canAttack = false;
              }
            }

            if (canAttack) {
              // Handle Stance Change (Aegislash)
              if (attacker.pokemonId === 681 || attacker.pokemonId === 10026) {
                const { updatedPokemon, log } = handleStanceChange(
                  attacker,
                  resolvedMove,
                );
                if (log) {
                  attacker = updatedPokemon;
                  if (isPlayer) bState.playerPokemon = updatedPokemon;
                  else bState.enemyPokemon = updatedPokemon;
                  pushLog(log, isPlayer ? "normal" : "normal");
                }
              }

              let { damage, isCrit, effectiveness } = calculateDamage(
                attacker,
                defender,
                resolvedMove,
                bState.activeMechanic,
              );

              // ── ACCURACY & EVASION CHECK ────────────────────────────────
              const accModifier = getAccuracyMultiplier(
                attacker.statModifiers.acc,
                defender.statModifiers.eva,
                bState.activeMechanic,
              );
              const hitChance = (resolvedMove.accuracy || 100) * accModifier;

              if (Math.random() * 100 > hitChance) {
                pushLog(
                  `¡El ataque de ${attacker.name} falló!`,
                  isPlayer ? "normal" : "normal",
                );
                damage = 0;
                // Move missed, skip status effects but keep turn progression
              }

              // Calculate Status Effect from Move
              let statusEffectToApply = null;
              if (
                resolvedMove.statusEffect &&
                !defender.status &&
                defender.currentHP - damage > 0
              ) {
                if (Math.random() * 100 < resolvedMove.statusEffect.chance) {
                  statusEffectToApply = resolvedMove.statusEffect.condition;
                }
              }

              // Campo Electrificado mechanic
              if (
                bState.activeMechanic === "campo_electrificado" &&
                resolvedMove.category === "physical" &&
                !defender.status &&
                defender.currentHP - damage > 0
              ) {
                if (Math.random() < 0.15 && !statusEffectToApply) {
                  statusEffectToApply = "PAR";
                }
              }

              // Prepare the animation state block
              bState.pendingAnimation = {
                actor: isPlayer ? "p" : "e",
                target: isPlayer ? "e" : "p",
                moveType: resolvedMove.type,
                moveCategory: resolvedMove.category,
                damage: damage,
                isCrit: isCrit,
                effectiveness: effectiveness,
                statusApplied: statusEffectToApply as any,
                statChanges: [], // Can implement stat changes later if needed
                hpTrigger: false,
              };

              // ── SELF STAT BOOST ───────────────────────────────────────────
              const selfBoosts =
                resolvedMove?.selfBoost ||
                (resolvedMove?.moveId
                  ? COMMON_SELF_BOOSTS[resolvedMove.moveId]
                  : null);

              if (selfBoosts && selfBoosts.length > 0) {
                for (const boost of selfBoosts) {
                  const { stat, stages } = boost;
                  if (isPlayer) {
                    const currentStage =
                      bState.playerPokemon.statModifiers[
                        stat as keyof typeof bState.playerPokemon.statModifiers
                      ] ?? 0;
                    const newStage = Math.max(
                      -6,
                      Math.min(6, currentStage + stages),
                    );
                    bState.playerPokemon = {
                      ...bState.playerPokemon,
                      statModifiers: {
                        ...bState.playerPokemon.statModifiers,
                        [stat]: newStage,
                      },
                    };
                    // console.log(
                    //   `[ENGINE] Player ${bState.playerPokemon.name} boost: ${stat} ${currentStage} -> ${newStage}`,
                    // );
                    pushLog(
                      `¡${bState.playerPokemon.name} subió su ${stat}!`,
                      "level",
                    );
                  } else {
                    const currentStage =
                      bState.enemyPokemon.statModifiers[
                        stat as keyof typeof bState.enemyPokemon.statModifiers
                      ] ?? 0;
                    const newStage = Math.max(
                      -6,
                      Math.min(6, currentStage + stages),
                    );
                    bState.enemyPokemon = {
                      ...bState.enemyPokemon,
                      statModifiers: {
                        ...bState.enemyPokemon.statModifiers,
                        [stat]: newStage,
                      },
                    };
                    // console.log(
                    //   `[ENGINE] Enemy ${bState.enemyPokemon.name} boost: ${stat} ${currentStage} -> ${newStage}`,
                    // );
                  }
                }
              }

              // Pre-deduct PP
              if (isPlayer) {
                const pMoveIdx = attacker.moves.findIndex(
                  (m: any) => m.moveId === resolvedMove.moveId,
                );

                // Add a more robust check to ensure we only deduct PP once per turn count
                const ppDeductionKey = `pp-${bState.turnCount}-${resolvedMove.moveId}`;
                if (
                  pMoveIdx >= 0 &&
                  processedAnimRef.current !== ppDeductionKey
                ) {
                  attacker.moves[pMoveIdx].currentPP = Math.max(
                    0,
                    attacker.moves[pMoveIdx].currentPP - 1,
                  );
                  processedAnimRef.current = ppDeductionKey;
                }
              }

              // Transition to animating, the actual damage will be applied via resolveAnimation by the UI
              bState.turnState = "animating";
              turnStateRef.current = "animating";
              processedStateRef.current = stateKey; // LOCK HERE
              nextState.currentBattle = bState;
              nextState.battleLog = logs.slice(-40);
              return nextState;
            }
          }

          // If they couldn't attack, or no move, just remove from queue and proceed
          bState.turnQueue = bState.turnQueue ? bState.turnQueue.slice(1) : [];

          if (!resolvedMove && isPlayer) {
            // console.warn("[useEngineTick] Player resolvedMove is null!", { manual: usedManual });
            pushLog(
              `¡${bState.playerPokemon.name} no pudo ejecutar su acción!`,
              "normal",
            );
          }

          if (bState.turnQueue && bState.turnQueue.length > 0) {
            bState.turnState = "turn_start";
            turnStateRef.current = "turn_start";
          } else {
            bState.turnState = "idle";
            turnStateRef.current = "idle";
          }

          nextState.currentBattle = bState;
          nextState.battleLog = logs.slice(-40);
          return nextState;
        }
      }

      if (bState.turnState === "apply_damage") {
        const anim = bState.pendingAnimation;

        // Build a stable ID for this apply_damage to prevent duplicate processing
        const animId = anim
          ? `${anim.actor}-${anim.moveType}-${anim.damage}-${bState.turnCount}`
          : `no-anim-${bState.turnCount}`;
        if (processedAnimRef.current === animId) return state; // Already processed
        processedAnimRef.current = animId;

        if (anim) {
          const isPlayer = anim.actor === "p";
          const attacker = isPlayer
            ? bState.playerPokemon
            : bState.enemyPokemon;
          const defender = isPlayer
            ? bState.enemyPokemon
            : bState.playerPokemon;
          const move = isPlayer
            ? bState.playerCurrentMove
            : bState.enemyCurrentMove;

          // Defensive ability check (Levitate, Volt Absorb, etc.)
          const abilityRes = applyAbilityDamageModifier(
            attacker,
            defender,
            anim.moveType,
            anim.damage,
          );

          if (abilityRes.blocked) {
            if (abilityRes.healAmount) {
              const healedDefender = {
                ...defender,
                currentHP: Math.min(
                  defender.maxHP,
                  defender.currentHP + abilityRes.healAmount,
                ),
              };
              if (isPlayer) bState.enemyPokemon = healedDefender;
              else bState.playerPokemon = healedDefender;
            }
            if (abilityRes.forceHP !== undefined) {
              const forcedDefender = {
                ...defender,
                currentHP: abilityRes.forceHP,
              };
              if (isPlayer) bState.enemyPokemon = forcedDefender;
              else bState.playerPokemon = forcedDefender;
            }
            if (abilityRes.log) pushLog(abilityRes.log, "normal");
            // Skip normal damage application
          } else {
            const finalDamage = Math.floor(anim.damage * abilityRes.multiplier);
            const { nextHP, focusBandTriggered } = applyDamage(
              defender,
              finalDamage,
            );

            if (isPlayer) {
              bState.enemyPokemon = {
                ...bState.enemyPokemon,
                currentHP: nextHP,
              };
            } else {
              bState.playerPokemon = {
                ...bState.playerPokemon,
                currentHP: nextHP,
              };
              // IMPORTANT: Sync back to team so death checks see the 0 HP
              nextState.team = nextState.team.map((p) =>
                p.uid === bState.playerPokemon.uid ? bState.playerPokemon : p,
              );
            }

            // Apply status if any (only if damage wasn't blocked/immune)
            if (anim.statusApplied && !defender.status && nextHP > 0) {
              defender.status = anim.statusApplied;
              pushLog(
                `¡${defender.name} ahora está ${anim.statusApplied}!`,
                isPlayer ? "normal" : "danger",
              );
            }

            if (focusBandTriggered)
              pushLog(
                `¡${defender.name} resistió el golpe con su Cinta Focus!`,
                "normal",
              );
          }

          // Logs
          if (move) {
            const damageText =
              anim.damage > 0 ? ` causando ${anim.damage} de daño!` : "!";
            pushLog(
              `${attacker.name} usó ${move.moveName}${damageText}`,
              isPlayer ? "attack" : "normal",
            );
          }
          if (anim.effectiveness > 1.5) pushLog("¡Es súper efectivo!", "super");
          if (anim.effectiveness < 0.7 && anim.effectiveness > 0)
            pushLog("No es muy efectivo...", "not-very");
          if (anim.effectiveness === 0)
            pushLog(`No afecta a ${defender.name}...`, "normal");
          if (anim.isCrit) pushLog("¡Un golpe crítico!", "crit");

          bState.pendingAnimation = null;
        }

        // Shift queue and determine next turnState
        bState.turnQueue = bState.turnQueue ? bState.turnQueue.slice(1) : [];

        // ── AUTO-CAPTURA (evaluar después del daño, antes de procesar muerte) ──
        if (
          nextState.autoCapture &&
          bState.type === "wild" &&
          !bState.isBossBattle &&
          !bState.pendingCaptureAnim &&
          bState.phase === "active" &&
          nextState.items["poke-ball"] > 0 &&
          bState.enemyPokemon.currentHP > 0
        ) {
          const enemyHpRatio =
            bState.enemyPokemon.currentHP / bState.enemyPokemon.maxHP;
          const isOwned =
            nextState.team.some(
              (p: any) => p.pokemonId === bState.enemyPokemon.pokemonId,
            ) ||
            nextState.pc.some(
              (p: any) => p.pokemonId === bState.enemyPokemon.pokemonId,
            );

          console.log("[AutoCaptura] Evaluando:", {
            enemyName: bState.enemyPokemon.name,
            enemyHP: bState.enemyPokemon.currentHP,
            enemyMaxHP: bState.enemyPokemon.maxHP,
            enemyHpRatio: enemyHpRatio.toFixed(2),
            isOwned,
            pokeBalls: nextState.items["poke-ball"],
          });

          if (!isOwned) {
            let shouldCapture = false;

            // Caso 1: HP ≤ 30% — captura directa
            if (enemyHpRatio <= 0.3) {
              console.log(
                "[AutoCaptura] ✅ Caso 1: HP <= 30%, capturando directamente",
              );
              shouldCapture = true;
            }

            // Caso 2: HP 30-50% y el siguiente golpe lo mataría
            if (!shouldCapture && enemyHpRatio > 0.3 && enemyHpRatio <= 0.5) {
              const nextMove = chooseBestMove(
                bState.playerPokemon,
                bState.enemyPokemon,
                bState.activeMechanic,
              );
              if (nextMove) {
                const { damage } = calculateDamage(
                  bState.playerPokemon,
                  bState.enemyPokemon,
                  nextMove,
                  bState.activeMechanic,
                );
                console.log(
                  "[AutoCaptura] 🔍 Caso 2: HP 30-50%, daño estimado:",
                  damage,
                  "/ HP restante:",
                  bState.enemyPokemon.currentHP,
                );
                if (damage >= bState.enemyPokemon.currentHP) {
                  console.log(
                    "[AutoCaptura] ✅ Caso 2: golpe letal detectado, captura preventiva",
                  );
                  shouldCapture = true;
                }
              } else {
                console.log(
                  "[AutoCaptura] ⚠️ Caso 2: no se encontró movimiento para simular",
                );
              }
            }

            if (shouldCapture) {
              console.log("[AutoCaptura] 🎯 Lanzando Poké Ball...");
              nextState.items["poke-ball"] -= 1;
              const catchAttempt = calculateCaptureChance(
                bState.enemyPokemon,
                ITEMS["poke-ball"],
                null,
                255,
                false,
                nextState.totalCaptured,
                false,
                1.0,
              );
              pushLog(`Auto-captura: lanzando Poké Ball...`, "capture");
              bState.pendingCaptureAnim = {
                ballId: "poke-ball",
                captured: catchAttempt.success,
              };
              bState.turnState = "animating";
              turnStateRef.current = "animating";
              nextState.currentBattle = bState;
              nextState.battleLog = logs.slice(-40);
              return nextState;
            } else {
              console.log(
                "[AutoCaptura] ⏳ Condiciones no cumplidas aún, esperando...",
              );
            }
          } else {
            console.log("[AutoCaptura] ⏭️ Pokémon ya poseído, saltando");
          }
        } else {
          // Log solo una vez por batalla para no spamear
          if (bState.turnCount === 0) {
            console.log("[AutoCaptura] ❌ Guard bloqueado:", {
              autoCapture: nextState.autoCapture,
              type: bState.type,
              isBossBattle: bState.isBossBattle,
              pendingCaptureAnim: !!bState.pendingCaptureAnim,
              phase: bState.phase,
              pokeBalls: nextState.items["poke-ball"],
            });
          }
        }

        // --- CHECK FOR DEFEAT/VICTORY ---
        if (bState.enemyPokemon.currentHP === 0) {
          pushLog(
            `¡${bState.enemyPokemon.name} enemigo se ha debilitado!`,
            "faint",
          );

          const moneyReward = calculateMoneyGain(
            bState.enemyPokemon.level,
            bState.type,
            bState.isBossBattle,
          );
          nextState.money += moneyReward;
          pushLog(`¡Has ganado $${moneyReward.toLocaleString()}!`, "normal");

          nextState.totalBattlesWon += 1;
          nextState.zoneBattlesWon += 1;

          // --- ZONE PROGRESSION ---
          if (bState.isBossBattle) {
            // ── GYM / ELITE MULTI-POKEMON ─────────────────────────────────────────
            if (
              (bState.type === "gym" || bState.type === "elite") &&
              bState.gymTeam &&
              bState.bossCurrentBar != null &&
              bState.bossMaxBars != null &&
              bState.bossCurrentBar < bState.bossMaxBars
            ) {
              // Hay más Pokémon en el equipo del líder
              const nextBarIndex = bState.bossCurrentBar; // 0-indexed = bossCurrentBar (ya que empieza en 1)
              const nextSlot = bState.gymTeam[nextBarIndex];

              // ── CALCULAR XP del Pokémon intermedio ────────────────
              const baseXP = bState.enemyPokemon.baseStats.hp;
              const xpGain = calculateXPGain(
                bState.enemyPokemon.level,
                baseXP,
                true,
                nextState.expMultiplier,
              );
              const expShareCount = nextState.items["exp-share"] || 0;
              const { updatedTeam } = distributeTeamXP(
                nextState.team,
                bState.playerPokemon.uid,
                xpGain,
                expShareCount,
              );

              nextState.team = updatedTeam.map((p) => {
                let current = { ...p };
                const isActive = p.uid === bState.playerPokemon.uid;

                if (isActive) {
                  current.xp += xpGain;
                  pushLog(`¡${current.name} ganó ${xpGain} PV!`, "level");
                }

                while (
                  current.xp >= xpToNextLevel(current.level) &&
                  current.level < 100
                ) {
                  current = levelUpPokemon(current);
                  pushLog(
                    `¡${current.name} subió al nivel ${current.level}!`,
                    "level",
                  );
                  // console.log(`[IntermediateGym] ${current.name} leveled up to ${current.level}`);

                  // Queue move learning
                  const learnQueue =
                    (nextState as any).__checkMoveLearnQueue || [];
                  // console.log(`[IntermediateGym] Queuing move learn for ${current.name}`);
                  (nextState as any).__checkMoveLearnQueue = [
                    ...learnQueue,
                    {
                      pokemonUid: current.uid,
                      level: current.level,
                      fromLevel: current.level,
                    },
                  ];

                  // Queue evolution check
                  const evoQueue =
                    (nextState as any).__checkEvolutionQueue || [];
                  // console.log(`[IntermediateGym] Queuing evolution for ${current.name}`);
                  (nextState as any).__checkEvolutionQueue = [
                    ...evoQueue,
                    {
                      pokemonUid: current.uid,
                      level: current.level,
                      pokemonId: current.pokemonId,
                    },
                  ];
                }
                return current;
              });

              const currentActive = nextState.team.find(
                (p) => p.uid === bState.playerPokemon.uid,
              );

              // BUG FIX: processedAnimRef.current no se limpia en la transición de gym
              processedAnimRef.current = null;

              // Spawn del siguiente Pokémon es async — marcar pendiente y salir del reducer
              nextState.currentBattle = {
                ...bState,
                playerPokemon: currentActive || bState.playerPokemon,
                enemyPokemon: bState.enemyPokemon, // se reemplazará en el useEffect
                bossCurrentBar: bState.bossCurrentBar + 1,
                turnState: "idle",
                turnQueue: [],
                pendingAnimation: null,
              };
              (nextState as any).__spawnNextGymPokemon = {
                pokemonId: nextSlot.pokemonId,
                level: Math.max(
                  nextSlot.level,
                  Math.max(...run.team.map((p) => p.level), 5),
                ),
                referenceBst:
                  bState.type === "elite"
                    ? 540 + (nextState.eliteFourProgress ?? 0) * 20
                    : (regionGyms.find(
                        (g) =>
                          g.id ===
                          regionZones[nextState.currentZoneIndex]?.gymId,
                      )?.referenceBst ?? 400),
              };
              nextState.battleLog = logs.slice(-40);
              return nextState;
            }

            // Solo otorgar badge/avance si es el último Pokémon del miembro actual
            const isLastGymPokemon =
              (bState.type !== "gym" && bState.type !== "elite") ||
              !bState.gymTeam ||
              !bState.bossCurrentBar ||
              !bState.bossMaxBars ||
              bState.bossCurrentBar >= bState.bossMaxBars;

            // ── BADGE AWARD (gym battles only) ───────────────────────────────────
            if (bState.type === "gym" && isLastGymPokemon) {
              const currentZoneForBadge =
                regionZones[nextState.currentZoneIndex];
              if (currentZoneForBadge?.gymId != null) {
                const gym = regionGyms.find(
                  (g) => g.id === currentZoneForBadge.gymId,
                );
                if (gym && !nextState.gymsBadges.includes(gym.id)) {
                  nextState.gymsBadges = [...nextState.gymsBadges, gym.id];
                  pushLog(`¡Has obtenido la ${gym.badgeName}!`, "badge");

                  // Award gym reward items
                  for (const reward of gym.rewardItems) {
                    if (Math.random() <= reward.chance) {
                      nextState.items = {
                        ...nextState.items,
                        [reward.itemId]:
                          (nextState.items[reward.itemId] ?? 0) + 1,
                      };
                    }
                  }
                }
              }
            }

            // ── ELITE FOUR PROGRESSION ───────────────────────────────────────────
            if (bState.type === "elite" && isLastGymPokemon) {
              const allMembersCount =
                (regionEliteFour?.trainers.length ?? 4) + 1;
              const currentProgress = nextState.eliteFourProgress ?? 0;
              const nextProgress = currentProgress + 1;

              if (nextProgress >= allMembersCount) {
                nextState.eliteFourDefeated = true;
                pushLog(
                  "¡Has derrotado al Campeón! ¡Eres el nuevo Campeón Pokémon!",
                  "badge",
                );
              } else {
                nextState.eliteFourProgress = nextProgress;
                nextState.currentZoneProgress = 0;
                nextState.pendingZoneTransition = true;
                (nextState as any)._eliteFourTransition = true;

                const allMembers = [
                  ...(regionEliteFour?.trainers ?? []),
                  ...(regionEliteFour?.champion
                    ? [regionEliteFour.champion]
                    : []),
                ];
                const nextMember = allMembers[nextProgress];
                if (nextMember) {
                  const isNextChampion =
                    nextProgress >= (regionEliteFour?.trainers.length ?? 4);
                  pushLog(
                    isNextChampion
                      ? `¡Siguiente: El Campeón ${nextMember.name}!`
                      : `¡Siguiente rival del Alto Mando: ${nextMember.name}!`,
                    "badge",
                  );
                }
              }
            }

            if (isLastGymPokemon && bState.type === "gym") {
              const region = { zones: regionZones };
              if (nextState.currentZoneIndex + 1 < region.zones.length) {
                nextState.currentZoneIndex += 1;
                nextState.maxZoneIndex = Math.max(
                  nextState.maxZoneIndex,
                  nextState.currentZoneIndex,
                );
                nextState.zoneBattlesWon = 0;
                nextState.pendingZoneTransition = true;
              }
            }

            // ── ROUTE BOSS PROGRESSION (on defeat) ────────────────────────────────
            if (
              isLastGymPokemon &&
              bState.type === "wild" &&
              bState.isBossBattle
            ) {
              const region = { zones: regionZones };
              if (nextState.currentZoneIndex + 1 < region.zones.length) {
                nextState.currentZoneIndex += 1;
                nextState.maxZoneIndex = Math.max(
                  nextState.maxZoneIndex,
                  nextState.currentZoneIndex,
                );
                nextState.zoneBattlesWon = 0;
                nextState.pendingZoneTransition = true;
              }
            }
          }

          // Calculate XP
          const baseXP = bState.enemyPokemon.baseStats.hp;
          const xpGain = calculateXPGain(
            bState.enemyPokemon.level,
            baseXP,
            bState.type === "trainer" ||
              bState.type === "gym" ||
              bState.type === "elite",
            nextState.expMultiplier,
          );

          const expShareCount = nextState.items["exp-share"] || 0;
          const { updatedTeam } = distributeTeamXP(
            nextState.team,
            bState.playerPokemon.uid,
            xpGain,
            expShareCount,
          );

          nextState.team = updatedTeam.map((p) => {
            let current = { ...p };
            const isActive = p.uid === bState.playerPokemon.uid;

            // console.log(`[Tick] Checking Pokémon: ${current.name} (Active: ${isActive}), Initial XP: ${current.xp}`);

            if (isActive) {
              current.xp += xpGain;
              pushLog(`¡${current.name} ganó ${xpGain} PV!`, "level");
              // console.log(`[Tick] ${current.name} gained ${xpGain} XP. New XP: ${current.xp}`);
            }

            // Check level up for anyone who gained XP
            while (
              current.xp >= xpToNextLevel(current.level) &&
              current.level < 100
            ) {
              const leveled = levelUpPokemon(current);
              pushLog(
                `¡${leveled.name} subió al nivel ${leveled.level}!`,
                "level",
              );
              current = leveled;
              // console.log(`[Tick] ${current.name} leveled up to ${current.level}. Required XP for next: ${xpToNextLevel(current.level)}`);

              // Queue move learning
              if (!nextState.pendingMoveLearn) {
                const learnQueue =
                  (nextState as any).__checkMoveLearnQueue || [];
                // console.log(`[Tick] Queuing move learn check for ${current.name} at level ${current.level}`);
                (nextState as any).__checkMoveLearnQueue = [
                  ...learnQueue,
                  {
                    pokemonUid: current.uid,
                    level: current.level,
                    fromLevel: current.level,
                  },
                ];
              }

              // Queue evolution
              const evoQueue = (nextState as any).__checkEvolutionQueue || [];
              // console.log(`[Tick] Queuing evolution check for ${current.name} at level ${current.level}`);
              (nextState as any).__checkEvolutionQueue = [
                ...evoQueue,
                {
                  pokemonUid: current.uid,
                  level: current.level,
                  pokemonId: current.pokemonId,
                },
              ];
            }
            return current;
          });

          // Generate Loot
          nextState.pendingLootSelection = generateLootOptions([], {
            team: nextState.team,
            pc: nextState.pc,
          });

          // End Battle
          processedAnimRef.current = null;

          {
            // Revertir mega si estaba activa
            const battleForRevert = nextState.currentBattle;
            if (nextState.megaState?.isMega && battleForRevert) {
              const reverted = revertMegaEvolution(
                battleForRevert.playerPokemon,
                nextState.megaState,
              );
              nextState.team = nextState.team.map((p) =>
                p.uid === reverted.uid ? reverted : p,
              );
              nextState.currentBattle = {
                ...battleForRevert,
                playerPokemon: reverted,
              };
            }
            nextState.megaState = resetMegaStateAfterBattle();
          }

          (nextState as any).currentBattle = null;
          nextState.battleLog = logs.slice(-40);
          return nextState;
        }

        if (bState.playerPokemon.currentHP === 0) {
          pushLog(`¡${bState.playerPokemon.name} se ha debilitado!`, "faint");
          nextState.totalFainted += 1;
          // If manual, we wait for switch. If auto, the next tick will handle it.
          if (!nextState.isManualBattle) {
            const nextP = getNextActivePokemon(nextState.team);
            if (nextP) {
              pushLog(`¡Adelante ${nextP.name}!`, "normal");
              bState.playerPokemon = nextP;
              bState.turnState = "idle"; // Reset turn after a faint
              turnStateRef.current = "idle";
              bState.turnQueue = [];
            }
          } else {
            bState.pendingManualSwitch = true;
            bState.turnState = "idle";
            turnStateRef.current = "idle";
            processedAnimRef.current = null;
            bState.turnQueue = [];
          }
        }

        if (bState.turnQueue && bState.turnQueue.length > 0) {
          bState.turnState = "turn_start";
          turnStateRef.current = "turn_start";
          processedAnimRef.current = null; // Reset so next actor's apply_damage can run
        } else {
          bState.turnState = "idle";
          turnStateRef.current = "idle";
          processedAnimRef.current = null;
        }

        processedStateRef.current = stateKey; // LOCK HERE
        nextState.currentBattle = bState;
        nextState.battleLog = logs.slice(-40);
        return nextState;
      }

      // Final turn cleanup
      bState.turnState = "idle";
      turnStateRef.current = "idle";

      // Cleanup turn state vars
      bState.playerCurrentMove = undefined;
      bState.enemyCurrentMove = undefined;
      bState.usedManualTurn = undefined;

      // --- END OF TURN EFFECTS (Burn/Poison) ---

      // Niebla Tóxica mechanic
      if (bState.activeMechanic === "niebla_toxica") {
        if (nextPlayerHP > 0) {
          if (
            bState.playerPokemon.types.some((t) =>
              ["poison", "steel"].includes(t.toLowerCase()),
            )
          ) {
            if (
              bState.playerPokemon.types.some(
                (t) => t.toLowerCase() === "poison",
              )
            ) {
              const heal = Math.max(
                1,
                Math.floor(bState.playerPokemon.maxHP / 16),
              );
              nextPlayerHP = Math.min(
                bState.playerPokemon.maxHP,
                nextPlayerHP + heal,
              );
              pushLog(
                `¡La Niebla Tóxica cura a ${bState.playerPokemon.name}!`,
                "normal",
              );
            }
          } else {
            const dmg = Math.max(
              1,
              Math.floor(bState.playerPokemon.maxHP / 16),
            );
            nextPlayerHP = Math.max(0, nextPlayerHP - dmg);
            pushLog(
              `¡La Niebla Tóxica daña a ${bState.playerPokemon.name}!`,
              "danger",
            );
          }
        }
        if (bState.enemyPokemon.currentHP > 0) {
          if (
            bState.enemyPokemon.types.some((t) =>
              ["poison", "steel"].includes(t.toLowerCase()),
            )
          ) {
            if (
              bState.enemyPokemon.types.some(
                (t) => t.toLowerCase() === "poison",
              )
            ) {
              const heal = Math.max(
                1,
                Math.floor(bState.enemyPokemon.maxHP / 16),
              );
              bState.enemyPokemon.currentHP = Math.min(
                bState.enemyPokemon.maxHP,
                bState.enemyPokemon.currentHP + heal,
              );
              pushLog(
                `¡La Niebla Tóxica cura a ${bState.enemyPokemon.name}!`,
                "danger",
              );
            }
          } else {
            const dmg = Math.max(1, Math.floor(bState.enemyPokemon.maxHP / 16));
            bState.enemyPokemon.currentHP = Math.max(
              0,
              bState.enemyPokemon.currentHP - dmg,
            );
            pushLog(
              `¡La Niebla Tóxica daña a ${bState.enemyPokemon.name} enemigo!`,
              "normal",
            );
          }
        }
      }

      if (nextPlayerHP > 0 && bState.playerPokemon.status === "BRN") {
        nextPlayerHP = Math.max(
          0,
          nextPlayerHP -
            Math.max(1, Math.floor(bState.playerPokemon.maxHP / 16)),
        );
        pushLog(
          `¡A ${bState.playerPokemon.name} le duele la quemadura!`,
          "danger",
        );
      } else if (
        nextPlayerHP > 0 &&
        (bState.playerPokemon.status === "PSN" ||
          bState.playerPokemon.status === "TOX")
      ) {
        nextPlayerHP = Math.max(
          0,
          nextPlayerHP -
            Math.max(1, Math.floor(bState.playerPokemon.maxHP / 8)),
        );
        pushLog(
          `¡El veneno resta salud a ${bState.playerPokemon.name}!`,
          "danger",
        );
      }

      let eNextHP = bState.enemyPokemon.currentHP;
      if (eNextHP > 0 && bState.enemyPokemon.status === "BRN") {
        eNextHP = Math.max(
          0,
          eNextHP - Math.max(1, Math.floor(bState.enemyPokemon.maxHP / 16)),
        );
        pushLog(
          `¡A ${bState.enemyPokemon.name} enemigo le duele la quemadura!`,
          "normal",
        );
      } else if (
        eNextHP > 0 &&
        (bState.enemyPokemon.status === "PSN" ||
          bState.enemyPokemon.status === "TOX")
      ) {
        eNextHP = Math.max(
          0,
          eNextHP - Math.max(1, Math.floor(bState.enemyPokemon.maxHP / 8)),
        );
        pushLog(
          `¡El veneno resta salud a ${bState.enemyPokemon.name} enemigo!`,
          "normal",
        );
      }
      bState.enemyPokemon.currentHP = eNextHP;

      if (eNextHP === 0 && nextPlayerHP > 0) {
        pushLog(
          `¡El problema de estado debilitó a ${bState.enemyPokemon.name}!`,
          "normal",
        );
        // Force evaluation of death in next tick's apply_damage phase to avoid ghost turns
        bState.turnState = "apply_damage";
        turnStateRef.current = "apply_damage";
        bState.turnQueue = [];
        bState.pendingAnimation = null;
      }

      if (nextPlayerHP === 0) {
        pushLog(`¡${bState.playerPokemon.name} se ha debilitado!`, "faint");
        nextState.totalFainted += 1;
      }

      bState.playerPokemon = {
        ...bState.playerPokemon,
        currentHP: nextPlayerHP,
      };
      nextState.team = nextState.team.map((p: any) =>
        p.uid === bState.playerPokemon.uid ? bState.playerPokemon : p,
      );
      bState.turnCount += 1;

      if (nextState.currentBattle !== null) {
        nextState.currentBattle = bState;
      }
      nextState.battleLog = logs.slice(-40);
      return nextState;
    });
  };

  // Guard for move learn processing to avoid race conditions
  const moveLearnProcessingRef = useRef(false);

  // ─── Async: Move Learn on Level Up ──────────────────────────────────────
  useEffect(() => {
    const queue = ((run as any).__checkMoveLearnQueue || []) as any[];
    const legacyMarker = (run as any).__checkMoveLearnAt;

    if (queue.length === 0 && !legacyMarker) return;

    // If already showing move learn modal, or already fetching one, don't pop yet
    if (run.pendingMoveLearn || moveLearnProcessingRef.current) return;

    let marker: any;
    let nextQueue: any[] = [];

    if (legacyMarker) {
      marker = legacyMarker;
      nextQueue = queue;
    } else {
      const [m, ...rest] = queue;
      marker = m;
      nextQueue = rest;
    }

    moveLearnProcessingRef.current = true;

    // Limpiar el que estamos procesando
    setRun((prev) => {
      const next = { ...prev };
      delete (next as any).__checkMoveLearnAt;
      if (nextQueue.length === 0) {
        delete (next as any).__checkMoveLearnQueue;
      } else {
        (next as any).__checkMoveLearnQueue = nextQueue;
      }
      return next;
    });

    const { pokemonUid, level, fromLevel, _specificMoveId } = marker;

    // Find pokemon using refs for fresh state
    const pokemon =
      teamRef.current.find((p) => p.uid === pokemonUid) ??
      (trainingRef.current?.pokemon?.uid === pokemonUid
        ? trainingRef.current.pokemon
        : null);

    if (!pokemon) {
      moveLearnProcessingRef.current = false;
      return;
    }

    // Use specificMoveId if present, otherwise search range
    learnMovesOnLevelUp(pokemon, level, fromLevel ?? level, _specificMoveId)
      .then((newMoves) => {
        if (newMoves.length === 0) {
          moveLearnProcessingRef.current = false;
          return;
        }

        const firstMove = newMoves[0];
        const remainingMoves = newMoves.slice(1);

        // --- TRAINING MODE AUTO-LEARN ---
        if (
          trainingRef.current?.isActive &&
          trainingRef.current.pokemon?.uid === pokemonUid
        ) {
          setTraining((prev) => {
            if (!prev.pokemon || prev.pokemon.uid !== pokemonUid) return prev;
            const p = { ...prev.pokemon };
            const nextMoves = [...p.moves];

            if (!nextMoves.some((m) => m.moveId === firstMove.moveId)) {
              if (nextMoves.length < 4) {
                nextMoves.push(firstMove);
              } else {
                // Replace last move silently in training if no modal is available/desired
                // or the player is busy battling.
                nextMoves[3] = firstMove;
              }
            }

            return {
              ...prev,
              pokemon: { ...p, moves: nextMoves },
              battleLog: [
                ...prev.battleLog,
                {
                  id: generateUid(),
                  text: `¡${p.name} aprendió ${firstMove.moveName}!`,
                  type: "level" as any,
                },
              ].slice(-40),
            };
          });

          // Re-queue remaining moves if any
          if (remainingMoves.length > 0) {
            setRun((prev) => ({
              ...prev,
              __checkMoveLearnQueue: [
                ...((prev as any).__checkMoveLearnQueue || []),
                ...remainingMoves.map((m) => ({
                  pokemonUid,
                  level,
                  fromLevel: level,
                  _specificMoveId: m.moveId,
                })),
              ],
            }));
          }

          moveLearnProcessingRef.current = false;
          return;
        }

        // --- RUN MODE (Team) ---
        setRun((prev) => {
          const pIndex = prev.team.findIndex((t) => t.uid === pokemonUid);
          if (pIndex === -1) {
            moveLearnProcessingRef.current = false;
            return prev;
          }

          let currentPokemon = { ...prev.team[pIndex] };
          let nextBattle = prev.currentBattle;
          const newLogs = [...prev.battleLog];

          if (currentPokemon.moves.length < 4) {
            // Direct learn if space
            if (
              !currentPokemon.moves.some((m) => m.moveId === firstMove.moveId)
            ) {
              currentPokemon.moves = [...currentPokemon.moves, firstMove];
              newLogs.push({
                id: generateUid(),
                text: `¡${currentPokemon.name} aprendió ${firstMove.moveName}!`,
                type: "level" as const,
              });
            }

            // If there are more moves, re-queue them so they process one by one
            const nextState: any = {
              ...prev,
              team: prev.team.map((t) =>
                t.uid === pokemonUid ? currentPokemon : t,
              ),
              battleLog: newLogs.slice(-40),
            };

            if (nextBattle && nextBattle.playerPokemon.uid === pokemonUid) {
              nextState.currentBattle = {
                ...nextBattle,
                playerPokemon: currentPokemon,
              };
            } else {
              nextState.currentBattle = nextBattle;
            }

            if (remainingMoves.length > 0) {
              nextState.__checkMoveLearnQueue = [
                ...((prev as any).__checkMoveLearnQueue || []),
                ...remainingMoves.map((m) => ({
                  pokemonUid,
                  level,
                  fromLevel: level,
                  _specificMoveId: m.moveId,
                })),
              ];
            }

            moveLearnProcessingRef.current = false;
            return nextState;
          } else {
            // Modal required
            const nextState: any = {
              ...prev,
              pendingMoveLearn: {
                pokemonUid,
                pokemonName: currentPokemon.name,
                newMove: firstMove,
              },
            };

            // Re-queue remaining moves
            if (remainingMoves.length > 0) {
              nextState.__checkMoveLearnQueue = [
                ...((prev as any).__checkMoveLearnQueue || []),
                ...remainingMoves.map((m) => ({
                  pokemonUid,
                  level,
                  fromLevel: level,
                  _specificMoveId: m.moveId,
                })),
              ];
            }

            moveLearnProcessingRef.current = false;
            return nextState;
          }
        });
      })
      .catch((err) => {
        console.error("[MOVE LEARN ERROR]", err);
        moveLearnProcessingRef.current = false;
      });
  }, [
    (run as any).__checkMoveLearnQueue,
    (run as any).__checkMoveLearnAt,
    run.pendingMoveLearn,
  ]);

  // ─── Async: Process Move Learn Queue ────────────────────────────────────
  useEffect(() => {
    if (
      run.pendingMoveLearn ||
      !run.pendingMoveLearnQueue ||
      run.pendingMoveLearnQueue.length === 0
    )
      return;

    setRun((prev) => {
      if (
        prev.pendingMoveLearn ||
        !prev.pendingMoveLearnQueue ||
        prev.pendingMoveLearnQueue.length === 0
      )
        return prev;

      const [next, ...rest] = prev.pendingMoveLearnQueue;
      return {
        ...prev,
        pendingMoveLearn: next,
        pendingMoveLearnQueue: rest.length > 0 ? rest : null,
      };
    });
  }, [run.pendingMoveLearn, run.pendingMoveLearnQueue]);

  // ─── Async: Evolution Check on Level Up ─────────────────────────────────
  useEffect(() => {
    const queue = ((run as any).__checkEvolutionQueue || []) as any[];
    const legacyMarker = (run as any).__checkEvolutionAt;

    if (queue.length === 0 && !legacyMarker) return;

    // If already showing evolution modal, don't pop yet
    if (run.pendingEvolution) return;

    let marker: any;
    let nextQueue: any[] = [];

    if (legacyMarker) {
      marker = legacyMarker;
      nextQueue = queue;
    } else {
      const [m, ...rest] = queue;
      marker = m;
      nextQueue = rest;
    }

    const { pokemonUid, level, pokemonId, toId, toName } = marker;

    // console.log(
    //   `[Evolution] Checking evolution for ${pokemonUid} (ID: ${pokemonId}) at level ${level}. Explicit Target: ${toName || "None"}`,
    // );

    setRun((prev) => {
      const next = { ...prev };
      delete (next as any).__checkEvolutionAt;
      if (nextQueue.length === 0) {
        delete (next as any).__checkEvolutionQueue;
      } else {
        (next as any).__checkEvolutionQueue = nextQueue;
      }
      return next;
    });

    const checkEvolution = async () => {
      try {
        const species = await getPokemonSpecies(pokemonId);
        const chain = await getEvolutionChain(species.evolution_chain.url);

        const findInChain = (node: any): any => {
          if (node.species.name.toLowerCase() === species.name.toLowerCase())
            return node;
          for (const next of node.evolves_to) {
            const found = findInChain(next);
            if (found) return found;
          }
          return null;
        };

        const node = findInChain(chain.chain);
        if (!node) {
          // console.log(
          //   `[Evolution] Pokemon ${species.name} not found in evolution chain`,
          // );
          return;
        }

        // --- NEW: Explicit stone/item target ---
        if (toId && toName) {
          const evoPokeRes = await fetch(
            `https://pokeapi.co/api/v2/pokemon/${toId}`,
          ).then((r) => r.json());

          const fromPokemon = run.team.find((p) => p.uid === pokemonUid);
          if (!fromPokemon) return;

          setRun((prev) => {
            if (prev.pendingEvolution) return prev;
            return {
              ...prev,
              pendingEvolution: {
                pokemonUid: fromPokemon.uid,
                fromName: fromPokemon.name,
                toId: toId,
                toName: toName,
                reason: marker.reason || "Piedra evolutiva",
              },
            };
          });
          return;
        }

        if (node.evolves_to.length === 0) {
          // console.log(`[Evolution] ${species.name} has no further evolutions.`);
          return;
        }

        for (const evo of node.evolves_to) {
          const detail = evo.evolution_details.find((d: any) => {
            const levelMatch = !d.min_level || d.min_level <= level;
            const triggerMatch = d.trigger.name === "level-up";
            const match = triggerMatch && levelMatch;
            if (!match) {
              // console.log(
              //   `[Evolution] ${species.name} -> ${evo.species.name} detail not met or not level-up trigger`,
              // );
            }
            return match;
          });

          if (!detail) continue;

          // console.log(
          //   `[Evolution] Found valid evolution: ${species.name} -> ${evo.species.name}`,
          // );

          const parts = evo.species.url.split("/").filter(Boolean);
          const evoId = parseInt(parts[parts.length - 1]);
          const evoPokeRes = await fetch(
            `https://pokeapi.co/api/v2/pokemon/${evoId}`,
          ).then((r) => r.json());

          const fromPokemon = run.team.find((p) => p.uid === pokemonUid);
          if (!fromPokemon) {
            // console.log(
            //   `[Evolution] Source pokemon ${pokemonUid} not found in team`,
            // );
            return;
          }

          setRun((prev) => {
            if (prev.pendingEvolution) return prev;
            // console.log(
            //   `[Evolution] Setting pendingEvolution for ${fromPokemon.name} -> ${evoPokeRes.name}`,
            // );
            return {
              ...prev,
              pendingEvolution: {
                pokemonUid,
                fromName: fromPokemon.name,
                toName:
                  evoPokeRes.name.charAt(0).toUpperCase() +
                  evoPokeRes.name.slice(1),
                toId: evoPokeRes.id,
                reason: `nivel ${level}`,
              },
            };
          });
          break;
        }
      } catch (e) {
        // console.error("[Evolution] Evolution check failed", e);
      }
    };

    checkEvolution();
  }, [
    (run as any).__checkEvolutionQueue,
    (run as any).__checkEvolutionAt,
    run.pendingEvolution,
  ]);

  useEffect(() => {
    const marker = (run as any).__spawnNextGymPokemon;
    if (!marker || !run.currentBattle) return;

    // Limpiar marker
    setRun((prev) => {
      const next = { ...prev };
      delete (next as any).__spawnNextGymPokemon;
      return next;
    });

    const { pokemonId, level, referenceBst } = marker;

    getPokemonData(pokemonId, level, false).then((baseEnemy) => {
      const teamAverageBst = calculateTeamBST(run.team);
      const multiplier = getBossMultiplier(teamAverageBst, referenceBst);
      const nextEnemy = scaleGymPokemon(baseEnemy, multiplier, false);

      setRun((prev) => {
        if (!prev.currentBattle) return prev;
        return {
          ...prev,
          currentBattle: {
            ...prev.currentBattle,
            enemyPokemon: nextEnemy,
            turnState: "idle",
            turnQueue: [],
            pendingAnimation: null,
            enemyReady: false, // resetear para el nuevo Pokémon
          },
          battleLog: [
            ...prev.battleLog,
            {
              id: generateUid(),
              text: `¡${nextEnemy.name} sale a combatir!`,
              type: "danger" as any,
            },
          ].slice(-40),
        };
      });
    });
  }, [(run as any).__spawnNextGymPokemon]);

  useGameLoop(run.isActive, run.speedMultiplier, tick);

  return { tick, regionZones, regionGyms };
}
