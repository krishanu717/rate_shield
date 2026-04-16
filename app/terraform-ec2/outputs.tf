output "instance_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_instance.rate_limiter.public_ip
}

output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.rate_limiter.id
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i <your-key.pem> ubuntu@${aws_instance.rate_limiter.public_ip}"
}

output "api_url" {
  description = "API endpoint URL"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "http://${aws_instance.rate_limiter.public_ip}"
}