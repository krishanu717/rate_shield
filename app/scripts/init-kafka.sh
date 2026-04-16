#!/bin/bash

# Wait for Kafka to be ready
echo "Waiting for Kafka to be ready..."
sleep 10

# Create the rate-limit-events topic
echo "Creating rate-limit-events topic..."
docker exec $(docker-compose ps -q kafka) kafka-topics \
  --create \
  --topic rate-limit-events \
  --bootstrap-server kafka:9092 \
  --partitions 1 \
  --replication-factor 1 \
  --if-not-exists

echo "Topic created successfully!"