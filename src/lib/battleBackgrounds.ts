export interface BattleBackground {
  id: string;
  name: string;
  spriteSheet: string; // path relative to public/
  frameHeight: number; // height in px of ONE visible frame
  frameCount: number; // number of animation frames
  fps: number; // animation speed
  transparencyColor: [number, number, number] | null; // RGB color to remove, or null to draw raw image
  zones: string[]; // zone IDs — use ["*"] for fallback
}

export const BATTLE_BACKGROUNDS: BattleBackground[] = [
  {
    id: "grass-route",
    name: "Ruta de Hierba",
    spriteSheet: "battle-bg/ruta_1.png",
    frameHeight: 112,
    frameCount: 1,
    fps: 0,
    transparencyColor: null,
    zones: ["ruta-1", "ruta-2", "ruta-22"],
  },
  {
    id: "cave-dirt",
    name: "Cueva",
    spriteSheet: "battle-bg/cave-dirt.png",
    frameHeight: 112,
    frameCount: 1,
    fps: 0,
    transparencyColor: null,
    zones: ["monte-luna", "cueva-roca"],
  },
  {
    id: "water-surf",
    name: "Agua",
    spriteSheet: "battle-bg/water-surf.png",
    frameHeight: 112,
    frameCount: 1,
    fps: 0,
    transparencyColor: null,
    zones: ["costa-azul", "ruta-surf"],
  },
  {
    id: "pond-water",
    name: "Lago",
    spriteSheet: "battle-bg/pond-water.png",
    frameHeight: 112,
    frameCount: 1,
    fps: 0,
    transparencyColor: null,
    zones: ["lago-colera", "lago-vigor"],
  },
  {
    id: "indoor-gray",
    name: "Interior (Gris)",
    spriteSheet: "battle-bg/indoor-gray.png",
    frameHeight: 112,
    frameCount: 1,
    fps: 0,
    transparencyColor: null,
    zones: ["gimnasio", "ciudad"],
  },
  {
    id: "indoor-blue",
    name: "Interior (Azul)",
    spriteSheet: "battle-bg/indoor-blue.png",
    frameHeight: 112,
    frameCount: 1,
    fps: 0,
    transparencyColor: null,
    zones: ["torre-celeste", "edificio"],
  },
  {
    id: "sand-route",
    name: "Arena",
    spriteSheet: "battle-bg/sand-route.png",
    frameHeight: 112,
    frameCount: 1,
    fps: 0,
    transparencyColor: null,
    zones: ["ruta-desierto", "safari"],
  },
  {
    id: "tower-psychic",
    name: "Torre Psíquica",
    spriteSheet: "battle-bg/tower-psychic.png",
    frameHeight: 112,
    frameCount: 1,
    fps: 0,
    transparencyColor: null,
    zones: ["torre-purpura", "gimnasio-psiquico"],
  },
  {
    id: "forest-green",
    name: "Bosque",
    spriteSheet: "battle-bg/forest-green.png",
    frameHeight: 112,
    frameCount: 1,
    fps: 0,
    transparencyColor: null,
    zones: ["bosque-jade", "ruta-bosque"],
  },
  {
    id: "underwater",
    name: "Fondo Marino",
    spriteSheet: "battle-bg/underwater.png",
    frameHeight: 114,
    frameCount: 1,
    fps: 0,
    transparencyColor: null,
    zones: ["fondo-marino"],
  },
];

export function getBackgroundForZone(zoneId: string): BattleBackground | null {
  return (
    BATTLE_BACKGROUNDS.find((bg) => bg.zones.includes(zoneId)) ??
    BATTLE_BACKGROUNDS.find((bg) => bg.zones.includes("*")) ??
    null
  );
}

export function getBackgroundById(id: string): BattleBackground | null {
  return (
    BATTLE_BACKGROUNDS.find((bg) => bg.id === id) ??
    BATTLE_BACKGROUNDS.find((bg) => bg.id === "indoor-gray") ??
    null
  );
}
