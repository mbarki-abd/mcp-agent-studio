# MCP Agent Studio - Plans

## Overview

Documentation des plans d'implémentation pour MCP Agent Studio.

---

## Plans Status

### Active (En cours)

| ID | Titre | Priorité | Progress |
|----|-------|----------|----------|
| [PLAN-005](./active/PLAN-005-v2-roadmap.md) | V2 Roadmap - MCP Real Execution | P0 | 0% |
| [PLAN-004](./active/PLAN-004-infrastructure.md) | Infrastructure & Deployment | P2 | 80% |

### Backlog (À venir)

| ID | Titre | Priorité | Dépend de |
|----|-------|----------|-----------|
| PLAN-006 | Multi-Organization & Billing | P2 | PLAN-005 |

### Completed (Terminés)

| ID | Titre | Complété |
|----|-------|----------|
| [PLAN-001](./completed/PLAN-001-initial-setup.md) | Initial Setup | 2025-12-10 |
| [PLAN-002](./completed/PLAN-002-backend-core.md) | Backend Core Implementation | 2025-12-10 |
| [PLAN-003](./completed/PLAN-003-dashboard-modules.md) | Dashboard Modules | 2025-12-11 |

---

## Workflow

```
📋 BACKLOG → 🚧 ACTIVE → ✅ COMPLETED
```

### Commandes

```bash
# Voir status des plans
/plan status

# Activer un plan
/plan activate PLAN-003

# Marquer comme complété
/plan complete PLAN-002

# Créer nouveau plan
/plan "feature description"
```

---

## Structure

```
docs/plans/
├── README.md           # Ce fichier
├── backlog/            # Plans planifiés
├── active/             # Plans en cours
└── completed/          # Plans terminés
```

---

## Conventions

### Nommage
- Format: `PLAN-XXX-slug.md`
- XXX = numéro séquentiel (001, 002, ...)
- slug = nom court en kebab-case

### Priorités
| Code | Signification |
|------|---------------|
| P0 | Critical - Bloquant |
| P1 | High - Important |
| P2 | Medium - Normal |
| P3 | Low - Nice to have |

### Statuts
- **BACKLOG**: Planifié, pas encore commencé
- **ACTIVE**: En cours d'implémentation
- **COMPLETED**: Terminé et validé
- **CANCELLED**: Annulé
