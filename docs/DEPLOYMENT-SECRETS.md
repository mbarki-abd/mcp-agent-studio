# Deployment Secrets Configuration

This document describes the GitHub secrets required for the CI/CD pipeline to work correctly.

## Required GitHub Secrets

### CI Pipeline Secrets (`.github/workflows/ci.yml`)

| Secret | Description | Required |
|--------|-------------|----------|
| `GITHUB_TOKEN` | Automatically provided by GitHub | Auto |

### Deploy Pipeline Secrets (`.github/workflows/deploy.yml`)

#### For SSH Deployment to Hetzner

| Secret | Description | Example |
|--------|-------------|---------|
| `DEPLOY_HOST` | Hetzner server IP or hostname | `65.108.x.x` or `mcp.ilinqsoft.com` |
| `DEPLOY_USER` | SSH username | `root` or `deploy` |
| `DEPLOY_SSH_KEY` | Private SSH key (PEM format) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `DOMAIN` | Domain name for the application | `mcp-studio.ilinqsoft.com` |

#### For E2E Tests in Production (Optional)

| Secret | Description | Default |
|--------|-------------|---------|
| `E2E_ADMIN_EMAIL` | Admin email for E2E tests | `admin@example.com` |
| `E2E_ADMIN_PASSWORD` | Admin password for E2E tests | `Admin123!` |

## Setting Up Secrets

### 1. Via GitHub UI

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with its name and value

### 2. Via GitHub CLI

```bash
# Set deployment secrets
gh secret set DEPLOY_HOST --body "your-server-ip"
gh secret set DEPLOY_USER --body "root"
gh secret set DEPLOY_SSH_KEY < ~/.ssh/id_rsa_hetzner
gh secret set DOMAIN --body "mcp-studio.ilinqsoft.com"

# Set optional E2E secrets
gh secret set E2E_ADMIN_EMAIL --body "admin@example.com"
gh secret set E2E_ADMIN_PASSWORD --body "SecurePassword123!"
```

## Hetzner Server Setup

Before deploying, ensure your Hetzner server is set up correctly:

### 1. SSH Access

```bash
# Generate SSH key if needed
ssh-keygen -t ed25519 -f ~/.ssh/hetzner_deploy

# Copy public key to server
ssh-copy-id -i ~/.ssh/hetzner_deploy.pub root@your-server-ip
```

### 2. Server Prerequisites

```bash
# On the Hetzner server
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install Docker Compose plugin
apt install docker-compose-plugin

# Create application directory
mkdir -p /opt/mcp-agent-studio
cd /opt/mcp-agent-studio

# Clone repository (first time only)
git clone https://github.com/mbarki-abd/mcp-agent-studio.git .
```

### 3. Environment Configuration

Create the production environment file:

```bash
# /opt/mcp-agent-studio/deploy/.env
DATABASE_URL=postgresql://postgres:your-secure-password@postgres:5432/mcp_studio
REDIS_URL=redis://:your-redis-password@redis:6379
JWT_SECRET=your-very-long-jwt-secret-key-here-min-32-chars
JWT_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d
ENCRYPTION_KEY=your-32-character-encryption-key!
NODE_ENV=production
POSTGRES_PASSWORD=your-secure-password
REDIS_PASSWORD=your-redis-password
DOMAIN=mcp-studio.ilinqsoft.com
ACME_EMAIL=your-email@example.com
```

### 4. DNS Configuration

Configure DNS records:

| Type | Name | Value |
|------|------|-------|
| A | `mcp-studio.ilinqsoft.com` | `your-server-ip` |
| A | `api.mcp-studio.ilinqsoft.com` | `your-server-ip` |

### 5. Initial Deployment

```bash
# On the Hetzner server
cd /opt/mcp-agent-studio

# Pull latest code
git pull origin master

# Start services
docker compose -f deploy/docker-compose.prod.yml up -d

# Run migrations
docker compose -f deploy/docker-compose.prod.yml run --rm server npx prisma migrate deploy

# Check logs
docker compose -f deploy/docker-compose.prod.yml logs -f
```

## Troubleshooting

### Deployment Fails with SSH Error

1. Verify SSH key is correct:
   ```bash
   ssh -i /path/to/private_key deploy_user@deploy_host
   ```

2. Check GitHub secret format:
   - Private key should include `-----BEGIN...` and `-----END...` headers
   - No extra whitespace or line breaks

### Health Checks Fail

1. Check container logs:
   ```bash
   docker compose -f deploy/docker-compose.prod.yml logs server
   ```

2. Verify environment variables:
   ```bash
   docker compose -f deploy/docker-compose.prod.yml exec server env
   ```

3. Test API manually:
   ```bash
   curl -v https://api.mcp-studio.ilinqsoft.com/health
   ```

### Database Migration Fails

1. Check database connectivity:
   ```bash
   docker compose -f deploy/docker-compose.prod.yml exec postgres psql -U postgres -c "\l"
   ```

2. Check migration status:
   ```bash
   docker compose -f deploy/docker-compose.prod.yml run --rm server npx prisma migrate status
   ```

## Security Notes

- Never commit secrets to the repository
- Use strong, unique passwords for all services
- Rotate secrets periodically
- Use environment-specific secrets for staging vs production
- Enable GitHub's secret scanning to detect leaked credentials
