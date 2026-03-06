import { getPokemonData } from "../features/run/services/pokeapi.service";
import type {
  ActivePokemon,
  ActiveMegaState,
} from "../features/run/types/game.types";
import { defaultActiveMegaState } from "../features/run/types/game.types";
import type { MegaEvolution } from "../lib/mega.service";

export interface MegaApplyResult {
  updatedPokemon: ActivePokemon;
  megaState: ActiveMegaState;
  logMessage: string;
}

export async function applyMegaEvolution(
  pokemon: ActivePokemon,
  mega: MegaEvolution,
  megaState: ActiveMegaState,
): Promise<MegaApplyResult> {
  if (megaState.usedThisBattle) {
    throw new Error(
      "[MegaEngine] Ya se usó la Mega Evolución en esta batalla.",
    );
  }

  const megaPokemon = await getPokemonData(
    mega.mega_pokemon_id,
    pokemon.level,
    pokemon.isShiny,
  );

  const newMegaState: ActiveMegaState = {
    isMega: true,
    megaName: mega.mega_name,
    originalPokemonId: pokemon.pokemonId,
    originalName: pokemon.name,
    originalTypes: [...pokemon.types],
    originalBaseStats: { ...pokemon.baseStats },
    originalStats: { ...pokemon.stats },
    usedThisBattle: true,
  };

  const megaTypes =
    mega.type_override.length > 0 ? mega.type_override : megaPokemon.types;

  const updatedPokemon: ActivePokemon = {
    ...pokemon,
    pokemonId: mega.mega_pokemon_id,
    name: formatMegaName(mega.mega_name),
    types: megaTypes,
    baseStats: megaPokemon.baseStats,
    stats: megaPokemon.stats,
    currentHP: pokemon.currentHP,
    maxHP: pokemon.maxHP,
  };

  const displayName = pokemon.nickname ?? pokemon.name;
  const logMessage = `¡${displayName} ha Mega Evolucionado en ${updatedPokemon.name}!`;

  return { updatedPokemon, megaState: newMegaState, logMessage };
}

export function revertMegaEvolution(
  pokemon: ActivePokemon,
  megaState: ActiveMegaState,
): ActivePokemon {
  if (!megaState.isMega || !megaState.originalPokemonId) return pokemon;

  return {
    ...pokemon,
    pokemonId: megaState.originalPokemonId,
    name: megaState.originalName ?? pokemon.name,
    types: megaState.originalTypes,
    baseStats: megaState.originalBaseStats ?? pokemon.baseStats,
    stats: megaState.originalStats ?? pokemon.stats,
    currentHP: pokemon.currentHP,
    maxHP: pokemon.maxHP,
  };
}

export function resetMegaStateAfterBattle(): ActiveMegaState {
  return { ...defaultActiveMegaState };
}

export function formatMegaName(megaSlug: string): string {
  const match = megaSlug.match(/^(.+)-mega(-[xy])?$/);
  if (!match) {
    return megaSlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  const base = match[1]
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const variant = match[2] ? ` ${match[2].slice(1).toUpperCase()}` : "";
  return `Mega ${base}${variant}`;
}
