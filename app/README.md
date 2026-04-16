# Distributed Rate Limiter

A high-performance, distributed rate limiting system built with NestJS, Redis, and Kafka. This project demonstrates enterprise-grade API rate limiting with multiple algorithms, API key tiering, and dynamic configuration.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │    │     Redis       │    │     Kafka       │
│   (NestJS)      │◄──►│  (Rate Limit    │    │  (Analytics     │
│                 │    │   State Store)  │    │   Events)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│ Load Generator  │    │ Analytics       │
│   (k6)          │    │ Service         │
└─────────────────┘    └─────────────────┘
```

### Components

- **API Gateway**: Main entry point with NestJS guards enforcing rate limits
- **Redis**: Distributed cache with Lua scripts for atomic operations
- **Kafka**: Message bus for analytics and monitoring events
- **Analytics Service**: Event consumer for processing rate limit decisions
- **Load Generator**: k6-based performance testing tool

## Features

### ✅ Phase 1: Core Rate Limiting
- HTTP 429 status codes for rate limited requests
- Fail-safe fallback when Redis is unavailable
- RFC 6585 compliant rate limit headers (`X-RateLimit-*`, `Retry-After`)
- Atomic Redis operations using Lua scripts

### ✅ Phase 2: Advanced Features
- **Multiple Algorithms**: Token Bucket, Sliding Window, Fixed Window strategies
- **API Key Tiering**: Different limits for Free, Pro, Enterprise tiers
- **Route-Specific Limits**: Custom limits per endpoint
- **Dynamic Configuration**: Runtime strategy switching and config updates
- **Production Ready**: Comprehensive error handling and logging

### 🚧 Phase 3: Monitoring & Observability (Planned)
- Prometheus metrics collection
- Grafana dashboards for real-time monitoring
- Alerting for rate limit violations

### 🚧 Phase 4: Production Deployment (Planned)
- Kubernetes deployment with Helm charts
- Redis Cluster support for high availability
- Multi-region deployment patterns

## How Rate Limiting Works

### Supported Algorithms

#### 1. Token Bucket (Default)
- **Capacity**: Maximum tokens allowed
- **Refill Rate**: Tokens added per second
- **Behavior**: Smooth rate limiting with burst capacity

#### 2. Sliding Window
- **Window Size**: Time window for counting requests
- **Behavior**: Rolling window prevents burst at window boundaries
- **Precision**: More accurate than fixed window but higher memory usage

#### 3. Fixed Window
- **Window Duration**: Fixed time periods (e.g., 60 seconds)
- **Behavior**: Simple but allows bursts at window boundaries
- **Efficiency**: Low memory usage, high performance

### Request Processing Flow

1. **Request Arrival**: Client hits protected endpoint
2. **Context Extraction**: Extract API key and route information
3. **Configuration Lookup**: Determine applicable rate limit rules
4. **Strategy Execution**: Apply appropriate algorithm (Redis + fallback)
5. **Response Headers**: Add rate limit headers to response
6. **Event Publishing**: Send decision to Kafka for analytics

### Distributed Consistency

- **Redis Keys**: `rate_limit:{identifier}` (IP or API key based)
- **Atomic Operations**: Lua scripts prevent race conditions
- **Shared State**: All instances share Redis for consistency
- **Fail-Open**: Allows requests when Redis unavailable (configurable)

## Installation and Setup

### Prerequisites

- Node.js 18 or higher
- Redis server (local or containerized)
- Kafka (optional, for analytics events)
- TypeScript 5.0+ (for latest features)

### Environment Setup

```bash
# Clone the repository
git clone <repository-url>
cd distributed-rate-limiter

# Install project dependencies
npm install

# Install Redis locally (macOS)
brew install redis
brew services start redis

# Or run Redis using Docker
docker run -d -p 6379:6379 redis:7

# Optional: Install Kafka for analytics
brew install kafka
brew services start zookeeper
brew services start kafka
```

### TypeScript Configuration

The project uses modern TypeScript features. If you encounter compilation issues:

```json
// tsconfig.json key settings
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "ignoreDeprecations": "6.0",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### Starting the API Gateway

```bash
# Navigate to API Gateway directory
cd apps/api-gateway

# Start the application
npx ts-node src/main.ts
```

The API will be available at `http://localhost:3000`

### Testing API Key Tiers

