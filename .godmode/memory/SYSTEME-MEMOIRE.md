# 🧠 SYSTÈME DE MÉMOIRE DISTRIBUÉE GODMODE

> *"La mémoire est le fondement de la continuité et de l'apprentissage"*

---

## 📐 ARCHITECTURE DE LA MÉMOIRE

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    ARCHITECTURE MÉMOIRE GODMODE                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ┌─────────────────────────────────────────────────────────────────────┐    ║
║  │                    NIVEAU 1: MÉMOIRE CENTRALE                        │    ║
║  │                    (Persistent - Fichiers JSON/YAML)                 │    ║
║  │  ┌────────────────────────────────────────────────────────────────┐│    ║
║  │  │  STATE GLOBAL                                                  ││    ║
║  │  │  • État du projet                                              ││    ║
║  │  │  • Index des agents                                            ││    ║
║  │  │  • Historique décisions                                        ││    ║
║  │  │  • Métriques globales                                          ││    ║
║  │  └────────────────────────────────────────────────────────────────┘│    ║
║  └─────────────────────────────────────────────────────────────────────┘    ║
║                                    │                                         ║
║                    ┌───────────────┼───────────────┐                        ║
║                    │               │               │                        ║
║  ┌─────────────────▼───┐ ┌────────▼────────┐ ┌───▼─────────────────┐       ║
║  │ NIVEAU 2: CONTEXTES │ │ NIVEAU 2: PKGS  │ │ NIVEAU 2: THREADS   │       ║
║  │    (Par Agent)      │ │   (Handoffs)    │ │  (Communications)   │       ║
║  │                     │ │                 │ │                     │       ║
║  │ • Mission active    │ │ • Architecture  │ │ • Conversations     │       ║
║  │ • Historique local  │ │ • Backend pkg   │ │ • Décisions         │       ║
║  │ • Fichiers touchés  │ │ • Frontend pkg  │ │ • Questions/Rép.    │       ║
║  │ • Connaissances     │ │ • Tests pkg     │ │                     │       ║
║  └─────────────────────┘ └─────────────────┘ └─────────────────────┘       ║
║                                    │                                         ║
║  ┌─────────────────────────────────▼───────────────────────────────────┐    ║
║  │                    NIVEAU 3: ARCHIVES                                │    ║
║  │                    (Historique compressé)                            │    ║
║  │  • Sessions précédentes                                             │    ║
║  │  • Agents dissous                                                    │    ║
║  │  • Projets terminés                                                  │    ║
║  └─────────────────────────────────────────────────────────────────────┘    ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 📁 STRUCTURE DES FICHIERS

```
.godmode/
├── memory/
│   │
│   ├── central/                          # NIVEAU 1: État Global
│   │   ├── project-state.json            # État actuel du projet
│   │   ├── agents-registry.json          # Registre des agents
│   │   ├── decisions-log.json            # Journal des décisions
│   │   ├── metrics.json                  # Métriques globales
│   │   └── checkpoints/                  # Points de sauvegarde
│   │       ├── checkpoint-latest.json
│   │       └── checkpoint-{timestamp}.json
│   │
│   ├── agents/                           # NIVEAU 2: Contextes Agents
│   │   ├── GRAND-MAITRE/
│   │   │   ├── context.json              # Contexte actuel
│   │   │   ├── history.json              # Historique des actions
│   │   │   └── knowledge.json            # Connaissances acquises
│   │   │
│   │   ├── AGT-STRAT-ARCH-001/
│   │   │   ├── context.json
│   │   │   ├── history.json
│   │   │   ├── knowledge.json
│   │   │   └── artifacts/                # Artefacts produits
│   │   │       └── ...
│   │   │
│   │   └── [autres agents]/
│   │
│   ├── packages/                         # NIVEAU 2: Packages Handoff
│   │   ├── architecture.pkg.json
│   │   ├── backend-auth.pkg.json
│   │   ├── frontend-ui.pkg.json
│   │   ├── tests-e2e.pkg.json
│   │   └── deploy.pkg.json
│   │
│   ├── threads/                          # NIVEAU 2: Conversations
│   │   ├── THREAD-001-auth-design/
│   │   │   ├── metadata.json
│   │   │   └── messages.json
│   │   └── ...
│   │
│   └── archive/                          # NIVEAU 3: Archives
│       ├── sessions/
│       │   └── 2024/
│       │       └── 01/
│       │           └── session-20240115.tar.gz
│       ├── agents/
│       │   └── AGT-DEV-BACK-001-dissolved.json
│       └── projects/
│           └── project-v1-complete.tar.gz
```

