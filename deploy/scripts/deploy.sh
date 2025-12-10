#!/bin/bash
# MCP Agent Studio - Deployment Script
# Usage: ./deploy.sh [version]

set -e

DEPLOY_DIR="/opt/mcp-agent-studio"
VERSION="${1:-latest}"

echo "=== MCP Agent Studio Deployment ==="
echo "Version: $VERSION"
echo ""

cd "$DEPLOY_DIR"

# Load environment
if [ ! -f "deploy/.env" ]; then
  echo "Error: deploy/.env not found!"
  echo "Please copy deploy/.env.example to deploy/.env and configure it."
  exit 1
fi

source deploy/.env

# Export version for docker-compose
export VERSION

# Pull latest code (if not using CI/CD)
if [ -d ".git" ]; then
  echo "Pulling latest code..."
  git pull origin main
fi

# Pull latest images
echo "Pulling Docker images..."
docker compose -f deploy/docker-compose.prod.yml pull

# Run database migrations
echo "Running database migrations..."
docker compose -f deploy/docker-compose.prod.yml run --rm server npx prisma migrate deploy

# Start/restart services
echo "Starting services..."
docker compose -f deploy/docker-compose.prod.yml up -d --remove-orphans

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
sleep 10

# Health check
echo "Running health checks..."
if curl -sf "https://api.$DOMAIN/health" > /dev/null; then
  echo "API: OK"
else
  echo "API: FAILED"
  docker compose -f deploy/docker-compose.prod.yml logs --tail=50 server
  exit 1
fi

if curl -sf "https://$DOMAIN" > /dev/null; then
  echo "Dashboard: OK"
else
  echo "Dashboard: FAILED"
  docker compose -f deploy/docker-compose.prod.yml logs --tail=50 dashboard
  exit 1
fi

# Cleanup
echo "Cleaning up old images..."
docker image prune -af --filter "until=24h"

echo ""
echo "=== Deployment Complete ==="
echo "Dashboard: https://$DOMAIN"
echo "API: https://api.$DOMAIN"
echo "API Docs: https://api.$DOMAIN/docs"
