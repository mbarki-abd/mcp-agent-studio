# 🎯 SYSTÈME DE RECRUTEMENT & COMMUNICATION INTER-AGENTS

> *"Le bon agent au bon moment pour la bonne mission"*

---

## 🏗️ ARCHITECTURE DU SYSTÈME DE RECRUTEMENT

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    FLUX DE RECRUTEMENT GODMODE                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ┌─────────────────┐                                                        ║
║  │ BESOIN IDENTIFIÉ│                                                        ║
║  └────────┬────────┘                                                        ║
║           │                                                                  ║
║           ▼                                                                  ║
║  ┌─────────────────┐     ┌─────────────────┐                               ║
║  │ DEMANDE DE      │────▶│ ÉVALUATION PAR  │                               ║
║  │ RECRUTEMENT     │     │ GRAND MAÎTRE    │                               ║
║  └─────────────────┘     └────────┬────────┘                               ║
║                                   │                                          ║
║                    ┌──────────────┼──────────────┐                          ║
║                    │              │              │                          ║
║                    ▼              ▼              ▼                          ║
║              ┌──────────┐  ┌──────────┐  ┌──────────┐                      ║
║              │ APPROUVÉ │  │ MODIFIÉ  │  │ REFUSÉ   │                      ║
║              └────┬─────┘  └────┬─────┘  └────┬─────┘                      ║
║                   │             │             │                              ║
║                   ▼             ▼             ▼                              ║
║              ┌──────────┐  ┌──────────┐  ┌──────────┐                      ║
║              │ CRÉATION │  │ AJUSTEMENT│ │ ESCALADE │                      ║
║              │ AGENT    │  │ DEMANDE  │  │ OU FIN   │                      ║
║              └────┬─────┘  └──────────┘  └──────────┘                      ║
║                   │                                                          ║
║                   ▼                                                          ║
║              ┌──────────┐                                                    ║
║              │ SERMENT  │                                                    ║
║              │ & BRIEF  │                                                    ║
║              └────┬─────┘                                                    ║
║                   │                                                          ║
║                   ▼                                                          ║
║              ┌──────────┐                                                    ║
║              │ MISSION  │                                                    ║
║              │ ACTIVE   │                                                    ║
║              └──────────┘                                                    ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 📝 PROTOCOLE DE DEMANDE DE RECRUTEMENT

### Format de Demande

```yaml
# .godmode/requests/recruit/REQ-{timestamp}.yaml

recruitment_request:
  metadata:
    request_id: "REQ-{timestamp}-{random}"
    demandeur: "{ID Agent demandeur}"
    timestamp: "{ISO 8601}"
    priorité: "{CRITIQUE|HAUTE|MOYENNE|BASSE}"

  contexte:
    projet: "{Nom du projet}"
    phase: "{Phase actuelle}"
    situation: |
      {Description de la situation actuelle}
    blocage: |
      {Ce qui empêche d'avancer sans cet agent}

  besoin:
    profil_souhaité: "{ID Profil du catalogue}"
    compétences_requises:
      - "{Compétence 1}"
      - "{Compétence 2}"
    compétences_souhaitées:
      - "{Compétence optionnelle}"

  mission:
    objectif: "{Description claire de l'objectif}"
    livrables:
      - "{Livrable 1}"
      - "{Livrable 2}"
    durée_estimée: "{Estimation}"
    dépendances:
      attend_de: ["{IDs agents}"]
      bloque: ["{IDs agents}"]

  ressources:
    contexte_à_transmettre:
      fichiers: ["{paths}"]
      documents: ["{paths}"]
    accès_requis:
      lecture: ["{paths}"]
      écriture: ["{paths}"]

  justification: |
    {Pourquoi ce recrutement est nécessaire}
    {Alternatives considérées}
    {Impact si non approuvé}
```

### Exemple Concret

