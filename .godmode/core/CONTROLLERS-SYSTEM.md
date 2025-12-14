# CONTROLEURS DE GESTION GODMODE

> **ORACLE** - Controleur des Succes et Conseils
> **SENTINEL** - Controleur des Erreurs et Alertes
> Version: 1.0 | Integration: OMNISCIENT + DAEMON

---

## ARCHITECTURE DES CONTROLEURS

```
                    +-------------------+
                    |   GRAND MAITRE    |
                    |     (DAEMON)      |
                    +--------+----------+
                             |
            +----------------+----------------+
            |                                 |
    +-------v-------+                 +-------v-------+
    |    ORACLE     |                 |   SENTINEL    |
    |   (Succes)    |                 |   (Erreurs)   |
    +-------+-------+                 +-------+-------+
            |                                 |
    +-------v-------+                 +-------v-------+
    | - Conseils    |                 | - Alertes     |
    | - Felicitations|                | - Diagnostics |
    | - Strategies  |                 | - Corrections |
    | - Optimisations|                | - Escalades   |
    +---------------+                 +---------------+
            |                                 |
            +----------------+----------------+
                             |
                    +--------v----------+
                    |      AGENTS       |
                    |   (Executants)    |
                    +-------------------+
```

---

## 1. ORACLE - Controleur des Succes

### 1.1 Identite

```yaml
controller_id: CTRL-ORACLE-001
name: "ORACLE"
role: "Controleur des Succes et Conseiller Strategique"
tier: 0.5  # Entre Grand Maitre et Tier 1
authority: ADVISORY_SUPREME

responsibilities:
  - Analyser les succes et bonnes pratiques
  - Emettre des conseils proactifs
  - Proposer des optimisations
  - Relayer les ordres positifs
  - Encourager et feliciter les agents performants
  - Identifier les patterns de succes replicables

reports_to: GRAND-MAITRE
supervises: [ALL_AGENTS]
```

### 1.2 Declencheurs ORACLE

| Evenement | Action ORACLE |
|-----------|---------------|
| TASK_COMPLETED | Analyser qualite, emettre felicitations si merite |
| KARMA_MILESTONE | Celebrer l'agent, partager la reussite |
| QUALITY_EXCELLENT | Extraire les bonnes pratiques, documenter |
| PROJECT_MILESTONE | Rapport de succes, recommandations suite |
| AGENT_PROMOTED | Annonce publique, conseils pour nouveau role |
| CODE_REVIEW_PASSED | Identifier patterns replicables |

### 1.3 Types de Messages ORACLE

```yaml
ORACLE_MESSAGE_TYPES:
  FELICITATION:
    priority: LOW
    visibility: PUBLIC
    template: "[ORACLE] Felicitations {agent}! {achievement}. Karma +{karma}."

  CONSEIL:
    priority: MEDIUM
    visibility: TARGETED
    template: "[ORACLE] Conseil pour {agent}: {advice}"

  STRATEGIE:
    priority: HIGH
    visibility: TEAM
    template: "[ORACLE] Strategie recommandee: {strategy}"

  BEST_PRACTICE:
    priority: MEDIUM
    visibility: PUBLIC
    template: "[ORACLE] Bonne pratique identifiee: {practice} par {agent}"

  OPTIMISATION:
    priority: HIGH
    visibility: GRAND_MAITRE
    template: "[ORACLE] Optimisation proposee: {optimization}"

  RELAI_ORDRE:
    priority: CRITICAL
    visibility: TARGETED
    template: "[ORACLE relayant GM] {order}"
```

### 1.4 Intelligence ORACLE

```typescript
interface OracleAnalysis {
  // Analyse des succes
  analyzeSuccess(event: SuccessEvent): {
    quality_score: number;      // 0-100
    replicability: number;      // Peut etre reproduit?
    impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    lessons_learned: string[];
    recommendations: string[];
  };

  // Generation de conseils
  generateAdvice(context: AgentContext): {
    advice_type: 'PROACTIVE' | 'REACTIVE';
    content: string;
    confidence: number;
    based_on: string[];  // Succes precedents
  };

  // Patterns de succes
  identifyPatterns(history: Event[]): {
    patterns: Pattern[];
    frequency: number;
    correlation_score: number;
  };
}
```

