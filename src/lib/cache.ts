import fs from "fs";
import path from "path";

type Entry<T> = { value: T; expires: number };

const store = new Map<string, Entry<unknown>>();

/** Cache válido até o fim do dia (banco atualiza 1x/dia). */
export function ttlUntilEndOfDayMs(): number {
  const now = new Date();
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );
  return Math.max(60_000, end.getTime() - now.getTime());
}

export function cacheGet<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs?: number): void {
  const ttl = ttlMs ?? ttlUntilEndOfDayMs();
  store.set(key, { value, expires: Date.now() + ttl });
}

export function cacheClear(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  Array.from(store.keys()).forEach((key) => {
    if (key.startsWith(prefix)) store.delete(key);
  });
}

function cacheDir(): string {
  const dir = path.join(process.cwd(), ".cache");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function diskPath(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(cacheDir(), `${safe}.json`);
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

type DiskPayload<T> = {
  day: string;
  savedAt: string;
  data: T;
};

/** Lê cache em disco se for do dia atual. */
export function diskGet<T>(key: string): T | null {
  try {
    const file = diskPath(key);
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw) as DiskPayload<T>;
    if (parsed.day !== todayStamp()) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

/** Grava cache em disco com carimbo do dia. */
export function diskSet<T>(key: string, data: T): void {
  try {
    const payload: DiskPayload<T> = {
      day: todayStamp(),
      savedAt: new Date().toISOString(),
      data,
    };
    fs.writeFileSync(diskPath(key), JSON.stringify(payload));
  } catch (err) {
    console.error("Falha ao gravar cache em disco:", err);
  }
}

export function diskClear(key?: string): void {
  try {
    if (key) {
      const file = diskPath(key);
      if (fs.existsSync(file)) fs.unlinkSync(file);
      return;
    }
    const dir = cacheDir();
    for (const name of fs.readdirSync(dir)) {
      if (name.endsWith(".json")) fs.unlinkSync(path.join(dir, name));
    }
  } catch {
    /* ignore */
  }
}

export function cacheMeta(key: string): { day: string; savedAt: string } | null {
  try {
    const file = diskPath(key);
    if (!fs.existsSync(file)) return null;
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as DiskPayload<unknown>;
    if (parsed.day !== todayStamp()) return null;
    return { day: parsed.day, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}
