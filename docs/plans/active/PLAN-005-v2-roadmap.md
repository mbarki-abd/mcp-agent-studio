# PLAN-005: MCP Agent Studio V2 Roadmap

**Status:** ACTIVE (Phase 1 & 2 Complete)
**Priority:** P0 (Critical)
**Created:** 2025-12-11
**Last Updated:** 2025-12-12

---

## Overview

Plan d'implémentation V2 pour MCP Agent Studio - Plateforme SaaS B2B de gestion multi-agents MCP.

### Vision

> Une plateforme centralisée pour gérer plusieurs serveurs MCP, leurs agents et outils, avec exécution réelle des tâches et monitoring en temps réel.

---

## Analyse de l'État Actuel

### Implémenté (100%)

| Feature | Status | Location |
|---------|--------|----------|
| Authentification JWT + Sessions | ✅ | `server/src/routes/auth.routes.ts` |
| RBAC avec CASL | ✅ | `server/src/utils/abilities.ts` |
| Module System (ModuleRegistry) | ✅ | `apps/dashboard/src/core/modules/` |
| WebSocket base | ✅ | `server/src/services/websocket.service.ts` |
| Agent CRUD | ✅ | `server/src/routes/agents.routes.ts` |
| Server Configuration | ✅ | `server/src/routes/servers.routes.ts` |
| Server Online Validation | ✅ | Health check before add |
| Database Schema (12 models) | ✅ | `server/prisma/schema.prisma` |

### Partiel (50-80%)

| Feature | Status | Manque |
|---------|--------|--------|
| Multi-tenancy | 🔄 70% | Isolation complète Organization |
| Wizards/Funnels | 🔄 30% | Wizards complets avec steps |
| Monitoring Dashboard | 🔄 50% | Charts temps réel |
| Tools Management | 🔄 60% | Installation via Master Agent |

### Non Implémenté (0%)

| Feature | Priority | Effort |
|---------|----------|--------|
| Task Execution RÉELLE via MCP | P0 | L |
| Master Agent Service | P0 | XL |
| Tool Installation via Master | P0 | L |
| Terminal Streaming (xterm.js) | P1 | M |
| Agent Creation via Prompt | P1 | L |
| Billing/Subscriptions (Stripe) | P2 | L |
| Analytics Dashboard | P2 | M |
| Multi-language i18n | P3 | S |

---

## Architecture V2

### Flux Principal

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          MCP AGENT STUDIO V2                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Dashboard (React)                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Servers │ Agents │ Tasks │ Tools │ Monitoring │ Chat          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     Backend API (Fastify)                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │   │
│  │  │   Auth   │  │  Servers │  │  Agents  │  │ MCP Client   │   │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │   │
│  │                                                │                │   │
│  │                                                ▼                │   │
│  │                              ┌──────────────────────────────┐  │   │
│  │                              │   Master Agent Service       │  │   │
│  │                              │   - Create Agents via Prompt │  │   │
│  │                              │   - Install Tools            │  │   │
│  │                              │   - Execute Tasks            │  │   │
│  │                              └──────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     Remote MCP Servers                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │ MyServer     │  │ Server 2     │  │ Server N     │          │   │
│  │  │ Master Agent │  │ Master Agent │  │ Master Agent │          │   │
│  │  │ Tools        │  │ Tools        │  │ Tools        │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Database Schema V2

