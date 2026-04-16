# Cost-Optimized AWS Deployment - Terraform Version
# EC2 + Docker Compose Setup (~$12-18/month)

## Overview

This Terraform configuration creates a cost-efficient AWS deployment for the distributed rate limiter using EC2 + Docker Compose. It provisions:

- EC2 t3.micro instance with Ubuntu
- Security groups for SSH, HTTP, HTTPS
- IAM role for EC2 with minimal permissions
- User data script for automatic Docker installation and deployment

## Architecture

```
Internet → EC2 Instance (t3.micro)
              ↓
        Docker Compose
              ↓
    * API Gateway (NestJS)
    * Redis (rate limiting)
    * Kafka (events)
    * Analytics Service
```

## Cost Estimate

- **EC2 t3.micro**: $8-10/month
- **EBS (20GB)**: $2/month
- **Data Transfer**: $1-5/month
- **Total**: $12-18/month

## Prerequisites

- AWS CLI configured
- Terraform installed
- Git repository with your code
- SSH key pair

## Quick Deploy

```bash
# Clone your repository
git clone <your-repo-url>
cd distributed-rate-limiter

# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Deploy
terraform apply

# Get the public IP
terraform output instance_public_ip
```

## Files Structure

```
terraform-ec2/
├── main.tf           # Main infrastructure
├── variables.tf      # Input variables
├── outputs.tf        # Output values
├── user-data.sh      # EC2 bootstrap script
└── README.md         # This file
```

## Configuration

### Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `region` | AWS region | us-east-1 |
| `instance_type` | EC2 instance type | t3.micro |
| `key_name` | SSH key pair name | your-key-pair |
| `repo_url` | Git repository URL | your-repo-url |
| `domain_name` | Domain for HTTPS (optional) | "" |

### Example Usage

```hcl
module "rate_limiter" {
  source = "./terraform-ec2"

  region       = "us-east-1"
  instance_type = "t3.micro"
  key_name     = "my-key-pair"
  repo_url     = "https://github.com/yourusername/distributed-rate-limiter.git"
  domain_name  = "api.yourdomain.com"  # Optional
}
```

## Security Features

- **Security Groups**: Minimal ports open (22, 80, 443)
- **IAM Role**: Least privilege access for EC2
- **SSH Access**: Key-based authentication only
- **Updates**: Automatic security updates via user data

## Scaling

### Vertical Scaling

```hcl
instance_type = "t3.small"  # Double CPU/memory
```

### Horizontal Scaling (Future)

For horizontal scaling, consider upgrading to the full ECS deployment.

## Monitoring

Access logs via SSH:

```bash
ssh ubuntu@<instance-ip>
docker-compose logs -f
```

## Cleanup

```bash
terraform destroy
```

## Upgrade Path

1. **Current**: EC2 + Docker Compose
2. **Next**: Add ElastiCache Redis
3. **Future**: Full ECS Fargate deployment

## Troubleshooting

### Connection Issues
- Verify security group allows SSH (port 22)
- Check SSH key permissions: `chmod 400 your-key.pem`

### Deployment Failures
- Check user-data logs: `ssh ubuntu@<ip> && cat /var/log/cloud-init-output.log`
- Verify Docker installation: `ssh ubuntu@<ip> && docker --version`

### Application Issues
- Check container status: `ssh ubuntu@<ip> && docker ps`
- View application logs: `ssh ubuntu@<ip> && docker-compose logs api-gateway`