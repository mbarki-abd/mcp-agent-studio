# PLAN-004: Infrastructure & Deployment

## Status: BACKLOG

| Attribut | Valeur |
|----------|--------|
| ID | PLAN-004 |
| Titre | Infrastructure Hetzner & CI/CD |
| Priorité | P2 (Medium) |
| Créé | 2025-12-10 |
| Dépend de | PLAN-003 |

---

## Objectif

Déployer MCP Agent Studio sur infrastructure Hetzner avec:
- Serveur Hetzner CX21
- Docker Compose production
- Traefik reverse proxy + SSL
- GitHub Actions CI/CD

---

## Infrastructure Cible

```
┌─────────────────────────────────────────────────────────┐
│                    HETZNER CX21                          │
│                  (2 vCPU, 4GB RAM)                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐                                       │
│  │   Traefik    │ :80, :443                             │
│  │   (proxy)    │ SSL via Let's Encrypt                 │
│  └──────┬───────┘                                       │
│         │                                                │
│    ┌────┴────┬──────────┬──────────┐                   │
│    │         │          │          │                    │
│    ▼         ▼          ▼          ▼                    │
│ ┌──────┐ ┌──────┐ ┌──────────┐ ┌───────┐              │
│ │Server│ │Dash  │ │PostgreSQL│ │ Redis │              │
│ │:3000 │ │:5173 │ │  :5432   │ │ :6379 │              │
│ └──────┘ └──────┘ └──────────┘ └───────┘              │
│                                                          │
│  Volumes:                                                │
│  - postgres_data                                         │
│  - redis_data                                            │
│  - traefik_certs                                         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Phases

### Phase 4.1: Provisioning Serveur

**Tasks:**
- [ ] Créer serveur Hetzner CX21 (Ubuntu 22.04)
- [ ] Configurer SSH keys
- [ ] Installer Docker & Docker Compose
- [ ] Configurer firewall (ufw)
- [ ] Créer user deploy

**Script:**
```bash
# Initial setup
apt update && apt upgrade -y
apt install -y docker.io docker-compose-plugin
usermod -aG docker deploy

# Firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

### Phase 4.2: Traefik Setup

**Fichiers:**
```
traefik/
├── traefik.yml
├── dynamic/
│   └── middlewares.yml
└── acme.json
```

**traefik.yml:**
```yaml
api:
  dashboard: true
  insecure: false

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@ilinqsoft.com
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web

providers:
  docker:
    exposedByDefault: false
```

**Tasks:**
- [ ] Configurer Traefik
- [ ] Configurer Let's Encrypt
- [ ] Configurer middlewares (rate-limit, headers)
- [ ] Test SSL

---

### Phase 4.3: Docker Compose Production

**docker-compose.prod.yml:**
```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v3.0
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik:/etc/traefik
      - traefik_certs:/letsencrypt

  server:
    image: ghcr.io/mbarki/mcp-agent-studio-server:latest
    restart: unless-stopped
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/mcp
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.mcp-studio.ilinqsoft.com`)"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"

  dashboard:
    image: ghcr.io/mbarki/mcp-agent-studio-dashboard:latest
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(`mcp-studio.ilinqsoft.com`)"
      - "traefik.http.routers.dashboard.tls.certresolver=letsencrypt"

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: mcp
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: mcp_agent_studio
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
  traefik_certs:
```

**Tasks:**
- [ ] Finaliser docker-compose.prod.yml
- [ ] Configurer secrets (.env.prod)
- [ ] Test local avec docker-compose
- [ ] Déployer sur Hetzner

---

### Phase 4.4: GitHub Actions CI/CD

**Workflows:**
```
.github/workflows/
├── ci.yml           # Test + Build on PR
├── deploy.yml       # Deploy on main merge
└── release.yml      # Semantic versioning
```

**ci.yml:**
```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - run: docker build -f Dockerfile.server -t server .
      - run: docker build -f Dockerfile.dashboard -t dashboard .
```

**deploy.yml:**
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/mbarki/mcp-agent-studio-server:latest

      - name: Deploy to Hetzner
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.HETZNER_HOST }}
          username: deploy
          key: ${{ secrets.HETZNER_SSH_KEY }}
          script: |
            cd /opt/mcp-agent-studio
            docker compose pull
            docker compose up -d
```

**Tasks:**
- [ ] Configurer CI workflow
- [ ] Configurer Deploy workflow
- [ ] Configurer GitHub secrets
- [ ] Test pipeline complet

---

### Phase 4.5: Monitoring & Logging

**Stack:**
- Prometheus (métriques)
- Loki (logs)
- Grafana (dashboards)

**Tasks:**
- [ ] Ajouter Prometheus
- [ ] Ajouter Loki + Promtail
- [ ] Ajouter Grafana
- [ ] Créer dashboards
- [ ] Configurer alerting

---

## Domaines

| Service | URL |
|---------|-----|
| Dashboard | https://mcp-studio.ilinqsoft.com |
| API | https://api.mcp-studio.ilinqsoft.com |
| API Docs | https://api.mcp-studio.ilinqsoft.com/docs |

---

## Critères de Complétion

- [ ] Serveur provisionné et sécurisé
- [ ] SSL fonctionnel sur tous les domaines
- [ ] CI/CD automatisé
- [ ] Déploiement zero-downtime
- [ ] Monitoring opérationnel
- [ ] Backups configurés

---

## Estimations

| Phase | Complexité |
|-------|------------|
| 4.1 Provisioning | S |
| 4.2 Traefik | S |
| 4.3 Docker Compose | M |
| 4.4 CI/CD | M |
| 4.5 Monitoring | M |
