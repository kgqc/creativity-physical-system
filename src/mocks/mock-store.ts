const PREFIX = "motion-prototype:mock:";

export const MOCK_STORAGE_KEYS = {
  session: `${PREFIX}session`,
  projects: `${PREFIX}projects`,
  jobs: `${PREFIX}jobs`,
  versions: `${PREFIX}versions`,
  assets: `${PREFIX}assets`,
  events: `${PREFIX}events`,
} as const;

export function readMockValue<T>(key: keyof typeof MOCK_STORAGE_KEYS, fallback: T): T {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEYS[key]);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

export function writeMockValue<T>(key: keyof typeof MOCK_STORAGE_KEYS, value: T) {
  localStorage.setItem(MOCK_STORAGE_KEYS[key], JSON.stringify(value));
}

export function resetMockData() {
  Object.values(MOCK_STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}
