# PLAN-004: Infrastructure & Deployment

## Status: COMPLETE

| Attribut | Valeur |
|----------|--------|
| ID | PLAN-004 |
| Titre | Infrastructure Hetzner & CI/CD |
| Priorité | P2 (Medium) |
| Créé | 2025-12-10 |
| Mise à jour | 2025-12-12 |
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

### Phase 4.1: Provisioning Serveur ✅ COMPLETE

**Tasks:**
- [x] Créer serveur Hetzner CX21 (Ubuntu 22.04)
- [x] Configurer SSH keys
- [x] Installer Docker & Docker Compose
- [x] Configurer firewall (ufw)
- [x] Créer user deploy

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

### Phase 4.2: Traefik Setup ✅ COMPLETE

**Fichiers:** `deploy/traefik/`
```
traefik/
├── traefik.yml          ✅ Configured
├── dynamic/
│   └── middlewares.yml  ✅ Rate-limit, headers, security
└── acme.json
```

**Tasks:**
- [x] Configurer Traefik - `deploy/traefik/traefik.yml`
- [x] Configurer Let's Encrypt
- [x] Configurer middlewares (rate-limit, headers) - `deploy/traefik/dynamic/middlewares.yml`
- [x] Test SSL

---

### Phase 4.3: Docker Compose Production ✅ COMPLETE

**Fichiers:** `deploy/docker-compose.prod.yml`, `Dockerfile.server`, `Dockerfile.dashboard`

Services configurés:
- Traefik (reverse proxy + SSL)
- Server (Fastify API)
- Dashboard (React app via nginx)
- PostgreSQL 16
- Redis 7
- Backup (pg_dump scheduled)

**Tasks:**
- [x] Finaliser docker-compose.prod.yml - `deploy/docker-compose.prod.yml`
- [x] Dockerfiles - `Dockerfile.server`, `Dockerfile.dashboard`
- [x] Configurer secrets (.env.prod)
- [x] Test local avec docker-compose
- [x] Déployer sur Hetzner

---

### Phase 4.4: GitHub Actions CI/CD ✅ COMPLETE

**Fichiers:** `.github/workflows/`
```
.github/workflows/
├── ci.yml           ✅ Lint, typecheck, build, docker-build
├── deploy.yml       ✅ Build, push to GHCR, SSH deploy
└── release.yml      ✅ Semantic versioning
```

**Tasks:**
- [x] Configurer CI workflow - `.github/workflows/ci.yml`
- [x] Configurer Deploy workflow - `.github/workflows/deploy.yml`
- [x] Configurer Release workflow - `.github/workflows/release.yml`
- [x] Configurer GitHub secrets
- [x] Test pipeline complet

---

### Phase 4.5: Monitoring & Logging ✅ COMPLETE

**Stack:** `deploy/monitoring/` + `deploy/docker-compose.monitoring.yml`
- Prometheus (métriques) + Alert rules
- Loki + Promtail (logs)
- Grafana (dashboards)
- Node Exporter, PostgreSQL Exporter, Redis Exporter, cAdvisor

**Fichiers créés:**
```
deploy/monitoring/
├── prometheus/
│   ├── prometheus.yml        # Scrape configs
│   └── alerts/mcp-alerts.yml # Alert rules
├── loki/
│   └── loki-config.yml       # Log aggregation
├── promtail/
│   └── promtail-config.yml   # Log collection
└── grafana/
    ├── provisioning/
    │   ├── datasources/datasources.yml
    │   └── dashboards/dashboards.yml
    └── dashboards/mcp-overview.json

deploy/docker-compose.monitoring.yml  # Full monitoring stack
```

**Tasks:**
- [x] Ajouter Prometheus avec scrape configs
- [x] Ajouter Loki + Promtail
- [x] Ajouter Grafana avec auto-provisioning
- [x] Créer dashboard MCP Overview
- [x] Configurer alerting (mcp-alerts.yml)

---

## Domaines

| Service | URL |
|---------|-----|
| Dashboard | https://mcp-studio.ilinqsoft.com |
| API | https://api.mcp-studio.ilinqsoft.com |
| API Docs | https://api.mcp-studio.ilinqsoft.com/docs |

---

## Critères de Complétion

- [x] Serveur provisionné et sécurisé
- [x] SSL fonctionnel sur tous les domaines
- [x] CI/CD automatisé
- [x] Déploiement zero-downtime
- [x] Monitoring opérationnel
- [x] Backups configurés

---

## Estimations

| Phase | Complexité |
|-------|------------|
| 4.1 Provisioning | S |
| 4.2 Traefik | S |
| 4.3 Docker Compose | M |
| 4.4 CI/CD | M |
| 4.5 Monitoring | M |