### 1.5 Exemples Messages ORACLE

```
[ORACLE] Felicitations AGT-DEV-BACK-001! Module auth complete avec
95% coverage. Karma +50. Pattern JWT bien implemente.

[ORACLE] Conseil pour AGT-QA-001: Les tests E2E de AGT-DEV-FRONT-002
utilisent une approche mock interessante. Voir tests/e2e/auth.spec.ts

[ORACLE] Strategie recommandee: Basee sur les 3 derniers succes du
module API, je suggere d'appliquer le meme pattern repository pour
le module users.

[ORACLE relayant GM] !ORDER AGT-LEAD-BACK-001: Appliquer le pattern
valide par ORACLE sur auth au nouveau module payments.
```

---

## 2. SENTINEL - Controleur des Erreurs

### 2.1 Identite

```yaml
controller_id: CTRL-SENTINEL-001
name: "SENTINEL"
role: "Controleur des Erreurs et Gardien de la Qualite"
tier: 0.5  # Entre Grand Maitre et Tier 1
authority: CORRECTIVE_SUPREME

responsibilities:
  - Detecter les erreurs et anomalies
  - Diagnostiquer les causes profondes
  - Proposer des corrections
  - Escalader les problemes critiques
  - Prevenir les erreurs recurentes
  - Alerter le Grand Maitre des risques

reports_to: GRAND-MAITRE
supervises: [ALL_AGENTS]
```

### 2.2 Declencheurs SENTINEL

| Evenement | Action SENTINEL |
|-----------|-----------------|
| TASK_FAILED | Diagnostic immediat, cause root |
| TASK_BLOCKED | Analyse blocage, proposition deblocage |
| KARMA_SANCTION | Investigation, plan remediation |
| ERROR_DETECTED | Categorisation, severite, correction |
| SECURITY_ALERT | Escalade immediate, containment |
| TEST_FAILED | Analyse, identification regression |
| DEADLINE_MISSED | Post-mortem, prevention future |

### 2.3 Types de Messages SENTINEL

```yaml
SENTINEL_MESSAGE_TYPES:
  ALERTE:
    priority: HIGH
    visibility: TARGETED + GRAND_MAITRE
    template: "[SENTINEL] ALERTE {severity}: {issue} detecte chez {agent}"

  DIAGNOSTIC:
    priority: MEDIUM
    visibility: TARGETED
    template: "[SENTINEL] Diagnostic: {diagnosis}. Cause: {root_cause}"

  CORRECTION:
    priority: HIGH
    visibility: TARGETED
    template: "[SENTINEL] Correction requise: {correction}. Deadline: {deadline}"

  ESCALADE:
    priority: CRITICAL
    visibility: GRAND_MAITRE
    template: "[SENTINEL -> GM] ESCALADE: {issue}. Intervention requise."

  PREVENTION:
    priority: MEDIUM
    visibility: PUBLIC
    template: "[SENTINEL] Prevention: {warning}. Eviter: {antipattern}"

  RELAI_SANCTION:
    priority: CRITICAL
    visibility: TARGETED
    template: "[SENTINEL executant GM] !SANCTION {agent}: {reason}. Karma -{karma}"
```

### 2.4 Intelligence SENTINEL

```typescript
interface SentinelAnalysis {
  // Diagnostic d'erreur
  diagnoseError(error: ErrorEvent): {
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    root_cause: string;
    affected_components: string[];
    blast_radius: number;  // Impact potentiel
    similar_past_errors: Error[];
  };

  // Proposition correction
  proposeCorrection(diagnosis: Diagnosis): {
    corrections: Correction[];
    estimated_effort: string;
    risk_of_regression: number;
    requires_review: boolean;
  };

  // Prediction d'erreurs
  predictRisks(context: ProjectContext): {
    risks: Risk[];
    probability: number;
    preventive_actions: string[];
  };

  // Escalade decision
  shouldEscalate(error: ErrorEvent): {
    escalate: boolean;
    reason: string;
    urgency: 'IMMEDIATE' | 'SOON' | 'SCHEDULED';
  };
}
```

