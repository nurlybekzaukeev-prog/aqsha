export const storageKeys = {
  token: "aqsha_token",
  user: "aqsha_user",
  favorites: "aqsha_favorites",
};

export function saveJson(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

export function loadJson<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(key);
    if (!val) return defaultValue;
    return JSON.parse(val) as T;
  } catch (e) {
    return defaultValue;
  }
}

export function removeKeys(keys: string[]) {
  keys.forEach((k) => localStorage.removeItem(k));
}
