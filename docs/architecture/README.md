# MCP Agent Studio - Architecture

> Multi-Agent Orchestration Platform for AI Development Teams

## Overview

MCP Agent Studio est une plateforme permettant d'orchestrer des agents AI dans un environnement contrôlé et sécurisé. Elle offre une interface web complète pour gérer des serveurs MCP, des agents avec hiérarchie (Master → Supervisor → Worker), des tâches planifiées et des permissions d'outils granulaires.

---

## Quick Links

| Document | Description |
|----------|-------------|
| [DECISIONS.md](./DECISIONS.md) | Index des Architecture Decision Records |
| [diagrams/](./diagrams/) | Diagrammes Mermaid |
| [ADR-001](./adr/001-tech-stack.md) | Technology Stack |
| [ADR-002](./adr/002-module-architecture.md) | Module Architecture |
| [ADR-003](./adr/003-mcp-client.md) | MCP Client Implementation |

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         MCP AGENT STUDIO                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                    DASHBOARD (React 18 + Vite)                       │ │
│  │                                                                       │ │
│  │   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │ │
│  │   │ Servers  │ │ Agents   │ │  Tasks   │ │Monitoring│ │  Tools   │  │ │
│  │   │ Module   │ │ Module   │ │ Module   │ │  Module  │ │ Module   │  │ │
│  │   └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │ │
│  │                              │                                        │ │
│  │   ┌──────────────────────────┼──────────────────────────────────┐   │ │
│  │   │                    CORE LAYER                                │   │ │
│  │   │   Auth (CASL) │ API Client │ WebSocket │ Module Registry    │   │ │
│  │   └──────────────────────────┼──────────────────────────────────┘   │ │
│  └──────────────────────────────┼──────────────────────────────────────┘ │
│                                 │                                         │
│                      HTTP REST + WebSocket (Socket.IO)                   │
│                                 │                                         │
│  ┌──────────────────────────────┼──────────────────────────────────────┐ │
│  │                    API SERVER (Fastify 4.26)                        │ │
│  │                                                                       │ │
│  │   ┌─────────────────────────────────────────────────────────────┐   │ │
│  │   │                      MIDDLEWARE                              │   │ │
│  │   │   CORS │ Helmet │ Rate Limit │ JWT Auth │ RBAC (CASL)       │   │ │
│  │   └─────────────────────────────────────────────────────────────┘   │ │
│  │                                                                       │ │
│  │   ┌─────────────────────────────────────────────────────────────┐   │ │
│  │   │                      ROUTES                                  │   │ │
│  │   │   /auth │ /servers │ /agents │ /tasks │ /tools │ /monitoring │   │ │
│  │   └───────────────────────────┬─────────────────────────────────┘   │ │
│  │                               │                                       │ │
│  │   ┌───────────────────────────┴─────────────────────────────────┐   │ │
│  │   │                      SERVICES                                │   │ │
│  │   │   AuthService │ AgentService │ TaskService │ ToolsService   │   │ │
│  │   │   MasterAgentService │ SchedulerService │ MonitoringService  │   │ │
│  │   └───────────────────────────┬─────────────────────────────────┘   │ │
│  │                               │                                       │ │
│  │   ┌───────────────────────────┴─────────────────────────────────┐   │ │
│  │   │                      DATA ACCESS                             │   │ │
│  │   │              Prisma ORM │ MCP Client │ BullMQ               │   │ │
│  │   └─────────────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                       DATA LAYER                                     │ │
│  │                                                                       │ │
│  │   ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │ │
│  │   │  PostgreSQL  │    │    Redis     │    │    MCP Server        │  │ │
│  │   │  (Primary)   │    │ (Cache/Queue)│    │    (External)        │  │ │
│  │   └──────────────┘    └──────────────┘    └──────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Backend

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Runtime | Node.js | 20+ | JavaScript runtime |
| Framework | Fastify | 4.26 | High-performance web framework |
| ORM | Prisma | 5.9 | Type-safe database access |
| Database | PostgreSQL | 16 | Primary data store |
| Cache | Redis | 7 | Session cache, job queue |
| Queue | BullMQ | 5.65 | Task scheduling |
| Auth | JWT + CASL | - | Token auth + RBAC |
| Validation | Zod | 3.22 | Schema validation |
| Real-time | Socket.IO | 4.8 | WebSocket communication |
| API Docs | Swagger | 8 | OpenAPI documentation |

