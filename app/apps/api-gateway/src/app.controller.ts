import { Controller, Get, UseGuards } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';

@Controller()
export class AppController {
  @Get('test')
  @UseGuards(RateLimitGuard)
  test() {
    return { message: 'Allowed' };
  }

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}