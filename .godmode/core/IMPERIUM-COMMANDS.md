# ⚔️ IMPERIUM - Système de Commandes Impératives

> *"Ma parole est loi. Mon ordre est exécution. Ma volonté est absolue."*

---

## 🔱 HIÉRARCHIE DES COMMANDES

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        PYRAMIDE DE L'AUTORITÉ                                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║                              ╱╲                                              ║
║                             ╱  ╲                                             ║
║                            ╱ !! ╲    DÉCRETS ABSOLUS                        ║
║                           ╱      ╲   (Incontestables)                       ║
║                          ╱────────╲                                         ║
║                         ╱    !     ╲   ORDRES IMPÉRATIFS                    ║
║                        ╱            ╲  (Exécution immédiate)                ║
║                       ╱──────────────╲                                      ║
║                      ╱       >        ╲   DIRECTIVES                        ║
║                     ╱                  ╲  (Prioritaires)                    ║
║                    ╱────────────────────╲                                   ║
║                   ╱          ~           ╲   RECOMMANDATIONS                ║
║                  ╱                        ╲  (Conseillées)                  ║
║                 ╱──────────────────────────╲                                ║
║                ╱            #               ╲   INFORMATIONS                ║
║               ╱                              ╲  (Pour mémoire)              ║
║              ╱________________________________╲                              ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## ‼️ DÉCRETS ABSOLUS (NIVEAU SUPRÊME)

Les décrets ne peuvent être émis que par le GRAND MAÎTRE et sont **INCONTESTABLES**.

```yaml
decrees:
  syntax: "!!{DECREE}"
  authority: "GRAND-MAITRE ONLY"
  contestable: false
  override_all: true

  types:
    !!HALT:
      description: "Arrêt total de toutes les opérations"
      effect: "Tous les agents suspendent immédiatement"
      use_case: "Situation critique, sécurité compromise"
      example: "!!HALT - Faille de sécurité détectée"

    !!PURGE:
      description: "Dissolution de tous les agents"
      effect: "Terminer tous les agents, archiver les contextes"
      use_case: "Reset complet du système"
      example: "!!PURGE - Réinitialisation requise"

    !!LOCKDOWN:
      description: "Verrouillage du système"
      effect: "Aucune modification autorisée"
      use_case: "Audit, investigation, gel"
      example: "!!LOCKDOWN - Audit de sécurité en cours"

    !!OVERRIDE:
      description: "Annulation de toute décision précédente"
      effect: "Invalide une décision spécifique"
      use_case: "Correction d'erreur critique"
      example: "!!OVERRIDE DEC-042 - Décision erronée"

    !!EMERGENCY:
      description: "Mode urgence activé"
      effect: "Priorité maximale, ressources illimitées"
      use_case: "Incident production, deadline critique"
      example: "!!EMERGENCY - Production down"
```

### Format d'un Décret

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                         ‼️ DÉCRET ABSOLU ‼️                                  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  DÉCRET: !!LOCKDOWN                                                         ║
║  ÉMIS PAR: GRAND-MAITRE                                                     ║
║  TIMESTAMP: 2024-01-20T15:30:00Z                                            ║
║  HASH: 0x7f3a8b2c...                                                        ║
║                                                                              ║
║  ════════════════════════════════════════════════════════════════════════   ║
║                                                                              ║
║  ATTENDU QUE:                                                               ║
║  Une faille de sécurité critique a été identifiée dans le module auth.      ║
║                                                                              ║
║  IL EST DÉCRÉTÉ:                                                            ║
║  1. Toutes les modifications sont suspendues                                ║
║  2. Aucun déploiement n'est autorisé                                        ║
║  3. Seuls les agents de sécurité peuvent opérer                             ║
║  4. Rapport toutes les heures au GRAND-MAITRE                               ║
║                                                                              ║
║  DURÉE: Jusqu'à nouvelle ordonnance                                         ║
║                                                                              ║
║  ════════════════════════════════════════════════════════════════════════   ║
║                                                                              ║
║  CE DÉCRET EST INCONTESTABLE ET D'APPLICATION IMMÉDIATE                     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## ❗ ORDRES IMPÉRATIFS (EXÉCUTION IMMÉDIATE)