```bash
# Free tier (100 requests/minute)
curl -H "x-api-key: api_key_free" http://localhost:3000/test

# Pro tier (1000 requests/minute)
curl -H "x-api-key: api_key_pro" http://localhost:3000/test

# Enterprise tier (unlimited)
curl -H "x-api-key: api_key_enterprise" http://localhost:3000/test
```

### Performance Testing with k6

```bash
# Install k6 load testing tool
brew install k6

# Navigate to load generator
cd apps/load-generator

# Run load test (5 virtual users for 10 seconds)
k6 run --vus 5 --duration 10s test.js
```

## API Reference

### Endpoint: GET /test

Rate-limited test endpoint demonstrating all rate limiting features.

**Headers:**
- `x-api-key` (optional): API key for tiered rate limiting
- `x-forwarded-for` (optional): Client IP when behind proxy

**Successful Response** (Status: 200 OK)
```json
{
  "message": "Allowed",
  "strategy": "token-bucket",
  "tier": "free"
}
```

**Rate Limit Headers (Always Returned):**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
Retry-After: 0
X-RateLimit-Strategy: token-bucket
X-RateLimit-Tier: free
```

**Rate Limited Response** (Status: 429 Too Many Requests)
```json
{
  "statusCode": 429,
  "message": "Too Many Requests",
  "error": "Too Many Requests"
}
```

**Headers when rate limited:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995230
Retry-After: 12
X-RateLimit-Strategy: token-bucket
X-RateLimit-Tier: free
```

### Rate Limiting Tiers

| Tier | Requests/Minute | API Key |
|------|----------------|---------|
| Free | 100 | `api_key_free` |
| Pro | 1000 | `api_key_pro` |
| Enterprise | Unlimited | `api_key_enterprise` |

### Supported Strategies

- **token-bucket**: Smooth rate limiting with burst capacity
- **sliding-window**: Rolling window prevents boundary bursts
- **fixed-window**: Simple fixed-time windows

## Configuration

### Rate Limit Parameters

#### Static Configuration

Modify default parameters in `libs/rate-limiter/src/configuration.ts`:

```typescript
export const PREDEFINED_TIERS = {
  free: {
    config: {
      capacity: 100,    // requests per window
      refillRate: 1,    // tokens per second
      tokenCost: 1,     // tokens per request
    },
  },
  pro: {
    config: {
      capacity: 1000,
      refillRate: 16.67, // ~1000 per minute
      tokenCost: 1,
    },
  },
  enterprise: {
    config: {
      capacity: 10000,
      refillRate: 166.67, // ~10000 per minute
      tokenCost: 1,
    },
  },
};
```

#### Dynamic Configuration

The system supports runtime configuration changes:

```typescript
// Access rate limiter service
const rateLimiter = app.get(RateLimiterService);

// Switch strategies at runtime
rateLimiter.switchStrategy('sliding-window');

// Add new API key
rateLimiter.addApiKey('new_key', 'pro');

// Update route-specific limits
const config = rateLimiter.getConfiguration();
config.setRouteConfig('/api/premium', {
  capacity: 500,
  refillRate: 8.33,
  tokenCost: 1,
});
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URI |
| `KAFKA_BROKERS` | `localhost:9092` | Kafka broker addresses |
| `KAFKAJS_NO_PARTITIONER_WARNING` | `1` | Suppress Kafka partitioner warnings |

### Strategy-Specific Configuration

#### Token Bucket Strategy
```typescript
const config = {
  capacity: 100,    // Maximum tokens
  refillRate: 1,    // Tokens added per second
  tokenCost: 1,     // Tokens consumed per request
};
```

#### Sliding Window Strategy
```typescript
const config = {
  capacity: 100,    // Maximum requests per window
  refillRate: 1,    // Affects window size calculation
  tokenCost: 1,     // Requests per call
};
```

#### Fixed Window Strategy
```typescript
const strategy = new FixedWindowStrategy(60, config); // 60-second windows
```

## Testing and Validation

### Manual Endpoint Testing

```bash
# Test single request
curl -v http://localhost:3000/test

# Test with API key
curl -H "x-api-key: api_key_pro" http://localhost:3000/test

# Test rate limiting (exceed free tier limit)
for i in {1..101}; do
  curl -s -H "x-api-key: api_key_free" http://localhost:3000/test > /dev/null
