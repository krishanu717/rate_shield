import { Injectable } from '@nestjs/common';
import * as client from 'prom-client';

// ✅ GLOBAL SINGLETON REGISTRY
const register = new client.Registry();

// ✅ CREATE COUNTERS ONLY ONCE
const requestsTotal = new client.Counter({
  name: 'requests_total',
  help: 'Total number of requests',
  registers: [register],
});

const requestsBlocked = new client.Counter({
  name: 'requests_blocked_total',
  help: 'Total blocked requests',
  registers: [register],
});

// default metrics
client.collectDefaultMetrics({ register });

@Injectable()
export class MetricsService {
  get requestsTotal() {
    return requestsTotal;
  }

  get requestsBlocked() {
    return requestsBlocked;
  }

  async getMetrics(): Promise<string> {
    return register.metrics();
  }
}