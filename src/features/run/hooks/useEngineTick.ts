import { useRef, useState, useEffect } from "react";
import { useGame } from "../../../context/GameContext";
import { useGameLoop } from "./useGameLoop";
import {
  calculateDamage,
  chooseBestMove,
  applyDamage,
  determineAttackOrder,
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
import { getZonesForRegion } from "../../../lib/regions.service";
import type { Zone } from "../../../lib/regions";
import {
  getPokemonData,
  learnMovesOnLevelUp,
  getPokemonSpecies,
  getEvolutionChain,
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

export function useEngineTick() {
  const { run, setRun, setMeta, notify } = useGame();
  const fetchingRef = useRef(false);
  const turnStateRef = useRef<string>("idle");
  const processedAnimRef = useRef<string | null>(null);

  const [regionZones, setRegionZones] = useState<Zone[]>([]);

  useEffect(() => {
    getZonesForRegion(run.currentRegion).then(setRegionZones);
  }, [run.currentRegion]);

  const tick = async () => {
    if (
      !run.isActive ||
      fetchingRef.current ||
      run.isPaused ||
      run.pendingLootSelection ||
      run.pendingMoveLearn ||
      run.pendingEvolution ||
      run.pendingZoneTransition
    )
      return;

    if (run.team.length > 0 && run.team.every((p) => p.currentHP === 0)) {
      if (run.currentBattle) {
        setRun((p) => ({
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
        }));
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

    const region = { zones: regionZones };
    const currentZone = region.zones[run.currentZoneIndex];

    if (!run.currentBattle) {
      // Progress zone
      const nextProgress =
        run.currentZoneProgress +
        (run.speedMultiplier === "SKIP" || run.isManualBattle ? 100 : 10);

      if (nextProgress >= 100) {
        // Find encounter
        fetchingRef.current = true;
        try {
          const requiredBattles = currentZone.trainerCount || 3;
          const isBossTime = run.zoneBattlesWon >= requiredBattles;
          let enemy;
          let isBoss = false;
          let activeMechanic = undefined;

          if (isBossTime) {
            const teamMaxLevel = Math.max(...run.team.map((p) => p.level), 5);
            const bossLevel = teamMaxLevel + 1; // More balanced
            const encounter = getWildEncounter(currentZone);

            let baseEnemy = await getPokemonData(
              encounter.pokemonId,
              bossLevel,
              false,
            );

            // Dynamic Boss Scaling (using the zone's reference BST)
            // Note: Route bosses do not trigger Gym Mechanics, so activeMechanic stays undefined.
            const teamAverageBst = calculateTeamBST(run.team);
            const multiplier = getBossMultiplier(
              teamAverageBst,
              currentZone.referenceBst || 280,
            );

            enemy = scaleGymPokemon(baseEnemy, multiplier, true);
            isBoss = true;
          } else {
            const encounter = getWildEncounter(currentZone);
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
            if (prev.currentBattle) return prev;

            return {
              ...prev,
              currentZoneProgress: 0,
              currentBattle: {
                type: "wild",
                phase: "active",
                turnState: "idle",
                playerPokemon: activePlayer!,
                enemyPokemon: enemy,
                turnCount: 0,
                isBossBattle: isBoss,
                activeMechanic: activeMechanic,
                bossMaxBars: 1,
                bossCurrentBar: 1,
              },
              battleLog: [
                ...prev.battleLog,
                {
                  id: generateUid(),
                  text: isBoss
                    ? `¡EL BOSS ${enemy.name} TE DESAFÍA!`
                    : `¡Un salvaje ${enemy.name} ha aparecido!`,
                  type: isBoss ? "danger" : ("normal" as any),
                },
              ].slice(-40),
            };
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

    // --- ACTIVE BATTLE ---
    // We do functional state update to ensure latest state
    setRun((state) => {
      // Guard against stale state reads during animation
      if (
        turnStateRef.current === "animating" &&
        state.currentBattle?.turnState === "animating"
      ) {
        return state;
      }

      let nextState = { ...state };
      let logs = [...nextState.battleLog];

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

      const bState = {
        ...nextState.currentBattle,
      } as import("../types/game.types").BattleState;
      const pushLog = (text: string, type: any = "normal") => {
        logs.push({ id: generateUid(), text, type });
      };

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
            const region = { zones: regionZones };
            if (nextState.currentZoneIndex + 1 < region.zones.length) {
              nextState.currentZoneIndex += 1;
              nextState.zoneBattlesWon = 0;
              nextState.pendingZoneTransition = true;
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
          nextState.currentBattle = null;
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
          nextState.currentBattle = null;
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

        bState.turnState = "turn_start";
        turnStateRef.current = "turn_start";
        nextState.currentBattle = bState;
        nextState.battleLog = logs.slice(-40);
        return nextState;
      }

      if (bState.turnState === "animating") {
        turnStateRef.current = "animating";
        return state; // Wait for UI to resolve animation
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
        // We are in turn_start, and need to process the next actor in the queue
        const currentActor = (bState.turnQueue || [])[0]; // "p" or "e"

        if (currentActor) {
          // --- ACTION CALCULATE PHASE ---
          const isPlayer = currentActor === "p";
          const attacker = isPlayer
            ? bState.playerPokemon
            : bState.enemyPokemon;
          const defender = isPlayer
            ? bState.enemyPokemon
            : bState.playerPokemon;
          const move = isPlayer
            ? bState.playerCurrentMove
            : bState.enemyCurrentMove;
          const usedManual = isPlayer ? bState.usedManualTurn : false;

          let resolvedMove = move;
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
              let { damage, isCrit, effectiveness } = calculateDamage(
                attacker,
                defender,
                resolvedMove,
                bState.activeMechanic,
              );

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

              // Pre-deduct PP
              if (isPlayer) {
                const pMoveIdx = attacker.moves.findIndex(
                  (m: any) => m.moveId === resolvedMove.moveId,
                );
                if (pMoveIdx >= 0) {
                  attacker.moves[pMoveIdx].currentPP = Math.max(
                    0,
                    attacker.moves[pMoveIdx].currentPP - 1,
                  );
                }
              }

              // Transition to animating, the actual damage will be applied via resolveAnimation by the UI
              bState.turnState = "animating";
              turnStateRef.current = "animating";
              nextState.currentBattle = bState;
              nextState.battleLog = logs.slice(-40);
              return nextState;
            }
          }

          // If they couldn't attack, or no move, just remove from queue and proceed
          bState.turnQueue = bState.turnQueue ? bState.turnQueue.slice(1) : [];

          if (!resolvedMove && isPlayer) {
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

          // Apply damage
          const { nextHP, focusBandTriggered } = applyDamage(
            defender,
            anim.damage,
          );

          if (isPlayer) {
            bState.enemyPokemon = { ...bState.enemyPokemon, currentHP: nextHP };
          } else {
            bState.playerPokemon = {
              ...bState.playerPokemon,
              currentHP: nextHP,
            };
          }

          // Apply status if any
          if (anim.statusApplied && !defender.status) {
            defender.status = anim.statusApplied;
            pushLog(
              `¡${defender.name} ahora está ${anim.statusApplied}!`,
              isPlayer ? "normal" : "danger",
            );
          }

          // Logs
          if (move) {
            pushLog(
              `${attacker.name} usó ${move.moveName} causando ${anim.damage} de daño!`,
              isPlayer ? "attack" : "normal",
            );
          }
          if (anim.effectiveness > 1.5) pushLog("¡Es súper efectivo!", "super");
          if (anim.effectiveness < 0.7 && anim.effectiveness > 0)
            pushLog("No es muy efectivo...", "not-very");
          if (anim.effectiveness === 0)
            pushLog(`No afecta a ${defender.name}...`, "normal");
          if (anim.isCrit) pushLog("¡Un golpe crítico!", "crit");
          if (focusBandTriggered)
            pushLog(
              `¡${defender.name} resistió el golpe con su Cinta Focus!`,
              "normal",
            );

          bState.pendingAnimation = null;
        }

        // Shift queue and determine next turnState
        bState.turnQueue = bState.turnQueue ? bState.turnQueue.slice(1) : [];

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
            const region = { zones: regionZones };
            if (nextState.currentZoneIndex + 1 < region.zones.length) {
              nextState.currentZoneIndex += 1;
              nextState.zoneBattlesWon = 0;
              nextState.pendingZoneTransition = true;
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

          let currentActive = updatedTeam.find(
            (p) => p.uid === bState.playerPokemon.uid,
          );
          let pendingLearnMove:
            | import("../types/game.types").ActiveMove
            | null = null;
          let pendingEvoData:
            | import("../types/game.types").EvolutionData
            | null = null;

          if (currentActive) {
            currentActive.xp += xpGain;
            pushLog(`¡${currentActive.name} ganó ${xpGain} PV!`, "level");

            while (currentActive.xp >= xpToNextLevel(currentActive.level)) {
              const prevLevel = currentActive.level;
              const leveled = levelUpPokemon(currentActive);
              pushLog(
                `¡${leveled.name} subió al nivel ${leveled.level}!`,
                "level",
              );
              currentActive = leveled;

              // Queue move learning (async — handled after setRun via side effect)
              // We store the level for post-battle async check
              if (!nextState.pendingMoveLearn) {
                // Mark that we need to check for new moves at this level
                // The actual async fetch happens in a useEffect outside the reducer
                (nextState as any).__checkMoveLearnAt = {
                  pokemonUid: currentActive.uid,
                  level: currentActive.level,
                };
              }

              // Queue evolution check — also async, mark for post-battle check
              if (!pendingEvoData) {
                (nextState as any).__checkEvolutionAt = {
                  pokemonUid: currentActive.uid,
                  level: currentActive.level,
                  pokemonId: currentActive.pokemonId,
                };
              }
            }
          }

          nextState.team = updatedTeam.map((p) =>
            p.uid === currentActive?.uid ? currentActive : p,
          );

          // Generate Loot
          nextState.pendingLootSelection = generateLootOptions([], {
            team: nextState.team,
            pc: nextState.pc,
          });

          // End Battle
          processedAnimRef.current = null;
          nextState.currentBattle = null;
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

        nextState.currentBattle = bState;
        nextState.battleLog = logs.slice(-40);
        return nextState;
      }

      // If we reach here, turnQueue is empty, meaning both actors have finished their turn actions
      // We process end of turn effects, then reset to idle

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
        // Simplified skip to next turn. Next tick will evaluate death properly.
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

      // Auto capture wild (ONLY UNOWNED POKEMON)
      if (
        nextState.autoCapture &&
        bState.type === "wild" &&
        nextPlayerHP > 0 &&
        nextEnemyHP > 0 &&
        nextEnemyHP / bState.enemyPokemon.maxHP < 0.3 &&
        !bState.pendingCaptureAnim // Don't trigger if already animating
      ) {
        const isOwned =
          nextState.team.some(
            (p: any) => p.pokemonId === bState.enemyPokemon.pokemonId,
          ) ||
          nextState.pc.some(
            (p: any) => p.pokemonId === bState.enemyPokemon.pokemonId,
          );

        if (
          (!isOwned || bState.isBossBattle) &&
          nextState.items["poke-ball"] > 0
        ) {
          nextState.items["poke-ball"] -= 1;
          const catchAttempt = calculateCaptureChance(
            bState.enemyPokemon,
            ITEMS["poke-ball"],
            null,
            255,
            bState.isBossBattle || false,
            nextState.totalCaptured,
            false,
            1.0,
          );

          pushLog(`Auto-captura: lanzando Poké Ball...`, "capture");

          // Trigger animation
          bState.pendingCaptureAnim = {
            ballId: "poke-ball",
            captured: catchAttempt.success,
          };
          bState.turnState = "animating";
          turnStateRef.current = "animating";

          nextState.currentBattle = bState;
          nextState.battleLog = logs.slice(-40);
          return nextState;
        }
      }

      if (nextState.currentBattle !== null) {
        nextState.currentBattle = bState;
      }
      nextState.battleLog = logs.slice(-40);
      return nextState;
    });
  };

  // ─── Async: Move Learn on Level Up ──────────────────────────────────────
  useEffect(() => {
    const marker = (run as any).__checkMoveLearnAt;
    if (!marker || run.pendingMoveLearn) return;
    const { pokemonUid, level } = marker;
    const pokemon = run.team.find((p) => p.uid === pokemonUid);
    if (!pokemon) return;

    // Clear marker immediately to avoid re-triggering
    setRun((prev) => {
      const next = { ...prev };
      delete (next as any).__checkMoveLearnAt;
      return next;
    });

    learnMovesOnLevelUp(pokemon, level).then((newMove) => {
      if (!newMove) return;
      setRun((prev) => {
        // Already has a pending learn — don't overwrite
        if (prev.pendingMoveLearn) return prev;
        const p = prev.team.find((t) => t.uid === pokemonUid);
        if (!p) return prev;
        // If has room, add directly
        if (p.moves.length < 4) {
          const nextMoves = [...p.moves, newMove];
          const updatedTeam = prev.team.map((t) =>
            t.uid === pokemonUid ? { ...t, moves: nextMoves } : t,
          );

          let nextBattle = prev.currentBattle;
          if (nextBattle && nextBattle.playerPokemon.uid === pokemonUid) {
            nextBattle = {
              ...nextBattle,
              playerPokemon: { ...nextBattle.playerPokemon, moves: nextMoves },
            };
          }

          return {
            ...prev,
            team: updatedTeam,
            currentBattle: nextBattle,
            battleLog: [
              ...prev.battleLog,
              {
                id: Date.now().toString(),
                text: `¡${p.name} aprendió ${newMove.moveName}!`,
                type: "level" as const,
              },
            ].slice(-40),
          };
        }
        // Full moveset — open modal
        return {
          ...prev,
          pendingMoveLearn: {
            pokemonUid,
            pokemonName: p.name,
            newMove,
          },
        };
      });
    });
  }, [(run as any).__checkMoveLearnAt]);

  // ─── Async: Evolution Check on Level Up ─────────────────────────────────
  useEffect(() => {
    const marker = (run as any).__checkEvolutionAt;
    if (!marker || run.pendingEvolution) return;
    const { pokemonUid, level, pokemonId } = marker;

    setRun((prev) => {
      const next = { ...prev };
      delete (next as any).__checkEvolutionAt;
      return next;
    });

    const checkEvolution = async () => {
      try {
        const species = await getPokemonSpecies(pokemonId);
        const chain = await getEvolutionChain(species.evolution_chain.url);

        // Find this pokemon in the chain
        const findInChain = (node: any): any => {
          if (node.species.name === species.name) return node;
          for (const next of node.evolves_to) {
            const found = findInChain(next);
            if (found) return found;
          }
          return null;
        };

        const node = findInChain(chain.chain);
        if (!node || node.evolves_to.length === 0) return;

        for (const evo of node.evolves_to) {
          const detail = evo.evolution_details.find(
            (d: any) =>
              d.trigger.name === "level-up" &&
              d.min_level &&
              d.min_level <= level,
          );
          if (!detail) continue;

          // Found a valid level-up evolution
          const evoSpeciesRes = await fetch(
            `https://pokeapi.co/api/v2/pokemon-species/${evo.species.name}`,
          ).then((r) => r.json());
          const evoPokeRes = await fetch(
            `https://pokeapi.co/api/v2/pokemon/${evo.species.name}`,
          ).then((r) => r.json());

          const fromPokemon = run.team.find((p) => p.uid === pokemonUid);
          if (!fromPokemon) return;

          setRun((prev) => {
            if (prev.pendingEvolution) return prev;
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
        console.error("Evolution check failed", e);
      }
    };

    checkEvolution();
  }, [(run as any).__checkEvolutionAt]);

  useGameLoop(run.isActive, run.speedMultiplier, tick);
}