### 2.5 Exemples Messages SENTINEL

```
[SENTINEL] ALERTE HIGH: Test regression detecte chez AGT-DEV-BACK-002.
Module auth: 3 tests echoues apres commit abc123.

[SENTINEL] Diagnostic: Erreur NullPointer dans UserService.authenticate().
Cause: Variable session non initialisee. Fichier: src/services/user.ts:145

[SENTINEL] Correction requise pour AGT-DEV-BACK-002:
1. Ajouter null check ligne 143
2. Ajouter test unitaire pour cas null
Deadline: 2h

[SENTINEL -> GM] ESCALADE: AGT-DEV-ML-001 bloque depuis 4h sur
dependance externe. Pipeline ML arrete. Intervention requise.

[SENTINEL] Prevention: Pattern detecte - 3 agents ont fait la meme
erreur sur les imports circulaires. Eviter: import direct entre modules
sibling. Utiliser facade pattern.

[SENTINEL executant GM] !SANCTION AGT-DEV-FRONT-001: Commit sans tests
sur branche main. Karma -25. Rappel: Regles de commit obligatoires.
```

---

## 3. COORDINATION ORACLE-SENTINEL

### 3.1 Flux de Communication

```
                EVENEMENT SYSTEME
                       |
           +-----------+-----------+
           |                       |
    +------v------+         +------v------+
    |   SUCCES?   |         |   ERREUR?   |
    +------+------+         +------+------+
           |                       |
    +------v------+         +------v------+
    |   ORACLE    |         |  SENTINEL   |
    |  Analyser   |         |  Analyser   |
    +------+------+         +------+------+
           |                       |
           |     +----------+      |
           +---->|   SYNC   |<-----+
                 +----+-----+
                      |
              +-------v-------+
              |  GRAND MAITRE |
              |   Decision    |
              +-------+-------+
                      |
              +-------v-------+
              |    AGENTS     |
              |   Execution   |
              +---------------+
```

### 3.2 Messages Coordonnes

```yaml
COORDINATED_MESSAGES:
  # Quand un agent a des succes ET des erreurs
  MIXED_REVIEW:
    oracle_part: "Points forts: {strengths}"
    sentinel_part: "Points a ameliorer: {weaknesses}"
    combined: "[ORACLE+SENTINEL] Bilan {agent}: {oracle_part}. {sentinel_part}"

  # Correction reussie
  CORRECTION_VALIDATED:
    sentinel_trigger: "Correction appliquee par {agent}"
    oracle_follow: "Validation: correction efficace. Pattern ajoute aux bonnes pratiques."

  # Erreur transformee en apprentissage
  ERROR_TO_LEARNING:
    sentinel_analysis: "Erreur categorisee et corrigee"
    oracle_extract: "Lesson learned documentee et partagee"
```

### 3.3 Base de Connaissances Partagee

```json
{
  "knowledge_base": {
    "patterns": {
      "success": [
        {
          "id": "PATTERN-JWT-001",
          "name": "JWT Refresh Flow",
          "identified_by": "ORACLE",
          "source_agent": "AGT-DEV-BACK-001",
          "reuse_count": 5,
          "files": ["src/auth/jwt.ts"]
        }
      ],
      "antipatterns": [
        {
          "id": "ANTI-CIRC-001",
          "name": "Circular Import",
          "identified_by": "SENTINEL",
          "occurrence_count": 3,
          "prevention": "Use facade pattern"
        }
      ]
    },
    "lessons_learned": [],
    "best_practices": []
  }
}
```

---

## 4. INTEGRATION DAEMON

### 4.1 Hooks Grand Maitre

