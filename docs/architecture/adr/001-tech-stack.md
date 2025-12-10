# ADR-001: Technology Stack

## Status: ACCEPTED

**Date:** 2025-12-10

---

## Context

MCP Agent Studio est une plateforme SaaS B2B pour l'orchestration d'agents IA. Nous devons choisir un stack technique qui supporte:
- Multi-tenancy
- Real-time communications
- Scalabilité
- Developer experience

---

## Decision

### Backend

| Choix | Technologie | Raison |
|-------|-------------|--------|
| Framework | **Fastify** | Performance, TypeScript natif, plugins ecosystem |
| ORM | **Prisma** | Type-safety, migrations, introspection |
| Database | **PostgreSQL** | ACID, JSON support, maturity |
| Cache/Queue | **Redis + BullMQ** | Sessions, cache, job queue |
| Auth | **JWT + CASL** | Stateless, RBAC granulaire |
| API Docs | **Swagger/OpenAPI** | Standard, auto-generated |
| Real-time | **WebSocket + SSE** | Bi-directional + streaming |

### Frontend

| Choix | Technologie | Raison |
|-------|-------------|--------|
| Framework | **React 18** | Ecosystem, concurrent features |
| Build | **Vite** | Speed, ESM native |
| State | **Zustand** | Simple, performant, TypeScript |
| Server State | **TanStack Query** | Caching, mutations, devtools |
| Forms | **react-hook-form + Zod** | Performance, validation |
| UI | **Radix UI + Tailwind** | Accessible, customizable |
| Charts | **Recharts** | React-friendly, D3-based |
| Terminal | **xterm.js** | Full terminal emulation |

### Infrastructure

| Choix | Technologie | Raison |
|-------|-------------|--------|
| Monorepo | **Turborepo + pnpm** | Caching, parallel builds |
| Container | **Docker** | Isolation, portability |
| Reverse Proxy | **Traefik** | Auto SSL, Docker integration |
| Hosting | **Hetzner** | Cost-effective EU hosting |
| CI/CD | **GitHub Actions** | Intégré, gratuit |

---

## Alternatives Considered

### Backend Framework

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Fastify | Fast, TypeScript, plugins | Smaller community | ✅ Selected |
| Express | Large community | Slower, callbacks | ❌ |
| NestJS | Enterprise patterns | Overhead, complexity | ❌ |

### Frontend State

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Zustand | Simple, performant | Less features | ✅ Selected |
| Redux Toolkit | Mature, devtools | Boilerplate | ❌ |
| Jotai | Atomic, minimal | Learning curve | ❌ |

### Database

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| PostgreSQL | ACID, JSON, mature | Scaling complexity | ✅ Selected |
| MySQL | Widespread | Less JSON support | ❌ |
| MongoDB | Flexible schema | Consistency issues | ❌ |

---

## Consequences

### Positive
- TypeScript end-to-end assure type safety
- Fastify + Prisma offrent excellente DX
- Radix + Tailwind permettent UI accessible et customizable
- Docker + Traefik simplifient le déploiement

### Negative
- Fastify moins connu qu'Express (recrutement)
- Zustand moins featuered que Redux (acceptable pour notre scope)

### Risks
- Migration future si scaling massif (mitigation: architecture modulaire)

---

## Related

- PLAN-001: Initial Setup
- PLAN-002: Backend Core
- ADR-002: Module Architecture
