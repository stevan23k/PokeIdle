import { useRef } from "react";
import { useGame } from "../../../context/GameContext";
import { useGameLoop } from "../../../features/run/hooks/useGameLoop";
import {
  calculateDamage,
  chooseBestMove,
  determineAttackOrder,
  applyDamage,
} from "../../../engine/combat.engine";
import { calculateXPGain, levelUpPokemon } from "../../../engine/xp.engine";
import { selectEnemyMove } from "../../../engine/ai.engine";
import {
  getRandomEnemyForTier,
  getPokemonTier,
} from "../../../engine/evolution.engine";
import {
  getPokemonData,
  learnMovesOnLevelUp,
} from "../../../features/run/services/pokeapi.service";
import { generateUid } from "../../../utils/random";
import { generateLootOptions } from "../../../lib/items";
import type { ActiveMove } from "../../../features/run/types/game.types";

export function useTrainingTick() {
  const { training, setTraining, meta, setMeta } = useGame();
  const fetchingRef = useRef(false);

  const tick = async () => {
    if (
      !training.isActive ||
      fetchingRef.current ||
      training.pendingLootSelection
    )
      return;

    // --- SPAWN ENEMY ---
    if (!training.currentBattle) {
      fetchingRef.current = true;
      try {
        const tier = getPokemonTier(training.pokemon.pokemonId);
        const enemyId = getRandomEnemyForTier(tier);

        // Dynamic level scaling based on progress
        const pLevel = training.pokemon.level;
        const wins = training.totalBattlesWon;
        let level = pLevel;

        if (wins <= 8) {
          // 0-8 battles: inferior levels
          level = Math.max(2, pLevel - (1 + Math.floor(Math.random() * 3)));
        } else if (wins <= 20) {
          // 9-20 battles: same level
          level = pLevel;
        } else {
          // 21+ battles: superior levels (max +8)
          level = pLevel + (1 + Math.floor(Math.random() * 8));
        }

        const isShiny = Math.random() < 1 / 4096;

        const enemy = await getPokemonData(enemyId, level, isShiny);

        setTraining((prev) => ({
          ...prev,
          currentBattle: {
            type: "wild",
            phase: "active",
            playerPokemon: prev.pokemon,
            enemyPokemon: enemy,
            turnCount: 0,
            isManualBattle: true, // Always manual in training
          },
          battleLog: [
            ...prev.battleLog,
            {
              id: generateUid(),
              text: `¡Un rival ${enemy.name} (Tier ${tier}) ha aparecido!`,
              type: "normal" as any,
            },
          ].slice(-40),
        }));
      } catch (e) {
        console.error("Failed to spawn training enemy", e);
      } finally {
        fetchingRef.current = false;
      }
      return;
    }

    // --- ACTIVE BATTLE ---
    setTraining((state) => {
      const bState = state.currentBattle;
      if (!bState || bState.phase !== "active") return state;

      const logs = [...state.battleLog];
      const pushLog = (text: string, type: any = "normal") => {
        logs.push({ id: generateUid(), text, type });
      };

      // Wait for manual player input
      if (!bState.manualActionQueue) return state;

      let pMove: ActiveMove | undefined;
      if (bState.manualActionQueue.type === "move") {
        pMove = state.pokemon.moves.find(
          (m) => String(m.moveId) === String(bState.manualActionQueue?.id),
        );
      }

      // If no move selected (e.g. switch which is not allowed in 1v1 training), just return
      if (!pMove) {
        const nextB = { ...bState, manualActionQueue: undefined };
        return { ...state, currentBattle: nextB };
      }

      // Turn logic
      const eMove = selectEnemyMove(bState.enemyPokemon, state.pokemon);

      // Determine order (respecting Speed & Priority)
      const order = determineAttackOrder(
        state.pokemon,
        pMove,
        bState.enemyPokemon,
        eMove,
      );

      let nextPlayerHP = state.pokemon.currentHP;
      let nextEnemyHP = bState.enemyPokemon.currentHP;

      const performAttack = (
        attacker: typeof state.pokemon,
        move: ActiveMove,
        defender: typeof state.pokemon,
        isPlayerAttacker: boolean,
      ) => {
        const { damage, isCrit, effectiveness, isStab } = calculateDamage(
          attacker,
          defender,
          move,
        );

        const { nextHP, focusBandTriggered } = applyDamage(defender, damage);

        pushLog(
          `${attacker.name} usa ${move.moveName}.`,
          isPlayerAttacker ? "attack" : "opponentAttack",
        );

        if (isStab) pushLog(`¡Bonus de tipo (STAB)!`, "normal");
        if (effectiveness > 1.5) pushLog("¡Es súper eficaz!", "normal");
        if (effectiveness > 0 && effectiveness < 1)
          pushLog("No es muy eficaz...", "normal");
        if (effectiveness === 0) pushLog("No le afecta...", "normal");
        if (isCrit) pushLog("¡Un golpe crítico!", "normal");

        if (focusBandTriggered) {
          pushLog(
            `¡${defender.name} aguantó el golpe con su Banda Focus!`,
            "special" as any,
          );
        }

        return nextHP;
      };

      if (order === "player-first") {
        // Player attacks first
        nextEnemyHP = performAttack(
          state.pokemon,
          pMove,
          bState.enemyPokemon,
          true,
        );

        if (nextEnemyHP > 0) {
          // Enemy attacks second if still alive
          nextPlayerHP = performAttack(
            { ...bState.enemyPokemon }, // We don't need real state here, just the object
            eMove,
            { ...state.pokemon, currentHP: state.pokemon.currentHP },
            false,
          );
        }
      } else {
        // Enemy attacks first
        nextPlayerHP = performAttack(
          bState.enemyPokemon,
          eMove,
          state.pokemon,
          false,
        );

        if (nextPlayerHP > 0) {
          // Player attacks second if still alive
          nextEnemyHP = performAttack(
            { ...state.pokemon, currentHP: nextPlayerHP },
            pMove,
            { ...bState.enemyPokemon },
            true,
          );
        }
      }

      const nextPokemon = {
        ...state.pokemon,
        currentHP: nextPlayerHP,
        moves: state.pokemon.moves.map((m) =>
          m.moveId === pMove?.moveId
            ? { ...m, currentPP: Math.max(0, m.currentPP - 1) }
            : m,
        ),
      };

      const nextBattle = {
        ...bState,
        playerPokemon: nextPokemon,
        enemyPokemon: { ...bState.enemyPokemon, currentHP: nextEnemyHP },
        turnCount: bState.turnCount + 1,
        manualActionQueue: undefined,
      };

      // Check for end of battle
      if (nextEnemyHP === 0) {
        nextBattle.phase = "victory";
        pushLog(`¡${bState.enemyPokemon.name} debilitado!`, "victory");

        // Rewards
        const xpGained = calculateXPGain(bState.enemyPokemon.level, 50, false);
        pushLog(`¡${nextPokemon.name} ganó ${xpGained} XP!`, "normal");

        let leveledPokemon = { ...nextPokemon, xp: nextPokemon.xp + xpGained };
        while (
          leveledPokemon.xp >= leveledPokemon.xpToNext &&
          leveledPokemon.level < 100
        ) {
          leveledPokemon = levelUpPokemon(leveledPokemon);
          pushLog(
            `¡${leveledPokemon.name} subió al nivel ${leveledPokemon.level}!`,
            "level",
          );

          // Async move learning
          const currentLvl = leveledPokemon.level;
          learnMovesOnLevelUp(leveledPokemon, currentLvl).then((newMoves) => {
            if (newMoves) {
              setTraining((prev) => ({
                ...prev,
                pokemon: { ...prev.pokemon, moves: newMoves },
              }));
              setMeta((prev) => ({
                ...prev,
              }));
            }
          });
        }

        // HEAL & PP RESTORE (Special feature of training mode)
        leveledPokemon.currentHP = leveledPokemon.maxHP;
        leveledPokemon.moves = leveledPokemon.moves.map((m) => ({
          ...m,
          currentPP: m.maxPP,
        }));

        // Award PokeCoins
        const coins = 5 + Math.floor(bState.enemyPokemon.level / 10);
        setMeta((prev) => ({ ...prev, pokeCoins: prev.pokeCoins + coins }));
        pushLog(`¡Ganaste ${coins} PokéCoins!`, "evolution");

        return {
          ...state,
          pokemon: leveledPokemon,
          currentBattle: null, // Reset for next battle in next tick
          totalBattlesWon: state.totalBattlesWon + 1,
          battleLog: logs.slice(-40),
          pendingLootSelection: generateLootOptions(["ball"]),
        };
      }

      if (nextPlayerHP === 0) {
        nextBattle.phase = "defeat";
        pushLog(`¡${state.pokemon.name} ha caído!`, "danger");
        return {
          ...state,
          pokemon: nextPokemon,
          currentBattle: nextBattle,
          battleLog: logs.slice(-40),
        };
      }

      return {
        ...state,
        pokemon: nextPokemon,
        currentBattle: nextBattle,
        battleLog: logs.slice(-40),
      };
    });
  };

  useGameLoop(
    training.isActive && !training.pendingLootSelection,
    training.currentBattle ? 1 : 4, // Tick faster when spawning next enemy
    tick,
  );
}