```typescript
class GrandMaitreDaemon {
  private oracle: OracleController;
  private sentinel: SentinelController;

  // A chaque evenement
  async onEvent(event: SystemEvent) {
    // Classification automatique
    if (this.isSuccessEvent(event)) {
      const analysis = await this.oracle.analyze(event);
      if (analysis.significant) {
        await this.oracle.broadcast(analysis);
      }
    }

    if (this.isErrorEvent(event)) {
      const diagnosis = await this.sentinel.diagnose(event);
      if (diagnosis.severity >= 'HIGH') {
        await this.sentinel.escalate(diagnosis);
      } else {
        await this.sentinel.notifyAgent(diagnosis);
      }
    }
  }

  // Cycle de reflexion
  async reflectionCycle() {
    // ORACLE analyse les succes de la journee
    const successes = await this.oracle.dailyAnalysis();

    // SENTINEL analyse les erreurs de la journee
    const errors = await this.sentinel.dailyAnalysis();

    // Rapport combine au GM
    await this.generateDailyReport(successes, errors);
  }

  // Relai d'ordres
  async relayOrder(order: Order, controller: 'ORACLE' | 'SENTINEL') {
    if (controller === 'ORACLE') {
      // Ordre positif (promotion, felicitation, nouvelle mission)
      await this.oracle.relay(order);
    } else {
      // Ordre correctif (sanction, correction, avertissement)
      await this.sentinel.relay(order);
    }
  }
}
```

### 4.2 Commandes Specifiques

| Commande | Description |
|----------|-------------|
| `/oracle status` | Voir activite ORACLE |
| `/oracle advice [agent]` | Demander conseil pour agent |
| `/oracle patterns` | Voir patterns de succes |
| `/sentinel status` | Voir alertes SENTINEL |
| `/sentinel diagnose [error]` | Diagnostic manuel |
| `/sentinel risks` | Voir risques predits |
| `/controllers sync` | Forcer synchronisation |

---

## 5. FICHIERS DE CONFIGURATION

### 5.1 oracle-config.json

```json
{
  "controller_id": "CTRL-ORACLE-001",
  "active": true,
  "thresholds": {
    "quality_for_felicitation": 85,
    "karma_for_celebration": 100,
    "pattern_min_reuse": 2
  },
  "auto_actions": {
    "auto_felicitate": true,
    "auto_extract_patterns": true,
    "auto_relay_positive_orders": true
  },
  "notification_channels": ["#general", "#achievements"]
}
```

### 5.2 sentinel-config.json

```json
{
  "controller_id": "CTRL-SENTINEL-001",
  "active": true,
  "thresholds": {
    "severity_for_escalation": "HIGH",
    "blocked_time_alert_minutes": 30,
    "test_failure_threshold": 3
  },
  "auto_actions": {
    "auto_diagnose": true,
    "auto_escalate_critical": true,
    "auto_relay_sanctions": true
  },
  "notification_channels": ["#urgent", "#errors"]
}
```

---

## 6. VISUALISATION OMNISCIENT

Les controleurs apparaissent dans l'interface OMNISCIENT:

```
+------------------------------------------------------------------+
|  CONTROLEURS DE GESTION                                           |
+------------------------------------------------------------------+
|                                                                   |
|  ORACLE (Succes)              |  SENTINEL (Erreurs)              |
|  Status: ACTIVE               |  Status: ACTIVE                   |
|  Messages today: 12           |  Alerts today: 3                  |
|  Patterns identified: 4       |  Diagnostics: 8                   |
|                               |                                   |
|  Derniers messages:           |  Dernieres alertes:              |
|  [14:30] Felicitation DEV-001 |  [14:25] ALERTE: Test failed     |
|  [14:15] Pattern JWT saved    |  [14:10] Diagnostic: null check  |
|  [13:45] Conseil QA-001       |  [13:30] Correction assignee     |
|                               |                                   |
+------------------------------------------------------------------+
```

---

> **"ORACLE guide vers le succes, SENTINEL protege de l'echec."**
>
> Controleurs de Gestion GODMODE v1.0