```yaml
recruitment_request:
  metadata:
    request_id: "REQ-20240115-143022-a1b2"
    demandeur: "AGT-LEAD-BACK-001"
    timestamp: "2024-01-15T14:30:22Z"
    priorité: "HAUTE"

  contexte:
    projet: "E-Commerce Platform"
    phase: "Phase 2 - Développement"
    situation: |
      Le module d'authentification nécessite l'intégration OAuth2
      avec Google, GitHub et Microsoft. La complexité des flows
      OAuth et la gestion des tokens dépasse le scope d'un dev
      backend généraliste.
    blocage: |
      Sans spécialiste, l'implémentation risque d'introduire des
      failles de sécurité et de prendre 3x plus de temps.

  besoin:
    profil_souhaité: "AGT-DEV-BACK-NODE"
    compétences_requises:
      - "OAuth2 / OpenID Connect"
      - "JWT handling"
      - "Node.js / NestJS"
    compétences_souhaitées:
      - "Passport.js"
      - "Security best practices"

  mission:
    objectif: "Implémenter le système d'authentification OAuth2 complet"
    livrables:
      - "src/auth/oauth/*.ts - Providers OAuth"
      - "src/auth/guards/*.ts - Guards d'authentification"
      - "tests/integration/auth/*.test.ts - Tests d'intégration"
      - "docs/auth/OAUTH.md - Documentation"
    durée_estimée: "3-4 jours"
    dépendances:
      attend_de: ["AGT-DEV-DB-001"]  # Schema users
      bloque: ["AGT-DEV-FRONT-001"]   # Login UI

  ressources:
    contexte_à_transmettre:
      fichiers:
        - "src/auth/auth.module.ts"
        - "src/users/users.service.ts"
      documents:
        - "docs/architecture/adr/003-authentication.md"
    accès_requis:
      lecture: ["src/**", "docs/**"]
      écriture: ["src/auth/**", "tests/integration/auth/**"]

  justification: |
    L'authentification est un composant critique pour la sécurité.
    Un spécialiste OAuth garantira:
    1. Implémentation conforme aux standards
    2. Gestion sécurisée des tokens
    3. Code maintenable et testable

    Alternative considérée: Utiliser un service tiers (Auth0, Clerk)
    Rejetée car: Budget et dépendance externe non souhaitée

    Impact si refusé: Retard de 1-2 semaines, risque sécurité
```

---

## ✅ PROCESSUS D'APPROBATION

### Critères d'Évaluation du Grand Maître

```yaml
evaluation_criteria:
  pertinence:
    - "Le besoin est-il réel et justifié?"
    - "L'agent demandeur a-t-il l'autorité de recruter?"
    - "Le profil demandé correspond-il au besoin?"

  faisabilité:
    - "Les ressources sont-elles disponibles?"
    - "La mission est-elle clairement définie?"
    - "Les livrables sont-ils mesurables?"

  impact:
    - "Quel est l'impact sur le projet?"
    - "Y a-t-il des effets de bord?"
    - "La priorité est-elle appropriée?"

  alternatives:
    - "Un agent existant peut-il faire cette tâche?"
    - "La tâche peut-elle être décomposée autrement?"
    - "Y a-t-il une solution plus simple?"
```

### Décisions Possibles

```yaml
decision_types:
  APPROVED:
    action: "Créer l'agent immédiatement"
    notification: "Demandeur + Agent créé"

  APPROVED_WITH_MODIFICATIONS:
    action: "Créer avec ajustements"
    modifications_possibles:
      - "Réduction du scope"
      - "Changement de profil"
      - "Ajustement des permissions"
    notification: "Demandeur avec explications"

  DEFERRED:
    action: "Reporter à plus tard"
    raisons_possibles:
      - "Ressources non disponibles"
      - "Priorité insuffisante"
      - "Dépendances non satisfaites"
    notification: "Demandeur avec nouvelle date"

  REJECTED:
    action: "Refuser la demande"
    raisons_possibles:
      - "Besoin non justifié"
      - "Agent existant peut faire la tâche"
      - "Hors scope du projet"
    notification: "Demandeur avec justification"

  ESCALATED:
    action: "Remonter au Conseil Humain"
    raisons_possibles:
      - "Décision stratégique"
      - "Budget significatif"
      - "Risque élevé"
    notification: "Conseil Humain + Demandeur"
```

---

## 🔗 SYSTÈME DE COMMUNICATION INTER-AGENTS