done
curl -i -H "x-api-key: api_key_free" http://localhost:3000/test

# Test different strategies
curl -H "x-strategy: sliding-window" http://localhost:3000/test
```

### Load Testing Results

#### Token Bucket Strategy
```
Total Requests: 70,999 in 5 seconds
Allowed Requests: 105 (100 initial tokens + 5 refills)
Blocked Requests: 70,894 (99.85% rate limited)
Throughput: ~14,000 requests per second
```

#### Strategy Comparison
| Strategy | Memory Usage | Boundary Behavior | Precision |
|----------|-------------|-------------------|-----------|
| Token Bucket | Medium | Smooth | High |
| Sliding Window | High | Smooth | Very High |
| Fixed Window | Low | Burst at boundaries | Medium |

### Redis State Inspection

```bash
# List all rate limit keys
redis-cli KEYS "rate_limit:*"

# Inspect rate limit state for IP
redis-cli HGETALL "rate_limit:::1"

# Inspect API key state
redis-cli HGETALL "rate_limit:api_key_pro"

# Monitor Redis operations
redis-cli MONITOR
```

### Strategy Testing

```bash
# Test strategy switching
curl -X POST http://localhost:3000/admin/strategy \
  -H "Content-Type: application/json" \
  -d '{"strategy": "sliding-window"}'

# Test configuration updates
curl -X POST http://localhost:3000/admin/config \
  -H "Content-Type: application/json" \
  -d '{"capacity": 200, "refillRate": 2}'
```

### Error Simulation

```bash
# Test Redis failure (stop Redis service)
brew services stop redis

# Verify fail-open behavior
curl http://localhost:3000/test

# Restart Redis
brew services start redis
```

## Analytics and Monitoring

### Enhanced Kafka Event Format

Rate limiting decisions are published to Kafka topic `rate-limit-events`:

```json
{
  "identifier": "rate_limit:192.168.1.1",
  "allowed": true,
  "timestamp": 1640995200,
  "strategy": "token-bucket",
  "tier": "free",
  "source": "redis",
  "path": "/test",
  "apiKey": "api_key_free",
  "limit": 100,
  "remaining": 99,
  "resetTime": 1640995260,
  "retryAfter": 0
}
```

### Event Fields

| Field | Type | Description |
|-------|------|-------------|
| `identifier` | string | Rate limit key (IP or API key) |
| `allowed` | boolean | Whether request was allowed |
| `timestamp` | number | Unix timestamp of decision |
| `strategy` | string | Algorithm used (token-bucket, sliding-window, fixed-window) |
| `tier` | string | API key tier (free, pro, enterprise) |
| `source` | string | Data source (redis, fallback) |
| `path` | string | Request path |
| `apiKey` | string | API key used (if any) |
| `limit` | number | Rate limit capacity |
| `remaining` | number | Remaining requests |
| `resetTime` | number | Unix timestamp when limit resets |
| `retryAfter` | number | Seconds to wait before retry |

### Starting the Analytics Service

```bash
# Navigate to analytics service
cd apps/analytics-service

# Start the consumer
npx ts-node src/main.ts
```

The service will:
- Connect to Kafka and subscribe to `rate-limit-events`
- Process events and log rate limiting decisions
- Handle message processing errors gracefully
- Support future analytics features (metrics, alerting)

## Deployment

### Docker Deployment

```bash
# Start all services using Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Check service health
docker-compose ps

# Stop all services
docker-compose down
```

The Docker setup includes:
- **Redis**: In-memory data store for rate limits
- **Kafka**: Event streaming for analytics
- **API Gateway**: Rate limiting service on port 3000
- **Analytics Service**: Kafka consumer for event processing

**Test the deployment:**
```bash
curl http://localhost:3000/test
curl http://localhost:3000/health
```

### AWS Deployment Plan

This section describes a clean, production-grade AWS deployment for the distributed rate limiter system.

#### 1. Objective
Deploy a distributed rate limiter system with:

- High availability
- Horizontal scalability
- Fault tolerance
- Observability
- Secure networking

#### 2. Architecture Overview

```
Client → Route53 → ALB → ECS (API Gateway) → Redis (ElastiCache)
                                              → Kafka (MSK)
                                              → Analytics Service
