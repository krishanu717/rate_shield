import {
  RateLimitStrategy,
  RateLimitConfig,
  RateLimitResult,
  RedisClient,
  FallbackEntry,
} from './strategies';

export class TokenBucketStrategy implements RateLimitStrategy {
  private fallbackBuckets: Map<string, FallbackEntry> = new Map();
  private config: RateLimitConfig;
  private redisClient: RedisClient;
  private script: string;
  private isRedisReady: () => boolean;

  constructor(
    redisClient: RedisClient,
    isRedisReady: () => boolean,
    script: string,
    config?: RateLimitConfig,
  ) {
    this.redisClient = redisClient;
    this.isRedisReady = isRedisReady;
    this.script = script;
    this.config = config || {
      capacity: 100,
      refillRate: 1,
      tokenCost: 1,
    };
  }

  async isAllowed(key: string, now: number): Promise<RateLimitResult> {
    if (this.isRedisReady()) {
      try {
        const result = await Promise.race([
          this.redisClient.eval(this.script, {
            keys: [key],
            arguments: [
              this.config.capacity.toString(),
              this.config.refillRate.toString(),
              now.toString(),
              this.config.tokenCost.toString(),
            ],
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Redis timeout')), 1000),
          ),
        ]);

        const allowed = result === 1;
        const remaining = await this.getRemaining(key);
        const resetTime = now + Math.ceil(this.config.capacity / this.config.refillRate);

        return {
          allowed,
          limit: this.config.capacity,
          remaining: Math.max(0, remaining),
          resetTime,
          retryAfter: allowed ? 0 : Math.ceil((this.config.capacity - remaining) / this.config.refillRate),
        };
      } catch (error) {
        console.warn('Token bucket Redis fallback:', error instanceof Error ? error.message : String(error));
      }
    }

    return this.consumeFallback(key, now);
  }

  getConfig(): RateLimitConfig {
    return this.config;
  }

  setConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private consumeFallback(key: string, now: number): RateLimitResult {
    let entry = this.fallbackBuckets.get(key);

    if (!entry) {
      entry = { tokens: this.config.capacity, lastRefill: now };
      this.fallbackBuckets.set(key, entry);
    }

    const timeDelta = Math.max(0, now - entry.lastRefill);
    const tokensToAdd = timeDelta * this.config.refillRate;
    entry.tokens = Math.min(this.config.capacity, entry.tokens + tokensToAdd);
    entry.lastRefill = now;

    const allowed = entry.tokens >= this.config.tokenCost;

    if (allowed) {
      entry.tokens -= this.config.tokenCost;
    }

    const resetTime = now + Math.ceil((this.config.capacity - entry.tokens) / this.config.refillRate);

    return {
      allowed,
      limit: this.config.capacity,
      remaining: Math.floor(entry.tokens),
      resetTime,
      retryAfter: allowed ? 0 : Math.ceil((this.config.capacity - entry.tokens) / this.config.refillRate),
    };
  }

  private async getRemaining(key: string): Promise<number> {
    try {
      const data = await this.redisClient.hGetAll(key);
      return parseInt(data.tokens || '0', 10);
    } catch (error) {
      return 0;
    }
  }
}
