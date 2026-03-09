/**
 * scripts/update_gacha_tiers.ts
 *
 * Asigna el gacha_tier a todos los Pokémon en species_cache.
 *
 * 6: Legendarios Mayores (GACHA_LEGENDARY_POOL)
 * 5: Singulares, Paradoja, Ultra Entes
 * 4: Semi-legendarios, Iniciales, Pseudo-legendarios, Raros (Formas Base)
 * 3: Comunes (Formas Base)
 *
 * Ejecutar con: npx tsx --env-file=.env scripts/update_gacha_tiers.ts
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { createClient } from "@supabase/supabase-js";
import {
  GACHA_LEGENDARY_POOL,
  MYTHICAL_IDS,
  PARADOX_IDS,
  ULTRA_BEAST_IDS,
  SUB_LEGENDARY_IDS,
} from "../src/lib/legendaries";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const PSEUDO_LEGENDARY_BASE = [
  147, 246, 371, 374, 443, 633, 704, 782, 885, 996,
];
const STARTERS_BASE = [
  1,
  4,
  7, // Gen 1
  152,
  155,
  158, // Gen 2
  252,
  255,
  258, // Gen 3
  387,
  390,
  393, // Gen 4
  495,
  498,
  501, // Gen 5
  650,
  653,
  656, // Gen 6
  722,
  725,
  728, // Gen 7
  810,
  813,
  816, // Gen 8
  906,
  909,
  912, // Gen 9
];
const RARES_BASE = [
  447, // Riolu
  570, // Zorua
  636, // Larvesta
  999, // Gimmighoul
  131, // Lapras
  143, // Snorlax (or 446 Munchlax?) -> Usaremos 446 Munchlax si existe, sino 143.
  446, // Munchlax
  142, // Aerodactyl
  479, // Rotom
  442, // Spiritomb
  302, // Sableye
  303, // Mawile
  201, // Unown? No, común.
];

async function main() {
  console.log("=== Updating Gacha Tiers ===\n");

  // 1. Reset all to 3 (Common)
  console.log("Resetting all tiers to 3...");
  const { error: resetError } = await supabase
    .from("species_cache")
    .update({ gacha_tier: 3 })
    .not("pokemon_id", "eq", 0);

  if (resetError) {
    console.error("Error resetting tiers:", resetError.message);
    return;
  }

  // 2. Set Tier 6 (Major Legendaries)
  console.log("Setting Tier 6 (Major Legendaries)...");
  await updateTier(Array.from(GACHA_LEGENDARY_POOL), 6);

  // 3. Set Tier 5 (Mythicals, Paradox, Ultra Beasts)
  console.log("Setting Tier 5 (Mythicals, Paradox, Ultra Beasts)...");
  const tier5Ids = new Set([
    ...Array.from(MYTHICAL_IDS),
    ...Array.from(PARADOX_IDS),
    ...Array.from(ULTRA_BEAST_IDS),
  ]);
  await updateTier(Array.from(tier5Ids), 5);

  // 4. Set Tier 4 (Sub-legendaries, Starters, Pseudos, Rares)
  console.log("Setting Tier 4 (Sub-legendaries, Starters, Pseudos, Rares)...");
  const tier4Ids = new Set([
    ...Array.from(SUB_LEGENDARY_IDS),
    ...STARTERS_BASE,
    ...PSEUDO_LEGENDARY_BASE,
    ...RARES_BASE,
  ]);
  // Ensure no overlap with higher tiers
  const filteredTier4 = Array.from(tier4Ids).filter(
    (id) => !GACHA_LEGENDARY_POOL.includes(id) && !tier5Ids.has(id),
  );
  await updateTier(filteredTier4, 4);

  console.log("\nDone.");
  process.exit(0);
}

async function updateTier(ids: number[], tier: number) {
  if (ids.length === 0) return;

  // Batch updates in chunks of 50 to avoid big queries
  const chunkSize = 50;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { error } = await supabase
      .from("species_cache")
      .update({ gacha_tier: tier })
      .in("pokemon_id", chunk);

    if (error) {
      console.error(`Error updating tier ${tier} for chunk:`, error.message);
    } else {
      console.log(`Tier ${tier}: Updated ${chunk.length} Pokémon...`);
    }
  }
}

main();
