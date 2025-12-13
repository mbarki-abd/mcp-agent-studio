# PLAN-006: MCP Agent Server Integration

## 🎯 Objectif

Implémenter toutes les fonctionnalités manquantes dans le dashboard **MCP Agent Studio** pour provisionner et contrôler les serveurs **mcp-agent-server** (instances déployées sur Hetzner).

### Nomenclature
- **mcp-agent-studio**: Dashboard de contrôle (ce projet)
- **mcp-agent-server**: Serveurs MCP distants à contrôler (API sur Hetzner)

## 📊 Gap Analysis Summary

| Catégorie | Implémenté | Manquant | Couverture |
|-----------|------------|----------|------------|
| Agents API | 40% | 60% | PARTIEL |
| Tokens API | 0% | 100% | MANQUANT |
| Credentials API | 0% | 100% | MANQUANT |
| Workspaces/Projects | 0% | 100% | MANQUANT |
| Filesystem API | 0% | 100% | MANQUANT |
| Terminal API | 60% | 40% | PARTIEL |
| Health & Monitoring | 0% | 100% | MANQUANT |
| Presence API | 0% | 100% | MANQUANT |
| Dashboard WebSocket | 0% | 100% | MANQUANT |
| Hetzner Provisioning | 0% | 100% | MANQUANT |
| Messages API (Claude) | 0% | 100% | MANQUANT |

**Couverture globale: ~35%**

---

## 🏗️ Architecture Cible

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         MCP Agent Studio Dashboard                        │
│                        (mcp.ilinqsoft.com)                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Agents    │  │  Terminals  │  │ Credentials │  │  Filesystem │    │
│  │  Management │  │  (xterm.js) │  │   Vault     │  │   Browser   │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │                │            │
│  ┌──────┴────────────────┴────────────────┴────────────────┴──────┐    │
│  │                    WebSocket Manager                            │    │
│  │   /ws/dashboard  │  /api/presence/ws  │  /api/terminals/ws     │    │
│  └───────────────────────────┬────────────────────────────────────┘    │
│                              │                                          │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ mcp-agent-srv-1 │  │ mcp-agent-srv-2 │  │ mcp-agent-srv-N │
│  (Hetzner VM)   │  │  (Hetzner VM)   │  │  (Hetzner VM)   │
│                 │  │                 │  │                 │
│  - Agents       │  │  - Agents       │  │  - Agents       │
│  - Workspaces   │  │  - Workspaces   │  │  - Workspaces   │
│  - Projects     │  │  - Projects     │  │  - Projects     │
│  - Terminal     │  │  - Terminal     │  │  - Terminal     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 📋 Phases d'Implémentation

### Phase 1: Foundation (Semaine 1-2)
**Objectif:** Établir les connexions WebSocket et les hooks API de base

#### 1.1 Dashboard WebSocket Real-Time
- [ ] Créer `useDashboardWebSocket()` hook
- [ ] Implémenter subscription par topics (agents, tasks, projects, system)
- [ ] Gérer initial_state et events streaming
- [ ] Intégrer dans AppProvider

#### 1.2 Health & Monitoring API
- [ ] Créer `useServerHealth()` hook pour /health
- [ ] Créer `useServerReady()` hook pour /ready
- [ ] Créer composant `ServerHealthStatus`
- [ ] Ajouter health indicators dans ServerDashboard

#### 1.3 Présence API
- [ ] Créer `usePresenceServer()` hook
- [ ] Créer `usePresenceAgents()` hook
- [ ] Créer `usePresenceStatus()` hook
- [ ] Créer `usePresenceWebSocket()` hook
- [ ] Composant `ServerPresenceIndicator`

### Phase 2: Agent Management Avancé (Semaine 3)
**Objectif:** Compléter le cycle de vie des agents

