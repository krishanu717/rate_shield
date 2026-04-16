output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "ecs_cluster_name" {
  description = "ECS Cluster Name"
  value       = aws_ecs_cluster.main.name
}

output "api_gateway_service_name" {
  description = "API Gateway ECS Service Name"
  value       = aws_ecs_service.api_gateway.name
}

output "analytics_service_name" {
  description = "Analytics ECS Service Name"
  value       = aws_ecs_service.analytics.name
}

output "redis_endpoint" {
  description = "Redis Cluster Endpoint"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "redis_port" {
  description = "Redis Port"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].port
}

output "kafka_bootstrap_brokers" {
  description = "Kafka Bootstrap Brokers"
  value       = aws_msk_cluster.kafka.bootstrap_brokers_tls
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS Name"
  value       = aws_lb.api_gateway.dns_name
}

output "cloudfront_domain_name" {
  description = "CloudFront Distribution Domain Name"
  value       = var.domain_name != "" ? aws_cloudfront_distribution.api_gateway[0].domain_name : null
}

output "api_gateway_url" {
  description = "API Gateway URL"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "http://${aws_lb.api_gateway.dns_name}"
}

output "cloudwatch_log_groups" {
  description = "CloudWatch Log Groups"
  value = {
    api_gateway = aws_cloudwatch_log_group.api_gateway.name
    analytics   = aws_cloudwatch_log_group.analytics.name
    kafka       = aws_cloudwatch_log_group.kafka.name
  }
}