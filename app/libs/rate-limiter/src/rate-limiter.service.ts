import { Injectable } from '@nestjs/common';
import { redisClient, isRedisReady } from '../../../libs/redis/src/redis.client';
import { sendRateLimitEvent } from '../../../libs/kafka/src/kafka.client';
import { RateLimitConfiguration, PREDEFINED_TIERS } from './configuration';
import { RateLimitResult, RateLimitStrategy } from './strategies';
import { TokenBucketStrategy } from './token-bucket.strategy';
import { SlidingWindowStrategy } from './sliding-window.strategy';
import { FixedWindowStrategy } from './fixed-window.strategy';
import * as fs from 'fs';
import * as path from 'path';

type StrategyType = 'token-bucket' | 'sliding-window' | 'fixed-window';

@Injectable()
export class RateLimiterService {
  private script: string;
  private strategy: RateLimitStrategy;
  private configuration: RateLimitConfiguration;
  private currentStrategyType: StrategyType = 'token-bucket';
  private apiKeyTiers: Map<string, string> = new Map();

  constructor() {
    const scriptPath = path.resolve(__dirname, '../../../libs/redis/src/ratelimit.lua');
    this.script = fs.readFileSync(scriptPath, 'utf8');

    // Initialize configuration with predefined tiers
    this.configuration = new RateLimitConfiguration({
      tiers: PREDEFINED_TIERS,
      default: PREDEFINED_TIERS.free.config,
    });

    // Initialize default token bucket strategy
    this.strategy = new TokenBucketStrategy(
      redisClient,
      isRedisReady,
      this.script,
      this.configuration.getDefaultConfig(),
    );

    // Add sample API keys for testing
    this.apiKeyTiers.set('api_key_free', 'free');
    this.apiKeyTiers.set('api_key_pro', 'pro');
    this.apiKeyTiers.set('api_key_enterprise', 'enterprise');
  }

  async consume(
    identifier: string,
    context?: { apiKey?: string; path?: string },
  ): Promise<RateLimitResult> {
    const now = Math.floor(Date.now() / 1000);

    // Determine which config to use
    let config = this.configuration.getDefaultConfig();

    // Check for API key override
    if (context?.apiKey) {
      const tierName = this.apiKeyTiers.get(context.apiKey);
      if (tierName) {
        config = this.configuration.getTierConfig(tierName);
      }
    }

    // Check for route-specific override
    if (context?.path) {
      const routeConfig = this.configuration.getRouteConfig(context.path);
      if (routeConfig) {
        config = routeConfig;
      }
    }

    // Update strategy config if needed
    this.updateStrategyConfig(config);

    // Check rate limit using current strategy
    const result = await this.strategy.isAllowed(identifier, now);

    // Publish event
    await sendRateLimitEvent({
      identifier,
      allowed: result.allowed,
      timestamp: now,
      strategy: this.currentStrategyType,
      tier: context?.apiKey ? this.apiKeyTiers.get(context.apiKey) : 'default',
      source: isRedisReady() ? 'redis' : 'fallback',
    });

    return result;
  }

  switchStrategy(strategyType: StrategyType): void {
    const config = this.strategy.getConfig();

    switch (strategyType) {
      case 'token-bucket':
        this.strategy = new TokenBucketStrategy(
          redisClient,
          isRedisReady,
          this.script,
          config,
        );
        break;
      case 'sliding-window':
        this.strategy = new SlidingWindowStrategy(config);
        break;
      case 'fixed-window':
        this.strategy = new FixedWindowStrategy(60, config);
        break;
      default:
        throw new Error(`Unknown strategy: ${strategyType}`);
    }

    this.currentStrategyType = strategyType;
    console.log(`Switched to ${strategyType} strategy`);
  }

  getCurrentStrategy(): StrategyType {
    return this.currentStrategyType;
  }

  getConfiguration(): RateLimitConfiguration {
    return this.configuration;
  }

  addApiKey(apiKey: string, tier: string): boolean {
    if (!this.configuration.getTierConfig(tier)) {
      return false;
    }
    this.apiKeyTiers.set(apiKey, tier);
    return true;
  }

  removeApiKey(apiKey: string): void {
    this.apiKeyTiers.delete(apiKey);
  }

  getTierForApiKey(apiKey: string): string | null {
    return this.apiKeyTiers.get(apiKey) || null;
  }

  private updateStrategyConfig(config: any): void {
    if (this.strategy instanceof TokenBucketStrategy) {
      (this.strategy as TokenBucketStrategy).setConfig(config);
    } else if (this.strategy instanceof SlidingWindowStrategy) {
      (this.strategy as SlidingWindowStrategy).setConfig(config);
    } else if (this.strategy instanceof FixedWindowStrategy) {
      (this.strategy as FixedWindowStrategy).setConfig(config);
    }
  }
}