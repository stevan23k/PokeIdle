/**
 * scripts/seed-cache.ts
 *
 * Pobla las tablas pokemon_cache y move_cache en Supabase
 * fetcheando datos de PokeAPI.
 *
 * Ejecutar con: npx tsx --env-file=.env scripts/seed-cache.ts
 *
 * Requiere en .env:
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY=eyJ...
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const API = "https://pokeapi.co/api/v2";


// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${url} (${res.status})`);
  return res.json();
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const statKeyMap: Record<string, string> = {
  hp: "hp",
  attack: "attack",
  defense: "defense",
  "special-attack": "spAtk",
  "special-defense": "spDef",
  speed: "speed",
};

const ailmentMap: Record<string, string> = {
  paralysis: "PAR",
  burn: "BRN",
  poison: "PSN",
  toxic: "TOX",
  sleep: "SLP",
  freeze: "FRZ",
};

// ─── Seed move_cache ──────────────────────────────────────────────────────────

const seededMoves = new Set<number>();

async function seedMove(url: string): Promise<void> {
  const md = await fetchJson(url);
  if (seededMoves.has(md.id)) return;
  seededMoves.add(md.id);

  const ailmentName = md.meta?.ailment?.name;
  const ailment =
    ailmentName && ailmentName !== "none" ? ailmentMap[ailmentName] ?? null : null;

  // Extraer descripción — preferir español, caer a inglés
  const flavorEntries: any[] = md.flavor_text_entries ?? [];
  const descEs = flavorEntries.find((f: any) => f.language.name === "es")?.flavor_text ?? null;
  const descEn = flavorEntries.find((f: any) => f.language.name === "en")?.flavor_text ?? null;
  // Limpiar saltos de línea y espacios extra que PokeAPI incluye
  const description = (descEs ?? descEn ?? null)
    ?.replace(/\n|\f/g, " ")
    .replace(/\s+/g, " ")
    .trim() ?? null;

  const { error } = await supabase.from("move_cache").upsert(
    {
      move_id: md.id,
      name_es:
        md.names.find((n: any) => n.language.name === "es")?.name ?? md.name,
      name_en: md.name,
      type: md.type.name,
      category: md.damage_class.name,
      power: md.power ?? null,
      accuracy: md.accuracy ?? null,
      pp: md.pp ?? 10,
      priority: md.priority ?? 0,
      ailment,
      ailment_chance: md.meta?.ailment_chance ?? null,
      description_es: description,
    },
    { onConflict: "move_id", ignoreDuplicates: false }
  );

  if (error) console.error(`  Move ${md.id} error:`, error.message);
}

// ─── Seed pokemon_cache ───────────────────────────────────────────────────────
// ... existing seedPokemon function omitted for brevity, but I will keep it in the real file ...

// ─── Seed pokemon_cache ───────────────────────────────────────────────────────

async function seedPokemon(id: number): Promise<void> {
  // Check if already cached
  /* 
  if (existing) {
    console.log(`  [SKIP] #${id} already cached`);
    return;
  }
  */

  const data = await fetchJson(`${API}/pokemon/${id}`);

  // Build base stats
  const baseStats: Record<string, number> = {};
  for (const s of data.stats) {
    const key = statKeyMap[s.stat.name];
    if (key) baseStats[key] = s.base_stat;
  }

  // Get all level-up moves
  const levelUpMoves = data.moves
    .filter((m: any) =>
      m.version_group_details.some(
        (v: any) => v.move_learn_method.name === "level-up"
      )
    )
    .map((m: any) => {
      const vg = m.version_group_details
        .filter((v: any) => v.move_learn_method.name === "level-up")
        .sort((a: any, b: any) => b.level_learned_at - a.level_learned_at)[0];
      return {
        moveId: parseInt(m.move.url.split("/").at(-2)),
        level: vg.level_learned_at,
        url: m.move.url,
      };
    })
    .sort((a: any, b: any) => b.level - a.level);

  // Get all TM moves
  const tmMoves: number[] = [];
  for (const moveEntry of data.moves) {
    const learnsMachineInAnyVersion = moveEntry.version_group_details.some(
      (vgd: any) => vgd.move_learn_method.name === "machine"
    );
    if (learnsMachineInAnyVersion) {
      const moveUrl = moveEntry.move.url as string;
      const moveIdMatch = moveUrl.match(/\/move\/(\d+)\//);
      if (moveIdMatch) {
        tmMoves.push(parseInt(moveIdMatch[1]));
      }
    }
  }

  // Seed moves concurrently (top 20 most recent to avoid too many requests)
  const movesToSeed = levelUpMoves.slice(0, 20);
  for (const m of movesToSeed) {
    try {
      await seedMove(m.url);
      await delay(50);
    } catch (e) {
      console.error(`  Move ${m.moveId} fetch failed, skipping`);
    }
  }

  // Extraer ability principal (primera no-oculta)
  const mainAbility = data.abilities.find((a: any) => !a.is_hidden)?.ability.name ?? null;

  // Insert pokemon
  const { error } = await supabase.from("pokemon_cache").upsert(
    {
      pokemon_id: id,
      name: data.name,
      types: data.types.map((t: any) => t.type.name),
      base_stats: baseStats,
      level_up_moves: levelUpMoves.map(({ moveId, level }) => ({ moveId, level })),
      tm_moves: tmMoves,
      ability: mainAbility,
      sprite_url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${id}.gif`,
    },
    { onConflict: "pokemon_id" }
  );

  if (error) console.error(`  Pokemon ${id} error:`, error.message);
}

// ─── Seed species_cache ───────────────────────────────────────────────────────

async function seedSpecies(id: number): Promise<void> {
  const { data: existing } = await supabase
    .from("species_cache")
    .select("pokemon_id")
    .eq("pokemon_id", id)
    .single();

  if (existing) return;

  try {
    const species = await fetchJson(`${API}/pokemon-species/${id}`);

    const { error } = await supabase.from("species_cache").upsert(
      {
        pokemon_id: id,
        name: species.name,
        is_legendary: species.is_legendary,
        is_mythical: species.is_mythical,
        evolves_from_id: species.evolves_from_species
          ? parseInt(species.evolves_from_species.url.split("/").at(-2))
          : null,
        evolution_chain_url: species.evolution_chain?.url ?? null,
        growth_rate: species.growth_rate?.name ?? "medium",
      },
      { onConflict: "pokemon_id" }
    );

    if (error) console.error(`  Species ${id} error:`, error.message);
  } catch {
    console.error(`  Species ${id} not found in PokeAPI, skipping`);
  }
}

async function seedAllMoves() {
  console.log("\nFetching move list from PokeAPI...");
  const res = await fetch(`${API}/move?limit=2000&offset=0`);
  const data = await res.json();
  const moves = data.results as { name: string; url: string }[];
  console.log(`Seeding ${moves.length} moves...\n`);

  let done = 0;
  for (let i = 0; i < moves.length; i += BATCH_SIZE) {
    const batch = moves.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(batch.map((m) => seedMove(m.url)));
    done += batch.length;
    console.log(`[${done}/${moves.length}] moves procesados`);
    await delay(DELAY_BETWEEN_BATCHES);
  }
  console.log("\nMoves done.");
  process.exit(0);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const BATCH_SIZE = 10;  // Pokémon procesados simultáneamente
const DELAY_BETWEEN_BATCHES = 1000; // ms entre lotes (respetar rate limit de PokeAPI)

async function main() {
  console.log("\nFetching Pokémon list from PokeAPI...");
  
  const res = await fetch(`${API}/pokemon?limit=1025&offset=0`);
  const data = await res.json();
  
  // IDs base 1-1025 (sin formas alternativas)
  const baseIds: number[] = data.results.map((_: any, i: number) => i + 1);
  
  // Formas especiales necesarias para mecánicas del juego
  const specialFormIds: number[] = [
    10026, // Aegislash-Blade (usado por abilities.engine.ts)
  ];
  
  const allIds = [...baseIds, ...specialFormIds];
  const total = allIds.length;
  
  console.log(`Seeding ${total} Pokémon in batches of ${BATCH_SIZE}\n`);

  let done = 0;
  let errors = 0;

  // Procesar en lotes paralelos
  for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
    const batch = allIds.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.allSettled(
      batch.map(async (id) => {
        await seedPokemon(id);
        await seedSpecies(id);
        return id;
      })
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      done++;
      if (result.status === "fulfilled") {
        console.log(`[${done}/${total}] #${batch[j]} OK`);
      } else {
        console.log(`[${done}/${total}] #${batch[j]} ERROR: ${result.reason?.message}`);
        errors++;
      }
    }

    // Pausa entre lotes para no saturar PokeAPI
    if (i + BATCH_SIZE < allIds.length) {
      await delay(DELAY_BETWEEN_BATCHES);
    }
  }

  console.log(`\nDone. ${done - errors}/${total} OK, ${errors} errors.`);
  process.exit(0);
}

if (process.argv.includes("--moves-only")) {
  seedAllMoves();
} else {
  main();
}
