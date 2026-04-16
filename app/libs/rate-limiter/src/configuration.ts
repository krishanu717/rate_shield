import { RateLimitConfig } from './strategies';

export interface RateLimitTier {
  name: string;
  config: RateLimitConfig;
  description?: string;
}

export interface RouteConfig {
  path: string;
  config: RateLimitConfig;
  description?: string;
}

export interface ConfigurationOptions {
  tiers?: Record<string, RateLimitTier>;
  routes?: RouteConfig[];
  default?: RateLimitConfig;
}

export class RateLimitConfiguration {
  private tiers: Map<string, RateLimitTier>;
  private routes: Map<string, RouteConfig>;
  private defaultConfig: RateLimitConfig;

  constructor(options?: ConfigurationOptions) {
    this.tiers = new Map();
    this.routes = new Map();

    this.defaultConfig = options?.default || {
      capacity: 100,
      refillRate: 1,
      tokenCost: 1,
    };

    if (options?.tiers) {
      Object.entries(options.tiers).forEach(([name, tier]) => {
        this.tiers.set(name, tier);
      });
    }

    if (options?.routes) {
      options.routes.forEach((route) => {
        this.routes.set(route.path, route);
      });
    }
  }

  getTierConfig(tierName: string): RateLimitConfig {
    const tier = this.tiers.get(tierName);
    return tier?.config || this.defaultConfig;
  }

  getRouteConfig(path: string): RateLimitConfig {
    const route = this.routes.get(path);
    return route?.config || this.defaultConfig;
  }

  getDefaultConfig(): RateLimitConfig {
    return this.defaultConfig;
  }

  setDefaultConfig(config: RateLimitConfig): void {
    this.defaultConfig = config;
  }

  addTier(name: string, tier: RateLimitTier): void {
    this.tiers.set(name, tier);
  }

  removeTier(name: string): void {
    this.tiers.delete(name);
  }

  addRoute(path: string, route: RouteConfig): void {
    this.routes.set(path, route);
  }

  removeRoute(path: string): void {
    this.routes.delete(path);
  }

  listTiers(): RateLimitTier[] {
    return Array.from(this.tiers.values());
  }

  listRoutes(): RouteConfig[] {
    return Array.from(this.routes.values());
  }

  updateTierConfig(tierName: string, config: Partial<RateLimitConfig>): boolean {
    const tier = this.tiers.get(tierName);
    if (!tier) {
      return false;
    }
    tier.config = { ...tier.config, ...config };
    return true;
  }

  updateRouteConfig(path: string, config: Partial<RateLimitConfig>): boolean {
    const route = this.routes.get(path);
    if (!route) {
      return false;
    }
    route.config = { ...route.config, ...config };
    return true;
  }

  export(): ConfigurationOptions {
    return {
      tiers: Object.fromEntries(this.tiers),
      routes: Array.from(this.routes.values()),
      default: this.defaultConfig,
    };
  }
}

// Predefined tier configurations
export const PREDEFINED_TIERS: Record<string, RateLimitTier> = {
  free: {
    name: 'free',
    config: { capacity: 100, refillRate: 1, tokenCost: 1 },
    description: 'Free tier: 100 requests per minute',
  },
  pro: {
    name: 'pro',
    config: { capacity: 1000, refillRate: 10, tokenCost: 1 },
    description: 'Pro tier: 1000 requests per 100 seconds',
  },
  enterprise: {
    name: 'enterprise',
    config: { capacity: 5000, refillRate: 50, tokenCost: 1 }, // Reduced from 10000/100 to 5000/50 for safety
    description: 'Enterprise tier: 5000 requests per 100 seconds (hard-capped for safety)',
  },
};
