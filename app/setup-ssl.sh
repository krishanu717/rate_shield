#!/bin/bash

# SSL Certificate Setup Script for Rate Limiter
# This script sets up Let's Encrypt SSL certificates for your domain

set -e

#!/bin/bash

# SSL Certificate Setup Script for Rate Limiter
# This script sets up Let's Encrypt SSL certificates for your subdomain

set -e

# Configuration - Update these with your actual subdomain
SUBDOMAIN="api.your-domain.com"
EMAIL="admin@your-domain.com"

echo " Setting up SSL certificates for $SUBDOMAIN"

# Install certbot if not present
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot..."
    # On Ubuntu/Debian
    sudo apt update
    sudo apt install -y certbot

    # On macOS with Homebrew
    # brew install certbot
fi

# Create SSL directory if it doesn't exist
mkdir -p ssl

# Stop nginx temporarily for certificate generation
echo "⏹️  Stopping nginx for certificate generation..."
docker-compose stop nginx

# Generate certificate for subdomain only
echo "🔐 Generating SSL certificate..."
sudo certbot certonly --standalone \
    --domain $SUBDOMAIN \
    --email $EMAIL \
    --agree-tos \
    --non-interactive

# Copy certificates to project directory
echo "📋 Copying certificates..."
sudo cp /etc/letsencrypt/live/$SUBDOMAIN/fullchain.pem ./ssl/fullchain.pem
sudo cp /etc/letsencrypt/live/$SUBDOMAIN/privkey.pem ./ssl/private/privkey.pem

# Set proper permissions
sudo chmod 644 ./ssl/fullchain.pem
sudo chmod 600 ./ssl/private/privkey.pem

# Update nginx config to use real certificates and subdomain
echo "⚙️  Updating nginx configuration..."
sed -i "s/your-domain.com/$SUBDOMAIN/g" nginx.conf
sed -i 's|ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;|ssl_certificate /etc/ssl/certs/fullchain.pem;|g' nginx.conf
sed -i 's|ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;|ssl_certificate_key /etc/ssl/private/privkey.pem;|g' nginx.conf

# Restart services
echo "🔄 Restarting services..."
docker-compose up -d

# Set up auto-renewal
echo "⏰ Setting up certificate auto-renewal..."
(crontab -l 2>/dev/null ; echo "0 12 * * * /usr/bin/certbot renew --quiet && docker-compose restart nginx") | crontab -

echo "✅ SSL setup complete!"
echo "🌐 Your API is now available at: https://$SUBDOMAIN"
echo "🔒 SSL certificates will auto-renew monthly"
echo ""
echo "📝 Next steps:"
echo "1. Point your subdomain DNS to your server's IP"
echo "2. Update the SUBDOMAIN and EMAIL variables in this script for your actual domain"
echo "3. Run this script on your server (not locally)"

# Restart services
echo "Restarting services..."
docker-compose up -d

# Set up auto-renewal
echo "⏰ Setting up certificate auto-renewal..."
(crontab -l ; echo "0 12 * * * /usr/bin/certbot renew --quiet && docker-compose restart nginx") | crontab -

echo " SSL setup complete!"
echo "Your API is now available at: https://$DOMAIN"
echo "SSL certificates will auto-renew monthly"