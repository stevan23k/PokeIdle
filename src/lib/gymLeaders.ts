export const LEADER_SPRITE_SLUGS: Record<string, string> = {
  "Brock": "brock",
  "Misty": "misty",
  "Lt. Surge": "ltsurge",
  "Erika": "erika",
  "Koga": "koga",
  "Sabrina": "sabrina",
  "Blaine": "blaine",
  "Giovanni": "giovanni",
};

export function getLeaderSpriteUrl(leaderName: string): string {
  const slug = LEADER_SPRITE_SLUGS[leaderName] ?? leaderName.toLowerCase().replace(/\s/g, "");
  return `https://play.pokemonshowdown.com/sprites/trainers/${slug}.png`;
}
