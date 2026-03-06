/**
 * scripts/seed-evolutions.ts
 *
 * Pobla la tabla evolution_cache en Supabase con todas las cadenas evolutivas.
 * Usa species_cache para obtener las URLs de evolución (debe estar poblada primero).
 * Si species_cache no tiene un Pokémon, hace fallback directo a PokeAPI.
 *
 * Ejecutar con: npx tsx --env-file=.env scripts/seed-evolutions.ts
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

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${url} (${res.status})`);
  return res.json();
}

// ─── Parsear nodo de cadena evolutiva recursivamente ─────────────────────────

interface EvolutionRow {
  from_pokemon_id: number;
  to_pokemon_id: number;
  trigger: string;
  min_level: number | null;
  item_id: string | null;
}

function parseChainNode(node: any): EvolutionRow[] {
  const rows: EvolutionRow[] = [];

  const fromId = parseInt(node.species.url.split("/").at(-2));

  for (const next of node.evolves_to) {
    const toId = parseInt(next.species.url.split("/").at(-2));

    for (const detail of next.evolution_details) {
      const trigger = detail.trigger?.name ?? "unknown";

      rows.push({
        from_pokemon_id: fromId,
        to_pokemon_id: toId,
        trigger,
        min_level: detail.min_level ?? null,
        item_id: detail.item?.name ?? null,
      });
    }

    // Recursivo para cadenas de 3 etapas
    rows.push(...parseChainNode(next));
  }

  return rows;
}

// ─── Obtener URLs de evolution_chain únicas desde species_cache ──────────────

async function getEvolutionChainUrls(): Promise<string[]> {
  console.log("Fetching evolution chain URLs from species_cache...");

  const { data, error } = await supabase
    .from("species_cache")
    .select("evolution_chain_url")
    .not("evolution_chain_url", "is", null);

  if (error) throw new Error(`species_cache query failed: ${error.message}`);

  const urls = [...new Set(data.map((r: any) => r.evolution_chain_url as string))];
  console.log(`Found ${urls.length} unique evolution chains.\n`);
  return urls;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const chainUrls = await getEvolutionChainUrls();

  if (chainUrls.length === 0) {
    console.log("No evolution chain URLs found in species_cache.");
    console.log("Make sure seed-cache.ts has been run first.");
    process.exit(1);
  }

  let done = 0;
  let errors = 0;
  let totalRows = 0;

  for (const url of chainUrls) {
    try {
      process.stdout.write(`[${done + 1}/${chainUrls.length}] ${url} ... `);

      const chain = await fetchJson(url);
      const rows = parseChainNode(chain.chain);

      if (rows.length === 0) {
        console.log("no evolutions");
        done++;
        continue;
      }

      const { error } = await supabase
        .from("evolution_cache")
        .upsert(rows, { onConflict: "from_pokemon_id,to_pokemon_id", ignoreDuplicates: true });

      if (error) {
        console.log(`ERROR: ${error.message}`);
        errors++;
      } else {
        console.log(`OK (${rows.length} rows)`);
        totalRows += rows.length;
      }

      await delay(300);
    } catch (e: any) {
      console.log(`ERROR: ${e.message}`);
      errors++;
    }

    done++;
  }

  console.log(`\nDone. ${done - errors}/${chainUrls.length} chains OK.`);
  console.log(`Total evolution rows inserted: ${totalRows}`);
  console.log(`Errors: ${errors}`);
  process.exit(0);
}

main();