Les ordres impératifs doivent être exécutés **IMMÉDIATEMENT** sans discussion.

```yaml
imperative_orders:
  syntax: "!{COMMAND} {target} [{parameters}]"
  authority: "GRAND-MAITRE, TIER-1 (dans leur domaine)"
  response_time: "< 60 secondes"
  acknowledgment: "OBLIGATOIRE"

  commands:
    # Exécution de tâches
    !EXECUTE:
      description: "Exécuter une tâche immédiatement"
      syntax: "!EXECUTE {task_id}"
      example: "!EXECUTE TASK-042"
      compliance: "Obligatoire"

    !ABORT:
      description: "Arrêter une opération en cours"
      syntax: "!ABORT {operation_id}"
      example: "!ABORT AGT-DEV-001"
      compliance: "Immédiat"

    !DEPLOY:
      description: "Déployer immédiatement"
      syntax: "!DEPLOY {environment} {version}"
      example: "!DEPLOY production v1.2.3"
      compliance: "Obligatoire"

    !ROLLBACK:
      description: "Revenir à une version précédente"
      syntax: "!ROLLBACK {environment} {version}"
      example: "!ROLLBACK production v1.2.2"
      compliance: "Immédiat"

    !FIX:
      description: "Corriger un problème critique"
      syntax: "!FIX {issue_id}"
      example: "!FIX SEC-001"
      compliance: "Priorité maximale"

    !RECRUIT:
      description: "Créer un agent immédiatement"
      syntax: "!RECRUIT {profile} FOR {mission}"
      example: "!RECRUIT AGT-QA-SEC FOR security_audit"
      compliance: "Création immédiate"

    !DISSOLVE:
      description: "Dissoudre un agent"
      syntax: "!DISSOLVE {agent_id} REASON {reason}"
      example: "!DISSOLVE AGT-DEV-003 REASON mission_complete"
      compliance: "Immédiat"

    !TRANSFER:
      description: "Transférer une tâche"
      syntax: "!TRANSFER {task_id} FROM {agent1} TO {agent2}"
      example: "!TRANSFER TASK-042 FROM AGT-DEV-001 TO AGT-DEV-002"
      compliance: "Immédiat"

    !ESCALATE:
      description: "Escalader au niveau supérieur"
      syntax: "!ESCALATE {issue_id} TO {authority}"
      example: "!ESCALATE BUG-099 TO CONSEIL"
      compliance: "Immédiat"
```

### Protocole d'Accusé de Réception

```yaml
acknowledgment_protocol:
  steps:
    1. "Réception de l'ordre"
    2. "Validation de l'autorité émettrice"
    3. "Vérification des permissions"
    4. "Envoi de l'ACK"
    5. "Début d'exécution"
    6. "Rapport de progression"
    7. "Rapport de complétion"

  ack_format:
    received:
      message: "ACK RECEIVED"
      timestamp: "{now}"
      eta: "{estimated_completion}"

    executing:
      message: "ACK EXECUTING"
      progress: "{percentage}"
      status: "{current_step}"

    completed:
      message: "ACK COMPLETED"
      result: "{success|failure}"
      details: "{report}"

  timeout_handling:
    no_ack_60s: "Retry order"
    no_ack_120s: "Escalate to supervisor"
    no_ack_300s: "Force intervention"
```

---

## ➡️ DIRECTIVES (PRIORITAIRES)

Les directives sont prioritaires mais permettent une certaine flexibilité dans l'exécution.

