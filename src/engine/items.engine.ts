import type { ActivePokemon } from "../features/run/types/game.types";
import { type Item, ITEMS } from "../lib/items";
import { calculateStats } from "./stats.engine";
import {
  getPokemonData,
  getPokemonSpecies,
  getEvolutionChain,
} from "../features/run/services/pokeapi.service";
import { levelUpPokemon, xpToNextLevel } from "./xp.engine";

export function getBestAvailableHealingItem(
  inventory?: Record<string, number>,
): string | null {
  if (!inventory) return null;
  // Potion priority: Full Restore > Max Potion > Hyper Potion > Super Potion > Potion
  const priorities = [
    "full-restore",
    "max-potion",
    "hyper-potion",
    "super-potion",
    "potion",
  ];
  for (const p of priorities) {
    if (inventory[p] && inventory[p] > 0) {
      return p;
    }
  }
  return null;
}

export interface UseItemResult {
  resultLog: string;
  success: boolean;
  newPokemon: ActivePokemon;
  newInventory: Record<string, number>;
  /**
   * Must be spread onto RunState (not the pokemon) so useEngineTick
   * useEffect dependencies fire correctly. Usage in any setRun call:
   *   setRun(prev => ({ ...prev, ...(result.runStateMarkers ?? {}), team: [...] }))
   */
  runStateMarkers?: {
    __checkEvolutionAt?: {
      pokemonUid: string;
      level: number;
      pokemonId: number;
      _nonce: number;
    };
    __checkMoveLearnAt?: { pokemonUid: string; level: number; _nonce: number };
  };
}

