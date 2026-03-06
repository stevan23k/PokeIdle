/**
 * seed-megas.ts
 * Puebla la tabla mega_evolutions en Supabase con los ~46 megas de PokeAPI.
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/seed-megas.ts
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// ----------------------------------------------------------------
// Mapa completo: slug-mega → mega-stone
// Fuente: https://bulbapedia.bulbagarden.net/wiki/Mega_Stone
// ----------------------------------------------------------------
const MEGA_STONE_MAP: Record<string, string> = {
  "venusaur-mega":    "venusaurite",
  "charizard-mega-x": "charizardite-x",
  "charizard-mega-y": "charizardite-y",
  "blastoise-mega":   "blastoisite",
  "alakazam-mega":    "alakazite",
  "gengar-mega":      "gengarite",
  "kangaskhan-mega":  "kangaskhanite",
  "pinsir-mega":      "pinsirite",
  "gyarados-mega":    "gyaradosite",
  "aerodactyl-mega":  "aerodactylite",
  "mewtwo-mega-x":    "mewtwonite-x",
  "mewtwo-mega-y":    "mewtwonite-y",
  "ampharos-mega":    "ampharosite",
  "scizor-mega":      "scizorite",
  "heracross-mega":   "heracronite",
  "houndoom-mega":    "houndoominite",
  "tyranitar-mega":   "tyranitarite",
  "blaziken-mega":    "blazikenite",
  "gardevoir-mega":   "gardevoirite",
  "mawile-mega":      "mawilite",
  "aggron-mega":      "aggronite",
  "medicham-mega":    "medichamite",
  "manectric-mega":   "manectite",
  "banette-mega":     "banettite",
  "absol-mega":       "absolite",
  "garchomp-mega":    "garchompite",
  "lucario-mega":     "lucarionite",
  "abomasnow-mega":   "abomasite",
  "beedrill-mega":    "beedrillite",
  "pidgeot-mega":     "pidgeotite",
  "slowbro-mega":     "slowbronite",
  "steelix-mega":     "steelixite",
  "sceptile-mega":    "sceptilite",
  "swampert-mega":    "swampertite",
  "sableye-mega":     "sablenite",
  "sharpedo-mega":    "sharpedonite",
  "camerupt-mega":    "cameruptite",
  "altaria-mega":     "altarianite",
  "glalie-mega":      "glalitite",
  "salamence-mega":   "salamencite",
  "metagross-mega":   "metagrossite",
  "latias-mega":      "latiasite",
  "latios-mega":      "latiosite",
  "rayquaza-mega":    "rayquaza-mega", // no necesita stone, pero lo incluimos
  "lopunny-mega":     "lopunnite",
  "gallade-mega":     "galladite",
  "audino-mega":      "audinite",
  "diancie-mega":     "diancite",
};

// Extrae el nombre base del slug mega
// "charizard-mega-x" → "charizard"
// "venusaur-mega"    → "venusaur"
function getBaseName(megaSlug: string): string {
  return megaSlug.replace(/-mega(-[xy])?$/, "");
}

async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      console.log(`  Retry ${i + 1}/${retries} for ${url}`);
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
}

async function main() {
  console.log("🔵 Iniciando seed de mega_evolutions...\n");

  const rows: {
    base_pokemon_id: number;
    mega_pokemon_id: number;
    mega_name: string;
    base_name: string;
    required_item: string;
    type_override: string[];
  }[] = [];

  const megaSlugs = Object.keys(MEGA_STONE_MAP);
  console.log(`📋 Total de megas a procesar: ${megaSlugs.length}\n`);

  for (const megaSlug of megaSlugs) {
    const baseName = getBaseName(megaSlug);
    const requiredItem = MEGA_STONE_MAP[megaSlug];

    process.stdout.write(`  Procesando ${megaSlug}...`);

    try {
      // Obtener datos del mega desde PokeAPI
      const megaData = await fetchWithRetry(
        `https://pokeapi.co/api/v2/pokemon/${megaSlug}`
      );

      // Obtener datos del base desde pokemon_cache (Supabase) o PokeAPI
      const { data: cachedBase } = await supabase
        .from("pokemon_cache")
        .select("pokemon_id")
        .eq("name", baseName)
        .maybeSingle();

      let basePokemonId: number;
      if (cachedBase) {
        basePokemonId = cachedBase.pokemon_id;
      } else {
        // Fallback a PokeAPI si no está en cache
        const baseData = await fetchWithRetry(
          `https://pokeapi.co/api/v2/pokemon/${baseName}`
        );
        basePokemonId = baseData.id;
      }

      const typeOverride: string[] = megaData.types.map(
        (t: any) => t.type.name as string
      );

      rows.push({
        base_pokemon_id: basePokemonId,
        mega_pokemon_id: megaData.id,
        mega_name: megaSlug,
        base_name: baseName,
        required_item: requiredItem,
        type_override: typeOverride,
      });

      console.log(
        ` ✅  (base_id=${basePokemonId}, mega_id=${megaData.id}, tipos=[${typeOverride.join(",")}])`
      );
    } catch (err) {
      console.log(` ❌  ERROR: ${err}`);
    }

    // Pausa corta para no saturar PokeAPI
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n💾 Insertando ${rows.length} filas en mega_evolutions...`);

  // Upsert en bloques de 20
  const CHUNK = 20;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("mega_evolutions")
      .upsert(chunk, { onConflict: "mega_name" });

    if (error) {
      console.error(`  ❌ Error en chunk ${i}-${i + CHUNK}:`, error.message);
    } else {
      inserted += chunk.length;
      console.log(`  ✅ ${inserted}/${rows.length} filas insertadas`);
    }
  }

  console.log("\n🎉 seed-megas completado!");
  console.log(`   Total insertados: ${inserted}/${rows.length}`);

  if (inserted < rows.length) {
    console.warn(
      "\n⚠️  Algunos megas fallaron. Revisa los errores arriba y vuelve a correr el script — los upserts son idempotentes."
    );
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});