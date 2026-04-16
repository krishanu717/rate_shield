import {
  RateLimitStrategy,
  RateLimitConfig,
  RateLimitResult,
  FixedWindowEntry,
} from './strategies';

export class FixedWindowStrategy implements RateLimitStrategy {
  private windows: Map<string, FixedWindowEntry> = new Map();
  private config: RateLimitConfig;
  private windowDuration: number;

  constructor(windowDurationSeconds: number = 60, config?: RateLimitConfig) {
    this.windowDuration = windowDurationSeconds;
    this.config = config || {
      capacity: 100,
      refillRate: 1,
      tokenCost: 1,
    };
  }

  async isAllowed(key: string, now: number): Promise<RateLimitResult> {
    const currentWindow = Math.floor(now / this.windowDuration);
    let entry = this.windows.get(key);

    // Check if we need to reset the window
    if (!entry || Math.floor(entry.windowStart / this.windowDuration) !== currentWindow) {
      entry = {
        count: 0,
        windowStart: currentWindow * this.windowDuration,
      };
      this.windows.set(key, entry);
    }

    const allowed = entry.count < this.config.capacity;

    if (allowed) {
      entry.count += this.config.tokenCost;
    }

    const nextWindowStart = entry.windowStart + this.windowDuration;
    const remaining = Math.max(0, this.config.capacity - entry.count);

    return {
      allowed,
      limit: this.config.capacity,
      remaining,
      resetTime: nextWindowStart,
      retryAfter: allowed ? 0 : Math.ceil(nextWindowStart - now),
    };
  }

  getConfig(): RateLimitConfig {
    return this.config;
  }

  setConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };
  }

  setWindowDuration(seconds: number): void {
    this.windowDuration = seconds;
    this.windows.clear();
  }
}
