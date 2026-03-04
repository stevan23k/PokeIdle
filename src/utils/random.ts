export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateUid(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}