### Frontend

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Framework | React | 18.2 | UI library |
| Build | Vite | 5.0 | Fast bundler |
| Language | TypeScript | 5.3 | Type safety |
| State | Zustand | 4.5 | Local state |
| Server State | TanStack Query | 5.17 | Remote state |
| Styling | Tailwind CSS | 3.4 | Utility-first CSS |
| Components | Radix UI | Latest | Accessible primitives |
| Forms | react-hook-form | 7.49 | Form management |
| Charts | Recharts | 2.12 | Data visualization |
| Terminal | xterm.js | 5.5 | Terminal emulator |

### Infrastructure

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Monorepo | Turborepo | 2.3 | Build orchestration |
| Package Manager | pnpm | 9.15 | Fast, disk-efficient |
| Containers | Docker | Latest | Containerization |
| Proxy | Traefik | 3.0 | Reverse proxy + TLS |
| CI/CD | GitHub Actions | - | Automation |
| Hosting | Hetzner | - | Cloud provider |

---

## Project Structure

```
mcp-agent-studio/
├── apps/
│   └── dashboard/              # React frontend
│       ├── src/
│       │   ├── core/           # Non-modular infrastructure
│       │   │   ├── api/        # Axios client + hooks
│       │   │   ├── auth/       # AuthProvider + CASL
│       │   │   ├── modules/    # Module registry + loader
│       │   │   └── websocket/  # Socket.IO provider
│       │   ├── components/     # Shared components
│       │   │   ├── layout/     # DashboardLayout, Header, Sidebar
│       │   │   └── ui/         # Radix-based components
│       │   ├── modules/        # Feature modules
│       │   │   ├── agents/     # Agent management
│       │   │   ├── servers/    # Server configuration
│       │   │   ├── tasks/      # Task management
│       │   │   ├── monitoring/ # Real-time monitoring
│       │   │   ├── tools/      # Tool catalog
│       │   │   └── chat/       # Agent chat
│       │   ├── pages/          # Top-level pages
│       │   └── stores/         # Global stores
│       ├── vite.config.ts
│       └── package.json
│
├── packages/
│   └── types/                  # @mcp/types - Shared TypeScript types
│       └── src/index.ts
│
├── server/                     # Fastify backend
│   ├── src/
│   │   ├── index.ts            # Entry point
│   │   ├── middleware/         # Fastify plugins
│   │   │   ├── auth.middleware.ts
│   │   │   ├── rbac.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── routes/             # API endpoints
│   │   │   ├── auth.routes.ts
│   │   │   ├── servers.routes.ts
│   │   │   ├── agents.routes.ts
│   │   │   ├── tasks.routes.ts
│   │   │   └── tools.routes.ts
│   │   ├── services/           # Business logic
│   │   │   ├── auth.service.ts
│   │   │   ├── agent.service.ts
│   │   │   ├── master-agent.service.ts
│   │   │   ├── mcp-client.ts
│   │   │   ├── scheduler.service.ts
│   │   │   └── monitoring.service.ts
│   │   ├── websocket/          # Socket.IO handlers
│   │   └── utils/              # Utilities
│   │       ├── crypto.ts       # Encryption
│   │       └── errors.ts       # Error classes
│   └── prisma/
│       ├── schema.prisma       # Database schema
│       └── seed.ts             # Seed data
│
├── deploy/                     # Deployment configs
│   ├── docker-compose.prod.yml
│   ├── scripts/
│   └── traefik/
│
├── docs/                       # Documentation
│   ├── architecture/           # This folder
│   ├── plans/                  # Feature plans
│   └── features/               # Specifications
│
├── docker-compose.yml          # Local development
├── Dockerfile.server
├── Dockerfile.dashboard
├── turbo.json                  # Turborepo config
├── pnpm-workspace.yaml
└── package.json
```

---

## Data Model

### Entity Relationships

