import type { RegionId } from "../features/run/types/game.types";

export interface ItemDrop {
  itemId: string;
  chance: number; // 0.0 to 1.0
}

export interface WildEncounter {
  pokemonId: number;
  minLevel: number;
  maxLevel: number;
  weight: number;
  captureRate: number; // Base capture rate modifier
}

export interface GymPokemon {
  pokemonId: number;
  level: number;
  moves?: string[]; // Specific moves (optional)
}

export interface GymDefinition {
  id: number;
  leaderName: string;
  badgeName: string;
  type: string;
  pokemon: GymPokemon[];
  rewardItems: ItemDrop[];
  unlockLevel: number;
}

export interface Zone {
  id: string;
  name: string;
  description: string;
  wildPokemon: WildEncounter[];
  encounterRate: number; // Encounters per second at x1 speed
  itemDrops: ItemDrop[];
  trainerCount: number; // Number of trainers to defeat to clear zone
  battleBgId: string; // ID of the battle background to use
}

export interface EliteTrainer {
  name: string;
  type: string;
  pokemon: GymPokemon[];
}

export interface EliteFourDefinition {
  trainers: EliteTrainer[];
  champion: EliteTrainer;
}

export interface Region {
  id: RegionId;
  name: string;
  unlockAfter: number; // runs completed to unlock
  zones: Zone[];
  gyms: GymDefinition[];
  eliteFour: EliteFourDefinition;
}