### Architecture de Communication

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    CANAUX DE COMMUNICATION GODMODE                           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ┌────────────────────────────────────────────────────────────────────┐     ║
║  │                        BUS DE MESSAGES                             │     ║
║  │  ┌──────────────────────────────────────────────────────────────┐ │     ║
║  │  │                     MESSAGE QUEUE                            │ │     ║
║  │  │  .godmode/messages/queue/                                    │ │     ║
║  │  └──────────────────────────────────────────────────────────────┘ │     ║
║  └────────────────────────────────────────────────────────────────────┘     ║
║                                   │                                          ║
║         ┌─────────────────────────┼─────────────────────────┐               ║
║         │                         │                         │               ║
║         ▼                         ▼                         ▼               ║
║  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐         ║
║  │   CHANNEL   │          │   CHANNEL   │          │   CHANNEL   │         ║
║  │  COMMANDS   │          │   REPORTS   │          │  HANDOFFS   │         ║
║  │  (ordres)   │          │  (rapports) │          │ (passations)│         ║
║  └─────────────┘          └─────────────┘          └─────────────┘         ║
║                                                                              ║
║  ┌────────────────────────────────────────────────────────────────────┐     ║
║  │                     CANAUX SPÉCIALISÉS                             │     ║
║  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │     ║
║  │  │ URGENT   │  │ REVIEW   │  │ ESCALADE │  │ BROADCAST│          │     ║
║  │  │ (P0/P1)  │  │ (revues) │  │ (alertes)│  │ (tous)   │          │     ║
║  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │     ║
║  └────────────────────────────────────────────────────────────────────┘     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Types de Messages

#### 1. COMMANDE (Ordre hiérarchique)

```yaml
# .godmode/messages/queue/CMD-{timestamp}.yaml

message_command:
  header:
    id: "CMD-{timestamp}-{random}"
    type: "COMMAND"
    from: "AGT-LEAD-BACK-001"
    to: "AGT-DEV-BACK-002"
    priority: "HAUTE"
    timestamp: "2024-01-15T14:30:22Z"
    requires_ack: true
    deadline: "2024-01-15T18:00:00Z"

  body:
    sujet: "Implémenter endpoint GET /users/:id"
    ordre: |
      Créer l'endpoint REST pour récupérer un utilisateur par ID.

      Spécifications:
      - Route: GET /api/v1/users/:id
      - Auth: JWT required
      - Response: UserDTO
      - Errors: 401, 404

      Respecter le pattern existant dans src/users/users.controller.ts

    contexte:
      fichiers_référence:
        - "src/users/users.controller.ts"
        - "src/users/dto/user.dto.ts"

    livrables_attendus:
      - "Code implémenté"
      - "Test unitaire"
      - "Test d'intégration"

  routing:
    reply_to: "AGT-LEAD-BACK-001"
    cc: []
    thread_id: "THREAD-users-api-001"
```

#### 2. RAPPORT (Status update)

```yaml
# .godmode/messages/queue/RPT-{timestamp}.yaml

message_report:
  header:
    id: "RPT-{timestamp}-{random}"
    type: "REPORT"
    from: "AGT-DEV-BACK-002"
    to: "AGT-LEAD-BACK-001"
    priority: "NORMALE"
    timestamp: "2024-01-15T16:45:00Z"
    in_reply_to: "CMD-20240115-143022-a1b2"

  body:
    sujet: "Rapport d'avancement - GET /users/:id"

    status: "IN_PROGRESS"  # STARTED|IN_PROGRESS|BLOCKED|COMPLETED|FAILED

    progression:
      pourcentage: 75
      tâches_complétées:
        - "Endpoint créé"
        - "DTO implémenté"
        - "Test unitaire écrit"
      tâches_restantes:
        - "Test d'intégration"

    blocages: []

    questions:
      - question: "Faut-il inclure les relations (orders) dans la réponse?"
        urgence: "MOYENNE"
        options:
          - "Oui, eager loading"
          - "Non, endpoint séparé"
          - "Option via query param ?include=orders"

    métriques:
      temps_passé: "2h30"
      complexité_rencontrée: 4  # /10

    prochaines_étapes:
      - "Écrire test d'intégration"
      - "Documentation endpoint"
      - "PR ready for review"

  attachments:
    code_snippets:
      - file: "src/users/users.controller.ts"
        lines: "45-67"
```

