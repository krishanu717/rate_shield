export interface RateLimitConfig {
  capacity: number;
  refillRate: number;
  tokenCost: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter: number;
}

export interface RateLimitStrategy {
  isAllowed(key: string, now: number): Promise<RateLimitResult>;
  getConfig(): RateLimitConfig;
}

export interface RedisClient {
  eval(script: string, options: any): Promise<any>;
  hGetAll(key: string): Promise<Record<string, string>>;
}

export interface FallbackEntry {
  tokens: number;
  lastRefill: number;
}

export interface SlidingWindowEntry {
  requests: number[];
  window: number;
}

export interface FixedWindowEntry {
  count: number;
  windowStart: number;
}