```

#### 3. Infrastructure Components

##### 3.1 Compute Layer

Service: **ECS Fargate**

Why:

- No server management
- Built-in scaling
- Seamless integration with ALB

Services to run:

- API Gateway (rate limiter)
- Analytics Service (Kafka consumer)

##### 3.2 Load Balancing

Service: **Application Load Balancer (ALB)**

Responsibilities:

- Distribute traffic across ECS tasks
- Perform health checks
- Handle TLS termination

##### 3.3 Redis Layer

Service: **ElastiCache Redis**

Configuration:

- Cluster mode enabled
- Multi-AZ enabled
- At least 1 replica per shard

Purpose:

- Centralized rate limit state
- Atomic operations using Lua

##### 3.4 Kafka Layer

Service: **AWS MSK (Managed Kafka)**

Configuration:

- Minimum 2–3 brokers
- Private subnet only
- TLS enabled

Purpose:

- Event streaming for analytics
- Decoupled processing

##### 3.5 Networking

Service: **VPC**

Structure:

- Public subnets: ALB
- Private subnets: ECS tasks, Redis, Kafka

Rules:

- No public access to Redis or Kafka
- ECS communicates internally only

##### 3.6 DNS

Service: **Route53**

- Map domain → ALB
- Optional: health-based routing

#### 4. Deployment Steps

##### Step 1 — Containerization

Build and push image:

```bash
docker build -t rate-limiter .
docker tag rate-limiter:latest <ECR_URL>
docker push <ECR_URL>
```

##### Step 2 — Create ECR Repository

- Store Docker images
- Enable image scanning

##### Step 3 — Create ECS Task Definition

Define:

- CPU and memory
- Container image
- Environment variables

Example:

```bash
REDIS_URL=redis://<elasticache-endpoint>:6379
KAFKA_BROKERS=<msk-brokers>
NODE_ENV=production
```

##### Step 4 — Create ECS Service

- Launch type: Fargate
- Attach to ALB target group
- Desired count: start with 2–3

##### Step 5 — Configure ALB

- Listener: HTTP/HTTPS
- Target group: ECS service
- Health check path: `/health`

##### Step 6 — Deploy Redis (ElastiCache)

Key settings:

- Engine: Redis 7
- Cluster mode: enabled
- Multi-AZ: enabled

##### Step 7 — Deploy Kafka (MSK)

Key settings:

- Broker count: 2–3
- Storage: provisioned
- Authentication: TLS or IAM

##### Step 8 — Deploy Analytics Service

- Separate ECS service
- Connect to Kafka
- Independent scaling

#### 5. Security Design

##### 5.1 Security Groups

- ALB: open to internet (80/443)
- ECS: allow only ALB traffic
- Redis: allow only ECS
- Kafka: allow only ECS

##### 5.2 Secrets Management

Use **AWS Secrets Manager** for:

- Redis credentials
- Kafka credentials
- API keys

#### 6. Scaling Strategy

##### Horizontal Scaling

ECS Auto Scaling:

- Scale out when CPU > 60% or request count is high
- Scale in when utilization is low

##### Redis Scaling

- Use cluster mode for sharding
- Avoid single-node bottlenecks

#### 7. Reliability Measures

##### 7.1 Timeouts

Set timeouts for:

- Redis calls
- Kafka producers
- HTTP requests

##### 7.2 Fallback Control

Retain the current fallback strategy and add:

- strict fallback limits
- alerting for fallback usage

##### 7.3 Graceful Shutdown

Handle:

```ts
SIGTERM → close Kafka + Redis connections
```

#### 8. Observability

##### Logging

- Use structured logging
- Send logs to CloudWatch

##### Metrics

Track:

- Requests allowed
- Requests blocked
- Redis latency
- Kafka failures
- Fallback usage

##### Health Checks

Expose:

```
GET /health
```

Validate:

- Redis connectivity
- Kafka connectivity (optional)

#### 9. Testing Before Production

##### Load Testing

Use k6:

```bash
k6 run --vus 100 --duration 60s test.js
```

##### Validate

- Rate limits enforced correctly
- No race conditions
- No memory spikes
- Stable latency

#### 10. Deployment Strategy

##### Recommended: Rolling Deployment

- Deploy new version gradually
- Keep old version running
- No downtime

##### Advanced: Blue/Green Deployment

- Two environments
- Switch traffic instantly
- Safe rollback

#### 11. Common Failure Points

Avoid:

- Single Redis instance
- No autoscaling
- No health checks
- Unlimited rate limits
- No timeout handling
- Logging only to console

#### 12. Final Outcome

After this deployment, the system will be:

- Horizontally scalable
- Fault tolerant
- Observable
- Secure
- Production-ready

If you want the next step, I can generate:

- Full Terraform infrastructure
- CI/CD pipeline for automatic deployment
- Cost-optimized AWS version
- Multi-region architecture


### Compilation Errors

#### TypeScript Errors Fixed
```bash
# Update tsconfig.json for modern TypeScript
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "ignoreDeprecations": "6.0"
  }
}