#### 2.1 Agent Provisioning
- [ ] Créer `useProvisionAgent()` mutation
- [ ] Créer wizard `AgentProvisionWizard`
  - Step 1: Configuration de base (name, engine)
  - Step 2: API Key (Claude/OpenAI)
  - Step 3: Capabilities selection
  - Step 4: Confirmation
- [ ] Afficher credentials après provisioning

#### 2.2 Agent Lifecycle
- [ ] Créer `useActivateAgent()` mutation
- [ ] Créer `useSuspendAgent()` mutation
- [ ] Créer `useSyncAgents()` mutation
- [ ] Ajouter boutons activate/suspend dans AgentDashboard

### Phase 3: Tokens & Credentials (Semaine 4)
**Objectif:** Gestion sécurisée des tokens et secrets

#### 3.1 Tokens API
- [ ] Créer hooks dans `tokens.ts`:
  - `useTokens()`
  - `useCreateToken()`
  - `useRevokeToken()`
  - `useDeleteToken()`
- [ ] Créer module `modules/tokens/`
- [ ] Page `TokensList.tsx`
- [ ] Dialog `CreateTokenDialog.tsx`

#### 3.2 Credentials API (Vault)
- [ ] Créer hooks dans `credentials.ts`:
  - `useCredentials()`
  - `useCredential()`
  - `useCreateCredential()`
  - `useUpdateCredential()`
  - `useDeleteCredential()`
  - `useCredentialValue()` (decrypted)
  - `useShareCredential()`
  - `useCredentialAudit()`
- [ ] Créer module `modules/credentials/`
- [ ] Page `CredentialsList.tsx`
- [ ] Dialog `CreateCredentialDialog.tsx`
- [ ] Composant `CredentialValueViewer` (masked by default)

### Phase 4: Workspaces & Projects (Semaine 5)
**Objectif:** Organisation des agents en espaces de travail

#### 4.1 Workspaces API
- [ ] Créer hooks dans `workspaces.ts`
- [ ] Créer module `modules/workspaces/`
- [ ] Pages: `WorkspacesList`, `WorkspaceDetail`
- [ ] Dialog `CreateWorkspaceDialog`

#### 4.2 Projects API
- [ ] Créer hooks dans `projects.ts`
- [ ] Créer module `modules/projects/`
- [ ] Pages: `ProjectsList`, `ProjectDetail`
- [ ] Dialog `CreateProjectDialog`
- [ ] Intégration avec workspaces

### Phase 5: Filesystem API (Semaine 6)
**Objectif:** Navigation et édition du filesystem agent

#### 5.1 Filesystem Hooks
- [ ] Créer hooks dans `filesystem.ts`:
  - `useFilesystemList(agentId, path)`
  - `useFilesystemTree(agentId)`
  - `useFileContent(agentId, path)`
  - `useWriteFile()`
  - `useCreateDirectory()`
  - `useDeletePath()`
  - `useRenamePath()`
  - `useCopyPath()`
  - `useSearchFiles()`

#### 5.2 Filesystem Browser
- [ ] Créer module `modules/filesystem/`
- [ ] Composant `FileBrowser` (tree view)
- [ ] Composant `FileViewer` (Monaco editor)
- [ ] Composant `FileActions` (context menu)
- [ ] Intégrer dans AgentDashboard

### Phase 6: Terminal API Refactoring (Semaine 7)
**Objectif:** Alignement avec l'API spec (WebSocket natif)

#### 6.1 Terminal Session Management
- [ ] Créer `useCreateTerminalSession()` mutation
- [ ] Créer `useTerminalWebSocket()` hook (standard WS, pas Socket.IO)
- [ ] Créer `useTerminalBuffer()` pour historique

#### 6.2 Terminal REST Operations
- [ ] `useExecuteCommand()` mutation
- [ ] `useTerminalInput()` mutation
- [ ] `useKillProcess()` mutation
- [ ] `useCloseTerminal()` mutation

#### 6.3 Terminal Component Update
- [ ] Refactorer `Terminal.tsx` pour utiliser les nouveaux hooks
- [ ] Supporter resize via WebSocket
- [ ] Ajouter historique des commandes

