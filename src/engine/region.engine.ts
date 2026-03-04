import type { Zone, WildEncounter } from "../lib/regions";

export function getWildEncounter(zone: Zone): WildEncounter {
  const totalWeight = zone.wildPokemon.reduce((acc, sum) => acc + sum.weight, 0);
  const roll = Math.random() * totalWeight;
  
  let accumulated = 0;
  for (const encounter of zone.wildPokemon) {
    accumulated += encounter.weight;
    if (roll <= accumulated) {
      return encounter;
    }
  }
  
  // Fallback to first
  return zone.wildPokemon[0];
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