---

## 📋 SCHÉMAS DE DONNÉES

### 1. État Global du Projet (project-state.json)

```json
{
  "version": "1.0",
  "project": {
    "id": "PRJ-20240115-ecommerce",
    "name": "E-Commerce Platform",
    "type": "WF-ECOMMERCE",
    "complexity": "GAMMA",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-20T15:30:00Z"
  },

  "status": {
    "phase": "P3-BUILD",
    "sub_phase": "P3.2-BACKEND",
    "progress_percentage": 45,
    "health": "GREEN"
  },

  "workflow": {
    "id": "WF-ECOMMERCE",
    "current_phase_index": 2,
    "phases_completed": ["P1-DISCOVERY", "P2-ARCHITECTURE"],
    "phases_remaining": ["P3-BUILD", "P4-INTEGRATIONS", "P5-FRONTEND", "P6-ADMIN", "P7-QA", "P8-DEPLOY"]
  },

  "agents": {
    "active_count": 8,
    "total_recruited": 12,
    "dissolved_count": 4
  },

  "metrics": {
    "tasks_total": 47,
    "tasks_completed": 21,
    "tasks_in_progress": 5,
    "tasks_blocked": 1,
    "code_coverage": 78,
    "technical_debt": "LOW"
  },

  "blockers": [
    {
      "id": "BLK-001",
      "description": "En attente de l'API de paiement Stripe",
      "blocking_agents": ["AGT-DEV-BACK-003"],
      "severity": "MEDIUM",
      "created_at": "2024-01-19T14:00:00Z"
    }
  ],

  "next_milestones": [
    {
      "name": "Backend API Complete",
      "target_date": "2024-01-25",
      "progress": 75
    }
  ]
}
```

### 2. Registre des Agents (agents-registry.json)

```json
{
  "version": "1.0",
  "last_updated": "2024-01-20T15:30:00Z",

  "agents": {
    "GRAND-MAITRE": {
      "id": "GRAND-MAITRE",
      "status": "ACTIVE",
      "type": "ORCHESTRATOR",
      "tier": 0,
      "created_at": "2024-01-15T10:00:00Z",
      "permissions": {
        "read": ["*"],
        "write": ["*"],
        "recruit": true,
        "communicate": ["*"]
      },
      "statistics": {
        "decisions_made": 34,
        "agents_recruited": 12,
        "agents_dissolved": 4,
        "escalations_handled": 3
      }
    },

    "AGT-STRAT-ARCH-001": {
      "id": "AGT-STRAT-ARCH-001",
      "status": "COMPLETED",
      "type": "STRATEGIST",
      "tier": 1,
      "profile": "AGT-STRAT-ARCH",
      "created_at": "2024-01-15T10:30:00Z",
      "completed_at": "2024-01-17T18:00:00Z",
      "recruited_by": "GRAND-MAITRE",
      "mission": "Concevoir l'architecture système",
      "permissions": {
        "read": ["*"],
        "write": ["docs/architecture/**"],
        "recruit": true,
        "communicate": ["GRAND-MAITRE", "AGT-LEAD-*"]
      },
      "livrables_produits": [
        "docs/architecture/README.md",
        "docs/architecture/adr/001-microservices.md",
        "docs/architecture/diagrams/system.mermaid"
      ],
      "statistics": {
        "messages_sent": 23,
        "messages_received": 15,
        "files_created": 8,
        "files_modified": 3
      }
    },

    "AGT-DEV-BACK-001": {
      "id": "AGT-DEV-BACK-001",
      "status": "ACTIVE",
      "type": "EXECUTOR",
      "tier": 2,
      "profile": "AGT-DEV-BACK-NODE",
      "created_at": "2024-01-18T09:00:00Z",
      "recruited_by": "AGT-LEAD-BACK-001",
      "mission": "Implémenter l'API Users",
      "current_task": "T-042",
      "permissions": {
        "read": ["src/**", "docs/**"],
        "write": ["src/backend/users/**", "tests/unit/users/**"],
        "recruit": false,
        "communicate": ["AGT-LEAD-BACK-001", "AGT-DEV-BACK-*"]
      },
      "statistics": {
        "tasks_completed": 5,
        "tasks_in_progress": 1,
        "commits": 12,
        "code_lines_added": 1247,
        "code_lines_removed": 89,
        "tests_written": 34
      }
    }
  },

  "hierarchy": {
    "GRAND-MAITRE": {
      "children": ["AGT-STRAT-ARCH-001", "AGT-LEAD-BACK-001", "AGT-LEAD-FRONT-001", "AGT-LEAD-QA-001"]
    },
    "AGT-LEAD-BACK-001": {
      "parent": "GRAND-MAITRE",
      "children": ["AGT-DEV-BACK-001", "AGT-DEV-BACK-002", "AGT-DEV-DB-001"]
    }
  }
}
```