### Phase 7: Claude Messages API (Semaine 8)
**Objectif:** Intégration de l'API Claude

#### 7.1 Messages Hooks
- [ ] Créer hooks dans `messages.ts`:
  - `useSendMessage()` (non-streaming)
  - `useSendMessageStreaming()` (SSE)

#### 7.2 Chat Enhancement
- [ ] Intégrer `/v1/messages` dans le module chat
- [ ] Supporter streaming responses
- [ ] Afficher token usage

### Phase 8: Hetzner Provisioning (Semaine 9-10)
**Objectif:** Provisioning automatique de serveurs MCP

#### 8.1 Provisioning Script
- [ ] Créer `scripts/hetzner-deploy.mjs`
- [ ] Cloud-init template
- [ ] Health check polling
- [ ] Credentials generation

#### 8.2 Dashboard Integration
- [ ] Créer wizard `ServerProvisionWizard`
  - Step 1: Hetzner API Token
  - Step 2: Server config (type, location)
  - Step 3: Provisioning progress (polling)
  - Step 4: Credentials display
- [ ] Page `ProvisionServer.tsx`

#### 8.3 Master Registration
- [ ] Implémenter heartbeat protocol
- [ ] Dashboard multi-serveur

---

## 📁 Structure des Fichiers à Créer

```
apps/dashboard/src/
├── core/
│   ├── api/
│   │   └── hooks/
│   │       ├── tokens.ts          # NEW
│   │       ├── credentials.ts     # NEW
│   │       ├── workspaces.ts      # NEW
│   │       ├── projects.ts        # NEW
│   │       ├── filesystem.ts      # NEW
│   │       ├── terminal.ts        # NEW (refactor)
│   │       ├── presence.ts        # NEW
│   │       ├── health.ts          # NEW
│   │       └── messages.ts        # NEW
│   └── websocket/
│       ├── DashboardWebSocket.ts  # NEW
│       ├── PresenceWebSocket.ts   # NEW
│       └── TerminalWebSocket.ts   # NEW (refactor)
│
├── modules/
│   ├── tokens/                    # NEW MODULE
│   │   ├── index.ts
│   │   └── pages/
│   │       └── TokensList.tsx
│   │
│   ├── credentials/               # NEW MODULE
│   │   ├── index.ts
│   │   └── pages/
│   │       └── CredentialsList.tsx
│   │
│   ├── workspaces/                # NEW MODULE
│   │   ├── index.ts
│   │   └── pages/
│   │       ├── WorkspacesList.tsx
│   │       └── WorkspaceDetail.tsx
│   │
│   ├── projects/                  # NEW MODULE
│   │   ├── index.ts
│   │   └── pages/
│   │       ├── ProjectsList.tsx
│   │       └── ProjectDetail.tsx
│   │
│   ├── filesystem/                # NEW MODULE
│   │   ├── index.ts
│   │   └── components/
│   │       ├── FileBrowser.tsx
│   │       └── FileViewer.tsx
│   │
│   └── provisioning/              # NEW MODULE
│       ├── index.ts
│       └── pages/
│           └── ProvisionServer.tsx
│
scripts/
└── hetzner-deploy.mjs             # NEW
```

---

## 🔄 Types à Ajouter (@mcp/types)

