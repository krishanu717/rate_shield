import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RateLimiterService } from '../../../libs/rate-limiter/src/rate-limiter.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private limiter: RateLimiterService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    // Extract API key from header or query parameter
    const apiKey = req.headers['x-api-key'] || req.query.api_key || null;
    const identifier = apiKey || `rate_limit:${req.ip}`;

    const result = await this.limiter.consume(identifier, {
      apiKey,
      path: req.path,
    });

    // Add rate limit headers to response
    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetTime);

    // Structured JSON logging for production
    console.log(JSON.stringify({
      service: 'api-gateway',
      event: 'rate_limit_check',
      timestamp: new Date().toISOString(),
      identifier,
      allowed: result.allowed,
      limit: result.limit,
      remaining: result.remaining,
      resetTime: result.resetTime,
      strategy: 'token-bucket', // TODO: make dynamic
      tier: apiKey ? this.limiter.getTierForApiKey(apiKey) : 'default',
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
    }));

    if (!result.allowed) {
      res.setHeader('Retry-After', Math.ceil(result.retryAfter));

      // Log blocked requests
      console.log(JSON.stringify({
        service: 'api-gateway',
        event: 'rate_limit_blocked',
        timestamp: new Date().toISOString(),
        identifier,
        retryAfter: result.retryAfter,
        tier: apiKey ? this.limiter.getTierForApiKey(apiKey) : 'default',
        ip: req.ip,
        path: req.path,
        method: req.method,
      }));

      throw new HttpException(
        'Too Many Requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}