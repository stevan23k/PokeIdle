import { useRef, useState } from "react";
import { useGame } from "../../../context/GameContext";
import { useGameLoop } from "./useGameLoop";
import {
  calculateDamage,
  chooseBestMove,
  applyDamage,
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
import { REGIONS } from "../../../lib/regions";
import {
  getPokemonData,
  learnMovesOnLevelUp,
} from "../services/pokeapi.service";
import { ITEMS, generateLootOptions } from "../../../lib/items";
import { generateUid } from "../../../utils/random";
import type { ActiveMove, PokemonStats } from "../types/game.types";

export function useEngineTick() {
  const { run, setRun, setMeta, notify } = useGame();
  const fetchingRef = useRef(false);

  const tick = async () => {
    if (
      !run.isActive ||
      fetchingRef.current ||
      run.isPaused ||
      run.pendingLootSelection
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
                REGIONS[run.currentRegion]?.zones[run.currentZoneIndex]?.name ||
                "Desconocido",
              totalCaptured: run.totalCaptured,
              totalBattlesWon: run.totalBattlesWon,
              totalFainted: run.totalFainted,
              moneyEarned: run.money,
              maxLevel: Math.max(...run.team.map((p) => p.level), 0),
              duration: Date.now() - run.startedAt,
              reasonEnded: "defeat",
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

    const region = REGIONS[run.currentRegion];
    const currentZone = region.zones[run.currentZoneIndex];

    if (!run.currentBattle) {
      // Progress zone
      const nextProgress =
        run.currentZoneProgress + (run.speedMultiplier === "SKIP" ? 20 : 10);

      if (nextProgress >= 100) {
        // Find encounter
        fetchingRef.current = true;
        try {
          const requiredBattles = currentZone.trainerCount || 3;
          const isBossTime = run.zoneBattlesWon >= requiredBattles;
          let enemy;
          let isBoss = false;

          if (isBossTime) {
            const teamMaxLevel = Math.max(...run.team.map((p) => p.level), 5);
            const bossLevel = teamMaxLevel + 2;
            const encounter = getWildEncounter(currentZone);

            // Perfect IVs for Boss
            const perfectIVs: PokemonStats = {
              hp: 31,
              attack: 31,
              defense: 31,
              spAtk: 31,
              spDef: 31,
              speed: 31,
            };
            // Favorable nature (Firme/Adamant for physical, Modesta/Modest for special)
            // Just picking one for now or we could randomize among "good" ones
            const forcedNature = "adamant";

            enemy = await getPokemonData(
              encounter.pokemonId,
              bossLevel,
              false,
              perfectIVs,
              forcedNature,
            );
            enemy.name = `BOSS ${enemy.name}`;
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

          setRun((prev) => ({
            ...prev,
            currentZoneProgress: 0,
            currentBattle: {
              type: "wild", // Always wild to allow capture UI
              phase: "active",
              playerPokemon: activePlayer!,
              enemyPokemon: enemy,
              turnCount: 0,
              isBossBattle: isBoss,
              bossMaxBars: isBoss ? 2 : 1,
              bossCurrentBar: isBoss ? 1 : 1,
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
          }));
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
      const currentBattle = state.currentBattle;
      if (!currentBattle) return state;

      let nextState = { ...state };
      let bState = { ...currentBattle };
      let logs = [...nextState.battleLog];
      const pushLog = (text: string, type: any = "normal") => {
        logs.push({ id: generateUid(), text, type });
      };

      if (bState.playerPokemon.currentHP === 0) {
        const nextP = getNextActivePokemon(nextState.team);
        if (nextP) {
          pushLog(`¡Adelante ${nextP.name}!`, "normal");
          bState.playerPokemon = nextP;
          nextState.currentBattle = bState;
          nextState.battleLog = logs.slice(-40);
        }
        return nextState;
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
        pMove = chooseBestMove(bState.playerPokemon, bState.enemyPokemon);
      }

      const eMove = selectEnemyMove(bState.enemyPokemon, bState.playerPokemon);

      if (!pMove && !usedManualTurn) {
        // En auto-battle, si no hay movimientos con PP, intentar cambiar.
        if (!nextState.isManualBattle) {
          const nextP = getNextActivePokemon(
            nextState.team.filter((p) => p.uid !== bState.playerPokemon.uid),
          );
          if (nextP) {
            pushLog(
              `${bState.playerPokemon.name} no tiene movimientos útiles. ¡Adelante ${nextP.name}!`,
              "normal",
            );
            bState.playerPokemon = nextP;
            usedManualTurn = true;
          } else {
            pushLog(
              `${bState.playerPokemon.name} no tiene más movimientos útiles y no hay reemplazos.`,
              "danger",
            );
            // Pokémon struggles or does nothing, for now, just skip turn
          }
        } else {
          pushLog(
            `${bState.playerPokemon.name} no puede atacar. Cambia de Pokémon.`,
            "danger",
          );
          nextState.battleLog = logs.slice(-40);
          return nextState; // Wait for switch input
        }
      }

      let nextEnemyHP = bState.enemyPokemon.currentHP;

      // If we switched this turn, we skip the player attack phase
      if (!usedManualTurn || pMove) {
        // Player attacks
        pushLog(
          `${bState.playerPokemon.name} usa ${pMove!.moveName}.`,
          "attack",
        );
        let {
          damage: pDmg,
          isCrit: pCrit,
          effectiveness: pEff,
        } = calculateDamage(bState.playerPokemon, bState.enemyPokemon, pMove!);

        const { nextHP, focusBandTriggered: pFocusTriggered } = applyDamage(
          bState.enemyPokemon,
          pDmg,
        );
        nextEnemyHP = nextHP;

        if (pCrit) pushLog(`¡GOLPE CRÍTICO!`, "crit");
        if (pEff >= 2) pushLog(`¡Es súper efectivo!`, "super");
        if (pEff < 1 && pEff > 0) pushLog(`No es muy efectivo...`, "not-very");
        if (pEff === 0)
          pushLog(`No afecta a ${bState.enemyPokemon.name}...`, "not-very");

        if (pFocusTriggered) {
          pushLog(
            `¡${bState.enemyPokemon.name} aguantó el golpe con su Banda Focus!`,
            "normal",
          );
        }

        const pMoveIdx = bState.playerPokemon.moves.findIndex(
          (m: any) => m.moveId === pMove!.moveId,
        );
        if (pMoveIdx >= 0) {
          bState.playerPokemon.moves[pMoveIdx].currentPP = Math.max(
            0,
            bState.playerPokemon.moves[pMoveIdx].currentPP - 1,
          );
        }

        if (nextEnemyHP === 0) {
          // Boss phase transition
          if (
            bState.isBossBattle &&
            (bState.bossCurrentBar || 1) < (bState.bossMaxBars || 1)
          ) {
            bState.bossCurrentBar = (bState.bossCurrentBar || 1) + 1;
            bState.enemyPokemon.currentHP = bState.enemyPokemon.maxHP;

            // Apply +2 Boosts
            bState.enemyPokemon.statModifiers.atk = Math.min(
              6,
              bState.enemyPokemon.statModifiers.atk + 2,
            );
            bState.enemyPokemon.statModifiers.spa = Math.min(
              6,
              bState.enemyPokemon.statModifiers.spa + 2,
            );

            pushLog(
              `¡${bState.enemyPokemon.name} recupera fuerzas y se enfurece!`,
              "danger",
            );
            pushLog(
              `¡EL BOSS OBTIENE +2 ATAQUE Y +2 ATAQUE ESPECIAL!`,
              "danger",
            );

            nextState.currentBattle = bState;
            nextState.battleLog = logs.slice(-40);
            return nextState;
          }

          pushLog(
            `¡${bState.enemyPokemon.name} enemigo se ha debilitado!`,
            "normal",
          );

          const xpGained = calculateXPGain(
            bState.enemyPokemon.level,
            50,
            bState.type !== "wild",
            state.expMultiplier,
          );
          pushLog(
            `¡${bState.playerPokemon.name} gana ${xpGained} puntos de experiencia!`,
            "normal",
          );

          let newPlayer = {
            ...bState.playerPokemon,
            xp: bState.playerPokemon.xp + xpGained,
          };
          // XP Share distribution
          nextState.team = distributeTeamXP(
            nextState.team,
            newPlayer.uid,
            xpGained,
            nextState.hasExpShare,
          );
          while (newPlayer.xp >= newPlayer.xpToNext && newPlayer.level < 100) {
            const prevLevel = newPlayer.level;
            newPlayer = levelUpPokemon(newPlayer);
            pushLog(
              `¡${newPlayer.name} subió al nivel ${newPlayer.level}!`,
              "level",
            );
            // Async: check if Pokémon learns a new move at this level
            const leveledPlayer = { ...newPlayer };
            const newLvl = newPlayer.level;
            learnMovesOnLevelUp(leveledPlayer, newLvl).then((updatedMoves) => {
              if (updatedMoves) {
                const newMoveName =
                  updatedMoves[updatedMoves.length - 1].moveName;
                setRun((prev) => ({
                  ...prev,
                  team: prev.team.map((p) =>
                    p.uid === leveledPlayer.uid
                      ? { ...p, moves: updatedMoves }
                      : p,
                  ),
                  battleLog: [
                    ...prev.battleLog,
                    {
                      id: generateUid(),
                      text: `¡${leveledPlayer.name} aprendió ${newMoveName}!`,
                      type: "level" as const,
                    },
                  ].slice(-40),
                }));
              }
            });
          }

          nextState.team = nextState.team.map((p: any) =>
            p.uid === newPlayer.uid ? newPlayer : p,
          );

          // --- STATISTICS UPDATES ---
          nextState.totalBattlesWon += 1;
          nextState.winStreak += 1;
          nextState.maxWinStreak = Math.max(
            nextState.maxWinStreak,
            nextState.winStreak,
          );

          const moneyReward = 10 + bState.enemyPokemon.level * 2;
          nextState.money += moneyReward;

          // Track highest level
          nextState.team.forEach((p) => {
            if (p.level > nextState.team[0].level) {
              // Not quite right, need a high score
              // Handled below with meta update if needed
            }
          });

          nextState.currentBattle = null;

          if (bState.isBossBattle) {
            pushLog(`¡Has derrotado al BOSS de la zona!`, "badge");
            const zoneName = currentZone.name;
            const cardId = `carta-${currentZone.id}`;
            pushLog(`¡Recibes la Carta ${zoneName}!`, "evolution");
            pushLog(`¡Experiencia ganada permanentemente aumentada!`, "normal");
            nextState.expMultiplier += 0.2;
            nextState.items[cardId] = (nextState.items[cardId] || 0) + 1;

            if (nextState.currentZoneIndex < region.zones.length - 1) {
              nextState.currentZoneIndex += 1;
              nextState.zoneBattlesWon = 0;
              pushLog(
                `¡Avanzaste a ${region.zones[nextState.currentZoneIndex].name}!`,
                "badge",
              );
            }
          } else {
            nextState.zoneBattlesWon = (nextState.zoneBattlesWon || 0) + 1;
            const requiredBattles = currentZone.trainerCount || 3;
            if (nextState.zoneBattlesWon >= requiredBattles) {
              pushLog(`¡ZONA COMPLETADA! ¡Prepárate para el BOSS!`, "badge");
            }
          }

          nextState.pendingLootSelection = generateLootOptions();

          nextState.battleLog = logs.slice(-40);
          return nextState;
        }

        bState.enemyPokemon = {
          ...bState.enemyPokemon,
          currentHP: nextEnemyHP,
        };
      }

      // Enemy attacks
      pushLog(
        `${bState.enemyPokemon.name} enemigo usa ${eMove.moveName}.`,
        "danger",
      );
      let {
        damage: eDmg,
        isCrit: eCrit,
        effectiveness: eEff,
      } = calculateDamage(bState.enemyPokemon, bState.playerPokemon, eMove);

      const { nextHP: nextPlayerHP_val, focusBandTriggered: eFocusTriggered } =
        applyDamage(bState.playerPokemon, eDmg);
      let nextPlayerHP = nextPlayerHP_val;

      if (eCrit) pushLog(`¡GOLPE CRÍTICO!`, "crit");
      if (eEff >= 2) pushLog(`¡Es súper efectivo!`, "danger");
      if (eEff < 1 && eEff > 0) pushLog(`No es muy efectivo...`, "not-very");

      if (eFocusTriggered) {
        pushLog(
          `¡${bState.playerPokemon.name} aguantó el golpe con su Banda Focus!`,
          "normal",
        );
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
        nextEnemyHP / bState.enemyPokemon.maxHP < 0.3
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
          let caught = false;
          let attempts = 0;
          const maxAttempts =
            nextEnemyHP / bState.enemyPokemon.maxHP <= 0.15 ? 2 : 1;

          while (
            attempts < maxAttempts &&
            nextState.items["poke-ball"] > 0 &&
            !caught
          ) {
            attempts++;
            nextState.items["poke-ball"] -= 1;
            pushLog(
              `Intentando atrapar a ${bState.enemyPokemon.name}...`,
              "capture",
            );
            const catchAttempt = calculateCaptureChance(
              bState.enemyPokemon,
              ITEMS["poke-ball"],
              null,
              255, // default rate
              bState.isBossBattle,
            );
            pushLog(catchAttempt.log, "normal");
            if (catchAttempt.success) {
              caught = true;
            }
          }

          if (caught) {
            pushLog(`¡${bState.enemyPokemon.name} fue atrapado!`, "capture");
            nextState.totalCaptured += 1;

            bState.enemyPokemon = {
              ...bState.enemyPokemon,
              caughtAt: currentZone.name,
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
            nextState.pendingLootSelection = generateLootOptions();

            // Unlock or Update Starter Genetics
            setMeta((m) => {
              const existing = m.unlockedStarters.find(
                (s) => s.id === bState.enemyPokemon.pokemonId,
              );

              if (existing) {
                let updated = false;
                const newMaxIvs = { ...existing.maxIvs };
                const newMaxEvs = { ...existing.maxEvs };

                (
                  [
                    "hp",
                    "attack",
                    "defense",
                    "spAtk",
                    "spDef",
                    "speed",
                  ] as const
                ).forEach((stat) => {
                  if (bState.enemyPokemon.ivs[stat] > newMaxIvs[stat]) {
                    newMaxIvs[stat] = bState.enemyPokemon.ivs[stat];
                    updated = true;
                  }
                  if (bState.enemyPokemon.evs[stat] > newMaxEvs[stat]) {
                    newMaxEvs[stat] = bState.enemyPokemon.evs[stat];
                    updated = true;
                  }
                });

                const newNatures = new Set(existing.unlockedNatures);
                if (!newNatures.has(bState.enemyPokemon.nature)) {
                  newNatures.add(bState.enemyPokemon.nature);
                  updated = true;
                }

                if (!updated) return m;

                return {
                  ...m,
                  unlockedStarters: m.unlockedStarters.map((s) =>
                    s.id === existing.id
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
          }
        }
      }

      if (nextState.currentBattle !== null) {
        nextState.currentBattle = bState;
      }
      nextState.battleLog = logs.slice(-40);
      return nextState;
    });
  };

  useGameLoop(run.isActive, run.speedMultiplier, tick);
}
