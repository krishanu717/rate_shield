import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'rate-limiter',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

export const producer = kafka.producer();

export const initKafka = async () => {
  try {
    await producer.connect();
    console.log('Kafka producer connected');
  } catch (error) {
    console.error('Kafka connection failed:', error instanceof Error ? error.message : String(error));
  }
};

export const sendRateLimitEvent = async (event: any) => {
  try {
    await producer.send({
      topic: 'rate-limit-events',
      messages: [{ value: JSON.stringify(event) }],
    });
  } catch (error) {
    console.error('Failed to send event:', error instanceof Error ? error.message : String(error));
  }
};
