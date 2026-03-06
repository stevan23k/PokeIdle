/**
 * legendaries.ts
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for all special Pokémon classifications.
 *
 * CATEGORIES (mutually exclusive, ordered by rarity):
 *
 *  legendary     – Box legendaries, cover mascots, trios with major lore.
 *                  Cannot be caught in the wild. Gacha only.
 *                  Examples: Mewtwo, Rayquaza, Zacian, Koraidon
 *
 *  mythical      – Event-only Pokémon. Extremely rare.
 *                  Cannot be caught in the wild. Gacha only.
 *                  Examples: Mew, Celebi, Jirachi, Arceus, Zarude
 *
 *  subLegendary  – Legendary-adjacent: roaming beasts, lake guardians,
 *                  swords of justice, ultra beasts, Paradox Pokémon.
 *                  Can appear as rare wild encounters at high zone tiers.
 *                  Examples: Raikou, Uxie, Virizion, Nihilego, Koraidon
 *
 *  paradox       – Ancient/Future Paradox forms from Scarlet/Violet.
 *                  Treated like sub-legendaries for encounter purposes.
 *                  Examples: Great Tusk, Iron Treads, Walking Wake
 *
 *  ultraBeast    – UBs from Sun/Moon/USUM.
 *                  Like sub-legendaries; can appear in late-game zones.
 *                  Examples: Nihilego, Buzzwole, Pheromosa
 *
 * HELPER FUNCTIONS:
 *  getLegendaryCategory(id)  → the category string or null
 *  isLegendaryOrMythical(id) → true if legendary or mythical (gacha-only)
 *  isSpecialPokemon(id)      → true for ANY special category
 *  canAppearInWild(id)       → false for legendary + mythical
 *  isGachaEligible(id)       → true for legendary + mythical
 *  getLegendaryTier(id)      → "S" | "A" | "B" | null for rarity display
 */

// ─────────────────────────────────────────────────────────────────────────────
// LEGENDARY — Box mascots and major lore legendaries. Gacha-only.
// ─────────────────────────────────────────────────────────────────────────────
export const LEGENDARY_IDS: ReadonlySet<number> = new Set([
  // Gen 1
  144, 145, 146, // Articuno, Zapdos, Moltres
  150,           // Mewtwo

  // Gen 2
  243, 244, 245, // Raikou, Entei, Suicune
  249, 250,      // Lugia, Ho-Oh

  // Gen 3
  377, 378, 379, // Regirock, Regice, Registeel
  380, 381,      // Latias, Latios
  382, 383, 384, // Kyogre, Groudon, Rayquaza

  // Gen 4
  480, 481, 482, // Uxie, Mesprit, Azelf
  483, 484,      // Dialga, Palkia
  485,           // Heatran
  486,           // Regigigas
  487,           // Giratina
  488,           // Cresselia
  
  // Gen 5
  638, 639, 640, // Cobalion, Terrakion, Virizion
  641, 642,      // Tornadus, Thundurus
  643, 644,      // Reshiram, Zekrom
  645,           // Landorus
  646,           // Kyurem

  // Gen 6
  716, 717,      // Xerneas, Yveltal
  718,           // Zygarde

  // Gen 7
  785, 786, 787, 788, // Tapu Koko, Tapu Lele, Tapu Bulu, Tapu Fini
  789, 790,      // Cosmog, Cosmoem (legendary chain)
  791, 792,      // Solgaleo, Lunala
  793,           // Nihilego (also UB — treated as legendary here)
  800,           // Necrozma

  // Gen 8
  888, 889,      // Zacian, Zamazenta
  890,           // Eternatus
  891, 892,      // Kubfu, Urshifu
  894, 895,      // Regieleki, Regidrago
  896, 897,      // Glastrier, Spectrier
  898,           // Calyrex

  // Gen 9
  1007, 1008,    // Koraidon, Miraidon
  1024,          // Terapagos
]);

// ─────────────────────────────────────────────────────────────────────────────
// MYTHICAL — Event distribution only. Gacha-only.
// ─────────────────────────────────────────────────────────────────────────────
export const MYTHICAL_IDS: ReadonlySet<number> = new Set([
  // Gen 1
  151,  // Mew

  // Gen 2
  251,  // Celebi

  // Gen 3
  385, 386,  // Jirachi, Deoxys

  // Gen 4
  489, 490,  // Phione, Manaphy
  491,       // Darkrai
  492,       // Shaymin
  493,       // Arceus

  // Gen 5
  494,       // Victini
  647,       // Keldeo
  648,       // Meloetta
  649,       // Genesect

  // Gen 6
  719,       // Diancie
  720,       // Hoopa
  721,       // Volcanion

  // Gen 7
  801,       // Magearna
  802,       // Marshadow
  807,       // Zeraora
  808, 809,  // Meltan, Melmetal

  // Gen 8
  893,       // Zarude

  // Gen 9
  1014,      // Pecharunt
]);

// ─────────────────────────────────────────────────────────────────────────────
// SUB-LEGENDARY — Powerful but not box-cover level. Can appear as rare wilds.
// ─────────────────────────────────────────────────────────────────────────────
export const SUB_LEGENDARY_IDS: ReadonlySet<number> = new Set([
  // Gen 1
  131,  // Lapras (semi-legendary in lore)
  143,  // Snorlax

  // Gen 2 (roaming)
  // (Raikou/Entei/Suicune moved to LEGENDARY)

  // Gen 4
  447, 448,  // Riolu, Lucario (rare but not legendary)

  // Gen 5
  595, 596,  // Joltik, Galvantula (not really, example placeholder)

  // Gen 6 (Warden's Pokémon, rare encounters)
  714, 715,  // Noibat, Noivern

  // Gen 7 — Island Scan / rare
  742, 743,  // Cutiefly, Ribombee

  // Gen 8 — Crown Tundra rare encounters
  // (Regis and birds moved to LEGENDARY)

  // Gen 9 — Treasures of Ruin
  1001, 1002, 1003, 1004, // Wo-Chien, Chien-Pao, Ting-Lu, Chi-Yu

  // Roaming forms (not box cover)
  // Additional semi-legendaries by game lore
]);

