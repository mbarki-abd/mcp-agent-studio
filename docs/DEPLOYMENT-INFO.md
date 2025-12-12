# MCP Agent Studio - Deployment Information

> **Document de reference pour les tests et acces aux environnements**
>
> Derniere mise a jour: Decembre 2024

---

## Environnements

### Local Development

| Service | URL | Description |
|---------|-----|-------------|
| **Dashboard** | http://localhost:5173 | Frontend React |
| **API Server** | http://localhost:3000 | Backend Fastify |
| **API Docs** | http://localhost:3000/docs | Swagger/OpenAPI |
| **Health Check** | http://localhost:3000/health | Status API |
| **PostgreSQL** | localhost:5432 | Base de donnees |
| **Redis** | localhost:6379 | Cache & Sessions |

**Demarrage local:**
```bash
# Installation
pnpm install

# Demarrer la base de donnees
docker compose up -d postgres redis

# Migrations & Seed
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# Demarrer les services
pnpm dev
```

---

### Production

| Service | URL | Description |
|---------|-----|-------------|
| **Dashboard** | https://mcp-studio.ilinqsoft.com | Frontend |
| **API Server** | https://api.mcp-studio.ilinqsoft.com | Backend |
| **API Docs** | https://api.mcp-studio.ilinqsoft.com/docs | Documentation |
| **Health** | https://api.mcp-studio.ilinqsoft.com/health | Monitoring |
| **Traefik** | https://traefik.mcp-studio.ilinqsoft.com | Reverse Proxy |

**Architecture:**
- Traefik v3.0 (Reverse Proxy + TLS)
- PostgreSQL 16 Alpine
- Redis 7 Alpine
- Node.js Backend
- Nginx Frontend

---

## Comptes de Test

### Utilisateur Standard (E2E Tests)

| Champ | Valeur |
|-------|--------|
| **Email** | `test@example.com` |
| **Password** | `password123` |
| **Name** | Test User |
| **Role** | USER |

> Utilise par les tests automatises (Playwright)

---

### Administrateur

| Champ | Valeur |
|-------|--------|
| **Email** | `mbarki@ilinqsoft.com` |
| **Password** | `P@55lin@` |
| **Name** | MBARKI Admin |
| **Role** | ADMIN |

> Acces complet a toutes les fonctionnalites

---

## Base de Donnees

### Local

```
Host:     localhost
Port:     5432
Database: mcp_studio
User:     postgres
Password: postgres
```

**Connection String:**
```
postgresql://postgres:postgres@localhost:5432/mcp_studio
```

### Production

```
Host:     postgres (interne Docker)
Port:     5432
Database: mcp_studio
User:     ${POSTGRES_USER}
Password: ${POSTGRES_PASSWORD}
```

> Les credentials production sont stockes dans les variables d'environnement

---

## Redis

### Local

```
Host:     localhost
Port:     6379
Password: (none)
```

### Production

```
Host:     redis (interne Docker)
Port:     6379
Password: ${REDIS_PASSWORD}
```

---

## Scripts de Test

### Seed Test Data

```bash
# Creer les utilisateurs et donnees de test
node e2e/seed-test-data.mjs

# Seed complet avec validation
node e2e/comprehensive-seed-and-test.mjs
```

### Tests E2E

```bash
# Installer Playwright
npx playwright install

# Lancer les tests
pnpm test:e2e

# Tests visuels
node e2e/visual-test.mjs
```

---

## API Authentication

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

**Response:**
```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": {
    "id": "...",
    "email": "test@example.com",
    "name": "Test User"
  }
}
```

### Utiliser le Token

```bash
curl http://localhost:3000/api/agents \
  -H "Authorization: Bearer eyJhbG..."
```

---

## Docker Commands

### Build Local

```bash
# Server
docker build -f Dockerfile.server -t mcp-server:local .

# Dashboard
docker build -f Dockerfile.dashboard -t mcp-dashboard:local \
  --build-arg VITE_API_URL=http://localhost:3000 .
```

### Run avec Docker Compose

```bash
# Dev
docker compose up -d

# Prod
docker compose -f deploy/docker-compose.prod.yml up -d

# Monitoring (Prometheus/Grafana)
docker compose -f deploy/docker-compose.monitoring.yml up -d
```

### Logs

```bash
docker logs -f mcp-server
docker logs -f mcp-dashboard
docker logs -f mcp-postgres
```

---

## Endpoints Principaux

| Module | Endpoint | Description |
|--------|----------|-------------|
| Auth | `POST /api/auth/login` | Connexion |
| Auth | `POST /api/auth/register` | Inscription |
| Auth | `POST /api/auth/refresh` | Refresh token |
| Agents | `GET /api/agents` | Liste agents |
| Tasks | `GET /api/tasks` | Liste taches |
| Servers | `GET /api/servers` | Liste serveurs |
| Tools | `GET /api/tools/definitions` | Catalogue outils |
| Chat | `POST /api/chat/sessions` | Nouvelle session |
| Audit | `GET /api/audit` | Logs d'audit |
| Org | `GET /api/organization` | Organisation |
| Keys | `GET /api/keys` | API Keys |
| Dashboard | `GET /api/dashboard/stats` | Statistiques |

---

## Troubleshooting

### Database Connection Failed

```bash
# Verifier que PostgreSQL est running
docker compose ps
docker compose logs postgres

# Reset database
docker compose down -v
docker compose up -d postgres
pnpm db:migrate
pnpm db:seed
```

### Redis Connection Failed

```bash
docker compose logs redis
docker exec -it mcp-redis redis-cli ping
```

### API Not Responding

```bash
# Verifier les logs
docker logs mcp-server

# Health check
curl http://localhost:3000/health
```

### CORS Issues

Verifier que `CORS_ORIGIN` correspond a l'URL du frontend:
- Local: `http://localhost:5173`
- Prod: `https://mcp-studio.ilinqsoft.com`

---

## Securite

### Variables d'Environnement Requises (Production)

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret pour signer les JWT (32+ chars) |
| `ENCRYPTION_KEY` | Cle AES-256 pour chiffrer les donnees sensibles |
| `POSTGRES_PASSWORD` | Password PostgreSQL |
| `REDIS_PASSWORD` | Password Redis |
| `DOMAIN` | Domaine de production |

### Generer des Secrets

```bash
# JWT Secret
openssl rand -base64 32

# Encryption Key (32 bytes hex)
openssl rand -hex 32
```

---

## Contact

- **Projet:** MCP Agent Studio
- **Maintainer:** MBARKI
- **Email:** mbarki@ilinqsoft.com
