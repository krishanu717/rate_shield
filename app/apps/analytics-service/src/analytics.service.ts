import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'analytics-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

const consumer = kafka.consumer({ groupId: 'analytics-group' });

export class AnalyticsService {
  constructor() {
    this.init();
  }

  async init() {
  try {
    await consumer.connect();

    await consumer.subscribe({
      topic: 'rate-limit-events',
      fromBeginning: false, // usually safer in prod
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          if (!message.value) {
            console.warn('Empty message received');
            return;
          }

          const raw = message.value.toString();
          const event = JSON.parse(raw);

          // IMPORTANT: await async handlers
          await this.handleEvent(event);

        } catch (err) {
          console.error('Message processing failed:', {
            error: err instanceof Error ? err.message : String(err),
            topic,
            partition,
            offset: message.offset,
            value: message.value?.toString(),
          });

          // Optional: send to DLQ here
        }
      },
    });

    console.log('Analytics service connected to Kafka');

  } catch (error) {
    console.error('Kafka init failed:', error instanceof Error ? error.message : String(error));
    throw error; // let upstream restart logic handle it
  }
}

  handleEvent(event: any) {
    // Structured JSON logging for production
    console.log(JSON.stringify({
      service: 'analytics-service',
      event: 'rate_limit_event_processed',
      timestamp: new Date().toISOString(),
      data: event,
    }));

    // Here you could store to database, send to monitoring, etc.
  }
}
