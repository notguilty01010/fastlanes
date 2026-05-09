// In-memory rate limiter с LRU-выселением. Один процесс - для MVP достаточно;
// под кластер нужен Redis.
type Bucket = { count: number; resetAt: number };

const MAX_KEYS = 5_000;

export class RateLimiter {
  private store = new Map<string, Bucket>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  check(key: string, now = Date.now()): { ok: boolean; retryAfterMs: number } {
    const bucket = this.store.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      this.evictIfNeeded();
      return { ok: true, retryAfterMs: 0 };
    }

    if (bucket.count >= this.limit) {
      return { ok: false, retryAfterMs: bucket.resetAt - now };
    }

    bucket.count += 1;
    // Map в JS сохраняет порядок вставки - touch для LRU.
    this.store.delete(key);
    this.store.set(key, bucket);
    return { ok: true, retryAfterMs: 0 };
  }

  private evictIfNeeded() {
    if (this.store.size <= MAX_KEYS) return;
    const overflow = this.store.size - MAX_KEYS;
    let removed = 0;
    for (const k of this.store.keys()) {
      if (removed >= overflow) break;
      this.store.delete(k);
      removed += 1;
    }
  }
}

// 1 запрос в 5 секунд на токен. На globalThis - чтобы пережить HMR.
const globalForRl = globalThis as unknown as {
  __fastlanes_track_rl?: RateLimiter;
};

export const trackTokenLimiter =
  globalForRl.__fastlanes_track_rl ?? new RateLimiter(1, 5_000);

if (process.env.NODE_ENV !== "production") {
  globalForRl.__fastlanes_track_rl = trackTokenLimiter;
}