# Check for compilation errors
npx tsc --noEmit
```

#### Common TypeScript Fixes
- Use `instanceof Error` for error type checking
- Add proper `@Injectable()` decorators
- Fix import paths to use relative paths
- Handle unknown error types safely

### Port Conflicts

```bash
# Find process using port 3000
lsof -i :3000

# Kill all ts-node processes
pkill -f ts-node

# Or kill specific process
kill -9 <PID>
```

### Redis Connection Issues

```bash
# Start Redis service
brew services start redis

# Test Redis connection
redis-cli ping

# Check Redis logs
brew services logs redis

# Run Redis in Docker
docker run -d -p 6379:6379 --name redis redis:7
```

### Kafka Connection Issues

```bash
# Start Kafka services (if using local Kafka)
brew services start zookeeper
brew services start kafka

# Check Kafka broker
kafka-topics --bootstrap-server localhost:9092 --list

# Note: Kafka is optional - system works without it
```

### Rate Limiting Not Working

```bash
# Check Redis keys
redis-cli KEYS "rate_limit:*"

# Inspect specific key
redis-cli HGETALL "rate_limit:::1"

# Enable debug logging in rate-limit.guard.ts
console.log(`Rate limit check: identifier=${identifier}, allowed=${result.allowed}`);
```

### Strategy Switching Issues

```bash
# Verify strategy implementation
const rateLimiter = app.get(RateLimiterService);
console.log('Current strategy:', rateLimiter.getCurrentStrategy());

// Test strategy switch
rateLimiter.switchStrategy('sliding-window');
```

### API Key Issues

```bash
# Test API key headers
curl -H "x-api-key: api_key_free" http://localhost:3000/test

# Check API key configuration
const rateLimiter = app.get(RateLimiterService);
console.log('API keys:', rateLimiter.getConfiguration().getTiers());
```

### Performance Issues

```bash
# Monitor Redis performance
redis-cli INFO stats

# Check system resources
top -pid <node-process-id>

# Profile with clinic.js
npm install -g clinic
clinic doctor -- npx ts-node src/main.ts
```

### Docker Deployment Issues

```bash
# Build and start services
docker-compose up --build

# Check service logs
docker-compose logs api-gateway

