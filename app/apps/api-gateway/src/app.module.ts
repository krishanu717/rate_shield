import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from './app.controller';
import { RateLimiterService } from '../../../libs/rate-limiter/src/rate-limiter.service';
import { RateLimitGuard } from './rate-limit.guard';
import { MetricsService } from './metrics/metrics.service';
import { MetricsController } from './metrics/metrics.controller';

import { initKafka } from '../../../libs/kafka/src/kafka.client';

@Module({
  controllers: [AppController, MetricsController],
  providers: [
    RateLimiterService,
    MetricsService,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {
  constructor() {
    initKafka();
  }
}