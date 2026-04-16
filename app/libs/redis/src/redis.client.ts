import { createClient } from 'redis';

export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

let isConnected = false;

redisClient.connect().then(() => {
  console.log('Redis connected');
  isConnected = true;
}).catch((err) => {
  console.error('Redis connection failed:', err instanceof Error ? err.message : String(err));
});

export const isRedisReady = () => isConnected;