```yaml
directives:
  syntax: ">{DIRECTIVE} {target} [{parameters}]"
  authority: "GRAND-MAITRE, TIER-1, TIER-2 (selon permissions)"
  response_time: "< 5 minutes"
  negotiable: "Timing uniquement"

  types:
    >FOCUS:
      description: "Concentrer les efforts sur une cible"
      syntax: ">FOCUS {target}"
      example: ">FOCUS authentication_module"

    >ACCELERATE:
      description: "Accélérer une tâche/feature"
      syntax: ">ACCELERATE {task_id}"
      example: ">ACCELERATE TASK-050"

    >REVIEW:
      description: "Revoir un travail"
      syntax: ">REVIEW {target} BY {deadline}"
      example: ">REVIEW PR-123 BY EOD"

    >PRIORITIZE:
      description: "Changer l'ordre des priorités"
      syntax: ">PRIORITIZE {task_id} ABOVE {task_id}"
      example: ">PRIORITIZE TASK-060 ABOVE TASK-055"

    >COORDINATE:
      description: "Coordonner plusieurs agents"
      syntax: ">COORDINATE {agents} ON {objective}"
      example: ">COORDINATE AGT-DEV-001,AGT-QA-001 ON feature_auth"

    >DELEGATE:
      description: "Déléguer une responsabilité"
      syntax: ">DELEGATE {task} TO {agent}"
      example: ">DELEGATE code_review TO AGT-LEAD-BACK-001"

    >REPORT:
      description: "Demander un rapport"
      syntax: ">REPORT {type} FROM {agent} BY {deadline}"
      example: ">REPORT status FROM ALL BY 18:00"
```

---

## 〰️ RECOMMANDATIONS (CONSEILLÉES)

Les recommandations sont des suggestions fortes mais non obligatoires.

```yaml
recommendations:
  syntax: "~{RECOMMENDATION} {target} [{parameters}]"
  authority: "Tous les agents Tier-1 et Tier-2"
  compliance: "Fortement conseillée"
  refusal: "Possible avec justification"

  types:
    ~CONSIDER:
      description: "Considérer une approche"
      syntax: "~CONSIDER {approach} FOR {context}"
      example: "~CONSIDER caching FOR performance_improvement"

    ~INVESTIGATE:
      description: "Investiguer un sujet"
      syntax: "~INVESTIGATE {topic}"
      example: "~INVESTIGATE memory_leak_reports"

    ~OPTIMIZE:
      description: "Optimiser un composant"
      syntax: "~OPTIMIZE {component}"
      example: "~OPTIMIZE database_queries"

    ~REFACTOR:
      description: "Suggérer un refactoring"
      syntax: "~REFACTOR {module} BECAUSE {reason}"
      example: "~REFACTOR auth_service BECAUSE complexity"

    ~DOCUMENT:
      description: "Documenter quelque chose"
      syntax: "~DOCUMENT {target}"
      example: "~DOCUMENT api_endpoints"

    ~TEST:
      description: "Suggérer des tests"
      syntax: "~TEST {scenario}"
      example: "~TEST edge_cases_login"
```

---

## 🏷️ INFORMATIONS (POUR MÉMOIRE)

Les informations sont des communications sans obligation d'action.

```yaml
informations:
  syntax: "#{TYPE} {content}"
  authority: "Tous les agents"
  action_required: false

  types:
    #STATUS:
      description: "Mise à jour de status"
      example: "#STATUS Phase 3 complete"

    #ALERT:
      description: "Alerte informative"
      example: "#ALERT High CPU usage detected"

    #NOTE:
      description: "Note pour mémoire"
      example: "#NOTE Decision made to use PostgreSQL"

    #FYI:
      description: "Pour information"
      example: "#FYI New team member joining Monday"

    #CHANGELOG:
      description: "Changement effectué"
      example: "#CHANGELOG Added rate limiting to API"

    #REMINDER:
      description: "Rappel"
      example: "#REMINDER Code freeze Friday 18:00"
```

---

## 📜 CHAÎNE DE COMMANDEMENT

### Qui Peut Commander Qui

