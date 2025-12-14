# 🔄 WORKFLOWS PAR TYPE DE PROJET

> *"Chaque projet mérite son processus adapté"*

---

## 📋 MATRICE DE SÉLECTION DE WORKFLOW

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    SÉLECTION AUTOMATIQUE DU WORKFLOW                         ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  TYPE DE PROJET          │ COMPLEXITÉ │ WORKFLOW         │ AGENTS MIN       ║
║  ────────────────────────┼────────────┼──────────────────┼────────────────  ║
║  🌐 Application Web      │ BETA-GAMMA │ WF-WEBAPP        │ 5-12            ║
║  📱 Application Mobile   │ BETA-GAMMA │ WF-MOBILE        │ 6-15            ║
║  🔌 API / Backend        │ ALPHA-BETA │ WF-API           │ 3-8             ║
║  🛒 E-Commerce           │ GAMMA      │ WF-ECOMMERCE     │ 10-20           ║
║  📊 Data / Analytics     │ BETA-DELTA │ WF-DATA          │ 4-12            ║
║  🤖 Machine Learning     │ DELTA-OMEGA│ WF-ML            │ 6-15            ║
║  🔬 Recherche Scientif.  │ OMEGA      │ WF-RESEARCH      │ 8-25            ║
║  🏢 Enterprise / SaaS    │ DELTA      │ WF-ENTERPRISE    │ 15-30           ║
║  📈 Scraping / Données   │ ALPHA-BETA │ WF-SCRAPING      │ 3-8             ║
║  🔧 CLI / Outils         │ ALPHA      │ WF-TOOLING       │ 2-4             ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 🌐 WF-WEBAPP: Applications Web Full-Stack

### Vue d'Ensemble

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW APPLICATION WEB                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1          PHASE 2          PHASE 3          PHASE 4          PHASE 5│
│  DISCOVERY        DESIGN           BUILD            TEST             DEPLOY │
│  ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐     ┌──────┐│
│  │Analyser │ ───▶ │Architect│ ───▶ │Develop  │ ───▶ │Quality  │ ───▶│Ship  ││
│  │Besoins  │      │System   │      │Features │      │Assure   │     │Live  ││
│  └─────────┘      └─────────┘      └─────────┘      └─────────┘     └──────┘│
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  AGENTS RECRUTÉS PAR PHASE:                                                 │
│                                                                              │
│  P1: AGT-STRAT-PRODUCT, AGT-STRAT-UX                                        │
│  P2: AGT-STRAT-ARCH, AGT-LEAD-BACK, AGT-LEAD-FRONT                         │
│  P3: AGT-DEV-BACK-*, AGT-DEV-FRONT-*, AGT-DEV-DB                           │
│  P4: AGT-QA-UNIT, AGT-QA-E2E, AGT-QA-SEC                                   │
│  P5: AGT-LEAD-DEVOPS, AGT-DEVOPS-DEPLOY                                     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Phases Détaillées

