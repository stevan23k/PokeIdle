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

// ─── Pokémon a seedear ───────────────────────────────────────────────────────
// Starters de todas las generaciones + sus evoluciones + legendarios frecuentes
const PRIORITY_IDS = [
  // Kanto starters
  1, 2, 3, 4, 5, 6, 7, 8, 9,
  // Kanto clásicos
  25, 26, 52, 53, 54, 55, 58, 59, 60, 61, 62,
  63, 64, 65, 66, 67, 68, 74, 75, 76,
  79, 80, 81, 82, 92, 93, 94,
  104, 105, 106, 107, 108, 109, 110,
  111, 112, 113, 114, 115, 116, 117, 118, 119,
  120, 121, 122, 123, 124, 125, 126, 127, 128,
  129, 130, 131, 132, 133, 134, 135, 136,
  137, 138, 139, 140, 141, 142, 143,
  // Kanto legendarios
  144, 145, 146, 150, 151,
  // Johto starters
  152, 153, 154, 155, 156, 157, 158, 159, 160,
  // Johto comunes
  161, 162, 163, 164, 165, 166, 167, 168,
  172, 173, 174, 175, 176, 179, 180, 181,
  183, 184, 185, 186, 187, 188, 189,
  190, 191, 192, 193, 194, 195, 196, 197,
  198, 199, 200, 201, 202, 203, 204, 205,
  206, 207, 208, 209, 210, 211, 212, 213,
  214, 215, 216, 217, 218, 219, 220, 221,
  // Johto legendarios
  243, 244, 245, 249, 250, 251,
  // Hoenn starters
  252, 253, 254, 255, 256, 257, 258, 259, 260,
  // Hoenn comunes
  261, 262, 263, 264, 265, 266, 267, 268, 269,
  270, 271, 272, 273, 274, 275, 276, 277,
  278, 279, 280, 281, 282, 283, 284, 285, 286,
  287, 288, 289, 290, 291, 292, 293, 294, 295,
  296, 297, 298, 299, 300, 301, 302, 303,
  304, 305, 306, 307, 308, 309, 310,
  311, 312, 313, 314, 315, 316, 317,
  318, 319, 320, 321, 322, 323, 324,
  325, 326, 327, 328, 329, 330, 331, 332,
  333, 334, 335, 336, 337, 338, 339, 340,
  341, 342, 343, 344, 345, 346, 347, 348,
  349, 350, 351, 352, 353, 354, 355, 356,
  // Hoenn legendarios
  377, 378, 379, 380, 381, 382, 383, 384, 385, 386,
  // Sinnoh starters
  387, 388, 389, 390, 391, 392, 393, 394, 395,
  // Sinnoh comunes
  396, 397, 398, 399, 400, 401, 402, 403, 404, 405,
  406, 407, 408, 409, 410, 411, 412, 413, 414,
  415, 416, 417, 418, 419, 420, 421, 422, 423,
  424, 425, 426, 427, 428, 429, 430, 431, 432,
  433, 434, 435, 436, 437, 438, 439, 440, 441,
  442, 443, 444, 445, 446, 447, 448, 449, 450,
  451, 452, 453, 454, 455, 456, 457, 458, 459, 460,
  // Sinnoh legendarios
  480, 481, 482, 483, 484, 485, 486, 487, 488, 491, 493,
  // Unova starters
  495, 496, 497, 498, 499, 500, 501, 502, 503,
  // Unova comunes
  504, 505, 506, 507, 508, 509, 510, 511, 512,
  513, 514, 515, 516, 517, 518, 519, 520, 521,
  522, 523, 524, 525, 526, 527, 528, 529, 530,
  531, 532, 533, 534, 535, 536, 537, 538, 539,
  540, 541, 542, 543, 544, 545, 546, 547, 548,
  549, 550, 551, 552, 553, 554, 555, 556, 557,
  558, 559, 560, 561, 562, 563, 564, 565, 566,
  567, 568, 569, 570, 571, 572, 573, 574, 575,
  576, 577, 578, 579, 580, 581, 582, 583, 584,
  585, 586, 587, 588, 589, 590, 591, 592, 593,
  // Unova legendarios
  638, 639, 640, 641, 642, 643, 644, 645, 646,
  // Kalos starters
  650, 651, 652, 653, 654, 655, 656, 657, 658,
  // Kalos comunes
  659, 660, 661, 662, 663, 664, 665, 666, 667,
  668, 669, 670, 671, 672, 673, 674, 675, 676,
  677, 678, 679, 680, 681, 682, 683, 684, 685,
  686, 687, 688, 689, 690, 691, 692, 693, 694,
  695, 696, 697, 698, 699, 700, 701, 702, 703,
  704, 705, 706, 707, 708, 709, 710, 711, 712, 713,
  // Kalos legendarios
  716, 717, 718,
  // Alola starters
  722, 723, 724, 725, 726, 727, 728, 729, 730,
  // Alola comunes
  731, 732, 733, 734, 735, 736, 737, 738, 739,
  740, 741, 742, 743, 744, 745, 746, 747, 748,
  749, 750, 751, 752, 753, 754, 755, 756, 757,
  758, 759, 760, 761, 762, 763, 764, 765, 766,
  767, 768, 769, 770, 771, 772, 773, 774, 775,
  776, 777, 778, 779, 780, 781, 782, 783, 784,
  // Alola legendarios
  785, 786, 787, 788, 791, 792, 800,
  // Ultra Beasts
  793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806,
  // Galar starters
  810, 811, 812, 813, 814, 815, 816, 817, 818,
  // Galar comunes
  819, 820, 821, 822, 823, 824, 825, 826, 827,
  828, 829, 830, 831, 832, 833, 834, 835, 836,
  837, 838, 839, 840, 841, 842, 843, 844, 845,
  846, 847, 848, 849, 850, 851, 852, 853, 854,
  855, 856, 857, 858, 859, 860, 861, 862, 863,
  864, 865, 866, 867, 868, 869, 870, 871, 872,
  873, 874, 875, 876, 877, 878, 879, 880, 881,
  882, 883, 884, 885, 886, 887,
  // Galar legendarios
  888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 898,
  // Paldea starters
  906, 907, 908, 909, 910, 911, 912, 913, 914,
  // Paldea comunes
  915, 916, 917, 918, 919, 920, 921, 922, 923,
  924, 925, 926, 927, 928, 929, 930, 931, 932,
  933, 934, 935, 936, 937, 938, 939, 940, 941,
  942, 943, 944, 945, 946, 947, 948, 949, 950,
  951, 952, 953, 954, 955, 956, 957, 958, 959,
  960, 961, 962, 963, 964, 965, 966, 967, 968,
  969, 970, 971, 972, 973, 974, 975, 976, 977,
  978, 979, 980, 981, 982, 983,
  // Paradox
  984, 985, 986, 987, 988, 989, 990,
  991, 992, 993, 994, 995, 996, 997,
  1001, 1002, 1003, 1004,
  1005, 1006, 1007, 1008,
];

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
    },
    { onConflict: "move_id", ignoreDuplicates: true }
  );

  if (error) console.error(`  Move ${md.id} error:`, error.message);
}