```prisma
// Extensions au schema actuel

model ToolDefinition {
  id           String   @id @default(uuid())
  name         String   @unique  // "jq", "ripgrep", "docker"
  displayName  String
  description  String?
  category     String   // CLI, Development, DevOps
  version      String
  installCmd   String   // apt-get install jq
  checkCmd     String   // jq --version
  docUrl       String?
  serverTools  ServerTool[]
}

model ServerTool {
  id               String   @id @default(uuid())
  serverId         String
  toolId           String
  status           ToolStatus @default(AVAILABLE)
  installedVersion String?
  installedAt      DateTime?
  healthStatus     HealthStatus @default(UNKNOWN)
  lastHealthCheck  DateTime?

  server           ServerConfiguration @relation(...)
  tool             ToolDefinition @relation(...)
  permissions      AgentToolPermission[]
}

model AgentToolPermission {
  id           String   @id @default(uuid())
  agentId      String
  serverToolId String
  canUse       Boolean  @default(true)
  rateLimit    Int?     // calls per minute
  grantedBy    String
  grantedAt    DateTime @default(now())

  agent        Agent @relation(...)
  serverTool   ServerTool @relation(...)
}
```

---

## Phases d'Implémentation

### Phase 1: Core MCP (P0) - CRITIQUE

**Objectif:** Exécution réelle des tâches via MCP

#### 1.1 Master Agent Service

```typescript
// server/src/services/master-agent.service.ts

interface MasterAgentService {
  // Connexion au Master Agent d'un serveur
  connect(serverId: string): Promise<MCPConnection>;

  // Créer un agent via prompt
  createAgent(serverId: string, prompt: string): Promise<Agent>;

  // Installer un outil
  installTool(serverId: string, toolName: string): Promise<ToolInstallResult>;

  // Exécuter une tâche
  executeTask(taskId: string): Promise<TaskExecution>;

  // Stream terminal output
  streamTerminal(taskId: string): AsyncIterable<TerminalOutput>;
}
```

#### 1.2 Task Execution Real

```typescript
// server/src/services/task-execution.service.ts

interface TaskExecutionService {
  // Démarrer l'exécution
  start(taskId: string): Promise<TaskExecution>;

  // Suivre le progress en temps réel
  onProgress(taskId: string, callback: (progress: Progress) => void): void;

  // Annuler
  cancel(taskId: string): Promise<void>;

  // Retry
  retry(executionId: string): Promise<TaskExecution>;
}
```

#### 1.3 Tool Installation

```typescript
// server/src/services/tool-installation.service.ts

interface ToolInstallationService {
  // Lister les outils disponibles
  listAvailable(): Promise<ToolDefinition[]>;

  // Installer sur un serveur
  install(serverId: string, toolId: string): Promise<InstallResult>;

  // Vérifier l'installation
  verify(serverId: string, toolId: string): Promise<VerifyResult>;

  // Désinstaller
  uninstall(serverId: string, toolId: string): Promise<void>;
}
```

**Livrables Phase 1:** ✅ COMPLETE
- [x] MasterAgentService avec connexion MCP
- [x] TaskExecutionService avec exécution réelle
- [x] ToolInstallationService
- [x] WebSocket events pour progress
- [ ] Tests d'intégration (à faire)

---

### Phase 2: Dashboard Enhancement (P1)

**Objectif:** UI complète pour V2 features

#### 2.1 Wizards Complets

```
Server Wizard:
┌─────────────────────────────────────────┐
│ Step 1: Basics                          │
│ ├─ Name                                 │
│ ├─ URL                                  │
│ └─ Master Token                         │
├─────────────────────────────────────────┤
│ Step 2: Validation                      │
│ ├─ Test Connection ✓                    │
│ ├─ Check Master Agent ✓                 │
│ └─ Fetch Capabilities ✓                 │
├─────────────────────────────────────────┤
│ Step 3: Tools Setup                     │
│ ├─ [ ] jq (JSON processor)              │
│ ├─ [x] ripgrep (Fast search)            │
│ └─ [ ] docker (Containers)              │
├─────────────────────────────────────────┤
│ Step 4: Initial Agent                   │
│ ├─ Name: "Assistant"                    │
│ └─ Role: ASSISTANT                      │
└─────────────────────────────────────────┘
```

#### 2.2 Terminal Streaming

```typescript
// apps/dashboard/src/components/Terminal/
// Intégration xterm.js pour output en temps réel

interface TerminalProps {
  taskId: string;
  onComplete?: (result: ExecutionResult) => void;
}
```

