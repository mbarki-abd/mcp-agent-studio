# MCP Agent Studio - Architecture

## Overview

Documentation de l'architecture technique de MCP Agent Studio.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP AGENT STUDIO                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              DASHBOARD (React + Vite)                │   │
│  │                                                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │ Agents   │ │  Tasks   │ │Monitoring│ ...       │   │
│  │  │ Module   │ │  Module  │ │  Module  │           │   │
│  │  └──────────┘ └──────────┘ └──────────┘           │   │
│  │                     │                              │   │
│  │              Core (Auth, API, WS)                  │   │
│  └─────────────────────┼────────────────────────────┘   │
│                        │                                  │
│              HTTP + WebSocket                             │
│                        │                                  │
│  ┌─────────────────────┼────────────────────────────────┐ │
│  │              API SERVER (Fastify)                     │ │
│  │                                                       │ │
│  │  Routes → Services → Prisma → PostgreSQL             │ │
│  │                  ↓                                    │ │
│  │              BullMQ → Redis                          │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture Decision Records (ADRs)

| ID | Titre | Status |
|----|-------|--------|
| [ADR-001](./adr/001-tech-stack.md) | Technology Stack | Accepted |
| [ADR-002](./adr/002-module-architecture.md) | Module Architecture | Accepted |

---

## Tech Stack Summary

### Backend
- **Framework**: Fastify
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Cache/Queue**: Redis + BullMQ
- **Auth**: JWT + CASL

### Frontend
- **Framework**: React 18 + Vite
- **State**: Zustand + TanStack Query
- **UI**: Radix UI + Tailwind CSS
- **Forms**: react-hook-form + Zod

### Infrastructure
- **Monorepo**: Turborepo + pnpm
- **Container**: Docker
- **Proxy**: Traefik
- **Hosting**: Hetzner
- **CI/CD**: GitHub Actions

---

## Data Model Overview

```
User ──┬── Organization
       │
       └── ServerConfiguration ──┬── Agent ──┬── Task
                                 │           │
                                 │           └── TaskExecution
                                 │
                                 └── ServerTool ── ToolDefinition
                                           │
                                           └── AgentToolPermission
```

---

## Module Architecture

```
dashboard/src/
├── core/           # Non-modular core
│   ├── auth/       # Authentication + CASL
│   ├── api/        # API client
│   ├── modules/    # Module system
│   └── layout/     # Shell layout
│
└── modules/        # Feature modules
    ├── agents/
    ├── tasks/
    ├── monitoring/
    ├── tools/
    └── chat/
```

---

## Diagrams

See [diagrams/](./diagrams/) for detailed architecture diagrams.