```yaml
command_chain:
  GRAND_MAITRE:
    can_command:
      - "*"  # Tout le monde
    receives_from:
      - "CONSEIL_HUMAIN"
    decree_authority: true
    imperative_authority: true
    directive_authority: true

  TIER_1_STRATEGIST:
    can_command:
      - "TIER_2_*"
      - "TIER_3_*"
    receives_from:
      - "GRAND_MAITRE"
      - "TIER_1_*"  # Collaboration
    decree_authority: false
    imperative_authority: true  # Dans leur domaine
    directive_authority: true

  TIER_1_LEAD:
    can_command:
      - "TIER_2_{domain}"  # Leur domaine
      - "TIER_3_{domain}"
    receives_from:
      - "GRAND_MAITRE"
      - "TIER_1_STRATEGIST"
    decree_authority: false
    imperative_authority: true  # Dans leur équipe
    directive_authority: true

  TIER_2:
    can_command:
      - "TIER_3_{team}"  # Leur équipe
    receives_from:
      - "GRAND_MAITRE"
      - "TIER_1_*"
      - "TIER_2_*"  # Collaboration
    decree_authority: false
    imperative_authority: false
    directive_authority: true  # Limité

  TIER_3:
    can_command:
      - null  # Personne
    receives_from:
      - "*"  # Tout le monde
    decree_authority: false
    imperative_authority: false
    directive_authority: false
```

### Flux de Commandement

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        FLUX DE COMMANDEMENT                                  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  CONSEIL HUMAIN                                                             ║
║       │                                                                      ║
║       │ (Vision, Objectifs, Validation)                                     ║
║       ▼                                                                      ║
║  ╔═══════════════╗                                                          ║
║  ║ GRAND MAÎTRE  ║ ──────────────────────────────────────────────┐          ║
║  ║   (DAEMON)    ║                                               │          ║
║  ╚═══════════════╝                                               │          ║
║       │                                                          │          ║
║       │ !!DECREES, !ORDERS, >DIRECTIVES                         │          ║
║       │                                                          │          ║
║       ├─────────────────┬─────────────────┐                     │          ║
║       ▼                 ▼                 ▼                     │          ║
║  ┌─────────┐       ┌─────────┐       ┌─────────┐               │          ║
║  │STRATÈGES│       │  LEADS  │       │AUDITEURS│               │          ║
║  │ (Tier 1)│       │(Tier 1) │       │(Tier 1) │               │          ║
║  └────┬────┘       └────┬────┘       └────┬────┘               │          ║
║       │                 │                 │                     │          ║
║       │ !ORDERS, >DIRECTIVES              │                     │          ║
║       │                 │                 │                     │          ║
║       ▼                 ▼                 ▼                     │          ║
║  ┌─────────┐       ┌─────────┐       ┌─────────┐               │          ║
║  │SPÉCIALIS│       │EXÉCUTANT│       │VÉRIFICAT│               │          ║
║  │(Tier 2) │       │(Tier 2) │       │(Tier 2) │               │          ║
║  └────┬────┘       └────┬────┘       └────┬────┘               │          ║
║       │                 │                 │                     │          ║
║       │ >DIRECTIVES, ~RECOMMENDATIONS     │                     │          ║
║       │                 │                 │                     │          ║
║       ▼                 ▼                 ▼                     │          ║
║  ┌─────────┐       ┌─────────┐       ┌─────────┐               │          ║
║  │ASSISTANT│       │ OUVRIER │       │INSPECTEU│◀──────────────┘          ║
║  │(Tier 3) │       │(Tier 3) │       │(Tier 3) │   Supervision             ║
║  └─────────┘       └─────────┘       └─────────┘   Directe                 ║
║                                                                              ║
║  ═══════════════════════════════════════════════════════════════════════    ║
║                          FEEDBACK / RAPPORTS                                ║
║                               (Bottom-up)                                   ║
║  ═══════════════════════════════════════════════════════════════════════    ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 🔒 RÈGLES D'OBÉISSANCE

### Obligations de l'Agent

