import type { PokemonStats } from "../features/run/types/game.types";

export type ItemCategory =
  | "ball"
  | "heal"
  | "battle"
  | "evo"
  | "held"
  | "special";

export type ItemEffect =
  | { type: "heal_hp"; amount: number | "full" }
  | { type: "heal_status" }
  | { type: "revive"; hpPercent: number }
  | { type: "catch"; catchMultiplier: number }
  | {
      type: "evolve";
      targetPokemonId?: number;
      method?: "stone" | "trade" | "item";
    }
  | { type: "stat_boost"; stat: keyof PokemonStats; amount: number }
  | { type: "xp_boost"; multiplier: number }
  | { type: "mega_evo"; stoneId: string };

export interface Item {
  id: string;
  name: string;
  spriteSlug: string; // PokeAPI slug
  description: string;
  category: ItemCategory;
  effect: ItemEffect;
  buyable: boolean;
  shopPrice: number | null;
}

export const ITEMS: Record<string, Item> = {
  // Balls
  "poke-ball": {
    id: "poke-ball",
    name: "Poké Ball",
    spriteSlug: "poke-ball",
    description: "Es una Poké Ball clásica para atrapar Pokémon.",
    category: "ball",
    effect: { type: "catch", catchMultiplier: 1.0 },
    buyable: true,
    shopPrice: 200,
  },
  "great-ball": {
    id: "great-ball",
    name: "Super Ball",
    spriteSlug: "great-ball",
    description: "Una buena Poké Ball con un índice algoríticamente superior.",
    category: "ball",
    effect: { type: "catch", catchMultiplier: 1.5 },
    buyable: true,
    shopPrice: 600,
  },
  "ultra-ball": {
    id: "ultra-ball",
    name: "Ultra Ball",
    spriteSlug: "ultra-ball",
    description: "Una Poké Ball excelente con un índice de éxito alta.",
    category: "ball",
    effect: { type: "catch", catchMultiplier: 2.0 },
    buyable: true,
    shopPrice: 1200,
  },
  "master-ball": {
    id: "master-ball",
    name: "Master Ball",
    spriteSlug: "master-ball",
    description: "La Poké Ball definitiva. Atrápa sin fallar.",
    category: "ball",
    effect: { type: "catch", catchMultiplier: 255.0 },
    buyable: false,
    shopPrice: null,
  },

  // Heals
  potion: {
    id: "potion",
    name: "Poción",
    spriteSlug: "potion",
    description: "Restaura 20 PS.",
    category: "heal",
    effect: { type: "heal_hp", amount: 20 },
    buyable: true,
    shopPrice: 300,
  },
  "super-potion": {
    id: "super-potion",
    name: "Superpoción",
    spriteSlug: "super-potion",
    description: "Restaura 50 PS.",
    category: "heal",
    effect: { type: "heal_hp", amount: 50 },
    buyable: true,
    shopPrice: 700,
  },
  "hyper-potion": {
    id: "hyper-potion",
    name: "Hiperpoción",
    spriteSlug: "hyper-potion",
    description: "Restaura 200 PS.",
    category: "heal",
    effect: { type: "heal_hp", amount: 200 },
    buyable: true,
    shopPrice: 1200,
  },
  "max-potion": {
    id: "max-potion",
    name: "Poción Máxima",
    spriteSlug: "max-potion",
    description: "Restaura todos los PS.",
    category: "heal",
    effect: { type: "heal_hp", amount: "full" },
    buyable: true,
    shopPrice: 2500,
  },
  "full-restore": {
    id: "full-restore",
    name: "Restaurar Todo",
    spriteSlug: "full-restore",
    description: "Restaura PS e irregularidades de estado.",
    category: "heal",
    effect: { type: "heal_hp", amount: "full" },
    buyable: true,
    shopPrice: 3000,
  },

  // Status
  antidote: {
    id: "antidote",
    name: "Antídoto",
    spriteSlug: "antidote",
    description: "Cura el envenenamiento.",
    category: "heal",
    effect: { type: "heal_status" },
    buyable: true,
    shopPrice: 200,
  },
  awakening: {
    id: "awakening",
    name: "Despertar",
    spriteSlug: "awakening",
    description: "Despierta a un Pokémon dormido.",
    category: "heal",
    effect: { type: "heal_status" },
    buyable: true,
    shopPrice: 250,
  },
  "full-heal": {
    id: "full-heal",
    name: "Cura Total",
    spriteSlug: "full-heal",
    description: "Cura cualquier problema de estado.",
    category: "heal",
    effect: { type: "heal_status" },
    buyable: true,
    shopPrice: 600,
  },
  "paralyze-heal": {
    id: "paralyze-heal",
    name: "Antiparalizador",
    spriteSlug: "paralyze-heal",
    description: "Cura parálisis.",
    category: "heal",
    effect: { type: "heal_status" },
    buyable: true,
    shopPrice: 200,
  },
  "burn-heal": {
    id: "burn-heal",
    name: "Antiquemar",
    spriteSlug: "burn-heal",
    description: "Cura las quemaduras.",
    category: "heal",
    effect: { type: "heal_status" },
    buyable: true,
    shopPrice: 250,
  },
  "ice-heal": {
    id: "ice-heal",
    name: "Antihielo",
    spriteSlug: "ice-heal",
    description: "Descongela a un Pokémon.",
    category: "heal",
    effect: { type: "heal_status" },
    buyable: true,
    shopPrice: 250,
  },

  // Revives
  revive: {
    id: "revive",
    name: "Revivir",
    spriteSlug: "revive",
    description: "Revive a un Pokémon con 50% de PS.",
    category: "heal",
    effect: { type: "revive", hpPercent: 0.5 },
    buyable: true,
    shopPrice: 1500,
  },
  "max-revive": {
    id: "max-revive",
    name: "Max. Revivir",
    spriteSlug: "max-revive",
    description: "Revive a un Pokémon con 100% de PS.",
    category: "heal",
    effect: { type: "revive", hpPercent: 1.0 },
    buyable: false,
    shopPrice: null,
  },

  // Special / Cards
  "exp-share": {
    id: "exp-share",
    name: "Repartir Exp",
    spriteSlug: "exp-share",
    description:
      "Reparte el 20% de la experiencia ganada a los Pokémon que no combatieron.",
    category: "special",
    effect: { type: "xp_boost", multiplier: 1.0 }, // special logic in engine
    buyable: false,
    shopPrice: null,
  },
  "mega-bracelet": {
    id: "mega-bracelet",
    name: "Mega-Brazalete",
    spriteSlug: "mega-bracelet",
    description: "Permite usar la Megaevolución si el Pokémon tiene su piedra.",
    category: "special",
    effect: { type: "stat_boost", stat: "attack", amount: 0 },
    buyable: false,
    shopPrice: null,
  },
  "cable-link": {
    id: "cable-link",
    name: "Cable Link",
    spriteSlug: "link-cable",
    description: "Evoluciona a Pokémon que normalmente requieren intercambio.",
    category: "evo",
    effect: { type: "evolve", method: "trade" },
    buyable: true,
    shopPrice: 2000,
  },

  // Evolution Stones (examples)
  "fire-stone": {
    id: "fire-stone",
    name: "Piedra Fuego",
    spriteSlug: "fire-stone",
    description: "Evoluciona a ciertos Pokémon de tipo Fuego.",
    category: "evo",
    effect: { type: "evolve", method: "stone" },
    buyable: true,
    shopPrice: 2100,
  },
  "water-stone": {
    id: "water-stone",
    name: "Piedra Agua",
    spriteSlug: "water-stone",
    description: "Evoluciona a ciertos Pokémon de tipo Agua.",
    category: "evo",
    effect: { type: "evolve", method: "stone" },
    buyable: true,
    shopPrice: 2100,
  },
  "thunder-stone": {
    id: "thunder-stone",
    name: "Piedra Trueno",
    spriteSlug: "thunder-stone",
    description: "Evoluciona a ciertos Pokémon de tipo Eléctrico.",
    category: "evo",
    effect: { type: "evolve", method: "stone" },
    buyable: true,
    shopPrice: 2100,
  },
  "leaf-stone": {
    id: "leaf-stone",
    name: "Piedra Hoja",
    spriteSlug: "leaf-stone",
    description: "Evoluciona a ciertos Pokémon de tipo Planta.",
    category: "evo",
    effect: { type: "evolve", method: "stone" },
    buyable: true,
    shopPrice: 2100,
  },
  "moon-stone": {
    id: "moon-stone",
    name: "Piedra Lunar",
    spriteSlug: "moon-stone",
    description: "Evoluciona a ciertos Pokémon.",
    category: "evo",
    effect: { type: "evolve", method: "stone" },
    buyable: true,
    shopPrice: 2100,
  },
  "sun-stone": {
    id: "sun-stone",
    name: "Piedra Solar",
    spriteSlug: "sun-stone",
    description: "Evoluciona a ciertos Pokémon.",
    category: "evo",
    effect: { type: "evolve", method: "stone" },
    buyable: true,
    shopPrice: 2100,
  },

  // Held Items
  "focus-band": {
    id: "focus-band",
    name: "Banda Focus",
    spriteSlug: "focus-band",
    description: "Puede evitar que el Pokémon se debilite, dejándolo con 1 PS.",
    category: "held",
    effect: { type: "stat_boost", stat: "hp", amount: 0 }, // Special logic in engine
    buyable: true,
    shopPrice: 4000,
  },

  // Held Items
  "choice-band": {
    id: "choice-band",
    name: "Cinta Elección",
    spriteSlug: "choice-band",
    description: "Sube mucho el Ataque pero solo permite usar un movimiento.",
    category: "held",
    effect: { type: "stat_boost", stat: "attack", amount: 1.5 },
    buyable: true,
    shopPrice: 5000,
  },
  "life-orb": {
    id: "life-orb",
    name: "Vidasfera",
    spriteSlug: "life-orb",
    description: "Sube el daño un 30% a cambio de perder vida cada turno.",
    category: "held",
    effect: { type: "stat_boost", stat: "hp", amount: -0.1 },
    buyable: true,
    shopPrice: 4000,
  },

  // Exp Cards (Story Mode Rewards)
  "carta-bosque": {
    id: "carta-bosque",
    name: "Carta Bosque",
    spriteSlug: "data-card-01",
    description: "Aumenta la experiencia ganada en un 20%.",
    category: "special",
    effect: { type: "xp_boost", multiplier: 1.2 },
    buyable: false,
    shopPrice: null,
  },
  "carta-cueva": {
    id: "carta-cueva",
    name: "Carta Cueva",
    spriteSlug: "data-card-02",
    description: "Aumenta la experiencia ganada en un 20%.",
    category: "special",
    effect: { type: "xp_boost", multiplier: 1.2 },
    buyable: false,
    shopPrice: null,
  },
  "carta-monte": {
    id: "carta-monte",
    name: "Carta Monte",
    spriteSlug: "data-card-03",
    description: "Aumenta la experiencia ganada en un 20%.",
    category: "special",
    effect: { type: "xp_boost", multiplier: 1.2 },
    buyable: false,
    shopPrice: null,
  },
  "carta-mar": {
    id: "carta-mar",
    name: "Carta Mar",
    spriteSlug: "data-card-04",
    description: "Aumenta la experiencia ganada en un 20%.",
    category: "special",
    effect: { type: "xp_boost", multiplier: 1.2 },
    buyable: false,
    shopPrice: null,
  },
  "carta-ciudad": {
    id: "carta-ciudad",
    name: "Carta Ciudad",
    spriteSlug: "data-card-05",
    description: "Aumenta la experiencia ganada en un 20%.",
    category: "special",
    effect: { type: "xp_boost", multiplier: 1.2 },
    buyable: false,
    shopPrice: null,
  },
};

export function generateLootOptions(
  excludeCategories: ItemCategory[] = [],
): string[] {
  const buyables = Object.values(ITEMS)
    .filter(
      (item) => item.buyable && !excludeCategories.includes(item.category),
    )
    .map((item) => item.id);
  const shuffled = buyables.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}