### 3. Contexte d'Agent (agents/{id}/context.json)

```json
{
  "version": "1.0",
  "agent_id": "AGT-DEV-BACK-001",
  "last_updated": "2024-01-20T15:30:00Z",

  "session": {
    "started_at": "2024-01-20T09:00:00Z",
    "messages_processed": 12,
    "tokens_used": 45000,
    "tokens_budget": 50000
  },

  "mission": {
    "id": "MISSION-042",
    "objective": "Implémenter l'API Users",
    "assigned_by": "AGT-LEAD-BACK-001",
    "assigned_at": "2024-01-18T09:00:00Z",
    "deadline": "2024-01-21T18:00:00Z",
    "priority": "HAUTE"
  },

  "current_task": {
    "id": "T-042-05",
    "description": "Implémenter GET /users/:id avec relations",
    "status": "IN_PROGRESS",
    "started_at": "2024-01-20T14:00:00Z",
    "files_being_edited": [
      "src/backend/users/users.controller.ts",
      "src/backend/users/users.service.ts"
    ]
  },

  "working_memory": {
    "files_read": [
      {
        "path": "src/backend/users/users.controller.ts",
        "last_read": "2024-01-20T14:30:00Z",
        "summary": "Controller avec endpoints GET /users, POST /users, DELETE /users/:id"
      },
      {
        "path": "src/backend/users/dto/user.dto.ts",
        "last_read": "2024-01-20T14:15:00Z",
        "summary": "DTOs: CreateUserDto, UpdateUserDto, UserResponseDto"
      }
    ],
    "decisions_pending": [
      {
        "question": "Inclure les relations dans GET /users/:id?",
        "options": ["Eager loading", "Lazy loading", "Query param"],
        "asked_to": "AGT-LEAD-BACK-001",
        "asked_at": "2024-01-20T14:45:00Z"
      }
    ],
    "notes": [
      "Le pattern Repository est utilisé dans ce projet",
      "Les validations utilisent class-validator",
      "Pagination cursor-based, pas offset"
    ]
  },

  "completed_tasks": [
    {
      "id": "T-042-01",
      "description": "Setup module Users",
      "completed_at": "2024-01-18T15:00:00Z"
    },
    {
      "id": "T-042-02",
      "description": "Implémenter POST /users",
      "completed_at": "2024-01-19T11:00:00Z"
    }
  ],

  "handoff_ready": false,
  "handoff_package_path": null
}
```

### 4. Package de Handoff (packages/{name}.pkg.json)