```yaml
workflow_webapp:
  id: "WF-WEBAPP"
  nom: "Application Web Full-Stack"
  complexité_cible: ["BETA", "GAMMA"]

  phases:
    - id: "P1-DISCOVERY"
      nom: "Discovery & Analyse"
      durée_typique: "1-2 semaines"

      agents_requis:
        - profile: "AGT-STRAT-PRODUCT"
          mission: "Définir le backlog produit"
        - profile: "AGT-STRAT-UX"
          mission: "Définir l'expérience utilisateur"

      livrables:
        - "docs/features/BACKLOG.md"
        - "docs/ux/PERSONAS.md"
        - "docs/ux/USER-JOURNEYS.md"
        - "docs/ux/WIREFRAMES.md"

      critères_passage:
        - "Backlog priorisé et validé"
        - "Personas définis"
        - "Wireframes approuvés"

    - id: "P2-DESIGN"
      nom: "Architecture & Design"
      durée_typique: "1-2 semaines"

      agents_requis:
        - profile: "AGT-STRAT-ARCH"
          mission: "Concevoir l'architecture système"
        - profile: "AGT-LEAD-BACK"
          mission: "Définir l'architecture backend"
        - profile: "AGT-LEAD-FRONT"
          mission: "Définir l'architecture frontend"

      livrables:
        - "docs/architecture/README.md"
        - "docs/architecture/adr/*.md"
        - "docs/architecture/diagrams/*.mermaid"
        - "docs/api/API-SPEC.yaml"

      critères_passage:
        - "Architecture validée"
        - "ADRs documentés"
        - "Contrats API définis"

    - id: "P3-BUILD"
      nom: "Développement"
      durée_typique: "4-12 semaines"

      sous_phases:
        - id: "P3.1-FOUNDATION"
          nom: "Fondations"
          agents:
            - "AGT-LEAD-DEVOPS → CI/CD setup"
            - "AGT-DEV-DB → Schema & migrations"
          livrables:
            - "Pipeline CI/CD fonctionnel"
            - "Database schema créé"

        - id: "P3.2-BACKEND"
          nom: "Backend Development"
          agents:
            - "AGT-DEV-BACK-* → APIs"
            - "AGT-QA-UNIT → Tests unitaires backend"
          livrables:
            - "APIs REST/GraphQL"
            - "Services métier"
            - "Tests unitaires (>80%)"

        - id: "P3.3-FRONTEND"
          nom: "Frontend Development"
          agents:
            - "AGT-DEV-FRONT-* → UI Components"
            - "AGT-QA-UNIT → Tests composants"
          livrables:
            - "Composants UI"
            - "Pages et routing"
            - "State management"

        - id: "P3.4-INTEGRATION"
          nom: "Intégration"
          agents:
            - "AGT-QA-INTEG → Tests d'intégration"
          livrables:
            - "Frontend connecté au backend"
            - "Tests d'intégration passants"

      critères_passage:
        - "Toutes les features MVP implémentées"
        - "Tests unitaires >80%"
        - "Tests d'intégration passants"
        - "Code review complète"

    - id: "P4-QUALITY"
      nom: "Quality Assurance"
      durée_typique: "1-2 semaines"

      agents_requis:
        - profile: "AGT-QA-E2E"
          mission: "Tests end-to-end Playwright"
        - profile: "AGT-QA-PERF"
          mission: "Tests de performance"
        - profile: "AGT-QA-SEC"
          mission: "Audit de sécurité"

      livrables:
        - "tests/e2e/*.spec.ts"
        - "docs/testing/TEST-REPORT.md"
        - "docs/security/SECURITY-AUDIT.md"
        - "docs/performance/PERF-REPORT.md"

      critères_passage:
        - "E2E tests passants"
        - "Performance acceptable"
        - "0 vulnérabilité critique"
        - "Documentation complète"

    - id: "P5-DEPLOY"
      nom: "Déploiement"
      durée_typique: "3-5 jours"

      agents_requis:
        - profile: "AGT-LEAD-DEVOPS"
          mission: "Superviser le déploiement"
        - profile: "AGT-DEVOPS-DEPLOY"
          mission: "Exécuter le déploiement"

      livrables:
        - "Application en production"
        - "Monitoring configuré"
        - "Runbooks opérationnels"
        - "docs/runbooks/DEPLOYMENT.md"

      critères_passage:
        - "Production stable"
        - "Monitoring actif"
        - "Rollback testé"
```

---

## 🤖 WF-ML: Machine Learning Projects

### Vue d'Ensemble

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW MACHINE LEARNING                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1       PHASE 2       PHASE 3       PHASE 4       PHASE 5      P6    │
│  PROBLEM       DATA          MODEL         EVAL         DEPLOY      MONITOR │
│  ┌───────┐     ┌───────┐     ┌───────┐     ┌───────┐    ┌───────┐   ┌─────┐│
│  │Define │ ──▶ │Collect│ ──▶ │Train  │ ──▶ │Validate──▶ │MLOps  │──▶│Watch││
│  │Problem│     │Prepare│     │Iterate│     │Test   │    │Deploy │   │Drift││
│  └───────┘     └───────┘     └───────┘     └───────┘    └───────┘   └─────┘│
│                     │             │                                          │
│                     │             │                                          │
│                     ▼             ▼                                          │
│               ┌───────────────────────┐                                     │
│               │   ITERATION LOOP      │                                     │
│               │   (Data ↔ Model)      │                                     │
│               └───────────────────────┘                                     │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  AGENTS SPÉCIALISÉS:                                                        │
│  • AGT-DATA-SCI (Data Scientists)                                           │
│  • AGT-DATA-ENG (Data Engineers)                                            │
│  • AGT-ML-ENG (ML Engineers)                                                │
│  • AGT-RESEARCH-* (Recherche)                                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Phases Détaillées