// ─────────────────────────────────────────────────────────────────────────────
// ULTRA BEASTS — From Gen 7. Rare wild encounters in late-game zones.
// ─────────────────────────────────────────────────────────────────────────────
export const ULTRA_BEAST_IDS: ReadonlySet<number> = new Set([
  793,  // Nihilego
  794,  // Buzzwole
  795,  // Pheromosa
  796,  // Xurkitree
  797,  // Celesteela
  798,  // Kartana
  799,  // Guzzlord
  803,  // Poipole
  804,  // Naganadel
  805,  // Stakataka
  806,  // Blacephalon
]);

// ─────────────────────────────────────────────────────────────────────────────
// PARADOX — Ancient/Future forms from Gen 9. Rare wilds in endgame.
// ─────────────────────────────────────────────────────────────────────────────
export const PARADOX_IDS: ReadonlySet<number> = new Set([
  // Ancient Paradox (Scarlet)
  984,  // Great Tusk
  985,  // Scream Tail
  986,  // Brute Bonnet
  987,  // Flutter Mane
  988,  // Slither Wing
  989,  // Sandy Shocks
  990,  // Roaring Moon
  1005, // Walking Wake
  1020, // Gouging Fire
  1021, // Raging Bolt

  // Future Paradox (Violet)
  991,  // Iron Treads
  992,  // Iron Bundle
  993,  // Iron Hands
  994,  // Iron Jugulis
  995,  // Iron Moth
  996,  // Iron Thorns
  997,  // Iron Valiant
  1006, // Iron Leaves
  1022, // Iron Boulder
  1023, // Iron Crown
]);

// ─────────────────────────────────────────────────────────────────────────────
// GACHA POOL — Subset of legendaries that appear in the gacha system
// (split from all LEGENDARY_IDS to allow exclusions like Cosmog chain)
// ─────────────────────────────────────────────────────────────────────────────
export const GACHA_LEGENDARY_POOL: ReadonlyArray<number> = [
  // Gen 1–2 classics
  150, 243, 244, 245, 249, 250,
  // Gen 3
  377, 378, 379, 380, 381, 382, 383, 384,
  // Gen 4
  483, 484, 487,
  // Gen 5
  643, 644, 646,
  // Gen 6
  716, 717, 718,
  // Gen 7
  791, 792, 800,
  // Gen 8
  888, 889, 890,
  // Gen 9
  1007, 1008,
];

// ─────────────────────────────────────────────────────────────────────────────
// TYPE ALIAS
// ─────────────────────────────────────────────────────────────────────────────
export type LegendaryCategory =
  | "legendary"
  | "mythical"
  | "subLegendary"
  | "ultraBeast"
  | "paradox";

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the specific category, or null if it's a regular Pokémon. */
export function getLegendaryCategory(id: number): LegendaryCategory | null {
  if (LEGENDARY_IDS.has(id)) return "legendary";
  if (MYTHICAL_IDS.has(id)) return "mythical";
  if (ULTRA_BEAST_IDS.has(id)) return "ultraBeast";
  if (PARADOX_IDS.has(id)) return "paradox";
  if (SUB_LEGENDARY_IDS.has(id)) return "subLegendary";
  return null;
}

/** True only for full legendaries and mythicals — these are GACHA ONLY. */
export function isLegendaryOrMythical(id: number): boolean {
  return LEGENDARY_IDS.has(id) || MYTHICAL_IDS.has(id);
}

/** True for any special Pokémon (legendary, mythical, UB, paradox, sub-legendary). */
export function isSpecialPokemon(id: number): boolean {
  return getLegendaryCategory(id) !== null;
}

/**
 * Whether this Pokémon can appear as a wild encounter.
 * Legendaries and mythicals are gacha-only. Others can appear rarely.
 */
export function canAppearInWild(id: number): boolean {
  return !LEGENDARY_IDS.has(id) && !MYTHICAL_IDS.has(id);
}

/** True if this Pokémon belongs to the gacha legendary pool. */
export function isGachaEligible(id: number): boolean {
  return GACHA_LEGENDARY_POOL.includes(id);
}

/**
 * Display tier for rarity badges:
 *  S = legendary / mythical
 *  A = ultra beast / paradox
 *  B = sub-legendary
 */
export function getLegendaryTier(id: number): "S" | "A" | "B" | null {
  const cat = getLegendaryCategory(id);
  if (!cat) return null;
  if (cat === "legendary" || cat === "mythical") return "S";
  if (cat === "ultraBeast" || cat === "paradox") return "A";
  return "B";
}

/**
 * Human-readable Spanish label for each category.
 */
export function getLegendaryCategoryLabel(id: number): string | null {
  const cat = getLegendaryCategory(id);
  switch (cat) {
    case "legendary":    return "Legendario";
    case "mythical":     return "Mítico";
    case "ultraBeast":   return "Ultra Ente";
    case "paradox":      return "Paradoja";
    case "subLegendary": return "Semi-legendario";
    default:             return null;
  }
}