// Generate full Kanto region (always unlocked):
// Zone structure between gyms: Route → Town → Route → [Gym]
export const REGIONS: Record<RegionId, Region> = {
  kanto: {
    id: "kanto",
    name: "Kanto",
    unlockAfter: 0,
    zones: [
      {
        id: "route-1",
        name: "Ruta 1",
        description: "Un camino rural tranquilo ideal para principiantes.",
        encounterRate: 0.5,
        trainerCount: 2,
        battleBgId: "grass-route",
        itemDrops: [
          { itemId: "potion", chance: 0.1 },
          { itemId: "poke-ball", chance: 0.1 },
        ],
        wildPokemon: [
          {
            pokemonId: 16,
            minLevel: 2,
            maxLevel: 4,
            weight: 50,
            captureRate: 1.0,
          }, // Pidgey
          {
            pokemonId: 19,
            minLevel: 2,
            maxLevel: 4,
            weight: 50,
            captureRate: 1.0,
          }, // Rattata
        ],
      },
      {
        id: "viridian-forest",
        name: "Bosque Verde",
        description: "Un bosque denso lleno de Pokémon bicho.",
        encounterRate: 0.6,
        trainerCount: 4,
        battleBgId: "forest-green",
        itemDrops: [
          { itemId: "potion", chance: 0.2 },
          { itemId: "antidote", chance: 0.1 },
          { itemId: "great-ball", chance: 0.05 },
        ],
        wildPokemon: [
          {
            pokemonId: 10,
            minLevel: 3,
            maxLevel: 5,
            weight: 40,
            captureRate: 1.0,
          }, // Caterpie
          {
            pokemonId: 13,
            minLevel: 3,
            maxLevel: 5,
            weight: 40,
            captureRate: 1.0,
          }, // Weedle
          {
            pokemonId: 25,
            minLevel: 3,
            maxLevel: 5,
            weight: 5,
            captureRate: 0.8,
          }, // Pikachu
          {
            pokemonId: 11,
            minLevel: 4,
            maxLevel: 6,
            weight: 15,
            captureRate: 0.9,
          }, // Metapod
        ],
      },
      {
        id: "mt-moon",
        name: "Monte Moon",
        description: "Una cueva mística conocida por sus piedras lunares.",
        encounterRate: 0.7,
        trainerCount: 6,
        battleBgId: "cave-dirt",
        itemDrops: [
          { itemId: "super-potion", chance: 0.15 },
          { itemId: "great-ball", chance: 0.1 },
          { itemId: "revive", chance: 0.05 },
        ],
        wildPokemon: [
          {
            pokemonId: 41,
            minLevel: 8,
            maxLevel: 12,
            weight: 45,
            captureRate: 1.0,
          }, // Zubat
          {
            pokemonId: 74,
            minLevel: 8,
            maxLevel: 10,
            weight: 35,
            captureRate: 1.0,
          }, // Geodude
          {
            pokemonId: 46,
            minLevel: 8,
            maxLevel: 10,
            weight: 15,
            captureRate: 0.9,
          }, // Paras
          {
            pokemonId: 35,
            minLevel: 10,
            maxLevel: 12,
            weight: 5,
            captureRate: 0.6,
          }, // Clefairy
        ],
      },
      {
        id: "rock-tunnel",
        name: "Túnel Roca",
        description: "Un foso oscuro y extenso donde caen ítems valiosos.",
        encounterRate: 0.8,
        trainerCount: 8,
        battleBgId: "cave-dirt",
        itemDrops: [
          { itemId: "hyper-potion", chance: 0.1 },
          { itemId: "ultra-ball", chance: 0.05 },
          { itemId: "full-restore", chance: 0.01 },
        ],
        wildPokemon: [
          {
            pokemonId: 66,
            minLevel: 15,
            maxLevel: 18,
            weight: 40,
            captureRate: 1.0,
          }, // Machop
          {
            pokemonId: 95,
            minLevel: 16,
            maxLevel: 19,
            weight: 30,
            captureRate: 0.8,
          }, // Onix
          {
            pokemonId: 104,
            minLevel: 15,
            maxLevel: 17,
            weight: 30,
            captureRate: 1.0,
          }, // Cubone
        ],
      },
    ],
    gyms: [
      {
        id: 1,
        leaderName: "Brock",
        badgeName: "Medalla Roca",
        type: "rock",
        unlockLevel: 10,
        pokemon: [
          { pokemonId: 74, level: 12 }, // Geodude
          { pokemonId: 95, level: 14 }, // Onix
        ],
        rewardItems: [{ itemId: "potion", chance: 1.0 }],
      },
      {
        id: 2,
        leaderName: "Misty",
        badgeName: "Medalla Cascada",
        type: "water",
        unlockLevel: 18,
        pokemon: [
          { pokemonId: 120, level: 18 }, // Staryu
          { pokemonId: 121, level: 21 }, // Starmie
        ],
        rewardItems: [{ itemId: "super-potion", chance: 1.0 }],
      },
      {
        id: 3,
        leaderName: "Lt. Surge",
        badgeName: "Medalla Trueno",
        type: "electric",
        unlockLevel: 24,
        pokemon: [
          { pokemonId: 100, level: 21 }, // Voltorb
          { pokemonId: 25, level: 18 }, // Pikachu
          { pokemonId: 26, level: 24 }, // Raichu
        ],
        rewardItems: [{ itemId: "super-potion", chance: 1.0 }],
      },
      {
        id: 4,
        leaderName: "Erika",
        badgeName: "Medalla Arcoíris",
        type: "grass",
        unlockLevel: 29,
        pokemon: [
          { pokemonId: 71, level: 29 }, // Victreebel
          { pokemonId: 114, level: 24 }, // Tangela
          { pokemonId: 45, level: 29 }, // Vileplume
        ],
        rewardItems: [{ itemId: "hyper-potion", chance: 1.0 }],
      },
      {
        id: 5,
        leaderName: "Koga",
        badgeName: "Medalla Alma",
        type: "poison",
        unlockLevel: 37,
        pokemon: [
          { pokemonId: 109, level: 37 }, // Koffing
          { pokemonId: 89, level: 39 }, // Muk
          { pokemonId: 109, level: 37 }, // Koffing
          { pokemonId: 110, level: 43 }, // Weezing
        ],
        rewardItems: [{ itemId: "hyper-potion", chance: 1.0 }],
      },
      {
        id: 6,
        leaderName: "Sabrina",
        badgeName: "Medalla Pantano",
        type: "psychic",
        unlockLevel: 43,
        pokemon: [
          { pokemonId: 64, level: 38 }, // Kadabra
          { pokemonId: 122, level: 37 }, // Mr. Mime
          { pokemonId: 49, level: 38 }, // Venomoth
          { pokemonId: 65, level: 43 }, // Alakazam
        ],
        rewardItems: [{ itemId: "hyper-potion", chance: 1.0 }],
      },
      {
        id: 7,
        leaderName: "Blaine",
        badgeName: "Medalla Volcán",
        type: "fire",
        unlockLevel: 47,
        pokemon: [
          { pokemonId: 58, level: 42 }, // Growlithe
          { pokemonId: 77, level: 40 }, // Ponyta
          { pokemonId: 78, level: 42 }, // Rapidash
          { pokemonId: 59, level: 47 }, // Arcanine
        ],
        rewardItems: [{ itemId: "max-potion", chance: 1.0 }],
      },
      {
        id: 8,
        leaderName: "Giovanni",
        badgeName: "Medalla Tierra",
        type: "ground",
        unlockLevel: 50,
        pokemon: [
          { pokemonId: 111, level: 45 }, // Rhyhorn
          { pokemonId: 51, level: 42 }, // Dugtrio
          { pokemonId: 31, level: 44 }, // Nidoqueen
          { pokemonId: 34, level: 45 }, // Nidoking
          { pokemonId: 112, level: 50 }, // Rhydon
        ],
        rewardItems: [{ itemId: "max-potion", chance: 1.0 }],
      },
    ],
    eliteFour: {
      trainers: [
        {
          name: "Lorelei",
          type: "ice",
          pokemon: [
            { pokemonId: 87, level: 54 }, // Dewgong
            { pokemonId: 91, level: 53 }, // Cloyster
            { pokemonId: 80, level: 54 }, // Slowbro
            { pokemonId: 124, level: 56 }, // Jynx
            { pokemonId: 131, level: 56 }, // Lapras
          ],
        },
        {
          name: "Bruno",
          type: "fighting",
          pokemon: [
            { pokemonId: 95, level: 53 }, // Onix
            { pokemonId: 107, level: 55 }, // Hitmonchan
            { pokemonId: 106, level: 55 }, // Hitmonlee
            { pokemonId: 95, level: 56 }, // Onix
            { pokemonId: 68, level: 58 }, // Machamp
          ],
        },
        {
          name: "Agatha",
          type: "ghost",
          pokemon: [
            { pokemonId: 94, level: 56 }, // Gengar
            { pokemonId: 42, level: 56 }, // Golbat
            { pokemonId: 93, level: 55 }, // Haunter
            { pokemonId: 24, level: 58 }, // Arbok
            { pokemonId: 94, level: 60 }, // Gengar
          ],
        },
        {
          name: "Lance",
          type: "dragon",
          pokemon: [
            { pokemonId: 130, level: 58 }, // Gyarados
            { pokemonId: 148, level: 56 }, // Dragonair
            { pokemonId: 148, level: 56 }, // Dragonair
            { pokemonId: 142, level: 60 }, // Aerodactyl
            { pokemonId: 149, level: 62 }, // Dragonite
          ],
        },
      ],
      champion: {
        name: "Rival Blue",
        type: "mixed",
        pokemon: [
          { pokemonId: 18, level: 61 }, // Pidgeot
          { pokemonId: 65, level: 59 }, // Alakazam
          { pokemonId: 112, level: 61 }, // Rhydon
          { pokemonId: 103, level: 61 }, // Exeggutor
          { pokemonId: 130, level: 63 }, // Gyarados
          { pokemonId: 6, level: 65 }, // Charizard
        ],
      },
    },
  },
  // Add more regions here (Johto, Hoenn, etc.) returning empty versions
  johto: {
    id: "johto",
    name: "Johto",
    unlockAfter: 1,
    zones: [],
    gyms: [],
    eliteFour: null as any,
  },
  hoenn: {
    id: "hoenn",
    name: "Hoenn",
    unlockAfter: 2,
    zones: [],
    gyms: [],
    eliteFour: null as any,
  },
  sinnoh: {
    id: "sinnoh",
    name: "Sinnoh",
    unlockAfter: 3,
    zones: [],
    gyms: [],
    eliteFour: null as any,
  },
  unova: {
    id: "unova",
    name: "Unova",
    unlockAfter: 4,
    zones: [],
    gyms: [],
    eliteFour: null as any,
  },
  kalos: {
    id: "kalos",
    name: "Kalos",
    unlockAfter: 5,
    zones: [],
    gyms: [],
    eliteFour: null as any,
  },
  alola: {
    id: "alola",
    name: "Alola",
    unlockAfter: 6,
    zones: [],
    gyms: [],
    eliteFour: null as any,
  },
  galar: {
    id: "galar",
    name: "Galar",
    unlockAfter: 7,
    zones: [],
    gyms: [],
    eliteFour: null as any,
  },
};
