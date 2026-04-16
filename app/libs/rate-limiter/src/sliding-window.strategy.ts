import {
  RateLimitStrategy,
  RateLimitConfig,
  RateLimitResult,
  SlidingWindowEntry,
} from './strategies';

export class SlidingWindowStrategy implements RateLimitStrategy {
  private windows: Map<string, SlidingWindowEntry> = new Map();
  private config: RateLimitConfig;

  constructor(config?: RateLimitConfig) {
    this.config = config || {
      capacity: 100,
      refillRate: 1,
      tokenCost: 1,
    };
  }

  async isAllowed(key: string, now: number): Promise<RateLimitResult> {
    const windowSize = Math.ceil(this.config.capacity / this.config.refillRate);
    const windowStart = now - windowSize;

    let entry = this.windows.get(key);

    if (!entry) {
      entry = { requests: [], window: windowSize };
      this.windows.set(key, entry);
    }

    // Remove expired requests outside the window
    entry.requests = entry.requests.filter((timestamp) => timestamp > windowStart);

    // Check if current request is allowed
    const allowed = entry.requests.length < this.config.capacity;

    if (allowed) {
      entry.requests.push(now);
    }

    const remaining = this.config.capacity - entry.requests.length;
    const oldestRequest = entry.requests[0] || now;
    const resetTime = oldestRequest + entry.window;

    return {
      allowed,
      limit: this.config.capacity,
      remaining,
      resetTime,
      retryAfter: allowed ? 0 : Math.ceil(resetTime - now),
    };
  }

  getConfig(): RateLimitConfig {
    return this.config;
  }

  setConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
