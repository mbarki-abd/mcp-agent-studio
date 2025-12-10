# PLAN-002: Backend Core Implementation

## Status: ACTIVE

| Attribut | Valeur |
|----------|--------|
| ID | PLAN-002 |
| Titre | Backend Core - Auth, Services, Routes |
| Priorité | P1 (High) |
| Créé | 2025-12-10 |
| Dépend de | PLAN-001 |

---

## Objectif

Implémenter les services backend core:
- Authentication complète (register, login, refresh, logout)
- CRUD complet pour toutes les entités
- Services métier
- Middleware RBAC avec CASL

---

## Phases

### Phase 2.1: Authentication Service

**Fichiers à créer:**
```
server/src/
├── services/
│   └── auth.service.ts
├── middleware/
│   ├── auth.middleware.ts
│   └── rbac.middleware.ts
└── utils/
    ├── password.ts
    └── jwt.ts
```

**Endpoints:**
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Créer compte + organisation |
| POST | `/api/auth/login` | Login, retourne JWT |
| POST | `/api/auth/refresh` | Refresh token |
| POST | `/api/auth/logout` | Invalider session |
| GET | `/api/auth/me` | Profil utilisateur |

**Tasks:**
- [ ] Implémenter `auth.service.ts` (register, login, validateToken)
- [ ] Implémenter `password.ts` (hash avec bcrypt)
- [ ] Implémenter `auth.middleware.ts` (JWT validation)
- [ ] Compléter `auth.routes.ts` avec handlers
- [ ] Tests unitaires auth

---

### Phase 2.2: Server Configuration Service

**Fichiers à créer:**
```
server/src/services/
└── server-config.service.ts
```

**Endpoints:**
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/servers` | Liste serveurs user |
| POST | `/api/servers` | Ajouter serveur |
| GET | `/api/servers/:id` | Détails serveur |
| PUT | `/api/servers/:id` | Modifier serveur |
| DELETE | `/api/servers/:id` | Supprimer serveur |
| POST | `/api/servers/:id/test` | Tester connexion |
| POST | `/api/servers/:id/health` | Health check |

**Tasks:**
- [ ] Implémenter `server-config.service.ts`
- [ ] Logique de test de connexion au serveur MCP
- [ ] Encryption du masterToken (AES-256)
- [ ] Compléter `servers.routes.ts`
- [ ] Tests

---

### Phase 2.3: Agent Service

**Fichiers à créer:**
```
server/src/services/
├── agent.service.ts
└── master-agent.service.ts
```

**Endpoints:**
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/agents` | Liste agents (avec filtres) |
| POST | `/api/agents` | Créer agent |
| GET | `/api/agents/:id` | Détails agent |
| PUT | `/api/agents/:id` | Modifier agent |
| DELETE | `/api/agents/:id` | Supprimer agent |
| POST | `/api/agents/:id/validate` | Valider agent (admin) |
| POST | `/api/agents/:id/execute` | Exécuter prompt |
| GET | `/api/agents/:id/status` | Status temps réel |

**Master Agent:**
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/master/execute` | Exécution + SSE streaming |
| POST | `/api/master/create-agent` | Créer agent via prompt |

**Tasks:**
- [ ] Implémenter `agent.service.ts`
- [ ] Implémenter `master-agent.service.ts`
- [ ] Logique hiérarchie (supervisor/subordinates)
- [ ] SSE streaming pour exécutions
- [ ] Compléter `agents.routes.ts`
- [ ] Tests

---

### Phase 2.4: Task Service

**Fichiers à créer:**
```
server/src/services/
├── task.service.ts
└── scheduler.service.ts
```

**Endpoints:**
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/tasks` | Liste tâches |
| POST | `/api/tasks` | Créer tâche |
| GET | `/api/tasks/:id` | Détails tâche |
| PUT | `/api/tasks/:id` | Modifier tâche |
| DELETE | `/api/tasks/:id` | Supprimer tâche |
| POST | `/api/tasks/:id/run` | Exécuter maintenant |
| POST | `/api/tasks/:id/cancel` | Annuler exécution |
| GET | `/api/tasks/:id/executions` | Historique |

**Tasks:**
- [ ] Implémenter `task.service.ts`
- [ ] Implémenter `scheduler.service.ts` (BullMQ)
- [ ] Logique assignment (manual, auto, by_capability)
- [ ] Support cron expressions
- [ ] Compléter `tasks.routes.ts`
- [ ] Tests

---

### Phase 2.5: Tools Service

**Fichiers à créer:**
```
server/src/services/
└── tools.service.ts
```

**Endpoints:**
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/tools` | Catalogue outils |
| GET | `/api/tools/server/:serverId` | Outils installés |
| POST | `/api/tools/server/:serverId/install` | Installer outil |
| DELETE | `/api/tools/server/:serverId/:toolId` | Désinstaller |
| GET | `/api/tools/agent/:agentId/permissions` | Permissions agent |
| PUT | `/api/tools/agent/:agentId/permissions` | Modifier permissions |

**Tasks:**
- [ ] Implémenter `tools.service.ts`
- [ ] Seed catalogue outils (git, docker, node, etc.)
- [ ] Logique installation sur serveur distant
- [ ] Compléter `tools.routes.ts`
- [ ] Tests

---

### Phase 2.6: Monitoring Service (WebSocket)

**Fichiers à créer:**
```
server/src/services/
└── monitoring.service.ts
server/src/websocket/
├── index.ts
└── handlers.ts
```

**WebSocket Events:**
| Event | Direction | Description |
|-------|-----------|-------------|
| `agent:status` | Server→Client | Changement status agent |
| `agent:todo` | Server→Client | Progress todo list |
| `agent:execution` | Server→Client | Output streaming |
| `subscribe:agent` | Client→Server | S'abonner à un agent |
| `unsubscribe:agent` | Client→Server | Se désabonner |

**Tasks:**
- [ ] Implémenter WebSocket handlers
- [ ] Implémenter `monitoring.service.ts`
- [ ] Room management par agent/user
- [ ] RBAC sur subscriptions
- [ ] Tests

---

## Critères de Complétion

- [ ] Tous les endpoints implémentés et testés
- [ ] Coverage tests > 80%
- [ ] Swagger documentation complète
- [ ] Aucune erreur TypeScript
- [ ] Migration Prisma appliquée

---

## Estimations

| Phase | Complexité |
|-------|------------|
| 2.1 Auth | M |
| 2.2 Servers | S |
| 2.3 Agents | L |
| 2.4 Tasks | L |
| 2.5 Tools | M |
| 2.6 Monitoring | M |

---

## Next Steps

Après complétion, passer à **PLAN-003: Dashboard Modules** pour l'implémentation frontend.