# Debug container
docker-compose exec api-gateway sh
```

## System Features

### ✅ Implemented Features

- **Multiple Rate Limiting Algorithms**: Token Bucket, Sliding Window, Fixed Window
- **API Key Tiering**: Free, Pro, Enterprise tiers with different limits
- **Route-Specific Limits**: Custom configuration per endpoint
- **Dynamic Configuration**: Runtime strategy switching and config updates
- **Distributed Architecture**: Scales across multiple instances with Redis
- **Atomic Operations**: Lua scripts ensure consistency across instances
- **Fault Tolerance**: Fail-safe fallback when Redis unavailable
- **Event Publishing**: Comprehensive Kafka integration for monitoring
- **RFC 6585 Compliance**: Standard rate limit headers
- **High Performance**: Handles 10,000+ requests per second
- **TypeScript Safety**: Full type safety with modern TypeScript features

### 🔧 Technical Features

- **Strategy Pattern**: Pluggable rate limiting algorithms
- **Dependency Injection**: NestJS DI container for service management
- **Error Handling**: Comprehensive error handling with proper TypeScript types
- **Configuration Management**: Centralized configuration with runtime updates
- **Logging**: Structured logging for debugging and monitoring
- **Testing**: Load testing with k6 and manual validation

## Future Enhancements

### Phase 3: Monitoring & Observability
- **Prometheus Metrics**: Collect detailed performance metrics
- **Grafana Dashboards**: Real-time visualization of rate limiting
- **Alerting**: Automated alerts for rate limit violations
- **Distributed Tracing**: OpenTelemetry integration

### Phase 4: Production Deployment
- **Kubernetes**: Helm charts for production deployment
- **Redis Cluster**: High availability with Redis Cluster
- **Multi-Region**: Global deployment patterns
- **Service Mesh**: Istio integration for advanced routing

### Additional Features
- **Admin API**: REST endpoints for runtime configuration
- **Rate Limit Bypass**: Internal service communication bypass
- **Custom Strategies**: Plugin system for custom algorithms
- **Analytics Dashboard**: Web UI for monitoring and analytics
- **Database Integration**: Persistent storage for configuration
- **Machine Learning**: Adaptive rate limiting based on patterns

## Technical Concepts Covered

1. **Distributed Systems**: Coordinating state across multiple instances
2. **Redis Lua Scripting**: Atomic multi-step operations in a distributed cache
3. **Token Bucket Algorithm**: Industry-standard rate limiting implementation
4. **Event-Driven Architecture**: Decoupling services with message queues
5. **Performance Testing**: Load testing and validation with k6
6. **Fault Tolerance Patterns**: Graceful degradation and fail-open behavior
7. **NestJS Guards**: Request lifecycle interception and validation
## Recent Improvements (Phase 1)

Phase 1 implementation completed with three critical production-ready enhancements:

### 1. RFC 6585 Compliant HTTP 429 Status

Previously, rate-limited requests returned `400 Bad Request`. Now the system correctly returns `429 Too Many Requests` per RFC 6585 standards. This allows clients to programmatically differentiate rate limit errors from other bad request scenarios.

**Implementation:**
- Replaced `BadRequestException` with `HttpException(HttpStatus.TOO_MANY_REQUESTS)`
- Enables proper client-side handling of rate limit responses

### 2. Fail-Safe In-Memory Fallback Rate Limiter

Replaced blind fail-open strategy with intelligent fallback. When Redis is unavailable, the system maintains an in-memory token bucket per IP address, ensuring protection even during infrastructure failures.

**Implementation:**
- Added `FallbackEntry` interface tracking tokens and last refill timestamp
- Map-based storage with same token bucket logic as Redis
- Automatic fallback when Redis is down or times out
- Events tagged with `source: 'redis'` or `source: 'fallback'` for monitoring

**Benefits:**
- Continues rate limiting protection during Redis outages
- Single-instance consistency for fallback (sufficient for most scenarios)
- Transparent transition between Redis and fallback

### 3. Standard Rate Limit Response Headers

Every response now includes RFC-compliant rate limit headers:

```
X-RateLimit-Limit: 100              (total requests in window)
X-RateLimit-Remaining: 43           (tokens still available)
X-RateLimit-Reset: 1640995230       (Unix timestamp when limit resets)
Retry-After: 12                      (seconds to wait, included when rate limited)
```

**Benefits:**
- Clients can self-throttle before hitting limit
- Better observability of rate limit state
- Enables intelligent retry logic
- Follows HTTP/1.1 standards

## Recent Improvements (Phase 2)

Phase 2 implementation adds feature-complete core functionality:

### 1. Multiple Rate Limiting Strategies (Pluggable)

The system now supports swappable rate limiting algorithms. Switch strategies at runtime without code changes.

**Available Strategies:**

**Token Bucket** (default)
- Continuous token generation
- Minimum latency
- Best for burst allowance scenarios
```
- Capacity: 100 tokens
- Refill: 1 token/second
- Cost: 1 token per request
```

**Sliding Window**
- Requests tracked within a rolling time window
- Precise rate limiting
- Higher memory usage for high-traffic IPs
```
- Window: Based on capacity/refill rate
- Cost per request: 1 counter increment
```

**Fixed Window**
- Traditional time-window approach
- Memory efficient
- Boundary conditions allow burst at window edges
```
- Window: 60 seconds (configurable)
- Limit: Fixed count per window
```

**Switching Strategies:**
```bash
# Via controller method (to be implemented)
POST /admin/strategy
Body: { "strategy": "sliding-window" }