```yaml
workflow_ml:
  id: "WF-ML"
  nom: "Machine Learning Project"
  complexité_cible: ["DELTA", "OMEGA"]

  phases:
    - id: "P1-PROBLEM"
      nom: "Problem Definition"
      durée_typique: "1-2 semaines"

      agents_requis:
        - profile: "AGT-STRAT-PRODUCT"
          mission: "Définir le problème business"
        - profile: "AGT-DATA-SCI"
          mission: "Cadrer le problème ML"

      livrables:
        - "docs/ml/PROBLEM-STATEMENT.md"
        - "docs/ml/SUCCESS-METRICS.md"
        - "docs/ml/FEASIBILITY-STUDY.md"

      questions_clés:
        - "Quel problème business résolvons-nous?"
        - "Quelles métriques définissent le succès?"
        - "Avons-nous assez de données?"
        - "Est-ce que le ML est la bonne approche?"

    - id: "P2-DATA"
      nom: "Data Collection & Preparation"
      durée_typique: "2-6 semaines"

      agents_requis:
        - profile: "AGT-DATA-ENG"
          mission: "Construire les pipelines data"
        - profile: "AGT-DATA-SCI"
          mission: "Explorer et préparer les données"
        - profile: "AGT-SCRAPER" # si needed
          mission: "Collecter des données externes"

      sous_phases:
        - "Data Collection"
        - "Data Exploration (EDA)"
        - "Data Cleaning"
        - "Feature Engineering"
        - "Data Validation"

      livrables:
        - "notebooks/eda/*.ipynb"
        - "src/data/pipelines/*.py"
        - "data/processed/*"
        - "docs/data/DATA-DICTIONARY.md"
        - "docs/data/DATA-QUALITY-REPORT.md"

      outils:
        - "pandas / polars"
        - "great_expectations"
        - "dbt"
        - "Apache Airflow"

    - id: "P3-MODEL"
      nom: "Model Development"
      durée_typique: "2-8 semaines"

      agents_requis:
        - profile: "AGT-DATA-SCI"
          mission: "Développer et itérer les modèles"
        - profile: "AGT-ML-ENG"
          mission: "Optimiser et industrialiser"

      sous_phases:
        - id: "P3.1"
          nom: "Baseline Model"
          description: "Modèle simple de référence"

        - id: "P3.2"
          nom: "Experimentation"
          description: "Test de différentes approches"
          iterations:
            - "Feature selection"
            - "Model selection"
            - "Hyperparameter tuning"
            - "Ensemble methods"

        - id: "P3.3"
          nom: "Model Selection"
          description: "Choix du meilleur modèle"

      livrables:
        - "notebooks/experiments/*.ipynb"
        - "src/models/*.py"
        - "mlflow/experiments/*"
        - "docs/ml/MODEL-CARD.md"

      outils:
        - "scikit-learn / XGBoost / LightGBM"
        - "TensorFlow / PyTorch"
        - "MLflow / Weights & Biases"
        - "Optuna / Ray Tune"

    - id: "P4-EVALUATION"
      nom: "Model Evaluation"
      durée_typique: "1-2 semaines"

      agents_requis:
        - profile: "AGT-DATA-SCI"
          mission: "Évaluation approfondie"
        - profile: "AGT-QA-ML" # spécialisé
          mission: "Tests de robustesse"

      évaluations:
        - "Performance metrics (accuracy, F1, AUC...)"
        - "Fairness & bias analysis"
        - "Robustness testing"
        - "Error analysis"
        - "A/B test design"

      livrables:
        - "docs/ml/EVALUATION-REPORT.md"
        - "docs/ml/BIAS-ANALYSIS.md"
        - "docs/ml/AB-TEST-DESIGN.md"

    - id: "P5-DEPLOY"
      nom: "MLOps & Deployment"
      durée_typique: "1-3 semaines"

      agents_requis:
        - profile: "AGT-ML-ENG"
          mission: "Déployer le modèle"
        - profile: "AGT-LEAD-DEVOPS"
          mission: "Infrastructure ML"

      composants:
        - "Model serving (API / batch)"
        - "Feature store"
        - "Model registry"
        - "A/B testing infrastructure"

      livrables:
        - "src/serving/*"
        - "k8s/ml-deployment.yaml"
        - "docs/ml/DEPLOYMENT-GUIDE.md"

      outils:
        - "TensorFlow Serving / Triton"
        - "MLflow Model Registry"
        - "Feast (feature store)"
        - "Seldon / KServe"

    - id: "P6-MONITOR"
      nom: "Monitoring & Maintenance"
      durée_typique: "Continu"

      agents_requis:
        - profile: "AGT-ML-ENG"
          mission: "Surveiller et maintenir"

      surveillance:
        - "Model performance drift"
        - "Data drift detection"
        - "Feature drift"
        - "Concept drift"

      livrables:
        - "Dashboards Grafana"
        - "Alerting rules"
        - "Retraining pipelines"
        - "docs/ml/MONITORING-RUNBOOK.md"

      outils:
        - "Evidently AI"
        - "Prometheus / Grafana"
        - "Great Expectations"
```

