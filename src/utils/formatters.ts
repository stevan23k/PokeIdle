export function padZeros(num: number, length: number = 3): string {
  return num.toString().padStart(length, '0');
}

export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