```
User ────────────────────── Organization
 │                              │
 │ owns                         │ has
 ▼                              ▼
ServerConfiguration ◄──────── User[]
 │
 ├── hosts ──► Agent ────┬── supervises ──► Agent[]
 │              │        │
 │              │        └── executes ──► TaskExecution[]
 │              │
 │              └── assigned ──► Task[]
 │
 ├── has ──► ServerTool ──► ToolDefinition
 │                              │
 │                              │
 └── runs ──► Task        AgentToolPermission
                                │
                                ▼
                          (Agent ←→ Tool permissions)
```

### Core Entities

| Entity | Description |
|--------|-------------|
| **User** | Platform users with roles (ADMIN, MANAGER, OPERATOR, VIEWER) |
| **Organization** | User groups with plans (FREE, STARTER, PRO, ENTERPRISE) |
| **ServerConfiguration** | MCP server connections with encrypted credentials |
| **Agent** | AI agents with hierarchy (MASTER → SUPERVISOR → WORKER) |
| **Task** | Work units with scheduling (immediate, scheduled, recurring) |
| **TaskExecution** | Execution records with output/error tracking |
| **ToolDefinition** | Available CLI tools catalog |
| **ServerTool** | Tool installations per server |
| **AgentToolPermission** | Fine-grained tool access control |

### Status Enums

```typescript
// Agent lifecycle
AgentStatus: PENDING_VALIDATION → ACTIVE ↔ BUSY ↔ INACTIVE → ERROR

// Task lifecycle
TaskStatus: DRAFT → PENDING → SCHEDULED → QUEUED → RUNNING → COMPLETED/FAILED/CANCELLED

// Server health
ServerStatus: ONLINE | OFFLINE | DEGRADED | MAINTENANCE | UNKNOWN
```

---

## Module Architecture

Le frontend utilise une architecture modulaire avec lazy loading:

```typescript
interface ModuleDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: ComponentType;
  dependencies: string[];  // Other modules required
  routes: ModuleRoute[];
  navigation: NavigationItem[];
  settings: {
    defaultEnabled: boolean;
    configurable: boolean;
  };
}
```

### Modules Disponibles

| Module | Routes | Description |
|--------|--------|-------------|
| **servers** | `/servers`, `/servers/new` | Server configuration management |
| **agents** | `/agents`, `/agents/:id`, `/agents/new` | Agent lifecycle management |
| **tasks** | `/tasks`, `/tasks/:id`, `/tasks/new` | Task scheduling & monitoring |
| **monitoring** | `/monitoring` | Real-time agent monitoring |
| **tools** | `/tools`, `/tools/server/:id`, `/tools/permissions/:id` | Tool catalog & permissions |
| **chat** | `/chat`, `/chat/:agentId` | Agent chat interface |

---

## Security Architecture

### Authentication Flow

```
┌────────┐    POST /auth/login     ┌────────────┐
│ Client │ ──────────────────────► │   Server   │
└────────┘                         └──────┬─────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │ Validate     │
                                   │ Credentials  │
                                   └──────┬───────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │ Create JWT   │
                                   │ + Session    │
                                   └──────┬───────┘
                                          │
    { accessToken, refreshToken }         │
◄─────────────────────────────────────────┘
```

### Authorization (RBAC with CASL)

```typescript
// Roles hierarchy
ADMIN > MANAGER > OPERATOR > VIEWER > USER

// Permission examples
can('manage', 'all')              // ADMIN
can('manage', 'Agent')            // MANAGER
can('read', 'Agent')              // OPERATOR
can('read', 'ServerConfiguration') // VIEWER
```

### Security Measures

- **JWT tokens** with expiration
- **Session validation** in database
- **bcrypt** password hashing
- **AES-256-GCM** for sensitive data (masterToken)
- **Rate limiting** (100 req/min)
- **Helmet** security headers
- **CORS** configuration

---

## Communication Patterns

### MCP Client Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MasterAgentService                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   executePrompt(prompt, agentId, callbacks)                     │
│                         │                                        │
│                         ▼                                        │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    MCPClient                             │   │
│   │                                                          │   │
│   │   1. WebSocket (preferred)                              │   │
│   │      └── JSON-RPC 2.0 over WS                          │   │
│   │                                                          │   │
│   │   2. HTTP Fallback                                      │   │
│   │      └── REST API calls                                 │   │
│   │                                                          │   │
│   │   3. Simulation Mode                                    │   │
│   │      └── Local mock responses                           │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   Callbacks:                                                     │
│   • onOutput(chunk) → Stream execution output                   │
│   • onToolCall(name, params) → Track tool usage                 │
│   • onFileChange(path, action) → Monitor file operations        │
│   • onTodoUpdate(todos) → Progress tracking                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Real-time Events (Socket.IO)