---

## 🔬 WF-RESEARCH: Recherche Scientifique

### Vue d'Ensemble

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW RECHERCHE SCIENTIFIQUE                           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     CYCLE DE RECHERCHE                              │    │
│  │                                                                     │    │
│  │    ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐│    │
│  │    │ QUESTION │ ──▶ │ LITTÉRA- │ ──▶ │ HYPOTHÈSE│ ──▶ │EXPÉRIMENT││    │
│  │    │ RECHERCHE│     │   TURE   │     │          │     │  DESIGN  ││    │
│  │    └──────────┘     └──────────┘     └──────────┘     └──────────┘│    │
│  │          ▲                                                   │     │    │
│  │          │               ITERATION                           │     │    │
│  │          │                                                   ▼     │    │
│  │    ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐│    │
│  │    │ PUBLICA- │ ◀── │ INTERPRÉ-│ ◀── │ ANALYSE  │ ◀── │ COLLECTE ││    │
│  │    │   TION   │     │  TATION  │     │ DONNÉES  │     │ DONNÉES  ││    │
│  │    └──────────┘     └──────────┘     └──────────┘     └──────────┘│    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  AGENTS SPÉCIALISÉS:                                                        │
│  • AGT-RESEARCH-LEAD (Chef de projet recherche)                             │
│  • AGT-RESEARCH-ANALYST (Analystes)                                         │
│  • AGT-DATA-SCI (Data Scientists)                                           │
│  • AGT-LITERATURE (Revue de littérature)                                    │
│  • AGT-STATS (Statisticien)                                                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Phases Détaillées

```yaml
workflow_research:
  id: "WF-RESEARCH"
  nom: "Projet de Recherche Scientifique"
  complexité_cible: ["OMEGA"]

  phases:
    - id: "P1-QUESTION"
      nom: "Formulation de la Question"
      agents:
        - profile: "AGT-RESEARCH-LEAD"
          mission: "Définir la question de recherche"

      livrables:
        - "docs/research/RESEARCH-QUESTION.md"
        - "docs/research/SCOPE.md"

    - id: "P2-LITERATURE"
      nom: "Revue de Littérature"
      agents:
        - profile: "AGT-LITERATURE"
          mission: "Revue systématique"
        - profile: "AGT-SCRAPER"
          mission: "Collecter les articles"

      livrables:
        - "docs/research/LITERATURE-REVIEW.md"
        - "docs/research/STATE-OF-ART.md"
        - "data/papers/*.pdf"

    - id: "P3-HYPOTHESIS"
      nom: "Hypothèses & Méthodologie"
      agents:
        - profile: "AGT-RESEARCH-LEAD"
        - profile: "AGT-STATS"

      livrables:
        - "docs/research/HYPOTHESES.md"
        - "docs/research/METHODOLOGY.md"
        - "docs/research/EXPERIMENT-DESIGN.md"

    - id: "P4-DATA-COLLECTION"
      nom: "Collecte de Données"
      agents:
        - profile: "AGT-DATA-ENG"
        - profile: "AGT-SCRAPER"
        - profile: "AGT-RESEARCH-ANALYST"

      livrables:
        - "data/raw/*"
        - "docs/data/COLLECTION-PROTOCOL.md"

    - id: "P5-ANALYSIS"
      nom: "Analyse des Données"
      agents:
        - profile: "AGT-DATA-SCI"
        - profile: "AGT-STATS"

      livrables:
        - "notebooks/analysis/*.ipynb"
        - "docs/research/RESULTS.md"

    - id: "P6-INTERPRETATION"
      nom: "Interprétation & Conclusions"
      agents:
        - profile: "AGT-RESEARCH-LEAD"
        - profile: "AGT-DATA-SCI"

      livrables:
        - "docs/research/INTERPRETATION.md"
        - "docs/research/CONCLUSIONS.md"
        - "docs/research/LIMITATIONS.md"

    - id: "P7-PUBLICATION"
      nom: "Publication"
      agents:
        - profile: "AGT-RESEARCH-LEAD"
        - profile: "AGT-COMM"

      livrables:
        - "docs/research/PAPER.md"
        - "docs/research/PRESENTATION.pptx"
        - "data/figures/*"
```

