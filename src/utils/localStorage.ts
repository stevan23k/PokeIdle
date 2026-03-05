export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const data = window.sessionStorage.getItem(key);
    return data ? JSON.parse(data) as T : defaultValue;
  } catch (e) {
    console.error(`Error loading ${key} from storage:`, e);
    return defaultValue;
  }
}

export function saveToStorage<T>(key: string, data: T): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key} to storage:`, e);
  }
}