#### 2.3 Real-time Monitoring

```typescript
// Composants de monitoring
- ServerHealthCard (status, latency, uptime)
- AgentActivityFeed (recent actions)
- TaskQueueVisualization (pending, running, completed)
- ResourceUsageCharts (CPU, Memory, Connections)
```

**Livrables Phase 2:** ✅ COMPLETE
- [x] ServerWizard complet (4 steps)
- [x] AgentWizard avec prompt
- [x] TaskWizard avec scheduling
- [x] Terminal component (xterm.js)
- [ ] ToolWizard avec install (optionnel)
- [ ] Real-time charts (Recharts) (optionnel)

---

### Phase 3: Advanced Features (P2)

**Objectif:** Features enterprise

#### 3.1 Multi-Organization

```typescript
// Isolation complète par Organization
model Organization {
  id          String   @id
  name        String
  plan        PlanType // FREE, PRO, ENTERPRISE
  users       User[]
  servers     ServerConfiguration[]
  quotas      OrganizationQuota
}
```

#### 3.2 Billing Integration

```typescript
// Stripe integration pour subscriptions
interface BillingService {
  createSubscription(orgId: string, plan: Plan): Promise<Subscription>;
  updatePlan(orgId: string, newPlan: Plan): Promise<void>;
  cancelSubscription(orgId: string): Promise<void>;
  getUsage(orgId: string): Promise<UsageReport>;
}
```

#### 3.3 Analytics

```typescript
// Métriques et analytics
- Task success rate
- Agent performance
- Tool usage statistics
- Cost per organization
```

**Livrables Phase 3:**
- [ ] Multi-org isolation
- [ ] Stripe billing
- [ ] Usage quotas
- [ ] Analytics dashboard

---

### Phase 4: Scale & Polish (P3)

**Objectif:** Production-ready

#### 4.1 Observability

```yaml
# Prometheus + Grafana
metrics:
  - mcp_tasks_total
  - mcp_task_duration_seconds
  - mcp_agent_connections
  - mcp_tool_installations
```

#### 4.2 High Availability

```yaml
# Docker Compose production
services:
  api:
    deploy:
      replicas: 3
  redis:
    deploy:
      mode: replicated
  postgres:
    deploy:
      replicas: 2 # master + replica
```

#### 4.3 i18n

```typescript
// Support multi-langue
languages: ['en', 'fr', 'es', 'de']
```

**Livrables Phase 4:**
- [ ] Prometheus metrics
- [ ] Grafana dashboards
- [ ] HA deployment
- [ ] i18n support

---

## Timeline (sans dates)

```
Phase 1 (Core MCP)
├── Master Agent Service
├── Task Execution Real
├── Tool Installation
└── WebSocket Progress

Phase 2 (Dashboard)
├── Wizards
├── Terminal Streaming
└── Real-time Monitoring

Phase 3 (Advanced)
├── Multi-org
├── Billing
└── Analytics

Phase 4 (Scale)
├── Observability
├── HA
└── i18n
```

---

## Risques et Mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| MCP Protocol changes | High | Version pinning, adapter pattern |
| Master Agent unavailable | High | Retry logic, health checks |
| Scale bottlenecks | Medium | Redis caching, connection pooling |
| Security vulnerabilities | High | Audit, OWASP compliance |

---

## Métriques de Succès

| Métrique | Target |
|----------|--------|
| Task execution success rate | > 95% |
| API response time (p99) | < 200ms |
| WebSocket latency | < 50ms |
| Tool installation success | > 99% |
| Uptime | 99.9% |

---

## Références

- [Plan V2 Original](file://C:/Users/mbark/.claude/plans/mossy-forging-treehouse.md)
- [Architecture Overview](../architecture/README.md)
- [ADR Index](../architecture/DECISIONS.md)
- [MCP Protocol Spec](https://modelcontextprotocol.io/)
