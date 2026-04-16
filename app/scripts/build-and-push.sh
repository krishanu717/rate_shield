#!/bin/bash

# Build and Push Docker Images to ECR
# Usage: ./build-and-push.sh [region] [project-name] [environment]

set -e

# Configuration
REGION=${1:-"us-east-1"}
PROJECT_NAME=${2:-"distributed-rate-limiter"}
ENVIRONMENT=${3:-"prod"}
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Repository names
API_GATEWAY_REPO="${PROJECT_NAME}-${ENVIRONMENT}-api-gateway"
ANALYTICS_REPO="${PROJECT_NAME}-${ENVIRONMENT}-analytics"

echo "🚀 Building and pushing Docker images to ECR"
echo "Region: $REGION"
echo "Account: $ACCOUNT_ID"
echo "Environment: $ENVIRONMENT"

# Authenticate Docker with ECR
echo "🔐 Authenticating with ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Build API Gateway image
echo "🏗️  Building API Gateway image..."
docker build -t $API_GATEWAY_REPO:latest -f Dockerfile \
  --target api-gateway \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  .

# Tag and push API Gateway image
echo "📤 Pushing API Gateway image..."
docker tag $API_GATEWAY_REPO:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$API_GATEWAY_REPO:latest
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$API_GATEWAY_REPO:latest

# Build Analytics image
echo "🏗️  Building Analytics Service image..."
docker build -t $ANALYTICS_REPO:latest -f Dockerfile \
  --target analytics \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  .

# Tag and push Analytics image
echo "📤 Pushing Analytics Service image..."
docker tag $ANALYTICS_REPO:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ANALYTICS_REPO:latest
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ANALYTICS_REPO:latest

echo "✅ All images built and pushed successfully!"
echo ""
echo "API Gateway: $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$API_GATEWAY_REPO:latest"
echo "Analytics:   $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ANALYTICS_REPO:latest"