---

## 📈 WF-SCRAPING: Collecte de Données

### Vue d'Ensemble

```yaml
workflow_scraping:
  id: "WF-SCRAPING"
  nom: "Projet de Scraping & Collecte"
  complexité_cible: ["ALPHA", "BETA"]

  phases:
    - id: "P1-REQUIREMENTS"
      nom: "Définition des Besoins"
      agents:
        - profile: "AGT-STRAT-PRODUCT"
      livrables:
        - "docs/scraping/REQUIREMENTS.md"
        - "docs/scraping/DATA-SCHEMA.md"
        - "docs/scraping/SOURCES.md"

    - id: "P2-LEGAL"
      nom: "Analyse Légale"
      agents:
        - profile: "AGT-RESEARCH-LEGAL"
      livrables:
        - "docs/scraping/LEGAL-ANALYSIS.md"
        - "docs/scraping/ROBOTS-TXT-REVIEW.md"
        - "docs/scraping/TOS-COMPLIANCE.md"

    - id: "P3-PROTOTYPE"
      nom: "Prototype Scraper"
      agents:
        - profile: "AGT-SCRAPER"
      livrables:
        - "src/scraping/prototypes/*.py"
        - "docs/scraping/ANTI-BOT-ANALYSIS.md"

    - id: "P4-DEVELOPMENT"
      nom: "Développement Production"
      agents:
        - profile: "AGT-SCRAPER"
        - profile: "AGT-DEV-BACK"
      livrables:
        - "src/scraping/spiders/*.py"
        - "src/scraping/pipelines/*.py"
        - "docker/scraper/*"

    - id: "P5-INFRASTRUCTURE"
      nom: "Infrastructure"
      agents:
        - profile: "AGT-LEAD-DEVOPS"
      composants:
        - "Proxy rotation"
        - "Scheduling (Airflow)"
        - "Storage (S3/GCS)"
        - "Monitoring"

    - id: "P6-OPERATIONS"
      nom: "Opérations"
      agents:
        - profile: "AGT-DATA-ENG"
      livrables:
        - "Pipelines ETL"
        - "Data quality checks"
        - "Alerting"
```

---

## 🛒 WF-ECOMMERCE: Plateforme E-Commerce

### Vue d'Ensemble

