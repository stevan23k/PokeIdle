/**
 * Evolution Engine
 *
 * Handles mapping Pokémon to their evolution "Tier" (1, 2, or 3)
 * and provides curated pools of enemies for Training Mode.
 */

export type EvolutionTier = 1 | 2 | 3;

import { isSpecialPokemon, canAppearInWild } from "../lib/legendaries";

// Tier 1: Base forms / First stage
const TIER_1_POOL = [
  1,
  4,
  7, // Bulbasaur, Charmander, Squirtle
  10,
  13,
  16,
  19, // Caterpie, Weedle, Pidgey, Rattata
  152,
  155,
  158, // Chikorita, Cyndaquil, Totodile
  252,
  255,
  258, // Treecko, Torchic, Mudkip
  387,
  390,
  393, // Turtwig, Chimchar, Piplup
  443, // Gible
  495,
  498,
  501, // Snivy, Tepig, Oshawott
  650,
  653,
  656, // Chespin, Fennekin, Froakie
  722,
  725,
  728, // Rowlet, Litten, Popplio
  810,
  813,
  816, // Grookey, Scorbunny, Sobble
  906,
  909,
  912, // Sprigatito, Fuecoco, Quaxly
  172,
  298,
  438, // Pichu, Azurill, Bonsly
  661, // Fletchling
  731, // Pikipek
  821, // Rookidee
  915, // Lechonk
];

// Tier 2: Middle stages / Second stage
const TIER_2_POOL = [
  2,
  5,
  8, // Ivysaur, Charmeleon, Wartortle
  11,
  14,
  17, // Metapod, Kakuna, Pidgeotto
  153,
  156,
  159, // Bayleef, Quilava, Croconaw
  253,
  256,
  259, // Grovyle, Combusken, Marshtomp
  388,
  391,
  394, // Grotle, Monferno, Prinplup
  444, // Gabite
  496,
  499,
  502, // Servine, Pignite, Dewott
  651,
  654,
  657, // Quilladin, Braixen, Frogadier
  723,
  726,
  729, // Dartrix, Torracat, Brionne
  811,
  814,
  817, // Thwackey, Raboot, Drizzile
  907,
  910,
  913, // Floragato, Crocalor, Quaxwell
  25,
  183,
  185, // Pikachu, Marill, Sudowoodo
  662, // Fletchinder
  732, // Trumbeak
  822, // Corvisquire
  916, // Oinkologne
];

// Tier 3: Final stages / Legendary / Single stage
const TIER_3_POOL = [
  3,
  6,
  9, // Venusaur, Charizard, Blastoise
  12,
  15,
  18,
  20, // Butterfree, Beedrill, Pidgeot, Raticate
  154,
  157,
  160, // Meganium, Typhlosion, Feraligatr
  254,
  257,
  260, // Sceptile, Blaziken, Swampert
  389,
  392,
  395, // Torterra, Infernape, Empoleon
  445, // Garchomp
  497,
  500,
  503, // Serperior, Emboar, Samurott
  652,
  655,
  658, // Chesnaught, Delphox, Greninja
  724,
  727,
  730, // Decidueye, Incineroar, Primarina
  812,
  815,
  818, // Rillaboom, Cinderace, Inteleon
  908,
  911,
  914, // Meowscarada, Skeledirge, Quaquaval
  26,
  184, // Raichu, Azumarill
  663, // Talonflame
  733, // Toucannon
  823, // Corviknight
  127,
  128,
  131,
  143, // Pinsir, Tauros, Lapras, Snorlax
  144,
  145,
  146,
  150,
  151, // Articuno, Zapdos, Moltres, Mewtwo, Mew
  243,
  244,
  245,
  249,
  250, // Beasts, Lugia, Ho-Oh
  382,
  383,
  384, // Weather Trio
  483,
  484,
  487, // Creation Trio
  643,
  644,
  646, // Tao Trio
  716,
  717,
  718, // Aura Trio
  791,
  792,
  800, // Light Trio
  888,
  889,
  890, // Galar Trio
  1007,
  1008,
  1024, // Paradox, Terapagos
];

/**
 * Returns the evolution tier of a Pokémon.
 * For now, uses a heuristic based on common patterns and a small lookup for exceptions.
 * In a full implementation, this would use PokeAPI species data.
 */
export function getPokemonTier(pokemonId: number): EvolutionTier {
  // Check our pools first for explicit tiering
  if (TIER_1_POOL.includes(pokemonId)) return 1;
  if (TIER_2_POOL.includes(pokemonId)) return 2;
  if (TIER_3_POOL.includes(pokemonId)) return 3;

  // Fallback: use legendaries registry for accurate classification
  if (isSpecialPokemon(pokemonId)) return 3;

  // Default to 1 for unknown regular Pokémon
  return 1;
}

export function getRandomEnemyForTier(tier: EvolutionTier): number {
  const basePool =
    tier === 1 ? TIER_1_POOL : tier === 2 ? TIER_2_POOL : TIER_3_POOL;
  // Filter out legendaries/mythicals — they are gacha-only, never wild
  const pool = basePool.filter((id) => canAppearInWild(id));
  if (pool.length === 0)
    return basePool[Math.floor(Math.random() * basePool.length)];
  return pool[Math.floor(Math.random() * pool.length)];
}