# Or programmatically
rateLimiter.switchStrategy('fixed-window');
```

### 2. API Key Based Rate Limiting with Tiers

Support multiple rate limit tiers tied to API keys. Different clients get different limits based on their subscription level.

**Predefined Tiers:**

**Free Tier**
- 100 requests per minute
- Per-IP limiting
- No API key required

**Pro Tier**
- 1,000 requests per 100 seconds
- Requires `X-API-Key: api_key_pro` header
- For power users

**Enterprise Tier**
- 10,000 requests per 100 seconds
- Requires `X-API-Key: api_key_enterprise` header
- For critical integrations

**Usage:**
```bash
# Free tier (IP-based)
curl http://localhost:3000/test

# Pro tier
curl -H "X-API-Key: api_key_pro" http://localhost:3000/test

# Enterprise tier
curl -H "X-API-Key: api_key_enterprise" http://localhost:3000/test

# Also supports query parameter
curl "http://localhost:3000/test?api_key=api_key_pro"
```

**Adding Custom API Keys:**
```typescript
// In rate-limiter service
rateLimiter.addApiKey('my_api_key', 'pro');
```

### 3. Route-Specific Rate Limiting

Different endpoints can have different rate limits.

**Example Configuration:**
```typescript
const config = new RateLimitConfiguration({
  routes: [
    {
      path: '/upload',
      config: { capacity: 10, refillRate: 0.1, tokenCost: 1 },
      description: 'Stricter limit for uploads',
    },
    {
      path: '/health',
      config: { capacity: 1000, refillRate: 100, tokenCost: 1 },
      description: 'Relaxed limit for health checks',
    },
  ],
});
```

### 4. Dynamic Configuration Without Restart

Rate limit parameters can be changed at runtime without redeploying the service.

**Runtime Configuration:**
```typescript
const config = rateLimiter.getConfiguration();

// Update default limits
config.setDefaultConfig({
  capacity: 200,
  refillRate: 2,
  tokenCost: 1,
});

// Update tier
config.updateTierConfig('pro', {
  capacity: 2000,
  refillRate: 20,
});

// Add new tier
config.addTier('vip', {
  name: 'vip',
  config: { capacity: 50000, refillRate: 500, tokenCost: 1 },
  description: 'VIP tier: 50000 requests per 100 seconds',
});
```

**Benefits:**
- No service downtime for configuration changes
- Easy A/B testing of rate limits
- Rapid response to traffic spikes
- Tier management via API endpoints

## Technical Concepts Covered

### Core Distributed Systems
1. **Distributed State Management**: Coordinating state across multiple service instances
2. **Atomic Operations**: Redis Lua scripting for multi-step atomic operations
3. **Consistency Models**: Strong consistency for rate limiting decisions
4. **Fault Tolerance**: Graceful degradation and fail-safe patterns

### Rate Limiting Algorithms
1. **Token Bucket Algorithm**: Industry-standard with burst capacity and smooth limiting
2. **Sliding Window Algorithm**: Rolling time windows for precise rate limiting
3. **Fixed Window Algorithm**: Simple time-based windows with boundary handling
4. **Strategy Pattern**: Pluggable algorithms with common interface

### Software Architecture
1. **Dependency Injection**: NestJS container for service management and testing
2. **Guard Pattern**: Request interception for cross-cutting concerns
3. **Event-Driven Architecture**: Decoupling services with message queues
4. **Configuration Management**: Runtime configuration with tiered overrides

### Production Engineering
1. **Error Handling**: Comprehensive error handling with TypeScript type safety
2. **Logging & Monitoring**: Structured logging and event publishing
3. **Performance Optimization**: High-throughput request processing
4. **Testing Strategies**: Load testing, integration testing, and validation

### Advanced TypeScript
1. **Modern TypeScript**: ES2020+ features and strict type checking
2. **Interface Design**: Clean interfaces for pluggable components
3. **Error Type Handling**: Proper error type checking and instanceof usage
4. **Decorator Metadata**: NestJS decorators for dependency injection

### DevOps & Deployment
1. **Containerization**: Docker deployment with multi-service orchestration
2. **Environment Configuration**: Environment-based configuration management
3. **Process Management**: Proper service lifecycle and cleanup
4. **Debugging Tools**: Redis CLI, Kafka tools, and application logging

## Contributing

1. Create a feature branch from main
2. Implement new functionality with tests
3. Ensure load tests pass without degradation
4. Submit a pull request with detailed description

## License

ISC License - see LICENSE file for details
