#!/bin/bash

# Domain Setup Test Script
# Run this locally to verify your configuration before deploying

echo "🧪 Testing Domain + HTTPS Configuration"
echo "========================================"

# Test 1: Check nginx configuration file exists
echo "1️⃣  Checking Nginx configuration file..."
if [ -f "nginx.conf" ]; then
    echo "✅ nginx.conf exists"
else
    echo "❌ nginx.conf missing"
    exit 1
fi

# Test 2: Check SSL directory
echo "2️⃣  Checking SSL directory..."
if [ -d "ssl" ]; then
    echo "✅ SSL directory exists"
else
    echo "❌ SSL directory missing - run: mkdir ssl"
    exit 1
fi

# Test 3: Check docker-compose
echo "3️⃣  Testing Docker Compose configuration..."
if docker-compose config >/dev/null 2>&1; then
    echo "✅ Docker Compose config is valid"
else
    echo "❌ Docker Compose config has errors"
    exit 1
fi

# Test 4: Check required files
echo "4️⃣  Checking required files..."
files=("nginx.conf" "setup-ssl.sh" "docker-compose.yml" "DOMAIN-README.md")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
        exit 1
    fi
done

# Test 5: Check script permissions
echo "5️⃣  Checking script permissions..."
if [ -x "setup-ssl.sh" ]; then
    echo "✅ setup-ssl.sh is executable"
else
    echo "❌ setup-ssl.sh not executable - run: chmod +x setup-ssl.sh"
    exit 1
fi

echo ""
echo "🎉 All pre-deployment checks passed!"
echo ""
echo "📋 Next steps:"
echo "1. Update SUBDOMAIN in setup-ssl.sh with your actual subdomain"
echo "2. Update EMAIL in setup-ssl.sh with your actual email"
echo "3. Upload project to your server"
echo "4. Configure DNS (A record: api.yourdomain.com → server IP)"
echo "5. Run: sudo ./setup-ssl.sh"
echo "6. Start services: docker-compose up -d"
echo ""
echo "📖 See DOMAIN-README.md for detailed instructions"