```yaml
workflow_ecommerce:
  id: "WF-ECOMMERCE"
  nom: "Plateforme E-Commerce"
  complexité_cible: ["GAMMA"]

  phases:
    - id: "P1-DISCOVERY"
      nom: "Discovery"
      agents:
        - "AGT-STRAT-PRODUCT"
        - "AGT-STRAT-UX"
        - "AGT-RESEARCH-MARKET"

    - id: "P2-ARCHITECTURE"
      nom: "Architecture"
      agents:
        - "AGT-STRAT-ARCH"
      considérations_spéciales:
        - "Payment gateway integration"
        - "Inventory management"
        - "Order processing"
        - "Shipping integration"
        - "Tax calculation"
        - "Multi-currency"

    - id: "P3-CORE-BACKEND"
      nom: "Backend Core"
      agents:
        - "AGT-LEAD-BACK"
        - "AGT-DEV-BACK-*"
      modules:
        - "Product catalog"
        - "User management"
        - "Cart & checkout"
        - "Order management"
        - "Payment processing"
        - "Inventory"

    - id: "P4-INTEGRATIONS"
      nom: "Intégrations"
      agents:
        - "AGT-INTEGRATOR"
      intégrations:
        - "Stripe / PayPal"
        - "Shipping APIs (UPS, FedEx)"
        - "Tax APIs"
        - "Analytics"
        - "Email service"

    - id: "P5-FRONTEND"
      nom: "Frontend"
      agents:
        - "AGT-LEAD-FRONT"
        - "AGT-DEV-FRONT-*"
      pages:
        - "Homepage"
        - "Product listing"
        - "Product detail"
        - "Cart"
        - "Checkout (multi-step)"
        - "User account"
        - "Order history"

    - id: "P6-ADMIN"
      nom: "Back-Office Admin"
      agents:
        - "AGT-DEV-FRONT-*"
      fonctionnalités:
        - "Dashboard analytics"
        - "Product management"
        - "Order management"
        - "Customer management"
        - "Inventory management"
        - "Reports"

    - id: "P7-QA"
      nom: "Quality Assurance"
      agents:
        - "AGT-QA-E2E"
        - "AGT-QA-SEC"
        - "AGT-QA-PERF"
      tests_critiques:
        - "Checkout flow E2E"
        - "Payment security"
        - "Load testing (Black Friday)"
        - "PCI compliance check"

    - id: "P8-DEPLOY"
      nom: "Déploiement"
      agents:
        - "AGT-LEAD-DEVOPS"
      considérations:
        - "CDN setup"
        - "Database replication"
        - "Redis caching"
        - "Auto-scaling"
```

---

## 📊 COMPARAISON DES WORKFLOWS

```
╔══════════════════════════════════════════════════════════════════════════════════════════════╗
║                              COMPARAISON DES WORKFLOWS                                       ║
╠══════════════════╦═══════════╦═══════════╦═══════════╦═══════════╦═══════════╦═════════════╣
║ Aspect           ║ WF-WEBAPP ║ WF-ML     ║ WF-RESEARCH║WF-SCRAPING║WF-ECOMMERCE║ WF-API     ║
╠══════════════════╬═══════════╬═══════════╬═══════════╬═══════════╬═══════════╬═════════════╣
║ Durée typique    ║ 8-16 sem  ║ 12-24 sem ║ Variable  ║ 4-8 sem   ║ 16-24 sem ║ 4-8 sem     ║
║ Agents min       ║ 5-12      ║ 6-15      ║ 8-25      ║ 3-8       ║ 10-20     ║ 3-8         ║
║ Itérations       ║ Modérées  ║ Très fréq ║ Très fréq ║ Peu       ║ Modérées  ║ Peu         ║
║ Risque tech      ║ Moyen     ║ Élevé     ║ Très élevé║ Moyen     ║ Moyen     ║ Faible      ║
║ Documentation    ║ Moyenne   ║ Élevée    ║ Très élev ║ Moyenne   ║ Élevée    ║ Élevée      ║
║ Tests requis     ║ Élevés    ║ Très élev ║ Stats     ║ Modérés   ║ Très élev ║ Élevés      ║
║ Sécurité         ║ Standard  ║ Data priv ║ Variable  ║ Legal     ║ PCI DSS   ║ Standard    ║
╚══════════════════╩═══════════╩═══════════╩═══════════╩═══════════╩═══════════╩═════════════╝
```

---

## 🎮 COMMANDES WORKFLOW

```bash
# Lister les workflows disponibles
/godmode workflow list

# Sélectionner un workflow pour le projet
/godmode workflow select WF-WEBAPP

# Voir le workflow actuel
/godmode workflow current

# Voir la phase actuelle
/godmode workflow phase

# Passer à la phase suivante (si critères OK)
/godmode workflow next-phase

# Voir les agents requis pour la phase
/godmode workflow agents

# Voir les livrables attendus
/godmode workflow deliverables

# Générer le rapport de workflow
/godmode workflow report
```

---

*Le workflow adapté est la clé du succès. Choisissez-le avec sagesse.*
