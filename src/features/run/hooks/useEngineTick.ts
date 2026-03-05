import { useRef, useState } from "react";
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
import { REGIONS } from "../../../lib/regions";
import {
  getPokemonData,
  learnMovesOnLevelUp,
} from "../services/pokeapi.service";
import { ITEMS, generateLootOptions } from "../../../lib/items";
import { generateUid } from "../../../utils/random";
import type { ActiveMove, PokemonStats } from "../types/game.types";
import {
  calculateTeamBST,
  getBossMultiplier,
  scaleGymPokemon,
} from "../../../engine/boss.engine";

export function useEngineTick() {
  const { run, setRun, setMeta, notify } = useGame();
  const fetchingRef = useRef(false);

  const tick = async () => {
    if (
      !run.isActive ||
      fetchingRef.current ||
      run.isPaused ||
      run.pendingLootSelection ||
      run.pendingMoveLearn ||
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
                REGIONS[run.currentRegion]?.zones[run.currentZoneIndex]?.name ||
                "Desconocido",
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

    const region = REGIONS[run.currentRegion];
    const currentZone = region.zones[run.currentZoneIndex];

    if (!run.currentBattle) {
      // Progress zone
      const nextProgress =
        run.currentZoneProgress + (run.speedMultiplier === "SKIP" || run.isManualBattle ? 100 : 10);

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

          setRun((prev) => ({
            ...prev,
            currentZoneProgress: 0,
            currentBattle: {
              type: "wild", // Always wild to allow capture UI
              phase: "active",
              turnState: "idle",
              playerPokemon: activePlayer!,
              enemyPokemon: enemy,
              turnCount: 0,
              isBossBattle: isBoss,
              activeMechanic: activeMechanic,
              bossMaxBars: isBoss
                ? run.gymsBadges.length === 0
                  ? 1
                  : run.gymsBadges.length < 4
                    ? 2
                    : 3
                : 1,
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
      const currentBattle = state.currentBattle;
      if (!currentBattle) return state;

      let nextState = { ...state };
      let bState = { ...currentBattle };
      let logs = [...nextState.battleLog];
      const pushLog = (text: string, type: any = "normal") => {
        logs.push({ id: generateUid(), text, type });
      };

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
        
        // Store the chosen moves temporarily on the state so we don't have to recalculate them
        (bState as any)._pMove = pMove;
        (bState as any)._eMove = eMove;
        (bState as any)._usedManualTurn = usedManualTurn;
        
        bState.turnState = "turn_start";
        nextState.currentBattle = bState;
        nextState.battleLog = logs.slice(-40);
        return nextState;
      }
      
      if (bState.turnState === "animating") {
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

      // We are in turn_start or apply_damage, and need to process the next actor in the queue
      const currentActor = (bState.turnQueue || [])[0]; // "p" or "e"

      if (currentActor) {
        // --- ACTION CALCULATE PHASE ---
        const isPlayer = currentActor === "p";
        const attacker = isPlayer ? bState.playerPokemon : bState.enemyPokemon;
        const defender = isPlayer ? bState.enemyPokemon : bState.playerPokemon;
        const move = isPlayer ? (bState as any)._pMove : (bState as any)._eMove;
        const usedManual = isPlayer ? (bState as any)._usedManualTurn : false;
        
        // If the player used a manual switch or item and didn't select a move, skip attack calc
        if (isPlayer && usedManual && !move) {
           (bState.turnQueue || []).shift(); // Remove "p"
           nextState.currentBattle = bState;
           nextState.battleLog = logs.slice(-40);
           return nextState; // Loop will continue on next tick for enemy
        }

        if (move && attacker.currentHP > 0 && defender.currentHP > 0) {
           let canAttack = true;

           // Esporas en el Aire mechanic
           if (
             bState.activeMechanic === "esporas_aire" &&
             !attacker.status
           ) {
             const isImmune = attacker.types.some((t: string) =>
               ["poison", "steel"].includes(t.toLowerCase()),
             );
             const moveType = move?.type.toLowerCase();
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
               pushLog(`¡${attacker.name} se despertó!`, isPlayer ? "normal" : "danger");
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
               pushLog(`¡${attacker.name} se descongeló!`, isPlayer ? "normal" : "danger");
             } else {
               pushLog(
                 `¡${attacker.name} está congelado!`,
                 "normal",
               );
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
             let {
               damage,
               isCrit,
               effectiveness,
             } = calculateDamage(
               attacker,
               defender,
               move,
               bState.activeMechanic,
             );

             // Calculate Status Effect from Move
             let statusEffectToApply = null;
             if (
               move.statusEffect &&
               !defender.status &&
               defender.currentHP - damage > 0
             ) {
               if (Math.random() * 100 < move.statusEffect.chance) {
                 statusEffectToApply = move.statusEffect.condition;
               }
             }

             // Campo Electrificado mechanic
             if (
               bState.activeMechanic === "campo_electrificado" &&
               move.category === "physical" &&
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
               moveType: move.type,
               moveCategory: move.category,
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
                 (m: any) => m.moveId === move.moveId,
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
             nextState.currentBattle = bState;
             nextState.battleLog = logs.slice(-40);
             return nextState; 
           }
        }
        
        // If they couldn't attack, or no move, just remove from queue and proceed
        if (bState.turnQueue) bState.turnQueue.shift();
        nextState.currentBattle = bState;
        nextState.battleLog = logs.slice(-40);
        return nextState; 
      }
      
      // If we reach here, turnQueue is empty, meaning both actors have finished their turn actions
      // We process end of turn effects, then reset to idle
      
      bState.turnState = "idle";
      
      // Cleanup temporary turn state vars
      delete (bState as any)._pMove;
      delete (bState as any)._eMove;
      delete (bState as any)._usedManualTurn;

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
            nextState.pendingLootSelection = generateLootOptions([], {
              team: nextState.team,
              pc: nextState.pc,
            });

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

                const pokemonId = bState.enemyPokemon.pokemonId;
                const pokemonName = bState.enemyPokemon.name;
                const runProgress = nextState.inheritanceProgress[
                  pokemonId
                ] || {
                  pokemonId,
                  pokemonName,
                  ivs: {},
                  evs: {},
                  newNatures: [],
                };

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
                  if (bState.enemyPokemon.ivs[stat] > existing.maxIvs[stat]) {
                    runProgress.ivs[stat] = [
                      existing.maxIvs[stat],
                      bState.enemyPokemon.ivs[stat],
                    ];
                  }
                  if (bState.enemyPokemon.evs[stat] > existing.maxEvs[stat]) {
                    runProgress.evs[stat] = [
                      existing.maxEvs[stat],
                      bState.enemyPokemon.evs[stat],
                    ];
                  }
                });

                if (
                  !existing.unlockedNatures.includes(bState.enemyPokemon.nature)
                ) {
                  if (
                    !runProgress.newNatures.includes(bState.enemyPokemon.nature)
                  ) {
                    runProgress.newNatures.push(bState.enemyPokemon.nature);
                  }
                }

                nextState.inheritanceProgress[pokemonId] = runProgress;

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
