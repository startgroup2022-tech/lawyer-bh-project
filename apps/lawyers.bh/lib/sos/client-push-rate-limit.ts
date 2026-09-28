const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 20;
const MAX_KEYS = 10_000;

type Entry = { count: number; resetAt: number };
const entries = new Map<string, Entry>();

function prune(now: number) {
  for (const [key, entry] of entries) {
    if (entry.resetAt <= now) entries.delete(key);
  }
  while (entries.size >= MAX_KEYS) {
    const oldest = entries.keys().next().value as string | undefined;
    if (!oldest) break;
    entries.delete(oldest);
  }
}

export function allowClientPushRegistration(key: string, now = Date.now()) {
  prune(now);
  const normalized = key.trim() || "unknown";
  const current = entries.get(normalized);
  if (!current || current.resetAt <= now) {
    entries.set(normalized, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}
