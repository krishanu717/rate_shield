---

# Cost-Optimized AWS Deployment Guide  
Distributed Rate Limiter (NestJS + Redis + Kafka)

---

## Overview

This guide describes how to deploy a distributed rate limiter system on AWS using a **cost-efficient architecture (~$10–30/month)** while maintaining production-relevant design.

This setup is intended for:
- System validation in a real environment
- Portfolio and interview demonstration
- Incremental scaling to full cloud-native architecture

---

## Architecture

```

Internet
↓
Route53 (optional)
↓
EC2 Instance (Ubuntu)
↓
Nginx (Reverse Proxy + HTTPS)
↓
Docker Compose
↓

* API Gateway (NestJS)
* Redis (rate limit state)
* Kafka (event streaming)
* Analytics Service

```

---

## Cost Breakdown

| Component        | Estimated Cost |
|-----------------|---------------|
| EC2 (t3.micro)  | $8–10/month   |
| EBS Storage     | $2/month      |
| Data Transfer   | $1–5/month    |
| **Total**       | **$12–18/month** |

Optional upgrade:

| Service              | Cost |
|----------------------|------|
| ElastiCache Redis    | $15  |
| **Total (upgraded)** | $25–30/month |

---

## Prerequisites

- AWS account
- EC2 key pair
- Security group configured:
  - Port 22 (SSH)
  - Port 80 (HTTP)
  - Port 443 (HTTPS)

---

## Step 1 — Launch EC2

Recommended configuration:

- Instance type: `t3.micro` (upgrade to `t3.small` if needed)
- OS: Ubuntu 22.04
- Storage: 20 GB

---

## Step 2 — Connect to EC2

```bash
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

---

## Step 3 — Install Docker and Compose

```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker

sudo usermod -aG docker ubuntu
newgrp docker
```

Verify:

```bash
docker --version
docker-compose --version
```

---

## Step 4 — Deploy Application

```bash
git clone <your-repo-url>
cd distributed-rate-limiter
docker-compose up -d --build
```

---

## Step 5 — Validate Deployment

### Check running containers

```bash
docker ps
```

### Test API

```bash
curl http://<EC2_PUBLIC_IP>:3000/test
```

---

## Step 6 — Configure Nginx

Expose application via reverse proxy:

```bash
curl http://<EC2_PUBLIC_IP>/test
```

Ensure Nginx routes traffic to:

```
api-gateway:3000
```

---

## Step 7 — Domain Setup (Optional)

Create DNS record:

```
Type: A
Name: api
Value: <EC2_PUBLIC_IP>
```

Verify:

```bash
nslookup api.yourdomain.com
```

---

## Step 8 — Enable HTTPS

Install Certbot:

```bash
sudo apt install -y certbot
```

Generate certificate:

```bash
sudo certbot certonly --standalone -d api.yourdomain.com
```

Mount certificates into Nginx container:

```
/etc/letsencrypt
```

Restart Nginx:

```bash
docker-compose restart nginx
```

---

## Step 9 — Test HTTPS

```bash
curl https://api.yourdomain.com/health
```

---

## Step 10 — Validate Rate Limiting

```bash
for i in {1..120}; do curl -s https://api.yourdomain.com/test; echo; done
```

---

## Observability

### Logs

```bash
docker-compose logs -f api-gateway
docker-compose logs -f analytics-service
docker-compose logs -f nginx
```

### Redis Inspection

```bash
docker exec -it <redis_container> redis-cli KEYS "*"
```

### Kafka Events

```bash
docker-compose logs -f analytics-service
```

---

## Scaling Strategy

### Vertical Scaling

Upgrade EC2:

```
t3.micro → t3.small → t3.medium
```

---

### Horizontal Scaling (Basic)

Run multiple API instances:

```yaml
deploy:
  replicas: 2
```

Nginx will distribute traffic.

---

## Optional Upgrade: Move Redis to ElastiCache

### Benefits

* Improved reliability
* Reduced data loss risk
* Managed service

### Configuration

Update environment variable:

```env
REDIS_URL=redis://<elasticache-endpoint>:6379
```

---

## Known Limitations

* Single EC2 instance (single point of failure)
* Kafka is not replicated
* Redis persistence limited to container volume
* No autoscaling
* No multi-region support

---

## Upgrade Path

```
Stage 1 → EC2 + Docker Compose
Stage 2 → Add ElastiCache (Redis)
Stage 3 → Add Load Balancer (ALB)
Stage 4 → Move to ECS + MSK
```

---

## Summary

This deployment provides:

* Distributed rate limiting system
* Event-driven architecture using Kafka
* Cost-efficient AWS deployment
* Production-like environment for testing and demonstration

It serves as a strong foundation for scaling into a fully managed cloud-native architecture.

---

If you want, I can next generate:

- Terraform version of this setup  
- GitHub Actions CI/CD pipeline  
- Resume-ready system design explanation

## 🔄 CI/CD Pipeline

GitHub Actions workflow included for:
- Automated testing
- Docker image building
- ECS deployment
- Infrastructure updates

---

**Ready to deploy?** This setup gives you enterprise-grade distributed rate limiting with full AWS managed services! 🎯