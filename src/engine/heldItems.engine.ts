import type { ActivePokemon } from "../features/run/types/game.types";
import { ITEMS } from "../lib/items";

export function equipItem(
  pokemon: ActivePokemon,
  itemId: string,
  inventory: Record<string, number>,
): {
  success: boolean;
  newPokemon: ActivePokemon;
  newInventory: Record<string, number>;
  msg: string;
} {
  if (!inventory[itemId] || inventory[itemId] <= 0) {
    return {
      success: false,
      newPokemon: pokemon,
      newInventory: inventory,
      msg: "No tienes este objeto.",
    };
  }

  const itemDef = ITEMS[itemId];
  if (!itemDef || itemDef.category !== "held") {
    return {
      success: false,
      newPokemon: pokemon,
      newInventory: inventory,
      msg: "Este objeto no se puede equipar.",
    };
  }

  let nextInv = { ...inventory };
  let nextPokemon = { ...pokemon };

  // If already holding something, return it to inventory
  if (nextPokemon.heldItem) {
    const oldItem = nextPokemon.heldItem;
    nextInv[oldItem] = (nextInv[oldItem] || 0) + 1;
  }

  // Equip new item
  nextPokemon.heldItem = itemId;
  nextInv[itemId] -= 1;

  return {
    success: true,
    newPokemon: nextPokemon,
    newInventory: nextInv,
    msg: `¡${pokemon.name} ahora lleva ${itemDef.name}!`,
  };
}

export function unequipItem(
  pokemon: ActivePokemon,
  inventory: Record<string, number>,
): {
  success: boolean;
  newPokemon: ActivePokemon;
  newInventory: Record<string, number>;
  msg: string;
} {
  const oldItem = pokemon.heldItem;
  if (!oldItem) {
    return {
      success: false,
      newPokemon: pokemon,
      newInventory: inventory,
      msg: "Este Pokémon no lleva nada.",
    };
  }

  let nextInv = { ...inventory };
  let nextPokemon = { ...pokemon };

  nextInv[oldItem] = (nextInv[oldItem] || 0) + 1;
  nextPokemon.heldItem = null;

  return {
    success: true,
    newPokemon: nextPokemon,
    newInventory: nextInv,
    msg: `Le quitaste la ${ITEMS[oldItem]?.name || "prenda"} a ${pokemon.name}.`,
  };
}