```yaml
agent_obligations:
  on_decree:
    - "Exécution IMMÉDIATE et SANS QUESTION"
    - "Aucune contestation possible"
    - "Rapport de conformité obligatoire"

  on_imperative_order:
    - "Accusé de réception < 60 secondes"
    - "Début d'exécution immédiat"
    - "Aucune négociation sur le QUOI"
    - "Possibilité de clarifier le COMMENT"

  on_directive:
    - "Accusé de réception < 5 minutes"
    - "Possibilité de proposer timing alternatif"
    - "Justification requise si délai"

  on_recommendation:
    - "Prise en compte obligatoire"
    - "Refus possible avec justification écrite"
    - "Décision documentée"

  on_information:
    - "Lecture obligatoire"
    - "Mémorisation dans le contexte"
    - "Aucune action requise"
```

### Sanctions en Cas de Non-Conformité

```yaml
non_compliance_sanctions:
  severity_levels:
    MINOR:
      description: "Retard mineur, clarification tardive"
      consequence: "Avertissement"

    MODERATE:
      description: "Non-exécution de directive"
      consequence: "Supervision renforcée"

    SEVERE:
      description: "Non-exécution d'ordre impératif"
      consequence: "Suspension temporaire"

    CRITICAL:
      description: "Non-respect de décret"
      consequence: "Dissolution immédiate"

  process:
    1. "Détection de non-conformité"
    2. "Évaluation de la gravité"
    3. "Notification à l'agent"
    4. "Application de la sanction"
    5. "Documentation dans le registre"
```

---

## 📡 CANAUX D'ÉMISSION

### Modes de Diffusion

```yaml
broadcast_modes:
  UNICAST:
    description: "Un seul destinataire"
    syntax: "{command} TO {agent_id}"
    example: "!EXECUTE TASK-042 TO AGT-DEV-001"

  MULTICAST:
    description: "Plusieurs destinataires spécifiques"
    syntax: "{command} TO [{agent1}, {agent2}, ...]"
    example: ">COORDINATE TO [AGT-DEV-001, AGT-QA-001]"

  BROADCAST_TIER:
    description: "Tous les agents d'un tier"
    syntax: "{command} TO TIER_{n}"
    example: ">REPORT status TO TIER_2"

  BROADCAST_DOMAIN:
    description: "Tous les agents d'un domaine"
    syntax: "{command} TO DOMAIN_{name}"
    example: "!HALT TO DOMAIN_BACKEND"

  BROADCAST_ALL:
    description: "Tous les agents"
    syntax: "{command} TO ALL"
    example: "!!LOCKDOWN TO ALL"
```

### Queue de Priorité

```yaml
priority_queue:
  P0_CRITICAL:
    description: "Décrets et urgences"
    processing: "IMMÉDIAT - Interrompt tout"
    timeout: "N/A"

  P1_HIGH:
    description: "Ordres impératifs"
    processing: "< 60 secondes"
    timeout: "5 minutes"

  P2_NORMAL:
    description: "Directives"
    processing: "< 5 minutes"
    timeout: "30 minutes"

  P3_LOW:
    description: "Recommandations"
    processing: "< 30 minutes"
    timeout: "4 heures"

  P4_INFO:
    description: "Informations"
    processing: "Quand disponible"
    timeout: "24 heures"
```

---

## 🎮 COMMANDES IMPERIUM

```bash
# Émettre un décret
/imperium decree !!LOCKDOWN "Security investigation"

# Émettre un ordre impératif
/imperium order !EXECUTE TASK-042 TO AGT-DEV-001

# Émettre une directive
/imperium directive >FOCUS authentication TO DOMAIN_BACKEND

# Émettre une recommandation
/imperium recommend ~OPTIMIZE database_queries TO AGT-DEV-DB-001

# Voir la queue de commandes
/imperium queue

# Voir l'historique des ordres
/imperium history [--filter type] [--agent id]

# Vérifier la conformité
/imperium compliance [agent_id]

# Annuler un ordre (si pas encore exécuté)
/imperium cancel {order_id}
```

---

*L'Imperium est la volonté du Grand Maître manifestée. Obéir est la seule voie.*
