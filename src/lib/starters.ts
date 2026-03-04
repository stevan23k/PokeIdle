export interface StarterDef {
  pokemonId: number;
  name: string;
  unlockCondition: {
    type: "runs" | "perfect_run" | "elite_wins";
    count: number;
    description: string;
  };
}

export const STARTERS: StarterDef[] = [
  { pokemonId: 1, name: "Bulbasaur", unlockCondition: { type: "runs", count: 0, description: "Siempre disponible" } },
  { pokemonId: 4, name: "Charmander", unlockCondition: { type: "runs", count: 0, description: "Siempre disponible" } },
  { pokemonId: 7, name: "Squirtle", unlockCondition: { type: "runs", count: 0, description: "Siempre disponible" } },
  
  { pokemonId: 25, name: "Pikachu", unlockCondition: { type: "runs", count: 1, description: "Completa 1 run" } },
  { pokemonId: 133, name: "Eevee", unlockCondition: { type: "runs", count: 1, description: "Completa 1 run" } },
  
  { pokemonId: 152, name: "Chikorita", unlockCondition: { type: "runs", count: 2, description: "Completa 2 runs" } },
  { pokemonId: 155, name: "Cyndaquil", unlockCondition: { type: "runs", count: 2, description: "Completa 2 runs" } },
  { pokemonId: 158, name: "Totodile", unlockCondition: { type: "runs", count: 2, description: "Completa 2 runs" } },
  
  { pokemonId: 252, name: "Treecko", unlockCondition: { type: "runs", count: 3, description: "Completa 3 runs" } },
  { pokemonId: 255, name: "Torchic", unlockCondition: { type: "runs", count: 3, description: "Completa 3 runs" } },
  { pokemonId: 258, name: "Mudkip", unlockCondition: { type: "runs", count: 3, description: "Completa 3 runs" } },
  
  { pokemonId: 387, name: "Turtwig", unlockCondition: { type: "runs", count: 5, description: "Completa 5 runs" } },
  { pokemonId: 390, name: "Chimchar", unlockCondition: { type: "runs", count: 5, description: "Completa 5 runs" } },
  { pokemonId: 393, name: "Piplup", unlockCondition: { type: "runs", count: 5, description: "Completa 5 runs" } },
  
  { pokemonId: 495, name: "Snivy", unlockCondition: { type: "runs", count: 7, description: "Completa 7 runs" } },
  { pokemonId: 498, name: "Tepig", unlockCondition: { type: "runs", count: 7, description: "Completa 7 runs" } },
  { pokemonId: 501, name: "Oshawott", unlockCondition: { type: "runs", count: 7, description: "Completa 7 runs" } },
  
  { pokemonId: 653, name: "Chespin", unlockCondition: { type: "runs", count: 10, description: "Completa 10 runs" } },
  { pokemonId: 650, name: "Fennekin", unlockCondition: { type: "runs", count: 10, description: "Completa 10 runs" } },
  { pokemonId: 656, name: "Froakie", unlockCondition: { type: "runs", count: 10, description: "Completa 10 runs" } },
  
  { pokemonId: 722, name: "Rowlet", unlockCondition: { type: "runs", count: 15, description: "Completa 15 runs" } },
  { pokemonId: 725, name: "Litten", unlockCondition: { type: "runs", count: 15, description: "Completa 15 runs" } },
  { pokemonId: 728, name: "Popplio", unlockCondition: { type: "runs", count: 15, description: "Completa 15 runs" } },
  
  { pokemonId: 810, name: "Grookey", unlockCondition: { type: "runs", count: 20, description: "Completa 20 runs" } },
  { pokemonId: 813, name: "Scorbunny", unlockCondition: { type: "runs", count: 20, description: "Completa 20 runs" } },
  { pokemonId: 816, name: "Sobble", unlockCondition: { type: "runs", count: 20, description: "Completa 20 runs" } },
  
  { pokemonId: 447, name: "Riolu", unlockCondition: { type: "perfect_run", count: 1, description: "Gana 1 run sin que ningún Pokémon se debilite" } },
  { pokemonId: 246, name: "Larvitar", unlockCondition: { type: "elite_wins", count: 3, description: "Derrota al Alto Mando 3 veces" } },
];