export async function useItemOnPokemon(
  pokemon: ActivePokemon,
  itemId: string,
  inventory: Record<string, number>,
): Promise<UseItemResult> {
  if (!inventory || !inventory[itemId] || inventory[itemId] <= 0) {
    return {
      resultLog: "No tienes este objeto.",
      success: false,
      newPokemon: pokemon,
      newInventory: inventory,
    };
  }

  const itemDef = ITEMS[itemId];
  if (
    !itemDef ||
    (itemDef.category !== "heal" &&
      itemDef.category !== "evo" &&
      itemDef.category !== "special" &&
      itemDef.category !== "battle" &&
      itemDef.category !== "tm") ||
    (itemId !== "rare-candy" && itemDef.category === "special")
  ) {
    if (itemId !== "rare-candy") {
      return {
        resultLog: `No puedes usar ${itemDef?.name || "este objeto"} así.`,
        success: false,
        newPokemon: pokemon,
        newInventory: inventory,
      };
    }
  }

  let nextPokemon = { ...pokemon };
  let applied = false;
  let resultMsg = "";
  let runStateMarkers: any = undefined;

  if (itemDef.effect.type === "stat_boost") {
    if (itemDef.category === "special") {
      // Permanent Stat Boost (Vitamins -> EVs)
      const stat = itemDef.effect.stat;
      if (stat === "crit" || stat === "acc" || stat === "eva") {
        return {
          resultLog: "Este objeto no se puede usar así.",
          success: false,
          newPokemon: pokemon,
          newInventory: inventory,
        };
      }

      // At this point, stat is guaranteed to be a key of PokemonStats
      const statKey = stat as keyof typeof nextPokemon.evs;
      const currentEvs = nextPokemon.evs;
      const totalEvs = Object.values(currentEvs).reduce(
        (a: number, b: number) => a + b,
        0,
      );

      if (currentEvs[statKey] >= 252) {
        return {
          resultLog: `¡${nextPokemon.name} ya no puede mejorar más su ${stat}!`,
          success: false,
          newPokemon: pokemon,
          newInventory: inventory,
        };
      }

      if (totalEvs >= 510) {
        return {
          resultLog: `¡${nextPokemon.name} ha alcanzado su límite de esfuerzo!`,
          success: false,
          newPokemon: pokemon,
          newInventory: inventory,
        };
      }

      const amountToAdd = Math.min(
        10,
        252 - currentEvs[statKey],
        510 - totalEvs,
      );
      nextPokemon.evs = {
        ...currentEvs,
        [statKey]: currentEvs[statKey] + amountToAdd,
      };

      // Recalculate stats
      nextPokemon.stats = calculateStats(
        nextPokemon.baseStats,
        nextPokemon.ivs,
        nextPokemon.evs,
        nextPokemon.level,
        nextPokemon.nature,
      );
      nextPokemon.maxHP = nextPokemon.stats.hp;

      applied = true;
      resultMsg = `¡El ${stat} de ${nextPokemon.name} aumentó permanentemente!`;
    } else if (itemDef.category === "battle") {
      // Battle Stat Boost (X Items -> Modifiers)
      const stat = itemDef.effect.stat;
      const stage = itemDef.effect.amount;

      const map: Record<string, keyof ActivePokemon["statModifiers"]> = {
        hp: "atk", // should not happen for X Items but just in case
        attack: "atk",
        defense: "def",
        spAtk: "spa",
        spDef: "spd",
        speed: "spe",
        crit: "crit",
        acc: "acc",
        eva: "eva",
      };

      const modKey = map[stat];
      if (!modKey)
        return {
          resultLog: "Efecto no implementado.",
          success: false,
          newPokemon: pokemon,
          newInventory: inventory,
        };

      if (nextPokemon.statModifiers[modKey] >= 6) {
        return {
          resultLog: `¡${nextPokemon.name} no puede subir más esa estadística!`,
          success: false,
          newPokemon: pokemon,
          newInventory: inventory,
        };
      }

      nextPokemon.statModifiers = {
        ...nextPokemon.statModifiers,
        [modKey]: Math.min(6, nextPokemon.statModifiers[modKey] + stage),
      };

      applied = true;
      resultMsg = `¡${nextPokemon.name} subió su estadística en batalla!`;
    }
  }

  if (itemDef.effect.type === "heal_hp") {
    if (nextPokemon.currentHP === 0) {
      return {
        resultLog: `${nextPokemon.name} está debilitado.`,
        success: false,
        newPokemon: pokemon,
        newInventory: inventory,
      };
    }
    if (nextPokemon.currentHP >= nextPokemon.maxHP) {
      return {
        resultLog: `${nextPokemon.name} ya tiene los PS al máximo.`,
        success: false,
        newPokemon: pokemon,
        newInventory: inventory,
      };
    }

    if (itemDef.effect.amount === "full") {
      nextPokemon.currentHP = nextPokemon.maxHP;
    } else {
      nextPokemon.currentHP = Math.min(
        nextPokemon.maxHP,
        nextPokemon.currentHP + itemDef.effect.amount,
      );
    }
    applied = true;
    resultMsg = `¡${nextPokemon.name} recuperó PS!`;
  } else if (itemDef.effect.type === "heal_status") {
    if (!nextPokemon.status) {
      return {
        resultLog: `${nextPokemon.name} no tiene problemas de estado.`,
        success: false,
        newPokemon: pokemon,
        newInventory: inventory,
      };
    }
    nextPokemon.status = null;
    applied = true;
    resultMsg = `¡El estado de ${nextPokemon.name} ha sido curado!`;
  } else if (itemDef.effect.type === "revive") {
    if (nextPokemon.currentHP > 0) {
      return {
        resultLog: `${nextPokemon.name} no está debilitado.`,
        success: false,
        newPokemon: pokemon,
        newInventory: inventory,
      };
    }
    nextPokemon.currentHP = Math.floor(
      nextPokemon.maxHP * itemDef.effect.hpPercent,
    );
    applied = true;
    resultMsg = `¡${nextPokemon.name} revivió!`;
  } else if (itemId === "rare-candy") {
    if (nextPokemon.level >= 100) {
      return {
        resultLog: `${nextPokemon.name} ya está al nivel máximo.`,
        success: false,
        newPokemon: pokemon,
        newInventory: inventory,
      };
    }

    // Set XP to next level and level up
    nextPokemon.xp = xpToNextLevel(nextPokemon.level);
    nextPokemon = levelUpPokemon(nextPokemon);

    applied = true;
    resultMsg = `¡${nextPokemon.name} subió al nivel ${nextPokemon.level}!`;
  } else if (itemDef.category === "evo") {
    // Evolution logic
    try {
      const species = await getPokemonSpecies(pokemon.pokemonId);
      const chain = await getEvolutionChain(species.evolution_chain.url);

      const findEvolution = (current: any): any => {
        if (current.species.name.toLowerCase() === species.name.toLowerCase()) {
          return current.evolves_to;
        }
        for (const next of current.evolves_to) {
          const res = findEvolution(next);
          if (res) return res;
        }
        return null;
      };

      const possibleEvolutions = findEvolution(chain.chain);
      console.log(
        `[Evolution] PokemonID: ${pokemon.pokemonId}, Name: ${pokemon.name}, SpeciesName: ${species.name}`,
      );
      console.log(
        `[Evolution] Possible evolutions found:`,
        possibleEvolutions?.length || 0,
      );

      if (!possibleEvolutions || possibleEvolutions.length === 0) {
        return {
          resultLog: `${pokemon.name} no puede evolucionar más.`,
          success: false,
          newPokemon: pokemon,
          newInventory: inventory,
        };
      }

      // Find if any evolution matches this item
      let targetEvolution: any = null;
      for (const evo of possibleEvolutions) {
        const details = evo.evolution_details.find((d: any) => {
          if (itemId === "cable-link") {
            return d.trigger.name === "trade";
          }
          const itemMatch =
            d.trigger.name === "use-item" && d.item?.name === itemId;
          if (d.item?.name) {
            console.log(
              `[Evolution] Checking item: ${d.item.name} vs ${itemId} -> ${itemMatch}`,
            );
          }
          return itemMatch;
        });
        if (details) {
          targetEvolution = evo;
          break;
        }
      }

      if (!targetEvolution) {
        return {
          resultLog: `${itemDef.name} no tiene efecto en ${pokemon.name}.`,
          success: false,
          newPokemon: pokemon,
          newInventory: inventory,
        };
      }

      // Trigger Evolution Modal via Markers
      const parts = targetEvolution.species.url.split("/").filter(Boolean);
      const evoId = parseInt(parts[parts.length - 1]);
      const evoName =
        targetEvolution.species.name.charAt(0).toUpperCase() +
        targetEvolution.species.name.slice(1);

      runStateMarkers = {
        __checkEvolutionAt: {
          pokemonUid: pokemon.uid,
          pokemonId: pokemon.pokemonId, // Added missing pokemonId
          level: pokemon.level, // Added level for consistency
          fromName: pokemon.name,
          toId: evoId,
          toName: evoName,
          reason: itemDef.name,
          _nonce: Date.now(),
        },
      };

      applied = true;
      resultMsg = `¡${pokemon.name} está reaccionando a la ${itemDef.name}!`;
    } catch (e) {
      console.error(e);
      return {
        resultLog: "Error al procesar la evolución.",
        success: false,
        newPokemon: pokemon,
        newInventory: inventory,
      };
    }
  }

  // ─── TM: Teach move ──────────────────────────────────────────────────────
  if (itemDef.category === "tm" && itemDef.effect.type === "teach") {
    const effect = itemDef.effect as {
      type: "teach";
      moveId: number;
      moveName: string;
    };
    const { moveId, moveName } = effect;

    if (nextPokemon.moves.some((m) => m.moveId === moveId)) {
      return {
        resultLog: `${nextPokemon.name} ya conoce ${moveName}.`,
        success: false,
        newPokemon: pokemon,
        newInventory: inventory,
      };
    }

    try {
      const md = await fetch(`https://pokeapi.co/api/v2/move/${moveId}`).then(
        (r) => r.json(),
      );
      const spanName =
        md.names?.find((n: any) => n.language.name === "es")?.name ?? moveName;

      const ailmentMap: Record<
        string,
        import("../features/run/types/game.types").StatusCondition
      > = {
        paralysis: "PAR",
        burn: "BRN",
        poison: "PSN",
        toxic: "TOX",
        sleep: "SLP",
        freeze: "FRZ",
      };
      let statusEffect = undefined;
      if (md.meta?.ailment?.name && md.meta.ailment.name !== "none") {
        const cond = ailmentMap[md.meta.ailment.name];
        if (cond)
          statusEffect = {
            condition: cond,
            chance: md.meta.ailment_chance || 100,
          };
      }

      const newMove: import("../features/run/types/game.types").ActiveMove = {
        moveId: md.id,
        moveName: spanName,
        type: md.type.name,
        category: md.damage_class.name,
        power: md.power || 0,
        accuracy: md.accuracy || 100,
        currentPP: md.pp || 10,
        maxPP: md.pp || 10,
        priority: md.priority || 0,
        enabled: true,
        statusEffect,
      };

      const nextInv = { ...inventory, [itemId]: (inventory[itemId] || 0) - 1 };

      if (nextPokemon.moves.length < 4) {
        nextPokemon.moves = [...nextPokemon.moves, newMove];
        return {
          resultLog: `¡${nextPokemon.name} aprendió ${spanName}!`,
          success: true,
          newPokemon: nextPokemon,
          newInventory: nextInv,
        };
      } else {
        // Full moveset — signal caller to open MoveLearningModal
        return {
          resultLog: `__PENDING_MOVE_LEARN__`,
          success: true,
          newPokemon: nextPokemon,
          newInventory: nextInv,
          pendingMove: newMove,
        } as any;
      }
    } catch {
      return {
        resultLog: "Error al cargar el movimiento de la MT.",
        success: false,
        newPokemon: pokemon,
        newInventory: inventory,
      };
    }
  }

  if (applied) {
    const nextInv = { ...inventory };
    nextInv[itemId] -= 1;

    // Rare Candy automatic markers (if not already set by stones)
    if (itemId === "rare-candy" && !runStateMarkers) {
      runStateMarkers = {
        __checkEvolutionAt: {
          pokemonUid: nextPokemon.uid,
          level: nextPokemon.level,
          pokemonId: nextPokemon.pokemonId,
          _nonce: Date.now(),
        },
        __checkMoveLearnAt: {
          pokemonUid: nextPokemon.uid,
          level: nextPokemon.level,
          _nonce: Date.now(),
        },
      };
    }

    return {
      resultLog: resultMsg,
      success: true,
      newPokemon: nextPokemon,
      newInventory: nextInv,
      runStateMarkers,
    };
  }

  return {
    resultLog: "El objeto no tuvo efecto.",
    success: false,
    newPokemon: pokemon,
    newInventory: inventory,
  };
}