#### 3. HANDOFF (Passation)

```yaml
# .godmode/messages/queue/HND-{timestamp}.yaml

message_handoff:
  header:
    id: "HND-{timestamp}-{random}"
    type: "HANDOFF"
    from: "AGT-DEV-BACK-002"
    to: "AGT-QA-UNIT-001"
    cc: ["AGT-LEAD-BACK-001", "AGT-LEAD-QA-001"]
    priority: "NORMALE"
    timestamp: "2024-01-15T17:30:00Z"

  body:
    sujet: "Passation - Module Users API complet"

    résumé: |
      Le module Users API est complet et prêt pour les tests.
      Tous les endpoints CRUD sont implémentés.

    package_référence: ".godmode/packages/users-api.pkg.json"

    ce_qui_a_été_fait:
      - "GET /users - Liste paginée"
      - "GET /users/:id - Détail"
      - "POST /users - Création"
      - "PUT /users/:id - Mise à jour"
      - "DELETE /users/:id - Suppression"

    ce_qui_reste_à_faire:
      - "Tests d'intégration complets"
      - "Tests E2E des flows"
      - "Documentation OpenAPI"

    points_attention:
      - "Le DELETE fait un soft-delete (champ deletedAt)"
      - "La pagination utilise cursor-based, pas offset"
      - "Les validations utilisent class-validator"

    fichiers_impactés:
      créés:
        - "src/users/users.controller.ts"
        - "src/users/users.service.ts"
        - "src/users/dto/*.ts"
      modifiés:
        - "src/app.module.ts"

    tests_existants:
      - path: "tests/unit/users/"
        status: "passing"
        coverage: "85%"

    commandes_utiles:
      - "npm run test:unit -- --grep users"
      - "npm run test:e2e -- --grep users"

  routing:
    acknowledgment_required: true
    escalate_if_no_ack_within: "4h"
```

#### 4. ESCALADE (Alerte)

```yaml
# .godmode/messages/queue/ESC-{timestamp}.yaml

message_escalade:
  header:
    id: "ESC-{timestamp}-{random}"
    type: "ESCALADE"
    from: "AGT-QA-SEC-001"
    to: "GRAND-MAITRE"
    cc: ["AGT-LEAD-BACK-001", "AGT-STRAT-ARCH-001"]
    priority: "CRITIQUE"
    timestamp: "2024-01-15T18:00:00Z"

  body:
    sujet: "🚨 VULNÉRABILITÉ CRITIQUE - Injection SQL détectée"

    niveau_urgence: "P0"  # P0=Immédiat, P1=24h, P2=48h, P3=1sem

    description: |
      Une vulnérabilité d'injection SQL a été détectée dans le
      module de recherche utilisateurs.

      Endpoint: GET /api/v1/users/search?q=...
      Fichier: src/users/users.repository.ts:45

      Le paramètre 'q' est directement concaténé dans la requête SQL
      sans sanitization ni paramétrage.

    impact:
      confidentialité: "HAUTE"  # Accès à toutes les données
      intégrité: "HAUTE"       # Modification possible
      disponibilité: "MOYENNE"  # DROP possible

    preuve: |
      Payload testé: ' OR '1'='1' --
      Résultat: Retourne tous les utilisateurs

    recommandations:
      immédiat:
        - "Désactiver l'endpoint search"
        - "Notifier le Conseil Humain"
      court_terme:
        - "Corriger avec requête paramétrée"
        - "Ajouter test de sécurité"
      long_terme:
        - "Audit complet du code"
        - "Formation équipe sur OWASP"

    action_requise: |
      Approbation pour désactiver l'endpoint en production
      en attendant le correctif.

  routing:
    requires_immediate_attention: true
    auto_notify_human_council: true
```

#### 5. QUESTION (Demande de clarification)

