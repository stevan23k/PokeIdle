import {
  getItemSprite,
  getTypeIcon,
  getShinySpriteSet,
  resolveItemSlug,
} from "./spriteRegistry";

const SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites";

const FRLG_BASE = `${SPRITE_BASE}/pokemon/versions/generation-iii/firered-leafgreen`;

// Pokémon sprite helpers
export const pokemonSprites = {
  // Battle front sprite (enemy) — FR/LG style, fallback to default
  front: (id: number, shiny = false): string => {
    // FRLG only has up to Deoxys (386)
    if (id > 386) return pokemonSprites.frontFallback(id, shiny);

    if (shiny) {
      const local = getShinySpriteSet(id);
      if (local?.front) return `/${local.front}`;
      return `${FRLG_BASE}/shiny/${id}.png`;
    }
    return `${FRLG_BASE}/${id}.png`;
  },

  // Battle back sprite (player) — FR/LG style, fallback to default
  back: (id: number, shiny = false): string => {
    // FRLG only has up to Deoxys (386)
    if (id > 386) return pokemonSprites.backFallback(id, shiny);

    if (shiny) {
      const local = getShinySpriteSet(id);
      if (local?.back) return `/${local.back}`;
      return `${FRLG_BASE}/back/shiny/${id}.png`;
    }
    return `${FRLG_BASE}/back/${id}.png`;
  },

  // Fallback sprites (for Pokémon not in Gen III)
  frontFallback: (id: number, shiny = false): string => {
    if (shiny) return `${SPRITE_BASE}/pokemon/shiny/${id}.png`;
    return `${SPRITE_BASE}/pokemon/${id}.png`;
  },

  backFallback: (id: number, shiny = false): string => {
    // Gen 6+ (ID > 649) really lacks 2D back sprites in many sets.
    // Also skip shiny back sprites for any Gen 4+ (ID > 386) to be safe.
    if (id > 649 || (id > 386 && shiny)) {
      return pokemonSprites.frontFallback(id, shiny);
    }
    if (shiny) return `${SPRITE_BASE}/pokemon/back/shiny/${id}.png`;
    return `${SPRITE_BASE}/pokemon/back/${id}.png`;
  },

  // Official artwork (for UI cards, roster, etc.)
  artwork: (id: number, shiny = false): string => {
    if (shiny)
      return `${SPRITE_BASE}/pokemon/other/official-artwork/shiny/${id}.png`;
    return `${SPRITE_BASE}/pokemon/other/official-artwork/${id}.png`;
  },

  // Small icon (for team slots, capture log, etc.)
  icon: (id: number): string =>
    `${SPRITE_BASE}/pokemon/versions/generation-viii/icons/${id}.png`,
};

// Item sprite helper: local first, GitHub as fallback
export function itemSpriteUrl(slug: string): string {
  const local = getItemSprite(slug);
  if (local) return `/${local}`;
  return `${SPRITE_BASE}/items/${slug}.png`;
}

// Item sprite by display name
export function itemSpriteByName(name: string): string {
  const slug = resolveItemSlug(name);
  return itemSpriteUrl(slug);
}

// Type icon helper: local first
export function typeIconUrl(typeName: string): string | null {
  const local = getTypeIcon(typeName);
  return local ? `/${local}` : null;
}
