/**
 * scripts/seed-kanto.ts
 *
 * Pobla las tablas zones, gyms y elite_four con datos completos de Kanto.
 * Diseñado para ser la plantilla de todas las regiones futuras.
 *
 * Ejecutar con: npx tsx --env-file=.env scripts/seed-kanto.ts
 *
 * SCHEMA ESPERADO EN SUPABASE:
 *
 * CREATE TABLE zones (
 *   id              TEXT PRIMARY KEY,
 *   region          TEXT NOT NULL,
 *   zone_index      INTEGER NOT NULL,
 *   name            TEXT NOT NULL,
 *   description     TEXT,
 *   encounter_rate  FLOAT NOT NULL DEFAULT 0.5,
 *   trainer_count   INTEGER NOT NULL DEFAULT 4,
 *   battle_bg_id    TEXT NOT NULL DEFAULT 'grass-route',
 *   reference_bst   INTEGER NOT NULL DEFAULT 300,
 *   wild_pokemon    JSONB NOT NULL DEFAULT '[]',
 *   item_drops      JSONB NOT NULL DEFAULT '[]',
 *   is_gym          BOOLEAN DEFAULT FALSE,
 *   gym_id          INTEGER,
 *   created_at      TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * CREATE TABLE gyms (
 *   id              INTEGER NOT NULL,
 *   region          TEXT NOT NULL,
 *   leader_name     TEXT NOT NULL,
 *   badge_name      TEXT NOT NULL,
 *   type            TEXT NOT NULL,
 *   unlock_level    INTEGER NOT NULL,
 *   reference_bst   INTEGER NOT NULL,
 *   mechanic        TEXT NOT NULL,
 *   pokemon         JSONB NOT NULL DEFAULT '[]',
 *   reward_items    JSONB NOT NULL DEFAULT '[]',
 *   PRIMARY KEY (id, region)
 * );
 *
 * CREATE TABLE elite_four (
 *   region          TEXT NOT NULL,
 *   slot            INTEGER NOT NULL,  -- 1-4 = Elite Four, 5 = Champion
 *   name            TEXT NOT NULL,
 *   role            TEXT NOT NULL,     -- 'elite_four' | 'champion'
 *   type            TEXT NOT NULL,
 *   pokemon         JSONB NOT NULL DEFAULT '[]',
 *   PRIMARY KEY (region, slot)
 * );
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// ─────────────────────────────────────────────────────────────────────────────
// KANTO ZONES — 16 zonas fieles a las rutas del juego original
// Progresión de niveles: 2-62
// Cada zona tiene entre 4-7 Pokémon salvajes con pesos realistas
// ─────────────────────────────────────────────────────────────────────────────

const KANTO_ZONES = [
  // ── PRE GYM 1 (Brock) ────────────────────────────────────────────────────
  {
    id: "kanto-route-1",
    region: "kanto",
    zone_index: 0,
    name: "Ruta 1",
    description: "Un camino rural tranquilo. Los primeros pasos de todo entrenador.",
    encounter_rate: 0.5,
    trainer_count: 2,
    battle_bg_id: "grass-route",
    reference_bst: 240,
    wild_pokemon: [
      { pokemonId: 16, minLevel: 2, maxLevel: 4, weight: 50, captureRate: 1.0 },  // Pidgey
      { pokemonId: 19, minLevel: 2, maxLevel: 4, weight: 50, captureRate: 1.0 },  // Rattata
    ],
    item_drops: [
      { itemId: "potion", chance: 0.12 },
      { itemId: "poke-ball", chance: 0.10 },
    ],
    is_gym: false,
    gym_id: null,
  },
  {
    id: "kanto-route-2",
    region: "kanto",
    zone_index: 1,
    name: "Ruta 2 / Bosque Verde",
    description: "Un bosque denso lleno de Pokémon Bicho. Ideal para capturar.",
    encounter_rate: 0.6,
    trainer_count: 4,
    battle_bg_id: "forest-green",
    reference_bst: 270,
    wild_pokemon: [
      { pokemonId: 10, minLevel: 3, maxLevel: 5, weight: 35, captureRate: 1.0 },  // Caterpie
      { pokemonId: 13, minLevel: 3, maxLevel: 5, weight: 35, captureRate: 1.0 },  // Weedle
      { pokemonId: 11, minLevel: 4, maxLevel: 6, weight: 15, captureRate: 0.9 },  // Metapod
      { pokemonId: 14, minLevel: 4, maxLevel: 6, weight: 10, captureRate: 0.9 },  // Kakuna
      { pokemonId: 25, minLevel: 3, maxLevel: 5, weight: 5,  captureRate: 0.8 },  // Pikachu (raro)
    ],
    item_drops: [
      { itemId: "potion", chance: 0.15 },
      { itemId: "antidote", chance: 0.10 },
      { itemId: "poke-ball", chance: 0.08 },
    ],
    is_gym: false,
    gym_id: null,
  },
  {
    id: "kanto-pewter-gym",
    region: "kanto",
    zone_index: 2,
    name: "Gimnasio de Plateada (Brock)",
    description: "El Gimnasio Roca de Brock. Sus Pokémon son duros como piedras.",
    encounter_rate: 0,
    trainer_count: 0,
    battle_bg_id: "gym-rock",
    reference_bst: 300,
    wild_pokemon: [],
    item_drops: [],
    is_gym: true,
    gym_id: 1,
  },

  // ── PRE GYM 2 (Misty) ────────────────────────────────────────────────────
  {
    id: "kanto-mt-moon",
    region: "kanto",
    zone_index: 3,
    name: "Monte Moon",
    description: "Una cueva mística donde caen piedras lunares y habitan Clefairy.",
    encounter_rate: 0.7,
    trainer_count: 6,
    battle_bg_id: "cave-dirt",
    reference_bst: 310,
    wild_pokemon: [
      { pokemonId: 41, minLevel: 8,  maxLevel: 12, weight: 40, captureRate: 1.0 },  // Zubat
      { pokemonId: 74, minLevel: 8,  maxLevel: 10, weight: 30, captureRate: 1.0 },  // Geodude
      { pokemonId: 46, minLevel: 8,  maxLevel: 10, weight: 15, captureRate: 0.9 },  // Paras
      { pokemonId: 35, minLevel: 10, maxLevel: 12, weight: 10, captureRate: 0.7 },  // Clefairy
      { pokemonId: 39, minLevel: 9,  maxLevel: 11, weight: 5,  captureRate: 0.8 },  // Jigglypuff
    ],
    item_drops: [
      { itemId: "super-potion", chance: 0.15 },
      { itemId: "great-ball",   chance: 0.10 },
      { itemId: "revive",       chance: 0.05 },
      { itemId: "moon-stone",   chance: 0.03 },
    ],
    is_gym: false,
    gym_id: null,
  },
  {
    id: "kanto-route-24-25",
    region: "kanto",
    zone_index: 4,
    name: "Rutas 24-25 / Cabo Celeste",
    description: "Rutas acuáticas al norte de Ciudad Celeste. Bulliciosas de entrenadores.",
    encounter_rate: 0.6,
    trainer_count: 5,
    battle_bg_id: "water-route",
    reference_bst: 320,
    wild_pokemon: [
      { pokemonId: 60,  minLevel: 10, maxLevel: 14, weight: 30, captureRate: 1.0 }, // Poliwag
      { pokemonId: 72,  minLevel: 10, maxLevel: 13, weight: 25, captureRate: 1.0 }, // Tentacool
      { pokemonId: 118, minLevel: 10, maxLevel: 13, weight: 25, captureRate: 1.0 }, // Goldeen
      { pokemonId: 54,  minLevel: 11, maxLevel: 14, weight: 15, captureRate: 0.9 }, // Psyduck
      { pokemonId: 79,  minLevel: 12, maxLevel: 14, weight: 5,  captureRate: 0.8 }, // Slowpoke
    ],
    item_drops: [
      { itemId: "super-potion", chance: 0.12 },
      { itemId: "great-ball",   chance: 0.08 },
      { itemId: "antidote",     chance: 0.10 },
    ],
    is_gym: false,
    gym_id: null,
  },
  {
    id: "kanto-cerulean-gym",
    region: "kanto",
    zone_index: 5,
    name: "Gimnasio de Ciudad Celeste (Misty)",
    description: "El Gimnasio Agua de Misty. Sus Pokémon atacan sin piedad.",
    encounter_rate: 0,
    trainer_count: 0,
    battle_bg_id: "gym-water",
    reference_bst: 340,
    wild_pokemon: [],
    item_drops: [],
    is_gym: true,
    gym_id: 2,
  },

  // ── PRE GYM 3 (Lt. Surge) ────────────────────────────────────────────────
  {
    id: "kanto-rock-tunnel",
    region: "kanto",
    zone_index: 6,
    name: "Túnel Roca",
    description: "Un foso oscuro y largo. Sin Flash, es fácil perderse.",
    encounter_rate: 0.75,
    trainer_count: 7,
    battle_bg_id: "cave-dirt",
    reference_bst: 360,
    wild_pokemon: [
      { pokemonId: 41,  minLevel: 15, maxLevel: 18, weight: 35, captureRate: 1.0 }, // Zubat
      { pokemonId: 74,  minLevel: 15, maxLevel: 17, weight: 25, captureRate: 1.0 }, // Geodude
      { pokemonId: 66,  minLevel: 15, maxLevel: 18, weight: 20, captureRate: 1.0 }, // Machop
      { pokemonId: 95,  minLevel: 15, maxLevel: 18, weight: 15, captureRate: 0.8 }, // Onix
      { pokemonId: 104, minLevel: 14, maxLevel: 17, weight: 5,  captureRate: 0.9 }, // Cubone
    ],
    item_drops: [
      { itemId: "super-potion", chance: 0.12 },
      { itemId: "great-ball",   chance: 0.08 },
      { itemId: "escape-rope",  chance: 0.10 },
      { itemId: "revive",       chance: 0.05 },
    ],
    is_gym: false,
    gym_id: null,
  },
  {
    id: "kanto-vermilion-gym",
    region: "kanto",
    zone_index: 7,
    name: "Gimnasio de Ciudad Carmín (Lt. Surge)",
    description: "El Gimnasio Eléctrico del Teniente Surge. Cuidado con la parálisis.",
    encounter_rate: 0,
    trainer_count: 0,
    battle_bg_id: "gym-electric",
    reference_bst: 370,
    wild_pokemon: [],
    item_drops: [],
    is_gym: true,
    gym_id: 3,
  },

  // ── PRE GYM 4 (Erika) ────────────────────────────────────────────────────
  {
    id: "kanto-pokemon-tower",
    region: "kanto",
    zone_index: 8,
    name: "Torre Pokémon",
    description: "Una torre ancestral donde descansan los Pokémon fallecidos. Fantasmas acechan.",
    encounter_rate: 0.65,
    trainer_count: 8,
    battle_bg_id: "tower-ghost",
    reference_bst: 390,
    wild_pokemon: [
      { pokemonId: 92,  minLevel: 20, maxLevel: 24, weight: 40, captureRate: 0.9 }, // Gastly
      { pokemonId: 93,  minLevel: 22, maxLevel: 25, weight: 20, captureRate: 0.8 }, // Haunter
      { pokemonId: 41,  minLevel: 20, maxLevel: 23, weight: 25, captureRate: 1.0 }, // Zubat
      { pokemonId: 42,  minLevel: 21, maxLevel: 24, weight: 15, captureRate: 0.9 }, // Golbat
    ],
    item_drops: [
      { itemId: "super-potion", chance: 0.12 },
      { itemId: "revive",       chance: 0.08 },
      { itemId: "escape-rope",  chance: 0.08 },
      { itemId: "great-ball",   chance: 0.06 },
    ],
    is_gym: false,
    gym_id: null,
  },
  {
    id: "kanto-route-12-15",
    region: "kanto",
    zone_index: 9,
    name: "Rutas 12-15 / Costa Sur",
    description: "Rutas costeras al sur de Kanto. Mar abierto y entrenadores fuertes.",
    encounter_rate: 0.6,
    trainer_count: 6,
    battle_bg_id: "water-route",
    reference_bst: 400,
    wild_pokemon: [
      { pokemonId: 98,  minLevel: 20, maxLevel: 24, weight: 30, captureRate: 1.0 }, // Krabby
      { pokemonId: 72,  minLevel: 20, maxLevel: 24, weight: 25, captureRate: 1.0 }, // Tentacool
      { pokemonId: 118, minLevel: 20, maxLevel: 23, weight: 20, captureRate: 1.0 }, // Goldeen
      { pokemonId: 129, minLevel: 20, maxLevel: 24, weight: 15, captureRate: 0.7 }, // Magikarp
      { pokemonId: 119, minLevel: 22, maxLevel: 25, weight: 10, captureRate: 0.8 }, // Seaking
    ],
    item_drops: [
      { itemId: "hyper-potion",  chance: 0.10 },
      { itemId: "ultra-ball",    chance: 0.05 },
      { itemId: "super-repel",   chance: 0.08 },
    ],
    is_gym: false,
    gym_id: null,
  },
  {
    id: "kanto-celadon-gym",
    region: "kanto",
    zone_index: 10,
    name: "Gimnasio de Ciudad Celeste (Erika)",
    description: "El Gimnasio Planta de Erika. Aromas letales y flores venenosas.",
    encounter_rate: 0,
    trainer_count: 0,
    battle_bg_id: "gym-grass",
    reference_bst: 420,
    wild_pokemon: [],
    item_drops: [],
    is_gym: true,
    gym_id: 4,
  },

  // ── PRE GYM 5 (Koga) ─────────────────────────────────────────────────────
  {
    id: "kanto-safari-zone",
    region: "kanto",
    zone_index: 11,
    name: "Zona Safari",
    description: "Una reserva natural exclusiva. Pokémon raros que no se encuentran en otro lugar.",
    encounter_rate: 0.7,
    trainer_count: 0,
    battle_bg_id: "safari-grass",
    reference_bst: 420,
    wild_pokemon: [
      { pokemonId: 111, minLevel: 25, maxLevel: 30, weight: 20, captureRate: 0.7 }, // Rhyhorn
      { pokemonId: 115, minLevel: 25, maxLevel: 28, weight: 10, captureRate: 0.5 }, // Kangaskhan
      { pokemonId: 113, minLevel: 23, maxLevel: 26, weight: 10, captureRate: 0.6 }, // Chansey
      { pokemonId: 147, minLevel: 24, maxLevel: 27, weight: 5,  captureRate: 0.4 }, // Dratini
      { pokemonId: 114, minLevel: 24, maxLevel: 28, weight: 20, captureRate: 0.9 }, // Tangela
      { pokemonId: 128, minLevel: 25, maxLevel: 30, weight: 15, captureRate: 0.8 }, // Tauros
      { pokemonId: 108, minLevel: 25, maxLevel: 28, weight: 10, captureRate: 0.7 }, // Lickitung
      { pokemonId: 83,  minLevel: 23, maxLevel: 26, weight: 10, captureRate: 0.8 }, // Farfetch'd
    ],
    item_drops: [
      { itemId: "max-potion",    chance: 0.05 },
      { itemId: "ultra-ball",    chance: 0.08 },
      { itemId: "full-restore",  chance: 0.02 },
    ],
    is_gym: false,
    gym_id: null,
  },
  {
    id: "kanto-fuchsia-gym",
    region: "kanto",
    zone_index: 12,
    name: "Gimnasio de Ciudad Fucsia (Koga)",
    description: "El Gimnasio Veneno de Koga. Paredes invisibles y venenos mortales.",
    encounter_rate: 0,
    trainer_count: 0,
    battle_bg_id: "gym-poison",
    reference_bst: 450,
    wild_pokemon: [],
    item_drops: [],
    is_gym: true,
    gym_id: 5,
  },

  // ── PRE GYM 6-8 + ELITE FOUR ─────────────────────────────────────────────
  {
    id: "kanto-mansion-cinnabar",
    region: "kanto",
    zone_index: 13,
    name: "Mansión Ciénaga",
    description: "Una mansión abandonada con experimentos genéticos olvidados. Pokémon peligrosos.",
    encounter_rate: 0.75,
    trainer_count: 8,
    battle_bg_id: "mansion-dark",
    reference_bst: 470,
    wild_pokemon: [
      { pokemonId: 109, minLevel: 30, maxLevel: 36, weight: 25, captureRate: 1.0 }, // Koffing
      { pokemonId: 110, minLevel: 33, maxLevel: 38, weight: 15, captureRate: 0.9 }, // Weezing
      { pokemonId: 88,  minLevel: 30, maxLevel: 35, weight: 20, captureRate: 1.0 }, // Grimer
      { pokemonId: 89,  minLevel: 33, maxLevel: 38, weight: 10, captureRate: 0.8 }, // Muk
      { pokemonId: 58,  minLevel: 30, maxLevel: 35, weight: 20, captureRate: 0.9 }, // Growlithe
      { pokemonId: 77,  minLevel: 32, maxLevel: 36, weight: 10, captureRate: 0.9 }, // Ponyta
    ],
    item_drops: [
      { itemId: "hyper-potion",  chance: 0.12 },
      { itemId: "ultra-ball",    chance: 0.07 },
      { itemId: "full-restore",  chance: 0.02 },
      { itemId: "fire-stone",    chance: 0.03 },
    ],
    is_gym: false,
    gym_id: null,
  },
  {
    id: "kanto-cinnabar-gym",
    region: "kanto",
    zone_index: 14,
    name: "Gimnasio de Isla Canela (Blaine)",
    description: "El Gimnasio Fuego de Blaine. Acertijos ardientes y temperaturas extremas.",
    encounter_rate: 0,
    trainer_count: 0,
    battle_bg_id: "gym-fire",
    reference_bst: 510,
    wild_pokemon: [],
    item_drops: [],
    is_gym: true,
    gym_id: 6,
  },
  {
    id: "kanto-victory-road",
    region: "kanto",
    zone_index: 15,
    name: "Ruta Victoria",
    description: "El último camino antes del Alto Mando. Solo los más fuertes llegan aquí.",
    encounter_rate: 0.8,
    trainer_count: 10,
    battle_bg_id: "cave-rock",
    reference_bst: 510,
    wild_pokemon: [
      { pokemonId: 75,  minLevel: 40, maxLevel: 46, weight: 25, captureRate: 1.0 }, // Graveler
      { pokemonId: 76,  minLevel: 42, maxLevel: 46, weight: 10, captureRate: 0.8 }, // Golem
      { pokemonId: 67,  minLevel: 40, maxLevel: 45, weight: 20, captureRate: 0.9 }, // Machoke
      { pokemonId: 42,  minLevel: 38, maxLevel: 44, weight: 20, captureRate: 0.9 }, // Golbat
      { pokemonId: 105, minLevel: 40, maxLevel: 46, weight: 15, captureRate: 0.9 }, // Marowak
      { pokemonId: 130, minLevel: 42, maxLevel: 46, weight: 5,  captureRate: 0.5 }, // Gyarados
      { pokemonId: 149, minLevel: 44, maxLevel: 46, weight: 5,  captureRate: 0.4 }, // Dragonite
    ],
    item_drops: [
      { itemId: "max-potion",   chance: 0.10 },
      { itemId: "ultra-ball",   chance: 0.08 },
      { itemId: "full-restore", chance: 0.04 },
      { itemId: "max-revive",   chance: 0.03 },
    ],
    is_gym: false,
    gym_id: null,
  },

  // ── GYMS 7-8 (Sabrina + Giovanni) ────────────────────────────────────────
  // Intercalados en el flujo real del juego
  {
    id: "kanto-saffron-gym",
    region: "kanto",
    zone_index: 16,
    name: "Gimnasio de Ciudad Azafrán (Sabrina)",
    description: "El Gimnasio Psíquico de Sabrina. La teletransportación confunde a cualquiera.",
    encounter_rate: 0,
    trainer_count: 0,
    battle_bg_id: "gym-psychic",
    reference_bst: 470,
    wild_pokemon: [],
    item_drops: [],
    is_gym: true,
    gym_id: 7,
  },
  {
    id: "kanto-viridian-gym",
    region: "kanto",
    zone_index: 17,
    name: "Gimnasio de Ciudad Verdeplata (Giovanni)",
    description: "El Gimnasio Tierra del misterioso líder Giovanni. El último gimnasio de Kanto.",
    encounter_rate: 0,
    trainer_count: 0,
    battle_bg_id: "gym-ground",
    reference_bst: 530,
    wild_pokemon: [],
    item_drops: [],
    is_gym: true,
    gym_id: 8,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// KANTO GYMS — 8 gimnasios completos
// ─────────────────────────────────────────────────────────────────────────────

const KANTO_GYMS = [
  {
    id: 1,
    region: "kanto",
    leader_name: "Brock",
    badge_name: "Medalla Roca",
    type: "rock",
    unlock_level: 10,
    reference_bst: 300,
    mechanic: "terreno_duro",
    pokemon: [
      { pokemonId: 74, level: 12 }, // Geodude
      { pokemonId: 95, level: 14 }, // Onix
    ],
    reward_items: [
      { itemId: "potion", chance: 1.0 },
      { itemId: "great-ball", chance: 0.5 },
    ],
  },
  {
    id: 2,
    region: "kanto",
    leader_name: "Misty",
    badge_name: "Medalla Cascada",
    type: "water",
    unlock_level: 18,
    reference_bst: 340,
    mechanic: "lluvia_constante",
    pokemon: [
      { pokemonId: 120, level: 18 }, // Staryu
      { pokemonId: 121, level: 21 }, // Starmie
    ],
    reward_items: [
      { itemId: "super-potion", chance: 1.0 },
      { itemId: "great-ball", chance: 0.5 },
    ],
  },
  {
    id: 3,
    region: "kanto",
    leader_name: "Lt. Surge",
    badge_name: "Medalla Trueno",
    type: "electric",
    unlock_level: 24,
    reference_bst: 370,
    mechanic: "campo_electrificado",
    pokemon: [
      { pokemonId: 100, level: 21 }, // Voltorb
      { pokemonId: 25,  level: 18 }, // Pikachu
      { pokemonId: 26,  level: 24 }, // Raichu
    ],
    reward_items: [
      { itemId: "super-potion", chance: 1.0 },
      { itemId: "ultra-ball", chance: 0.3 },
    ],
  },
  {
    id: 4,
    region: "kanto",
    leader_name: "Erika",
    badge_name: "Medalla Arcoíris",
    type: "grass",
    unlock_level: 29,
    reference_bst: 420,
    mechanic: "esporas_aire",
    pokemon: [
      { pokemonId: 71,  level: 29 }, // Victreebel
      { pokemonId: 114, level: 24 }, // Tangela
      { pokemonId: 45,  level: 29 }, // Vileplume
    ],
    reward_items: [
      { itemId: "hyper-potion", chance: 1.0 },
      { itemId: "leaf-stone", chance: 0.3 },
    ],
  },
  {
    id: 5,
    region: "kanto",
    leader_name: "Koga",
    badge_name: "Medalla Alma",
    type: "poison",
    unlock_level: 37,
    reference_bst: 450,
    mechanic: "niebla_toxica",
    pokemon: [
      { pokemonId: 109, level: 37 }, // Koffing
      { pokemonId: 89,  level: 39 }, // Muk
      { pokemonId: 109, level: 37 }, // Koffing
      { pokemonId: 110, level: 43 }, // Weezing
    ],
    reward_items: [
      { itemId: "hyper-potion", chance: 1.0 },
      { itemId: "antidote", chance: 1.0 },
    ],
  },
  {
    id: 6,
    region: "kanto",
    leader_name: "Blaine",
    badge_name: "Medalla Volcán",
    type: "fire",
    unlock_level: 42,
    reference_bst: 510,
    mechanic: "suelo_ardiente",
    pokemon: [
      { pokemonId: 58,  level: 42 }, // Growlithe
      { pokemonId: 77,  level: 40 }, // Ponyta
      { pokemonId: 78,  level: 42 }, // Rapidash
      { pokemonId: 59,  level: 47 }, // Arcanine
    ],
    reward_items: [
      { itemId: "max-potion", chance: 1.0 },
      { itemId: "fire-stone", chance: 0.3 },
    ],
  },
  {
    id: 7,
    region: "kanto",
    leader_name: "Sabrina",
    badge_name: "Medalla Pantano",
    type: "psychic",
    unlock_level: 43,
    reference_bst: 470,
    mechanic: "inversion_stats",
    pokemon: [
      { pokemonId: 64,  level: 38 }, // Kadabra
      { pokemonId: 122, level: 37 }, // Mr. Mime
      { pokemonId: 49,  level: 38 }, // Venomoth
      { pokemonId: 65,  level: 43 }, // Alakazam
    ],
    reward_items: [
      { itemId: "hyper-potion", chance: 1.0 },
      { itemId: "ultra-ball", chance: 0.5 },
    ],
  },
  {
    id: 8,
    region: "kanto",
    leader_name: "Giovanni",
    badge_name: "Medalla Tierra",
    type: "ground",
    unlock_level: 50,
    reference_bst: 530,
    mechanic: "gravedad_aumentada",
    pokemon: [
      { pokemonId: 111, level: 45 }, // Rhyhorn
      { pokemonId: 51,  level: 42 }, // Dugtrio
      { pokemonId: 31,  level: 44 }, // Nidoqueen
      { pokemonId: 34,  level: 45 }, // Nidoking
      { pokemonId: 112, level: 50 }, // Rhydon
    ],
    reward_items: [
      { itemId: "max-potion", chance: 1.0 },
      { itemId: "ultra-ball", chance: 1.0 },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// KANTO ELITE FOUR + CHAMPION
// ─────────────────────────────────────────────────────────────────────────────

const KANTO_ELITE_FOUR = [
  {
    region: "kanto",
    slot: 1,
    name: "Lorelei",
    role: "elite_four",
    type: "ice",
    pokemon: [
      { pokemonId: 87,  level: 54 }, // Dewgong
      { pokemonId: 91,  level: 53 }, // Cloyster
      { pokemonId: 80,  level: 54 }, // Slowbro
      { pokemonId: 124, level: 56 }, // Jynx
      { pokemonId: 131, level: 56 }, // Lapras
    ],
  },
  {
    region: "kanto",
    slot: 2,
    name: "Bruno",
    role: "elite_four",
    type: "fighting",
    pokemon: [
      { pokemonId: 95,  level: 53 }, // Onix
      { pokemonId: 107, level: 55 }, // Hitmonchan
      { pokemonId: 106, level: 55 }, // Hitmonlee
      { pokemonId: 95,  level: 56 }, // Onix
      { pokemonId: 68,  level: 58 }, // Machamp
    ],
  },
  {
    region: "kanto",
    slot: 3,
    name: "Agatha",
    role: "elite_four",
    type: "ghost",
    pokemon: [
      { pokemonId: 94,  level: 56 }, // Gengar
      { pokemonId: 42,  level: 56 }, // Golbat
      { pokemonId: 93,  level: 55 }, // Haunter
      { pokemonId: 24,  level: 58 }, // Arbok
      { pokemonId: 94,  level: 60 }, // Gengar
    ],
  },
  {
    region: "kanto",
    slot: 4,
    name: "Lance",
    role: "elite_four",
    type: "dragon",
    pokemon: [
      { pokemonId: 130, level: 58 }, // Gyarados
      { pokemonId: 148, level: 56 }, // Dragonair
      { pokemonId: 148, level: 56 }, // Dragonair
      { pokemonId: 142, level: 60 }, // Aerodactyl
      { pokemonId: 149, level: 62 }, // Dragonite
    ],
  },
  {
    region: "kanto",
    slot: 5,
    name: "Blue",
    role: "champion",
    type: "mixed",
    pokemon: [
      { pokemonId: 18,  level: 61 }, // Pidgeot
      { pokemonId: 65,  level: 59 }, // Alakazam
      { pokemonId: 112, level: 61 }, // Rhydon
      { pokemonId: 103, level: 61 }, // Exeggutor
      { pokemonId: 130, level: 63 }, // Gyarados
      { pokemonId: 6,   level: 65 }, // Charizard
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n=== Seeding Kanto ===\n");

  // Zones
  console.log(`Inserting ${KANTO_ZONES.length} zones...`);
  const { error: zonesError } = await supabase
    .from("zones")
    .upsert(KANTO_ZONES, { onConflict: "id" });
  if (zonesError) console.error("Zones error:", zonesError.message);
  else console.log("Zones OK");

  // Gyms
  console.log(`Inserting ${KANTO_GYMS.length} gyms...`);
  const { error: gymsError } = await supabase
    .from("gyms")
    .upsert(KANTO_GYMS, { onConflict: "id,region" });
  if (gymsError) console.error("Gyms error:", gymsError.message);
  else console.log("Gyms OK");

  // Elite Four
  console.log(`Inserting ${KANTO_ELITE_FOUR.length} elite four slots...`);
  const { error: eliteError } = await supabase
    .from("elite_four")
    .upsert(KANTO_ELITE_FOUR, { onConflict: "region,slot" });
  if (eliteError) console.error("Elite Four error:", eliteError.message);
  else console.log("Elite Four OK");

  console.log("\nDone.");
  process.exit(0);
}

main();