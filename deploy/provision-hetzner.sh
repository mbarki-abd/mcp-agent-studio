#!/bin/bash
# Hetzner Server Provisioning Script for MCP Agent Studio
# This script sets up a fresh Ubuntu server with Docker and the application

set -e

echo "=== MCP Agent Studio - Server Provisioning ==="
echo "Started at: $(date)"

# Update system
echo ">>> Updating system packages..."
apt update && apt upgrade -y

# Install required packages
echo ">>> Installing required packages..."
apt install -y curl git ca-certificates gnupg

# Install Docker
echo ">>> Installing Docker..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Verify Docker installation
docker --version
docker compose version

# Create application directory
echo ">>> Creating application directory..."
mkdir -p /opt/mcp-agent-studio
cd /opt/mcp-agent-studio

# Clone repository
echo ">>> Cloning repository..."
if [ -d ".git" ]; then
    git pull origin master
else
    git clone https://github.com/mbarki-abd/mcp-agent-studio.git .
fi

# Create .env file for production
echo ">>> Creating production environment file..."
cat > deploy/.env << 'ENVEOF'
# Production Environment Configuration
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:McpPostgres2024!Secure@postgres:5432/mcp_studio
POSTGRES_PASSWORD=McpPostgres2024!Secure

# Redis
REDIS_URL=redis://:R3d1sMcp2024!Secure@redis:6379
REDIS_PASSWORD=R3d1sMcp2024!Secure

# Security
JWT_SECRET=McpJwtSecret2024SuperSecureKeyMin32Characters!
JWT_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d
ENCRYPTION_KEY=McpEncrypt2024SecureKey32Chars!

# Domain
DOMAIN=mcp-studio.ilinqsoft.com
ACME_EMAIL=mbark@ilinqsoft.com
ENVEOF

# Create Traefik directories
mkdir -p deploy/traefik/acme
touch deploy/traefik/acme/acme.json
chmod 600 deploy/traefik/acme/acme.json

# Login to GitHub Container Registry (public images)
echo ">>> Pulling Docker images..."
docker compose -f deploy/docker-compose.prod.yml pull || true

# Start the stack
echo ">>> Starting the application stack..."
docker compose -f deploy/docker-compose.prod.yml up -d

# Wait for services to be ready
echo ">>> Waiting for services to start..."
sleep 30

# Run database migrations
echo ">>> Running database migrations..."
docker compose -f deploy/docker-compose.prod.yml exec -T server npx prisma migrate deploy || \
docker compose -f deploy/docker-compose.prod.yml run --rm server npx prisma migrate deploy || \
echo "Migration may need manual attention"

# Seed initial data
echo ">>> Seeding initial data..."
docker compose -f deploy/docker-compose.prod.yml exec -T server npx prisma db seed || \
echo "Seeding may need manual attention"

# Check status
echo ">>> Checking service status..."
docker compose -f deploy/docker-compose.prod.yml ps

# Configure firewall
echo ">>> Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Show completion message
echo ""
echo "=== Provisioning Complete ==="
echo "Server IP: $(curl -s ifconfig.me)"
echo "Dashboard URL: https://mcp-studio.ilinqsoft.com"
echo "API URL: https://api.mcp-studio.ilinqsoft.com"
echo ""
echo "Default credentials:"
echo "  Email: admin@example.com"
echo "  Password: Admin123!"
echo ""
echo "Completed at: $(date)"
