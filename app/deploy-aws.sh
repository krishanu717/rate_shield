#!/bin/bash

# Complete AWS Deployment Script
# This script deploys the entire distributed rate limiter to AWS

set -e

# Configuration
PROJECT_NAME="distributed-rate-limiter"
ENVIRONMENT="prod"
REGION="us-east-1"
DOMAIN_NAME=""  # Set your domain name here, e.g., "api.yourdomain.com"

echo "🚀 Starting complete AWS deployment for $PROJECT_NAME"
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first."
    exit 1
fi

if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform not found. Please install it first."
    exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run 'aws configure'."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Step 1: Initialize Terraform
echo ""
echo "🏗️  Step 1: Initializing Terraform..."
cd terraform

# Create S3 bucket for Terraform state (if it doesn't exist)
STATE_BUCKET="${PROJECT_NAME}-terraform-state"
if ! aws s3 ls "s3://${STATE_BUCKET}" &> /dev/null; then
    echo "📦 Creating Terraform state bucket..."
    aws s3 mb "s3://${STATE_BUCKET}" --region $REGION
    aws s3api put-bucket-versioning \
        --bucket $STATE_BUCKET \
        --versioning-configuration Status=Enabled
fi

# Initialize Terraform
terraform init

# Create terraform.tfvars file
cat > terraform.tfvars << EOF
aws_region     = "$REGION"
project_name   = "$PROJECT_NAME"
environment    = "$ENVIRONMENT"
domain_name    = "$DOMAIN_NAME"
EOF

echo "✅ Terraform initialized"

# Step 2: Plan infrastructure
echo ""
echo "📋 Step 2: Planning infrastructure changes..."
terraform plan -out=tfplan

# Ask for confirmation
echo ""
read -p "🤔 Do you want to apply these changes? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled by user"
    exit 1
fi

# Step 3: Apply infrastructure
echo ""
echo "🏗️  Step 3: Applying infrastructure..."
terraform apply tfplan

# Get outputs
API_URL=$(terraform output -raw api_gateway_url)
ALB_DNS=$(terraform output -raw alb_dns_name)
CLOUDFRONT_URL=$(terraform output -raw cloudfront_domain_name 2>/dev/null || echo "")

echo "✅ Infrastructure deployed successfully!"
echo "ALB DNS: $ALB_DNS"
if [ -n "$CLOUDFRONT_URL" ]; then
    echo "CloudFront URL: $CLOUDFRONT_URL"
fi

cd ..

# Step 4: Build and push Docker images
echo ""
echo "🏗️  Step 4: Building and pushing Docker images..."
chmod +x scripts/build-and-push.sh
./scripts/build-and-push.sh $REGION $PROJECT_NAME $ENVIRONMENT

# Step 5: Deploy ECS services
echo ""
echo "🚀 Step 5: Deploying ECS services..."
chmod +x scripts/deploy-ecs.sh
CLUSTER_NAME="${PROJECT_NAME}-${ENVIRONMENT}-cluster"
./scripts/deploy-ecs.sh $CLUSTER_NAME $REGION

# Step 6: Test deployment
echo ""
echo "🧪 Step 6: Testing deployment..."

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 60

# Test health endpoint
if curl -f -s "$API_URL/health" > /dev/null; then
    echo "✅ Health check passed: $API_URL/health"
else
    echo "❌ Health check failed"
    exit 1
fi

# Test rate limiting
if curl -f -s "$API_URL/test" > /dev/null; then
    echo "✅ API test passed: $API_URL/test"
else
    echo "❌ API test failed"
    exit 1
fi

# Step 7: Setup monitoring (optional)
echo ""
echo "📊 Step 7: Setting up monitoring..."

# Deploy CloudWatch dashboard
if [ -f "monitoring/dashboard.yaml" ]; then
    echo "📈 Creating CloudWatch dashboard..."
    aws cloudformation deploy \
        --template-file monitoring/dashboard.yaml \
        --stack-name "${PROJECT_NAME}-${ENVIRONMENT}-dashboard" \
        --parameter-overrides \
            EcsCluster="${CLUSTER_NAME}" \
            ApiGatewayService="${PROJECT_NAME}-${ENVIRONMENT}-api-gateway" \
            AnalyticsService="${PROJECT_NAME}-${ENVIRONMENT}-analytics" \
            LoadBalancer="${PROJECT_NAME}-${ENVIRONMENT}-alb" \
            RedisCluster="${PROJECT_NAME}-${ENVIRONMENT}-redis" \
            KafkaCluster="${PROJECT_NAME}-${ENVIRONMENT}-kafka" \
        --region $REGION \
        --no-fail-on-empty-changeset
fi

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo ""
echo "🌐 Your API is now live at:"
echo "   $API_URL"
echo ""
echo "📊 Monitoring Dashboard:"
echo "   https://$REGION.console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:name=${PROJECT_NAME}-${ENVIRONMENT}-dashboard"
echo ""
echo "📋 Next steps:"
echo "1. Point your domain DNS to CloudFront (if using custom domain)"
echo "2. Configure API keys and rate limits"
echo "3. Set up alerts in CloudWatch"
echo "4. Monitor logs and metrics"
echo ""
echo "🔒 Security Notes:"
echo "- All services run in private subnets"
echo "- Traffic flows through ALB with SSL/TLS"
echo "- IAM roles follow least privilege principle"
echo "- VPC isolation prevents unauthorized access"
echo ""
echo "💰 Cost Estimate: ~$90-245/month (see AWS-README.md for details)"