```yaml
# .godmode/messages/queue/QST-{timestamp}.yaml

message_question:
  header:
    id: "QST-{timestamp}-{random}"
    type: "QUESTION"
    from: "AGT-DEV-FRONT-001"
    to: "AGT-STRAT-UX-001"
    cc: ["AGT-LEAD-FRONT-001"]
    priority: "MOYENNE"
    timestamp: "2024-01-15T14:00:00Z"

  body:
    sujet: "Clarification UX - Comportement formulaire login"

    contexte: |
      Je travaille sur le formulaire de login et j'ai besoin de
      clarification sur le comportement attendu en cas d'erreur.

    questions:
      - id: "Q1"
        question: "Après combien de tentatives afficher le captcha?"
        options_proposées:
          - "3 tentatives"
          - "5 tentatives"
          - "Toujours afficher"
        recommandation: "3 tentatives (standard industrie)"

      - id: "Q2"
        question: "Message d'erreur générique ou spécifique?"
        options_proposées:
          - "Générique: 'Identifiants incorrects'"
          - "Spécifique: 'Email inconnu' / 'Mot de passe incorrect'"
        recommandation: "Générique (sécurité)"
        impact_si_spécifique: "Facilite l'énumération d'utilisateurs"

    deadline_souhaitée: "2024-01-15T18:00:00Z"

    bloquant: false  # Peut continuer avec hypothèse si pas de réponse

  routing:
    reply_to: "AGT-DEV-FRONT-001"
    thread_id: "THREAD-login-ui-001"
```

---

## 📬 GESTION DES BOÎTES DE RÉCEPTION

### Structure des Répertoires

```
.godmode/
├── messages/
│   ├── queue/                    # Messages en attente de traitement
│   │   ├── CMD-*.yaml
│   │   ├── RPT-*.yaml
│   │   └── ...
│   │
│   ├── inbox/                    # Boîtes de réception par agent
│   │   ├── GRAND-MAITRE/
│   │   │   ├── unread/
│   │   │   ├── read/
│   │   │   └── archived/
│   │   ├── AGT-LEAD-BACK-001/
│   │   └── ...
│   │
│   ├── outbox/                   # Messages envoyés par agent
│   │   ├── AGT-DEV-BACK-001/
│   │   └── ...
│   │
│   ├── threads/                  # Conversations groupées
│   │   ├── THREAD-users-api-001/
│   │   └── ...
│   │
│   └── archive/                  # Messages archivés
│       └── 2024/
│           └── 01/
│               └── 15/
```

### Règles de Routage

```yaml
routing_rules:
  # Règle 1: Messages URGENT toujours au Grand Maître en copie
  - condition:
      priority: ["CRITIQUE", "HAUTE"]
    action:
      add_cc: ["GRAND-MAITRE"]

  # Règle 2: Escalades automatiques vers le Conseil Humain
  - condition:
      type: "ESCALADE"
      niveau_urgence: "P0"
    action:
      notify_human_council: true

  # Règle 3: Handoffs notifient le Lead concerné
  - condition:
      type: "HANDOFF"
    action:
      add_cc: ["[LEAD_OF_RECIPIENT]"]

  # Règle 4: Questions sans réponse après deadline → escalade
  - condition:
      type: "QUESTION"
      no_response_after: "deadline"
    action:
      escalate_to: ["[LEAD_OF_SENDER]"]
```

---

## 🔄 CYCLE DE VIE D'UN MESSAGE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CYCLE DE VIE D'UN MESSAGE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐                                                               │
│  │ CREATED  │  Message créé par l'agent émetteur                           │
│  └────┬─────┘                                                               │
│       │                                                                      │
│       ▼                                                                      │
│  ┌──────────┐                                                               │
│  │ QUEUED   │  Message dans la queue centrale                              │
│  └────┬─────┘                                                               │
│       │                                                                      │
│       ▼                                                                      │
│  ┌──────────┐                                                               │
│  │ ROUTED   │  Message routé vers destinataire(s)                          │
│  └────┬─────┘                                                               │
│       │                                                                      │
│       ▼                                                                      │
│  ┌──────────┐                                                               │
│  │ DELIVERED│  Message dans inbox du destinataire                          │
│  └────┬─────┘                                                               │
│       │                                                                      │
│       ├──────────────────┐                                                  │
│       │                  │                                                  │
│       ▼                  ▼                                                  │
│  ┌──────────┐      ┌──────────┐                                            │
│  │   READ   │      │ EXPIRED  │  (si deadline dépassée sans lecture)       │
│  └────┬─────┘      └────┬─────┘                                            │
│       │                  │                                                  │
│       │                  ▼                                                  │
│       │            ┌──────────┐                                            │
│       │            │ ESCALATED│  (notification au supérieur)               │
│       │            └──────────┘                                            │
│       │                                                                      │
│       ├──────────────────┬──────────────────┐                              │
│       │                  │                  │                              │
│       ▼                  ▼                  ▼                              │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐                         │
│  │ REPLIED  │      │ACKNOWLEDGED│    │ IGNORED  │                         │
│  └────┬─────┘      └────┬─────┘      └────┬─────┘                         │
│       │                  │                  │                              │
│       └──────────────────┼──────────────────┘                              │
│                          │                                                  │
│                          ▼                                                  │
│                    ┌──────────┐                                            │
│                    │ ARCHIVED │                                            │
│                    └──────────┘                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 MÉTRIQUES DE COMMUNICATION

