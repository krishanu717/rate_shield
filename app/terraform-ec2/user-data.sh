#!/bin/bash
set -e

# Update system
apt update
apt upgrade -y

# Install Docker
apt install -y docker.io docker-compose
systemctl start docker
systemctl enable docker

# Add ubuntu user to docker group
usermod -aG docker ubuntu

# Install Git
apt install -y git

# Clone repository
cd /home/ubuntu
git clone ${repo_url} app
cd app

# Create .env file if needed
cat > .env << EOF
REDIS_URL=redis://redis:6379
KAFKA_BROKER=kafka:9092
EOF

# Start application
docker-compose up -d --build

# Install Certbot if domain is provided
if [ -n "${domain_name}" ]; then
  apt install -y certbot

  # Create Nginx config for SSL challenge
  mkdir -p /etc/nginx/sites-available
  cat > /etc/nginx/sites-available/rate-limiter << EOF
server {
    listen 80;
    server_name ${domain_name};

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

  ln -s /etc/nginx/sites-available/rate-limiter /etc/nginx/sites-enabled/
  nginx -t && systemctl reload nginx

  # Get SSL certificate
  certbot --nginx -d ${domain_name} --non-interactive --agree-tos --email admin@${domain_name}

  # Restart services
  docker-compose restart
fi

# Setup log rotation
cat > /etc/logrotate.d/rate-limiter << EOF
/home/ubuntu/app/docker-compose logs --no-color | gzip -c > /var/log/rate-limiter.log.gz
EOF

# Create health check script
cat > /usr/local/bin/health-check.sh << 'EOF'
#!/bin/bash
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "healthy"
    exit 0
else
    echo "unhealthy"
    exit 1
fi
EOF
chmod +x /usr/local/bin/health-check.sh

# Setup cron for health monitoring
echo "* * * * * root /usr/local/bin/health-check.sh >> /var/log/health-check.log 2>&1" > /etc/cron.d/health-check

echo "Setup complete!"