```json
{
  "version": "1.0",
  "package_id": "PKG-backend-users-20240120",
  "created_at": "2024-01-20T18:00:00Z",
  "created_by": "AGT-DEV-BACK-001",

  "metadata": {
    "type": "FEATURE_COMPLETE",
    "feature": "Users API",
    "phase": "P3-BUILD",
    "recipients": ["AGT-QA-UNIT-001", "AGT-QA-INTEG-001"]
  },

  "summary": {
    "objective": "API complète de gestion des utilisateurs",
    "status": "COMPLETED",
    "duration": "3 jours",
    "complexity_encountered": 6
  },

  "deliverables": {
    "files_created": [
      {
        "path": "src/backend/users/users.module.ts",
        "description": "Module NestJS pour Users",
        "lines": 35
      },
      {
        "path": "src/backend/users/users.controller.ts",
        "description": "Controller REST",
        "lines": 120
      },
      {
        "path": "src/backend/users/users.service.ts",
        "description": "Service métier",
        "lines": 180
      }
    ],
    "files_modified": [
      {
        "path": "src/backend/app.module.ts",
        "changes": "Import UsersModule"
      }
    ],
    "tests_created": [
      {
        "path": "tests/unit/users/users.service.spec.ts",
        "coverage": 92,
        "tests_count": 15
      }
    ]
  },

  "api_specification": {
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/v1/users",
        "description": "Liste paginée des utilisateurs",
        "auth": "JWT required",
        "response": "UserResponseDto[]"
      },
      {
        "method": "GET",
        "path": "/api/v1/users/:id",
        "description": "Détail d'un utilisateur",
        "auth": "JWT required",
        "response": "UserResponseDto"
      },
      {
        "method": "POST",
        "path": "/api/v1/users",
        "description": "Créer un utilisateur",
        "auth": "JWT required + Admin",
        "body": "CreateUserDto",
        "response": "UserResponseDto"
      },
      {
        "method": "PUT",
        "path": "/api/v1/users/:id",
        "description": "Modifier un utilisateur",
        "auth": "JWT required + Owner/Admin",
        "body": "UpdateUserDto",
        "response": "UserResponseDto"
      },
      {
        "method": "DELETE",
        "path": "/api/v1/users/:id",
        "description": "Supprimer (soft) un utilisateur",
        "auth": "JWT required + Admin",
        "response": "void"
      }
    ]
  },

  "knowledge_transfer": {
    "patterns_used": [
      "Repository pattern pour l'accès aux données",
      "DTO pattern pour la validation",
      "Guard pattern pour l'autorisation"
    ],
    "decisions_made": [
      {
        "decision": "Soft delete plutôt que hard delete",
        "reason": "Audit trail et récupération possible",
        "adr_ref": "docs/architecture/adr/005-soft-delete.md"
      },
      {
        "decision": "Pagination cursor-based",
        "reason": "Performance sur large datasets",
        "adr_ref": "docs/architecture/adr/004-pagination.md"
      }
    ],
    "gotchas": [
      "Le champ email est unique mais case-insensitive",
      "Les mots de passe sont hashés avec bcrypt (12 rounds)",
      "Les timestamps sont en UTC"
    ]
  },

  "testing_guide": {
    "unit_tests": {
      "command": "npm run test:unit -- --grep users",
      "coverage_target": 80,
      "current_coverage": 92
    },
    "integration_tests": {
      "command": "npm run test:integration -- --grep users",
      "prerequisites": ["Database running", "Redis running"],
      "test_data": "See tests/fixtures/users.fixture.ts"
    },
    "e2e_tests": {
      "scenarios_to_test": [
        "CRUD complet d'un utilisateur",
        "Pagination sur liste > 100 users",
        "Permissions (admin vs user)",
        "Validation des inputs"
      ]
    }
  },

  "remaining_work": {
    "todos": [
      "Tests d'intégration complets",
      "Documentation OpenAPI",
      "Tests E2E"
    ],
    "known_issues": [],
    "tech_debt": [
      {
        "description": "Refactorer la méthode findAll pour accepter plus de filtres",
        "priority": "LOW",
        "estimated_effort": "2h"
      }
    ]
  },

  "next_steps": [
    "AGT-QA-UNIT: Compléter les tests unitaires edge cases",
    "AGT-QA-INTEG: Tests d'intégration API",
    "AGT-LEAD-BACK: Review & merge"
  ]
}
```

### 5. Journal des Décisions (decisions-log.json)

