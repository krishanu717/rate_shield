import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { RateLimiterService } from '../../../libs/rate-limiter/src/rate-limiter.service';
import { RateLimitGuard } from './rate-limit.guard';
import { initKafka } from '../../../libs/kafka/src/kafka.client';

@Module({
  controllers: [AppController],
  providers: [RateLimiterService, RateLimitGuard],
})
export class AppModule {
  constructor() {
    initKafka();
  }
}