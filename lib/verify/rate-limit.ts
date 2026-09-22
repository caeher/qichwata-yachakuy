const MAX_KEYS = 5_000;

type Store = Map<string, { timestamps: number[] }>;

export function consumeToken(input: {
  key: string;
  now: number;
  store: Store;
  limit: number;
  windowMs: number;
}): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const { key, now, store, limit, windowMs } = input;
  const windowStart = now - windowMs;

  if (!store.has(key) && store.size >= MAX_KEYS) {
    const oldest = store.keys().next().value;
    if (oldest) {
      store.delete(oldest);
    }
  }

  const entry = store.get(key) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= limit) {
    const retryAfterMs = entry.timestamps[0] + windowMs - now;
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return { ok: true };
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "local";
  }
  return headers.get("x-real-ip")?.trim() || "local";
}
