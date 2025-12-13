# MCP Agent Studio - Instructions Claude

## Description du Projet

**MCP Agent Studio** est une plateforme d'orchestration multi-agent pour équipes de développement IA. Elle permet de gérer des serveurs MCP, des agents avec hiérarchie (Master → Supervisor → Worker), des tâches planifiées et des permissions d'outils granulaires via une interface web complète.

---

## Architecture

### Stack Technique

| Composant | Technologie | Version |
|-----------|-------------|---------|
| **Backend** | Fastify + Node.js | 4.26 / 20+ |
| **Frontend** | React + Vite | 18.2 / 5.0 |
| **Database** | PostgreSQL + Redis | 16 / 7 |
| **ORM** | Prisma | 5.9 |
| **Queue** | BullMQ | 5.65 |
| **Real-time** | Socket.IO | 4.8 |
| **Auth** | JWT + CASL | - |
| **Monorepo** | Turborepo + pnpm | 2.3 / 9.15 |

### Structure du Projet

```
mcp-agent-studio/
├── apps/
│   └── dashboard/              # Frontend React (modules: servers, agents, tasks, monitoring, tools, chat)
├── packages/
│   └── types/                  # Types TypeScript partagés (@mcp/types)
├── server/                     # Backend Fastify (routes, services, websocket)
├── deploy/                     # Configuration Docker + Traefik
├── docs/                       # Documentation (architecture, plans, features)
└── .claude/                    # Configuration GODMODE
    ├── contexts/               # État des sessions
    ├── packages/               # Packages de handoff inter-agents
    ├── agents/                 # Définitions des agents
    └── graphs/                 # Graphes sémantiques JSON-LD
```

---

## Commandes Principales

### Développement

```bash
# Démarrer tout
pnpm dev

# Démarrer uniquement le serveur
pnpm dev:server

# Démarrer uniquement le dashboard
pnpm dev:dashboard

# Tests MCP
pnpm dev:mcp          # Lancer le sample MCP server
pnpm mcp:test         # Tester le client MCP
```

### Build & Tests

```bash
pnpm build            # Build tous les workspaces
pnpm build:check      # Tests + Build (CI)
pnpm test             # Tests unitaires + e2e
pnpm test:e2e         # Tests Playwright
pnpm typecheck        # Vérification TypeScript
pnpm lint             # Linting
pnpm lint:fix         # Auto-fix linting
```

### Base de Données

```bash
pnpm db:generate      # Générer Prisma client
pnpm db:migrate       # Appliquer migrations
pnpm db:push          # Push schema (dev)
```

### Workflow Git

```bash
# Avant commit
pnpm precommit        # lint + typecheck + test:unit
```

---

## Modules Frontend

Le dashboard utilise une architecture modulaire avec lazy loading:

| Module | Routes | Description |
|--------|--------|-------------|
| **servers** | `/servers` | Gestion des serveurs MCP |
| **agents** | `/agents` | Gestion du cycle de vie des agents |
| **tasks** | `/tasks` | Planification et monitoring des tâches |
| **monitoring** | `/monitoring` | Monitoring temps réel |
| **tools** | `/tools` | Catalogue d'outils et permissions |
| **chat** | `/chat` | Interface de chat avec agents |

---

## Services Backend

| Service | Responsabilité |
|---------|----------------|
| **AuthService** | JWT + sessions + RBAC |
| **AgentService** | CRUD agents + lifecycle |
| **MasterAgentService** | Exécution MCP + callbacks |
| **SchedulerService** | BullMQ + tâches récurrentes |
| **MonitoringService** | WebSocket + événements temps réel |

---

## Sécurité

- **Auth**: JWT avec expiration + refresh tokens
- **RBAC**: CASL (roles: ADMIN > MANAGER > OPERATOR > VIEWER)
- **Encryption**: AES-256-GCM pour données sensibles (masterToken)
- **Rate Limiting**: 100 req/min par IP
- **Headers**: Helmet + CORS

---

## Communication

### REST API

```
/api/auth/*           # Authentication
/api/servers/*        # Server management
/api/agents/*         # Agent management
/api/tasks/*          # Task management
/api/tools/*          # Tool catalog
```

### WebSocket (Socket.IO)

```
Events Server → Client:
- agent:status        # Changement statut agent
- agent:execution     # Stream exécution tâche
- agent:todo          # Mise à jour progress
- server:health       # Changement santé serveur

Events Client → Server:
- subscribe:agent     # S'abonner aux updates agent
- subscribe:server    # S'abonner aux updates serveur
```

### MCP Client

```
Modes:
1. WebSocket (préféré)  → JSON-RPC 2.0 over WS
2. HTTP Fallback        → REST API calls
3. Simulation Mode      → Mock local
```

---

## Déploiement

### Docker Compose Stack

```yaml
services:
  traefik       # Reverse proxy + TLS (Let's Encrypt)
  postgres      # PostgreSQL 16
  redis         # Redis 7
  server        # API Fastify (port 3000)
  dashboard     # React frontend (port 5173)
```

### Hetzner Hosting

- Provider: Hetzner Cloud
- Reverse Proxy: Traefik 3.0
- TLS: Let's Encrypt automatique
- Domaine: mcp-studio.ilinqsoft.com

---

## Documentation

| Document | Chemin |
|----------|--------|
| Architecture globale | `docs/architecture/README.md` |
| ADR (décisions) | `docs/architecture/adr/` |
| Plans de features | `docs/plans/` |
| Diagrammes Mermaid | `docs/architecture/diagrams/` |

---

## Workflow GODMODE

Le projet utilise le système GODMODE v3.0 pour l'orchestration multi-agent autonome.

### Commandes GODMODE

```bash
# Initialisation (déjà effectuée)
/init

# Pipeline complet
/master auto          # Orchestration automatique

# Agents spécifiques
/plan [feature]       # Planification architecture
/dev [#issue]         # Développement
/build                # CI/CD + Git
/deploy [env]         # Déploiement
/test                 # Tests automatisés

# Monitoring
/status               # Vue d'ensemble
/dashboard            # Tableau de bord visuel
/resume               # Reprendre session précédente
```

### Fichiers GODMODE

```
.claude/
├── contexts/session.json          # État actuel
├── packages/                      # Packages inter-agents
├── agents/                        # Agents recrutés
└── graphs/project.graph.jsonld    # Graphe sémantique du projet
```

---

## Points d'Attention

1. **Modularité**: Le frontend est modulaire, chaque module est autonome
2. **TypeScript**: Types stricts, pas de `any`
3. **Tests**: Pyramide (beaucoup de unit, peu de e2e)
4. **Sécurité**: OWASP, pas de secrets en dur
5. **Performance**: Lazy loading, caching Redis, indexes PostgreSQL
6. **Observabilité**: Logs structurés, métriques, health checks

---

## Contacts

- **Auteur**: mbarki <mbark@ilinqsoft.com>
- **Licence**: MIT
- **Repo**: mcp-agent-studio

---

*Dernière mise à jour: 2025-12-13*
