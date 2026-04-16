#!/bin/bash

# Deploy ECS Services
# Usage: ./deploy-ecs.sh [cluster-name] [region]

set -e

# Configuration
CLUSTER_NAME=${1:-"distributed-rate-limiter-prod-cluster"}
REGION=${2:-"us-east-1"}

echo "🚀 Deploying ECS services"
echo "Cluster: $CLUSTER_NAME"
echo "Region: $REGION"

# Update API Gateway service
echo "📦 Updating API Gateway service..."
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service distributed-rate-limiter-prod-api-gateway \
  --force-new-deployment \
  --region $REGION

# Update Analytics service
echo "📦 Updating Analytics service..."
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service distributed-rate-limiter-prod-analytics \
  --force-new-deployment \
  --region $REGION

# Wait for deployments to complete
echo "⏳ Waiting for deployments to complete..."

# Check API Gateway deployment
echo "🔍 Checking API Gateway deployment..."
aws ecs wait services-stable \
  --cluster $CLUSTER_NAME \
  --services distributed-rate-limiter-prod-api-gateway \
  --region $REGION

# Check Analytics deployment
echo "🔍 Checking Analytics deployment..."
aws ecs wait services-stable \
  --cluster $CLUSTER_NAME \
  --services distributed-rate-limiter-prod-analytics \
  --region $REGION

echo "✅ All services deployed successfully!"

# Get service status
echo ""
echo "📊 Service Status:"
aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services distributed-rate-limiter-prod-api-gateway distributed-rate-limiter-prod-analytics \
  --region $REGION \
  --query 'services[].[serviceName,runningCount,desiredCount,status]' \
  --output table