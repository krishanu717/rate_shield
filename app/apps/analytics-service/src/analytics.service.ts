import { Kafka } from 'kafkajs';
import { Pool } from 'pg';

const kafka = new Kafka({
  clientId: 'analytics-service',
  brokers: (process.env.KAFKA_BROKERS || 'redpanda:9092').split(','),
});

const consumer = kafka.consumer({ groupId: 'analytics-group' });

const pool = new Pool({
  host: 'postgres',
  user: 'postgres',
  password: 'postgres',
  database: 'analytics',
  port: 5432,
});

export class AnalyticsService {
  constructor() {
    this.init();
  }

  async initDB() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        identifier TEXT,
        allowed BOOLEAN,
        strategy TEXT,
        tier TEXT,
        timestamp BIGINT
      );
    `);
    console.log('DB initialized');
  }

  async init() {
    await this.initDB();

    await consumer.connect();

    await consumer.subscribe({
      topic: 'rate-limit-events',
      fromBeginning: false,
    });

    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;

        const event = JSON.parse(message.value.toString());
        await this.handleEvent(event);
      },
    });

    console.log('Analytics service connected');
  }

  async handleEvent(event: any) {
    try {
      await pool.query(
        `INSERT INTO events(identifier, allowed, strategy, tier, timestamp)
         VALUES($1, $2, $3, $4, $5)`,
        [
          event.identifier,
          event.allowed,
          event.strategy,
          event.tier,
          event.timestamp,
        ]
      );

      console.log('Inserted:', event.identifier);
    } catch (err) {
      console.error('DB insert failed:', err);
    }
  }
}