// ─── Seed pokemon_cache ───────────────────────────────────────────────────────

async function seedPokemon(id: number): Promise<void> {
  // Check if already cached
  const { data: existing } = await supabase
    .from("pokemon_cache")
    .select("pokemon_id")
    .eq("pokemon_id", id)
    .single();

  if (existing) {
    console.log(`  [SKIP] #${id} already cached`);
    return;
  }

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

  // Seed moves concurrently (top 20 most recent to avoid too many requests)
  const movesToSeed = levelUpMoves.slice(0, 20);
  for (const m of movesToSeed) {
    try {
      await seedMove(m.url);
      await delay(150);
    } catch (e) {
      console.error(`  Move ${m.moveId} fetch failed, skipping`);
    }
  }

  // Insert pokemon
  const { error } = await supabase.from("pokemon_cache").upsert(
    {
      pokemon_id: id,
      name: data.name,
      types: data.types.map((t: any) => t.type.name),
      base_stats: baseStats,
      level_up_moves: levelUpMoves.map(({ moveId, level }) => ({ moveId, level })),
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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const total = PRIORITY_IDS.length;
  console.log(`\nStarting seed — ${total} Pokémon\n`);

  let done = 0;
  let errors = 0;

  for (const id of PRIORITY_IDS) {
    try {
      process.stdout.write(`[${done + 1}/${total}] Seeding #${id}... `);
      await seedPokemon(id);
      await seedSpecies(id);
      await delay(400); // Rate limiting — PokeAPI pide no saturar
      console.log("OK");
    } catch (e: any) {
      console.log(`ERROR: ${e.message}`);
      errors++;
    }
    done++;
  }

  console.log(`\nDone. ${done - errors}/${total} OK, ${errors} errors.`);
  process.exit(0);
}

main();