```json
{
  "version": "1.0",
  "decisions": [
    {
      "id": "DEC-001",
      "timestamp": "2024-01-15T11:00:00Z",
      "type": "ARCHITECTURAL",
      "title": "Choix de l'architecture microservices",
      "decided_by": "AGT-STRAT-ARCH-001",
      "approved_by": "GRAND-MAITRE",
      "context": "Projet e-commerce avec forte croissance attendue",
      "decision": "Architecture microservices avec API Gateway",
      "alternatives_considered": [
        {
          "option": "Monolithe modulaire",
          "pros": ["Plus simple", "Déploiement unique"],
          "cons": ["Scaling difficile", "Couplage"]
        },
        {
          "option": "Serverless",
          "pros": ["Scaling auto", "Coût variable"],
          "cons": ["Cold starts", "Vendor lock-in"]
        }
      ],
      "rationale": "La croissance attendue et les équipes séparées justifient les microservices",
      "impact": "ÉLEVÉ",
      "adr_ref": "docs/architecture/adr/001-microservices.md",
      "affected_agents": ["AGT-LEAD-BACK-001", "AGT-LEAD-FRONT-001", "AGT-LEAD-DEVOPS-001"]
    },
    {
      "id": "DEC-002",
      "timestamp": "2024-01-16T14:00:00Z",
      "type": "TECHNICAL",
      "title": "Framework backend: NestJS",
      "decided_by": "AGT-LEAD-BACK-001",
      "approved_by": "AGT-STRAT-ARCH-001",
      "context": "Besoin d'un framework TypeScript robuste",
      "decision": "NestJS avec Prisma ORM",
      "rationale": "TypeScript natif, architecture modulaire, excellente documentation",
      "impact": "ÉLEVÉ",
      "affected_agents": ["AGT-DEV-BACK-*"]
    },
    {
      "id": "DEC-003",
      "timestamp": "2024-01-18T10:00:00Z",
      "type": "PROCESS",
      "title": "Stratégie de test: TDD",
      "decided_by": "AGT-LEAD-QA-001",
      "approved_by": "GRAND-MAITRE",
      "context": "Projet critique nécessitant haute qualité",
      "decision": "Test-Driven Development pour les composants critiques",
      "rationale": "Réduit les bugs en production, améliore le design",
      "impact": "MOYEN",
      "affected_agents": ["AGT-DEV-*", "AGT-QA-*"]
    }
  ]
}
```

---

## 🔄 MÉCANISMES DE PERSISTANCE

### Sauvegarde Automatique

```yaml
auto_save_config:
  triggers:
    - event: "AGENT_ACTION"
      description: "Après chaque action d'agent"
      saves: ["agent_context"]

    - event: "TASK_COMPLETE"
      description: "Quand une tâche est terminée"
      saves: ["agent_context", "project_state", "metrics"]

    - event: "PHASE_TRANSITION"
      description: "Changement de phase"
      saves: ["full_checkpoint"]

    - event: "DECISION_MADE"
      description: "Décision importante"
      saves: ["decisions_log", "agent_context"]

    - event: "AGENT_DISSOLVED"
      description: "Agent terminé"
      saves: ["agent_archive", "handoff_package"]

    - event: "TIMER"
      interval: "5 minutes"
      saves: ["project_state", "agents_contexts"]

    - event: "SESSION_END"
      description: "Fin de session"
      saves: ["full_checkpoint"]

  checkpoint_retention:
    latest: 1              # Toujours garder le dernier
    hourly: 24             # 24 dernières heures
    daily: 7               # 7 derniers jours
    weekly: 4              # 4 dernières semaines
    monthly: 12            # 12 derniers mois
```

### Commandes de Sauvegarde

```bash
# Sauvegarder maintenant
/godmode save

# Sauvegarder avec message
/godmode save "Avant refactoring majeur"

# Créer un checkpoint nommé
/godmode checkpoint create "pre-release-v1"

# Lister les checkpoints
/godmode checkpoint list

# Restaurer un checkpoint
/godmode checkpoint restore "pre-release-v1"

# Exporter l'état complet
/godmode export --format json --output ./backup.json
```

---

## 🔁 RÉCUPÉRATION & CONTINUITÉ

### Reprise de Session

```yaml
session_resume:
  on_start:
    1. "Charger project-state.json"
    2. "Charger agents-registry.json"
    3. "Identifier l'agent actif (si conversation en cours)"
    4. "Charger le contexte de l'agent"
    5. "Restaurer la position dans le workflow"
    6. "Afficher le résumé de la situation"

  resume_prompt: |
    🔄 REPRISE DE SESSION GODMODE

    📊 Projet: {project.name}
    📍 Phase: {workflow.current_phase}
    👥 Agents actifs: {agents.active_count}

    Dernière activité: {last_activity.description}
    Il y a: {last_activity.time_ago}

    Où en étions-nous?
    {last_context.summary}

    Voulez-vous:
    1. Continuer là où nous en étions
    2. Voir le statut détaillé
    3. Reprendre une autre tâche
```

### Récupération d'Erreur

