import {
  getItemSprite,
  getTypeIcon,
  getShinySpriteSet,
  resolveItemSlug,
} from "./spriteRegistry";

const SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites";

const FRLG_BASE = `${SPRITE_BASE}/pokemon/versions/generation-iii/firered-leafgreen`;

// Mapa de IDs de formas especiales → ID base para sprites
const FORM_SPRITE_OVERRIDES: Record<number, number> = {
  // Aegislash-Shield is 681, Aegislash-Blade is 10026.
  // We keep overrides empty for now unless we need to redirect a form to a base sprite.
};

// Pokémon sprite helpers
export const pokemonSprites = {
  // Battle front sprite (enemy) — FR/LG style, fallback to default
  front: (id: number, shiny = false): string => {
    const spriteId = FORM_SPRITE_OVERRIDES[id] ?? id;
    // FRLG only has up to Deoxys (386)
    if (spriteId > 386) return pokemonSprites.frontFallback(spriteId, shiny);

    if (shiny) {
      const local = getShinySpriteSet(spriteId);
      if (local?.front) return `/${local.front}`;
      return `${FRLG_BASE}/shiny/${spriteId}.png`;
    }
    return `${FRLG_BASE}/${spriteId}.png`;
  },

  // Battle back sprite (player) — FR/LG style, fallback to default
  back: (id: number, shiny = false): string => {
    const spriteId = FORM_SPRITE_OVERRIDES[id] ?? id;
    // FRLG only has up to Deoxys (386)
    if (spriteId > 386) return pokemonSprites.backFallback(spriteId, shiny);

    if (shiny) {
      const local = getShinySpriteSet(spriteId);
      if (local?.back) return `/${local.back}`;
      return `${FRLG_BASE}/back/shiny/${spriteId}.png`;
    }
    return `${FRLG_BASE}/back/${spriteId}.png`;
  },

  // Fallback sprites (for Pokémon not in Gen III)
  frontFallback: (id: number, shiny = false): string => {
    const spriteId = FORM_SPRITE_OVERRIDES[id] ?? id;
    if (shiny) return `${SPRITE_BASE}/pokemon/shiny/${spriteId}.png`;
    return `${SPRITE_BASE}/pokemon/${spriteId}.png`;
  },

  backFallback: (id: number, shiny = false): string => {
    const spriteId = FORM_SPRITE_OVERRIDES[id] ?? id;
    // Gen 6+ (ID > 649) really lacks 2D back sprites in many sets.
    // Also skip shiny back sprites for any Gen 4+ (ID > 386) to be safe.
    if (spriteId > 649 || (spriteId > 386 && shiny)) {
      return pokemonSprites.frontFallback(spriteId, shiny);
    }
    if (shiny) return `${SPRITE_BASE}/pokemon/back/shiny/${spriteId}.png`;
    return `${SPRITE_BASE}/pokemon/back/${spriteId}.png`;
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