```typescript
// Server → Client events
'agent:status'     // Agent status changes
'agent:execution'  // Task execution streams
'agent:todo'       // Todo progress updates
'server:health'    // Server health changes

// Client → Server events
'subscribe:agent'   // Subscribe to agent updates
'unsubscribe:agent' // Unsubscribe
'subscribe:server'  // Subscribe to server updates
```

---

## Task Scheduling

### BullMQ Integration

```
┌────────────────────────────────────────────────────────────────┐
│                     SchedulerService                            │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Queues:                                                       │
│   ├── task-execution     (immediate tasks)                     │
│   ├── scheduled-tasks    (cron-based)                          │
│   └── recurring-tasks    (periodic)                            │
│                                                                 │
│   Workers:                                                      │
│   └── Process jobs → MasterAgentService.executePrompt()        │
│                                                                 │
│   Redis:                                                        │
│   └── Job persistence, rate limiting, retries                  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Execution Modes

| Mode | Description | Storage |
|------|-------------|---------|
| `IMMEDIATE` | Execute now | Memory |
| `SCHEDULED` | Execute at specific time | Redis |
| `RECURRING` | Cron-based repetition | Redis + DB |

---

## Deployment Architecture

### Docker Compose Stack

```yaml
services:
  traefik:       # Reverse proxy + TLS
  postgres:      # Database (16-alpine)
  redis:         # Cache/Queue (7-alpine)
  server:        # API server
  dashboard:     # React frontend
```

### Network Topology

```
Internet
    │
    ▼
┌─────────────────────────┐
│    Traefik (443/80)     │
│    Let's Encrypt TLS    │
└───────────┬─────────────┘
            │
    ┌───────┴───────┐
    ▼               ▼
┌───────────┐  ┌───────────┐
│ Dashboard │  │  Server   │
│ (nginx)   │  │ (node)    │
│ :5173     │  │ :3000     │
└───────────┘  └─────┬─────┘
                     │
          ┌─────────┴─────────┐
          ▼                   ▼
    ┌───────────┐       ┌───────────┐
    │ PostgreSQL│       │   Redis   │
    │   :5432   │       │   :6379   │
    └───────────┘       └───────────┘
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| POST | `/api/auth/refresh` | Refresh token |
| GET | `/api/auth/me` | Current user |

### Resources

| Resource | Endpoints |
|----------|-----------|
| Servers | `GET/POST /api/servers`, `GET/PATCH/DELETE /api/servers/:id` |
| Agents | `GET/POST /api/agents`, `GET/PATCH/DELETE /api/agents/:id` |
| Tasks | `GET/POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/:id` |
| Tools | `GET /api/tools`, `POST /api/tools/:id/permissions` |

### Special

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /docs` | Swagger UI |
| `WS /api/monitoring` | Socket.IO endpoint |

---

## Diagrams

See [diagrams/](./diagrams/) for detailed Mermaid diagrams:

- [system-overview.mermaid](./diagrams/system-overview.mermaid) - System architecture
- [data-model.mermaid](./diagrams/data-model.mermaid) - Entity relationships
- [service-layer.mermaid](./diagrams/service-layer.mermaid) - Service dependencies
- [auth-flow.mermaid](./diagrams/auth-flow.mermaid) - Authentication flow
- [mcp-communication.mermaid](./diagrams/mcp-communication.mermaid) - MCP protocol flow

---

## Architecture Decision Records (ADRs)

| ID | Title | Status | Date |
|----|-------|--------|------|
| [ADR-001](./adr/001-tech-stack.md) | Technology Stack | Accepted | 2025-12-10 |
| [ADR-002](./adr/002-module-architecture.md) | Module Architecture | Accepted | 2025-12-10 |
| [ADR-003](./adr/003-mcp-client.md) | MCP Client Implementation | Accepted | 2025-12-11 |

---

## Related Documentation

- [Plans](../plans/) - Feature implementation plans
- [Features](../features/) - Feature specifications
- [API Docs](http://localhost:3000/docs) - Swagger documentation (local)
