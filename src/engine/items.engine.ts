import type { ActivePokemon } from "../features/run/types/game.types";
import { type Item, ITEMS } from "../lib/items";
import {
  getPokemonData,
  getPokemonSpecies,
  getEvolutionChain,
} from "../features/run/services/pokeapi.service";

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

export async function useItemOnPokemon(
  pokemon: ActivePokemon,
  itemId: string,
  inventory: Record<string, number>,
): Promise<{
  resultLog: string;
  success: boolean;
  newPokemon: ActivePokemon;
  newInventory: Record<string, number>;
}> {
  if (!inventory || !inventory[itemId] || inventory[itemId] <= 0) {
    return {
      resultLog: "No tienes este objeto.",
      success: false,
      newPokemon: pokemon,
      newInventory: inventory,
    };
  }

  const itemDef = ITEMS[itemId];
  if (!itemDef || (itemDef.category !== "heal" && itemDef.category !== "evo")) {
    return {
      resultLog: `No puedes usar ${itemDef?.name || "este objeto"} así.`,
      success: false,
      newPokemon: pokemon,
      newInventory: inventory,
    };
  }

  let nextPokemon = { ...pokemon };
  let applied = false;
  let resultMsg = "";

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
  } else if (itemDef.category === "evo") {
    // Evolution logic
    try {
      const species = await getPokemonSpecies(pokemon.pokemonId);
      const chain = await getEvolutionChain(species.evolution_chain.url);

      const findEvolution = (current: any): any => {
        if (current.species.name === species.name) {
          return current.evolves_to;
        }
        for (const next of current.evolves_to) {
          const res = findEvolution(next);
          if (res) return res;
        }
        return null;
      };

      const possibleEvolutions = findEvolution(chain.chain);
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
          return d.trigger.name === "use-item" && d.item?.name === itemId;
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

      // Evolve!
      const evoSpeciesName = targetEvolution.species.name;
      const evoData = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${evoSpeciesName}`,
      ).then((r) => r.json());
      const evolvedForm = await getPokemonData(
        evoData.id,
        pokemon.level,
        pokemon.isShiny,
      );

      // Preserve current state
      nextPokemon = {
        ...evolvedForm,
        uid: pokemon.uid,
        nickname: pokemon.nickname,
        currentHP:
          Math.floor((pokemon.currentHP / pokemon.maxHP) * evolvedForm.maxHP) ||
          1,
        caughtAt: pokemon.caughtAt,
        caughtLevel: pokemon.caughtLevel,
        heldItem: pokemon.heldItem,
      };

      applied = true;
      resultMsg = `¡Tu ${pokemon.name} ha evolucionado en ${nextPokemon.name}!`;
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

  if (applied) {
    const nextInv = { ...inventory };
    nextInv[itemId] -= 1;
    return {
      resultLog: resultMsg,
      success: true,
      newPokemon: nextPokemon,
      newInventory: nextInv,
    };
  }

  return {
    resultLog: "El objeto no tuvo efecto.",
    success: false,
    newPokemon: pokemon,
    newInventory: inventory,
  };
}
