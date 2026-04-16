variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "key_name" {
  description = "SSH key pair name"
  type        = string
}

variable "repo_url" {
  description = "Git repository URL for the application"
  type        = string
}

variable "domain_name" {
  description = "Domain name for HTTPS setup (optional)"
  type        = string
  default     = ""
}