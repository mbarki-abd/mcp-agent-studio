#!/bin/bash
# MCP Agent Studio - Production Initialization Script
# This script helps initialize a fresh production deployment

set -e

DEPLOY_DIR="/opt/mcp-agent-studio"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

header() {
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  MCP Agent Studio - Production Setup${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
}

# Check if running as deploy user
check_user() {
    if [ "$(whoami)" != "deploy" ]; then
        log_error "This script must be run as the 'deploy' user"
        log_info "Run: su - deploy"
        exit 1
    fi
}

# Check if Docker is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please run setup-server.sh first."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Cannot connect to Docker. Is the deploy user in the docker group?"
        exit 1
    fi

    log_success "Docker is available"
}

# Generate secrets
generate_secrets() {
    log_info "Generating secrets..."

    JWT_SECRET=$(openssl rand -base64 32)
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')
    REDIS_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')
    GRAFANA_PASSWORD=$(openssl rand -base64 16 | tr -d '/+=')

    log_success "Secrets generated"
}

# Create .env file
create_env_file() {
    log_info "Creating environment file..."

    if [ -f "$DEPLOY_DIR/deploy/.env" ]; then
        log_warn "Environment file already exists"
        read -p "Overwrite? (y/N): " overwrite
        if [ "$overwrite" != "y" ] && [ "$overwrite" != "Y" ]; then
            log_info "Keeping existing .env file"
            return
        fi
        cp "$DEPLOY_DIR/deploy/.env" "$DEPLOY_DIR/deploy/.env.backup"
        log_info "Backup created: .env.backup"
    fi

    read -p "Enter your domain (e.g., mcp-studio.example.com): " DOMAIN

    if [ -z "$DOMAIN" ]; then
        log_error "Domain is required"
        exit 1
    fi

    read -p "Enter GitHub repository (e.g., username/repo): " GITHUB_REPO
    GITHUB_REPO=${GITHUB_REPO:-mbark/mcp-agent-studio}

    cat > "$DEPLOY_DIR/deploy/.env" << EOF
# MCP Agent Studio - Production Environment
# Generated: $(date)

# Domain
DOMAIN=$DOMAIN

# PostgreSQL
POSTGRES_USER=mcp
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=mcp_agent_studio

# Redis
REDIS_PASSWORD=$REDIS_PASSWORD

# JWT
JWT_SECRET=$JWT_SECRET

# Encryption
ENCRYPTION_KEY=$ENCRYPTION_KEY

# Traefik Auth (run: htpasswd -nb admin <password>)
# TRAEFIK_AUTH=admin:\$apr1\$...

# GitHub Container Registry
GITHUB_REPOSITORY=$GITHUB_REPO
VERSION=latest

# Grafana (monitoring)
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=$GRAFANA_PASSWORD
EOF

    chmod 600 "$DEPLOY_DIR/deploy/.env"
    log_success "Environment file created: $DEPLOY_DIR/deploy/.env"

    echo ""
    echo -e "${YELLOW}=== IMPORTANT ===${NC}"
    echo "Save these credentials securely:"
    echo ""
    echo "PostgreSQL Password: $POSTGRES_PASSWORD"
    echo "Redis Password: $REDIS_PASSWORD"
    echo "Grafana Password: $GRAFANA_PASSWORD"
    echo ""
    echo "JWT Secret: $JWT_SECRET"
    echo "Encryption Key: $ENCRYPTION_KEY"
    echo ""
    echo -e "${YELLOW}=================${NC}"
    echo ""
}

# Create Docker network
create_network() {
    if docker network inspect mcp-network &> /dev/null; then
        log_info "Docker network 'mcp-network' already exists"
    else
        docker network create mcp-network
        log_success "Docker network 'mcp-network' created"
    fi
}

# Setup Traefik
setup_traefik() {
    log_info "Setting up Traefik..."

    mkdir -p "$DEPLOY_DIR/deploy/traefik"

    if [ ! -f "$DEPLOY_DIR/deploy/traefik/acme.json" ]; then
        touch "$DEPLOY_DIR/deploy/traefik/acme.json"
        chmod 600 "$DEPLOY_DIR/deploy/traefik/acme.json"
        log_success "Created acme.json for SSL certificates"
    fi
}

# Pull images
pull_images() {
    log_info "Pulling Docker images..."

    source "$DEPLOY_DIR/deploy/.env"

    cd "$DEPLOY_DIR"
    docker compose -f deploy/docker-compose.prod.yml pull

    log_success "Docker images pulled"
}

# Start services
start_services() {
    log_info "Starting services..."

    source "$DEPLOY_DIR/deploy/.env"

    cd "$DEPLOY_DIR"
    docker compose -f deploy/docker-compose.prod.yml up -d

    log_success "Services started"
}

# Run migrations
run_migrations() {
    log_info "Waiting for PostgreSQL to be ready..."
    sleep 10

    log_info "Running database migrations..."

    cd "$DEPLOY_DIR"
    docker compose -f deploy/docker-compose.prod.yml run --rm server npx prisma migrate deploy

    log_success "Migrations completed"
}

# Health check
health_check() {
    log_info "Running health checks..."

    source "$DEPLOY_DIR/deploy/.env"

    echo "Waiting for services to be fully ready..."
    sleep 15

    # API Health Check
    if curl -sf "http://localhost:3000/health" > /dev/null 2>&1; then
        log_success "API: OK (internal)"
    else
        log_warn "API: Not responding on internal port"
    fi

    # Check if Traefik is routing correctly
    if curl -sf "https://api.$DOMAIN/health" > /dev/null 2>&1; then
        log_success "API: OK (external with SSL)"
    else
        log_warn "API: External access may not be ready yet (DNS/SSL)"
    fi

    # Dashboard Check
    if curl -sf "http://localhost:80" > /dev/null 2>&1; then
        log_success "Dashboard: OK (internal)"
    else
        log_warn "Dashboard: Not responding"
    fi
}

# Show status
show_status() {
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  Deployment Complete!${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""

    source "$DEPLOY_DIR/deploy/.env"

    echo "URLs:"
    echo "  Dashboard: https://$DOMAIN"
    echo "  API: https://api.$DOMAIN"
    echo "  API Docs: https://api.$DOMAIN/docs"
    echo ""
    echo "Monitoring (if enabled):"
    echo "  Grafana: https://grafana.$DOMAIN"
    echo "  Prometheus: https://prometheus.$DOMAIN"
    echo ""
    echo "Commands:"
    echo "  View logs: docker compose -f deploy/docker-compose.prod.yml logs -f"
    echo "  Restart: docker compose -f deploy/docker-compose.prod.yml restart"
    echo "  Stop: docker compose -f deploy/docker-compose.prod.yml down"
    echo ""
    echo "Note: SSL certificates may take a few minutes to be issued."
    echo ""
}

# Main
main() {
    header

    check_user
    check_docker

    cd "$DEPLOY_DIR"

    echo "This script will:"
    echo "  1. Generate secure secrets"
    echo "  2. Create the .env configuration file"
    echo "  3. Setup Docker network"
    echo "  4. Configure Traefik for SSL"
    echo "  5. Pull and start all services"
    echo "  6. Run database migrations"
    echo ""
    read -p "Continue? (y/N): " confirm

    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        log_info "Aborted"
        exit 0
    fi

    generate_secrets
    create_env_file
    create_network
    setup_traefik
    pull_images
    start_services
    run_migrations
    health_check
    show_status
}

main "$@"
