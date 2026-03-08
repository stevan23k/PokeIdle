import type { Zone, WildEncounter } from "../lib/regions";
import { canAppearInWild } from "../lib/legendaries";

export function getWildEncounter(zone: Zone): WildEncounter | null {
  // Filter out Pokémon that cannot appear in the wild (legendaries/mythicals)
  const allowedPokemon = zone.wildPokemon.filter((p) =>
     p.pokemonId && canAppearInWild(p.pokemonId),
  );
 
  if (allowedPokemon.length === 0) {
    if (zone.wildPokemon.length > 0) {
      console.warn(`No wild encounters allowed for zone ${zone.id}`);
    }
    return null;
  }

  const totalWeight = allowedPokemon.reduce((acc, p) => acc + p.weight, 0);
  const roll = Math.random() * totalWeight;

  let accumulated = 0;
  for (const encounter of allowedPokemon) {
    accumulated += encounter.weight;
    if (roll <= accumulated) {
      return encounter;
    }
  }

  return allowedPokemon[0];
}

export function rollZoneItem(zone: Zone): string | null {
  // Check each item drop. Usually one is enough, but a zone could drop multiple.
  // We'll return the first successful roll for simplicity.
  for (const drop of zone.itemDrops) {
    if (Math.random() <= drop.chance) {
      return drop.itemId;
    }
  }
  return null;
}