```yaml
error_recovery:
  scenarios:
    - type: "AGENT_CRASH"
      recovery:
        1. "Restaurer le dernier contexte agent"
        2. "Identifier la tâche en cours"
        3. "Vérifier les fichiers modifiés"
        4. "Reprendre ou rollback selon l'état"

    - type: "MEMORY_OVERFLOW"
      recovery:
        1. "Sauvegarder l'état actuel"
        2. "Archiver les contextes anciens"
        3. "Compresser les historiques"
        4. "Libérer de la mémoire"
        5. "Reprendre avec contexte minimal"

    - type: "CORRUPTION"
      recovery:
        1. "Identifier les fichiers corrompus"
        2. "Restaurer depuis le dernier checkpoint valide"
        3. "Rejouer les actions depuis le checkpoint"
        4. "Valider l'état restauré"
```

---

## 📊 MÉTRIQUES & MONITORING

### Dashboard Mémoire

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        🧠 MEMORY DASHBOARD                                   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  📊 UTILISATION MÉMOIRE                                                      ║
║  ────────────────────────────────────────────────────────────────────────    ║
║  Centrale:    ████████░░░░░░░░░░░░  1.2 MB / 5 MB                           ║
║  Agents:      ██████████████░░░░░░  3.5 MB / 10 MB                          ║
║  Packages:    ████░░░░░░░░░░░░░░░░  0.8 MB / 5 MB                           ║
║  Archives:    ██████████████████░░  45 MB / 100 MB                          ║
║                                                                              ║
║  📁 FICHIERS                                                                 ║
║  ────────────────────────────────────────────────────────────────────────    ║
║  project-state.json      │ 12 KB  │ Modifié il y a 2 min                    ║
║  agents-registry.json    │ 45 KB  │ Modifié il y a 5 min                    ║
║  decisions-log.json      │ 23 KB  │ Modifié il y a 1h                       ║
║                                                                              ║
║  👥 CONTEXTES AGENTS (Top 5 par taille)                                      ║
║  ────────────────────────────────────────────────────────────────────────    ║
║  AGT-DEV-BACK-001       │ 850 KB │ Actif depuis 3h                          ║
║  AGT-LEAD-BACK-001      │ 620 KB │ Actif depuis 2 jours                     ║
║  AGT-QA-E2E-001         │ 450 KB │ Actif depuis 1h                          ║
║                                                                              ║
║  📦 PACKAGES RÉCENTS                                                         ║
║  ────────────────────────────────────────────────────────────────────────    ║
║  backend-users.pkg.json  │ 125 KB │ Créé il y a 30 min                      ║
║  architecture.pkg.json   │ 89 KB  │ Créé il y a 2 jours                     ║
║                                                                              ║
║  💾 CHECKPOINTS                                                              ║
║  ────────────────────────────────────────────────────────────────────────    ║
║  Latest: checkpoint-20240120-153000.json (2.3 MB)                           ║
║  Total checkpoints: 47 │ Espace utilisé: 89 MB                              ║
║                                                                              ║
║  ⚠️ ALERTES                                                                  ║
║  ────────────────────────────────────────────────────────────────────────    ║
║  • AGT-DEV-BACK-001 approche la limite mémoire (85%)                        ║
║  • 3 checkpoints > 7 jours à archiver                                       ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 🎮 COMMANDES MÉMOIRE

```bash
# État de la mémoire
/godmode memory status

# Optimiser la mémoire
/godmode memory optimize

# Archiver les vieux contextes
/godmode memory archive --older-than 7d

# Voir le contexte d'un agent
/godmode memory context AGT-DEV-BACK-001

# Rechercher dans la mémoire
/godmode memory search "authentication"

# Exporter la mémoire
/godmode memory export ./backup/

# Importer une mémoire
/godmode memory import ./backup/

# Nettoyer les archives
/godmode memory clean --keep-last 30d

# Valider l'intégrité
/godmode memory validate
```

---

## 🔐 SÉCURITÉ DE LA MÉMOIRE

### Bonnes Pratiques

```yaml
memory_security:
  sensitive_data:
    - "Ne jamais stocker de secrets en clair"
    - "Masquer les tokens/API keys dans les logs"
    - "Chiffrer les archives contenant des données sensibles"

  access_control:
    - "Chaque agent n'accède qu'à son contexte"
    - "Les packages sont en lecture seule pour les destinataires"
    - "Seul le Grand Maître accède à tout"

  integrity:
    - "Checksums sur les fichiers critiques"
    - "Validation JSON à chaque lecture"
    - "Backup avant toute modification"

  retention:
    - "Politique de rétention claire"
    - "RGPD compliance si données personnelles"
    - "Purge automatique des données obsolètes"
```

---

*La mémoire est le gardien de la connaissance. Préservez-la avec soin.*