```typescript
// packages/types/src/index.ts additions

// Tokens
export interface Token {
  id: string;
  name: string;
  agentId: string;
  permissions: string[];
  expiresAt?: string;
  createdAt: string;
  lastUsedAt?: string;
}

// Credentials
export interface Credential {
  id: string;
  name: string;
  type: 'api_key' | 'password' | 'ssh_key' | 'token' | 'certificate' | 'secret' | 'other';
  visibility: 'private' | 'internal' | 'public';
  agentId: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Workspaces
export interface Workspace {
  id: string;
  name: string;
  type: 'personal' | 'team' | 'shared';
  ownerId: string;
  projectsCount: number;
  createdAt: string;
  updatedAt: string;
}

// Projects
export interface Project {
  id: string;
  name: string;
  workspaceId: string;
  type: 'generic' | 'nodejs' | 'python' | 'web' | 'api' | 'fullstack' | 'library' | 'script' | 'data' | 'docs' | 'custom';
  status: 'active' | 'inactive' | 'archived';
  path: string;
  createdAt: string;
  updatedAt: string;
}

// Filesystem
export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink';
  size: number;
  permissions: string;
  modifiedAt: string;
}

// Terminal Session
export interface TerminalSession {
  id: string;
  agentId: string;
  status: 'active' | 'idle' | 'closed';
  createdAt: string;
  lastActivityAt: string;
}

// Presence
export interface ServerPresence {
  id: string;
  name: string;
  version: string;
  host: string;
  port: number;
  environment: string;
  startedAt: string;
  uptime: number;
  status: 'online' | 'offline' | 'degraded';
}

export interface AgentPresence {
  id: string;
  name: string;
  unixUser: string;
  engineType: 'claude' | 'openai' | 'custom';
  status: 'active' | 'suspended' | 'offline';
  lastActiveAt: string;
  workspacesCount: number;
  projectsCount: number;
  hasTerminalSession: boolean;
}

// Dashboard WebSocket Events
export type DashboardEventType =
  | 'initial_state'
  | 'agent_update'
  | 'agent_created'
  | 'agent_deleted'
  | 'project_created'
  | 'project_update'
  | 'project_deleted'
  | 'task_started'
  | 'task_progress'
  | 'task_completed'
  | 'task_error'
  | 'todo_update'
  | 'message_sent'
  | 'message_received'
  | 'system_stats';

export interface DashboardEvent<T = unknown> {
  type: DashboardEventType;
  timestamp: string;
  data: T;
}
```

---

## ⚡ Métriques de Succès

| Métrique | Actuel | Cible |
|----------|--------|-------|
| Couverture API | 35% | 95% |
| Modules Dashboard | 8 | 14 |
| Hooks API | 45 | 85+ |
| Real-time Events | Socket.IO | WebSocket natif |
| Tests E2E | 0 | 50+ |

---

## 🚧 Risques et Mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Breaking changes Socket.IO → WebSocket | HIGH | Migration progressive, feature flag |
| Sécurité credentials | CRITICAL | Review crypto, audit logging |
| Latence multi-serveur | MEDIUM | Connection pooling, retry logic |
| Hetzner API limits | LOW | Rate limiting, backoff |

---

## 📅 Timeline Estimée

| Phase | Durée | Dépendances |
|-------|-------|-------------|
| Phase 1: Foundation | 2 semaines | - |
| Phase 2: Agent Management | 1 semaine | Phase 1 |
| Phase 3: Tokens & Credentials | 1 semaine | Phase 1 |
| Phase 4: Workspaces & Projects | 1 semaine | Phase 3 |
| Phase 5: Filesystem | 1 semaine | Phase 2 |
| Phase 6: Terminal Refactor | 1 semaine | Phase 1 |
| Phase 7: Claude Messages | 1 semaine | Phase 1 |
| Phase 8: Hetzner Provisioning | 2 semaines | Phases 1-7 |

**Total: ~10 semaines**

---

## ✅ Critères d'Acceptation

- [ ] Tous les endpoints API documentés sont supportés
- [ ] WebSocket natif remplace Socket.IO pour terminal
- [ ] Dashboard real-time via /ws/dashboard
- [ ] Multi-serveur avec Presence API
- [ ] Provisioning Hetzner fonctionnel
- [ ] Credentials vault sécurisé (AES-256-GCM)
- [ ] Tests E2E pour chaque module
- [ ] Documentation API à jour

---

**Créé:** 2025-12-13
**Auteur:** GODMODE Daemon
**Version:** 1.0.0
**Status:** EN ATTENTE D'APPROBATION
