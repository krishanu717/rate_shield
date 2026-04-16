variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "distributed-rate-limiter"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "domain_name" {
  description = "Domain name for CloudFront distribution"
  type        = string
  default     = ""
}

variable "api_gateway_cpu" {
  description = "CPU units for API Gateway task"
  type        = number
  default     = 256
}

variable "api_gateway_memory" {
  description = "Memory for API Gateway task"
  type        = number
  default     = 512
}

variable "analytics_cpu" {
  description = "CPU units for Analytics service task"
  type        = number
  default     = 256
}

variable "analytics_memory" {
  description = "Memory for Analytics service task"
  type        = number
  default     = 512
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "kafka_instance_type" {
  description = "MSK Kafka instance type"
  type        = string
  default     = "kafka.t3.small"
}

variable "kafka_broker_count" {
  description = "Number of Kafka brokers"
  type        = number
  default     = 2
}