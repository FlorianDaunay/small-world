/**
 * Safe JSON access to localStorage: private windows or a full quota must never crash the app.
 */
export const STORAGE_PREFIX = "smallworld:";

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    /* storage unavailable */
  }
}

/** Offers `data` as a downloaded JSON file. */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Lets the user pick a JSON file and parses it. */
export function pickJsonFile(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const input = Object.assign(document.createElement("input"), { type: "file", accept: "application/json,.json" });
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error("noFile"));
      try {
        resolve(JSON.parse(await file.text()));
      } catch {
        reject(new Error("invalidFile"));
      }
    };
    input.click();
  });
}
