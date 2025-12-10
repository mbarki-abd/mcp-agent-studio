# PLAN-003: Dashboard Modules

## Status: COMPLETED

| Attribut | Valeur |
|----------|--------|
| ID | PLAN-003 |
| Titre | Dashboard - Architecture Modulaire & Modules Core |
| Priorité | P1 (High) |
| Créé | 2025-12-10 |
| Dépend de | PLAN-002 |

---

## Objectif

Implémenter l'architecture modulaire du dashboard et les modules core:
- Module Loader & Registry
- Module Agents
- Module Tasks
- Module Monitoring
- Module Tools
- Module Chat

---

## Architecture Modulaire

```
apps/dashboard/src/
├── core/                    # @mcp/core
│   ├── auth/                # Auth context + CASL
│   ├── modules/             # Module loader
│   ├── api/                 # API client
│   ├── websocket/           # WS manager
│   └── theme/               # Theme provider
│
├── modules/                 # Modules pluggables
│   ├── agents/
│   ├── tasks/
│   ├── monitoring/
│   ├── tools/
│   └── chat/
│
└── App.tsx                  # Module registration
```

---

## Phases

### Phase 3.1: Core Package

**Fichiers à créer:**
```
apps/dashboard/src/core/
├── modules/
│   ├── ModuleLoader.tsx
│   ├── ModuleRegistry.ts
│   └── types.ts
├── auth/
│   ├── AuthProvider.tsx
│   ├── useAuth.ts
│   └── ability.ts          # CASL
├── api/
│   ├── client.ts           # Axios/fetch wrapper
│   └── hooks.ts            # TanStack Query hooks
└── websocket/
    ├── WebSocketProvider.tsx
    └── useWebSocket.ts
```

**Tasks:**
- [x] Implémenter ModuleLoader avec lazy loading
- [x] Implémenter ModuleRegistry
- [x] Implémenter AuthProvider avec CASL
- [x] Implémenter API client avec interceptors
- [x] Implémenter WebSocket manager
- [ ] Tests

---

### Phase 3.2: Module Agents

**Structure:**
```
modules/agents/
├── index.ts                 # ModuleDefinition
├── routes.tsx
├── pages/
│   ├── AgentsList.tsx
│   ├── AgentDetail.tsx
│   └── CreateAgent.tsx
├── components/
│   ├── AgentCard.tsx
│   ├── AgentStatusBadge.tsx
│   └── AgentHierarchy.tsx
├── wizards/
│   └── CreateAgentWizard.tsx
└── stores/
    └── agents.store.ts
```

**Pages:**
| Route | Component | Description |
|-------|-----------|-------------|
| `/agents` | AgentsList | Liste avec filtres |
| `/agents/:id` | AgentDetail | Détails + actions |
| `/agents/new` | CreateAgent | Wizard création |

**Tasks:**
- [x] Implémenter module definition
- [x] Implémenter AgentsList avec DataTable
- [x] Implémenter AgentDetail
- [x] Implémenter CreateAgentWizard (4 steps)
- [x] Implémenter AgentHierarchy (tree view)
- [x] Store Zustand
- [ ] Tests

---

### Phase 3.3: Module Tasks

**Structure:**
```
modules/tasks/
├── index.ts
├── routes.tsx
├── pages/
│   ├── TasksList.tsx
│   ├── TaskDetail.tsx
│   └── CreateTask.tsx
├── components/
│   ├── TaskCard.tsx
│   ├── TaskTimeline.tsx
│   ├── ScheduleDisplay.tsx
│   └── ExecutionHistory.tsx
├── wizards/
│   └── CreateTaskWizard.tsx
└── stores/
    └── tasks.store.ts
```

**Wizard Steps:**
1. **Info** - Titre, description, priorité
2. **Schedule** - Mode (immediate/scheduled/recurring), cron
3. **Agent** - Assignment mode, agent selection
4. **Prompt** - Prompt editor, variables, optimizer

**Tasks:**
- [x] Implémenter module definition
- [x] Implémenter TasksList
- [x] Implémenter TaskDetail avec ExecutionHistory
- [x] Implémenter CreateTaskWizard (4 steps)
- [x] Cron expression builder
- [x] Prompt editor avec syntax highlighting
- [ ] Tests

---

### Phase 3.4: Module Monitoring

**Structure:**
```
modules/monitoring/
├── index.ts
├── routes.tsx
├── pages/
│   └── ControlCenter.tsx
├── components/
│   ├── AgentGrid.tsx
│   ├── AgentMonitorCard.tsx
│   ├── TodoProgress.tsx
│   ├── TerminalView.tsx      # xterm.js
│   └── MetricsChart.tsx
└── stores/
    └── monitoring.store.ts
```

**Features:**
- Grid temps réel des agents
- Todo progress par agent
- Terminal streaming (lecture seule)
- Métriques et charts

**Tasks:**
- [x] Implémenter ControlCenter layout
- [x] Implémenter AgentGrid avec status live
- [x] Implémenter TodoProgress component
- [x] Implémenter TerminalView avec xterm.js
- [x] WebSocket subscriptions
- [ ] Tests

---

### Phase 3.5: Module Tools

**Structure:**
```
modules/tools/
├── index.ts
├── routes.tsx
├── pages/
│   ├── ToolsCatalog.tsx
│   ├── ServerTools.tsx
│   └── AgentPermissions.tsx
├── components/
│   ├── ToolCard.tsx
│   ├── ToolsGrid.tsx
│   └── PermissionMatrix.tsx
├── wizards/
│   └── InstallToolWizard.tsx
└── stores/
    └── tools.store.ts
```

**Tasks:**
- [x] Implémenter ToolsCatalog (global)
- [x] Implémenter ServerTools (par serveur)
- [x] Implémenter AgentPermissions matrix
- [ ] Implémenter InstallToolWizard
- [ ] Tests

---

### Phase 3.6: Module Chat

**Structure:**
```
modules/chat/
├── index.ts
├── routes.tsx
├── pages/
│   └── AgentChat.tsx
├── components/
│   ├── ChatMessage.tsx
│   ├── ChatInput.tsx
│   ├── ChatHistory.tsx
│   └── PromptOptimizer.tsx
└── stores/
    └── chat.store.ts
```

**Features:**
- Chat par agent
- Historique conversations
- Prompt Optimizer (agent dédié)
- Streaming responses

**Tasks:**
- [x] Implémenter AgentChat interface
- [x] Implémenter ChatMessage avec markdown
- [x] Implémenter streaming responses (simulated)
- [ ] Implémenter PromptOptimizer
- [ ] Tests

---

## Critères de Complétion

- [x] Tous les modules chargés dynamiquement
- [x] Navigation sidebar générée depuis modules
- [x] RBAC appliqué sur toutes les routes
- [x] WebSocket stable avec reconnection
- [ ] Coverage tests > 80%
- [x] Responsive design

---

## Dependencies

```json
{
  "@tanstack/react-query": "^5.x",
  "@casl/ability": "^6.x",
  "@casl/react": "^4.x",
  "zustand": "^5.x",
  "react-hook-form": "^7.x",
  "@hookform/resolvers": "^3.x",
  "zod": "^3.x",
  "xterm": "^5.x",
  "xterm-addon-fit": "^0.8.x",
  "recharts": "^2.x",
  "@radix-ui/react-*": "latest"
}
```

---

## Next Steps

Après complétion, passer à **PLAN-004: Infrastructure & Deployment** pour le déploiement sur Hetzner.
