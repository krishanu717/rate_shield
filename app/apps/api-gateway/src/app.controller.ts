import { Controller, Get, UseGuards } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';
import { MetricsService } from './metrics/metrics.service';

@Controller()
export class AppController {
  constructor(private metricsService: MetricsService) {}

  @Get('test')
  @UseGuards(RateLimitGuard)
  test() {
    return { message: 'Allowed' };
  }

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  // ✅ ADD THIS
  @Get('metrics')
  async metrics() {
    return this.metricsService.getMetrics();
  }
}