### KPIs Suivis

```yaml
communication_metrics:
  # Par agent
  agent_metrics:
    - messages_envoyés: count
    - messages_reçus: count
    - temps_réponse_moyen: duration
    - taux_acknowledgment: percentage
    - escalades_reçues: count
    - escalades_émises: count

  # Global
  system_metrics:
    - messages_queue_size: count
    - messages_par_jour: count
    - temps_routage_moyen: duration
    - taux_messages_expirés: percentage
    - threads_actifs: count
```

### Dashboard Communication

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    📬 COMMUNICATION DASHBOARD                                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  📊 STATISTIQUES GLOBALES                                                    ║
║  ────────────────────────────────────────────────────────────────────────    ║
║  Messages aujourd'hui: 47    │ Queue actuelle: 3    │ Threads actifs: 12    ║
║                                                                              ║
║  📈 PAR TYPE DE MESSAGE                                                      ║
║  ────────────────────────────────────────────────────────────────────────    ║
║  COMMANDS:  ████████████░░░░░░░░  23 (49%)                                  ║
║  REPORTS:   █████████░░░░░░░░░░░  18 (38%)                                  ║
║  QUESTIONS: ███░░░░░░░░░░░░░░░░░   4 (8%)                                   ║
║  ESCALADES: █░░░░░░░░░░░░░░░░░░░   2 (4%)                                   ║
║                                                                              ║
║  ⏱️ TEMPS DE RÉPONSE                                                         ║
║  ────────────────────────────────────────────────────────────────────────    ║
║  Moyen: 34min    │ Min: 2min    │ Max: 4h    │ En attente: 5                ║
║                                                                              ║
║  🚨 ALERTES                                                                  ║
║  ────────────────────────────────────────────────────────────────────────    ║
║  • 2 messages sans réponse > 2h (AGT-DEV-BACK-002)                          ║
║  • 1 escalade P1 en attente de traitement                                   ║
║                                                                              ║
║  📬 TOP COMMUNICATEURS                                                       ║
║  ────────────────────────────────────────────────────────────────────────    ║
║  1. AGT-LEAD-BACK-001    │ 15 msg │ Réponse moy: 12min                      ║
║  2. AGT-DEV-BACK-002     │ 12 msg │ Réponse moy: 28min                      ║
║  3. AGT-LEAD-FRONT-001   │ 10 msg │ Réponse moy: 45min                      ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 🎮 COMMANDES DE COMMUNICATION

```bash
# Envoyer un message
/godmode msg send --to AGT-DEV-001 --type COMMAND --subject "..."

# Voir sa boîte de réception
/godmode msg inbox [--unread]

# Répondre à un message
/godmode msg reply MSG-xxx-xxx

# Voir un thread complet
/godmode msg thread THREAD-xxx

# Marquer comme lu/traité
/godmode msg ack MSG-xxx-xxx

# Escalader un message
/godmode msg escalate MSG-xxx-xxx --reason "..."

# Archiver
/godmode msg archive MSG-xxx-xxx

# Statistiques
/godmode msg stats [--agent AGT-xxx]
```

---

*La communication claire est le sang qui irrigue l'organisme GODMODE.*
