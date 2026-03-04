const inMemoryCache = new Map<string, any>();

export function getCached<T>(key: string): T | null {
  return inMemoryCache.has(key) ? inMemoryCache.get(key) as T : null;
}

export function setCached<T>(key: string, value: T): void {
  inMemoryCache.set(key, value);
}
