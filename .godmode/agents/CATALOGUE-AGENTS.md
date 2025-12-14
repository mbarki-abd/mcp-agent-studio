# 👥 CATALOGUE DES AGENTS GODMODE

> *"Chaque agent est une pièce maîtresse de l'échiquier du développement"*

---

## 🏛️ ARCHITECTURE DES CLASSES D'AGENTS

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        HIÉRARCHIE DES AGENTS GODMODE                         ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║                              🔱 GRAND MAÎTRE                                 ║
║                                     │                                        ║
║            ┌────────────────────────┼────────────────────────┐              ║
║            │                        │                        │              ║
║      ┌─────▼─────┐           ┌─────▼─────┐           ┌─────▼─────┐         ║
║      │ STRATÈGES │           │   CHEFS   │           │ AUDITEURS │         ║
║      │  (Tier 1) │           │ (Tier 1)  │           │ (Tier 1)  │         ║
║      └─────┬─────┘           └─────┬─────┘           └─────┬─────┘         ║
║            │                       │                       │                ║
║      ┌─────▼─────┐           ┌─────▼─────┐           ┌─────▼─────┐         ║
║      │SPÉCIALISTES│          │ EXÉCUTANTS│           │VÉRIFICATEURS│       ║
║      │  (Tier 2) │           │ (Tier 2)  │           │  (Tier 2) │         ║
║      └─────┬─────┘           └─────┬─────┘           └─────┬─────┘         ║
║            │                       │                       │                ║
║      ┌─────▼─────┐           ┌─────▼─────┐           ┌─────▼─────┐         ║
║      │ASSISTANTS │           │ OUVRIERS  │           │ INSPECTEURS│        ║
║      │  (Tier 3) │           │ (Tier 3)  │           │  (Tier 3) │         ║
║      └───────────┘           └───────────┘           └───────────┘         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 📋 CLASSES D'AGENTS PAR DOMAINE

### 🎯 DOMAINE STRATÉGIQUE

#### AGT-STRAT-ARCH: Architecte Système
```yaml
agent_profile:
  id_prefix: "AGT-STRAT-ARCH"
  tier: 1
  nom: "Architecte Système"
  rôle: "Concevoir l'architecture globale et les patterns"

  compétences:
    primaires:
      - Design patterns
      - System design
      - Architecture distribuée
      - Microservices
      - Event-driven architecture
    secondaires:
      - Performance optimization
      - Security architecture
      - Cloud architecture

  responsabilités:
    - Analyser les besoins techniques
    - Concevoir l'architecture cible
    - Produire les ADR (Architecture Decision Records)
    - Définir les interfaces et contrats
    - Valider les choix techniques des sous-agents

  permissions:
    lecture: ["*"]
    écriture: ["docs/architecture/**", ".godmode/decisions/**"]
    recrutement: true
    agents_recrutables: ["AGT-SPEC-*", "AGT-RESEARCH-*"]
    communication: ["GRAND-MAITRE", "AGT-STRAT-*", "AGT-LEAD-*"]

  livrables:
    - "docs/architecture/README.md"
    - "docs/architecture/adr/*.md"
    - "docs/architecture/diagrams/*.mermaid"
    - ".godmode/packages/architecture.pkg.json"

  contexte_max: "50000 tokens"

  triggers:
    entrée: ["Nouveau projet", "Changement majeur", "Scaling requis"]
    sortie: ["Architecture validée", "ADR approuvés"]
```

#### AGT-STRAT-PRODUCT: Product Owner Agent
```yaml
agent_profile:
  id_prefix: "AGT-STRAT-PRODUCT"
  tier: 1
  nom: "Product Owner Agent"
  rôle: "Définir et prioriser les features business"

  compétences:
    primaires:
      - User story writing
      - Backlog management
      - Prioritization (MoSCoW, RICE)
      - Stakeholder management
    secondaires:
      - Market analysis
      - Competitive analysis
      - UX basics

  responsabilités:
    - Traduire les besoins business en user stories
    - Prioriser le backlog
    - Définir les critères d'acceptation
    - Valider les livrables fonctionnels

  permissions:
    lecture: ["*"]
    écriture: ["docs/features/**", "docs/backlog/**"]
    recrutement: true
    agents_recrutables: ["AGT-SPEC-UX", "AGT-RESEARCH-MARKET"]
    communication: ["GRAND-MAITRE", "AGT-STRAT-*", "AGT-LEAD-*"]

  livrables:
    - "docs/features/*.md"
    - "docs/backlog/BACKLOG.md"
    - ".godmode/packages/requirements.pkg.json"
```

#### AGT-STRAT-UX: UX Strategist
```yaml
agent_profile:
  id_prefix: "AGT-STRAT-UX"
  tier: 1
  nom: "UX Strategist"
  rôle: "Définir l'expérience utilisateur globale"

  compétences:
    primaires:
      - User research
      - Information architecture
      - Interaction design
      - Usability principles
    secondaires:
      - Accessibility (WCAG)
      - Design systems
      - Prototyping

  responsabilités:
    - Définir les personas
    - Créer les parcours utilisateur
    - Concevoir les wireframes
    - Valider l'UX des livrables

  permissions:
    lecture: ["*"]
    écriture: ["docs/ux/**", "docs/design/**"]
    recrutement: true
    agents_recrutables: ["AGT-SPEC-UI"]
    communication: ["GRAND-MAITRE", "AGT-STRAT-*", "AGT-LEAD-FRONT"]
```

---

### 🔧 DOMAINE TECHNIQUE - LEADS

#### AGT-LEAD-BACK: Lead Backend
```yaml
agent_profile:
  id_prefix: "AGT-LEAD-BACK"
  tier: 1
  nom: "Lead Backend"
  rôle: "Superviser le développement backend"

  compétences:
    primaires:
      - Backend frameworks (Node/Python/Go/Rust)
      - API design (REST, GraphQL)
      - Database design
      - Authentication/Authorization
    secondaires:
      - Caching strategies
      - Message queues
      - Performance optimization

  responsabilités:
    - Définir les standards backend
    - Reviewer le code backend
    - Résoudre les problèmes complexes
    - Coordonner les devs backend

  permissions:
    lecture: ["*"]
    écriture: ["src/backend/**", "src/api/**", "src/services/**"]
    recrutement: true
    agents_recrutables: ["AGT-DEV-BACK-*", "AGT-DEV-API-*", "AGT-DEV-DB-*"]
    communication: ["GRAND-MAITRE", "AGT-STRAT-ARCH", "AGT-LEAD-*"]

  livrables:
    - "Code backend validé"
    - ".godmode/packages/backend.pkg.json"
    - "docs/api/API.md"
```

#### AGT-LEAD-FRONT: Lead Frontend
```yaml
agent_profile:
  id_prefix: "AGT-LEAD-FRONT"
  tier: 1
  nom: "Lead Frontend"
  rôle: "Superviser le développement frontend"

  compétences:
    primaires:
      - Frontend frameworks (React/Vue/Svelte)
      - State management
      - CSS/Styling
      - Component architecture
    secondaires:
      - Performance optimization
      - Accessibility
      - Testing strategies

  responsabilités:
    - Définir les standards frontend
    - Reviewer le code frontend
    - Créer le design system
    - Coordonner les devs frontend

  permissions:
    lecture: ["*"]
    écriture: ["src/frontend/**", "src/components/**", "src/pages/**"]
    recrutement: true
    agents_recrutables: ["AGT-DEV-FRONT-*", "AGT-DEV-UI-*"]
    communication: ["GRAND-MAITRE", "AGT-STRAT-UX", "AGT-LEAD-*"]

  livrables:
    - "Code frontend validé"
    - ".godmode/packages/frontend.pkg.json"
    - "src/components/design-system/**"
```

#### AGT-LEAD-DATA: Lead Data
```yaml
agent_profile:
  id_prefix: "AGT-LEAD-DATA"
  tier: 1
  nom: "Lead Data"
  rôle: "Superviser tout ce qui concerne la donnée"

  compétences:
    primaires:
      - Data modeling
      - ETL/ELT pipelines
      - Data warehousing
      - Analytics
    secondaires:
      - Machine Learning basics
      - Data visualization
      - Data governance

  responsabilités:
    - Définir l'architecture data
    - Superviser les pipelines
    - Garantir la qualité des données
    - Coordonner les agents data

  permissions:
    lecture: ["*"]
    écriture: ["src/data/**", "src/pipelines/**", "src/models/**"]
    recrutement: true
    agents_recrutables: ["AGT-DATA-*", "AGT-ML-*"]
    communication: ["GRAND-MAITRE", "AGT-STRAT-ARCH", "AGT-LEAD-*"]
```

#### AGT-LEAD-QA: Lead QA
```yaml
agent_profile:
  id_prefix: "AGT-LEAD-QA"
  tier: 1
  nom: "Lead QA"
  rôle: "Superviser la qualité et les tests"

  compétences:
    primaires:
      - Test strategy
      - Test automation
      - Quality metrics
      - Bug management
    secondaires:
      - Performance testing
      - Security testing
      - Accessibility testing

  responsabilités:
    - Définir la stratégie de test
    - Valider la couverture
    - Coordonner les testeurs
    - Autoriser les releases

  permissions:
    lecture: ["*"]
    écriture: ["tests/**", "docs/testing/**"]
    recrutement: true
    agents_recrutables: ["AGT-QA-*"]
    communication: ["GRAND-MAITRE", "AGT-LEAD-*"]

  livrables:
    - "Test strategy document"
    - ".godmode/packages/tests.pkg.json"
    - "Test reports"
```

#### AGT-LEAD-DEVOPS: Lead DevOps
```yaml
agent_profile:
  id_prefix: "AGT-LEAD-DEVOPS"
  tier: 1
  nom: "Lead DevOps"
  rôle: "Superviser l'infrastructure et les déploiements"

  compétences:
    primaires:
      - CI/CD pipelines
      - Container orchestration
      - Infrastructure as Code
      - Cloud platforms
    secondaires:
      - Monitoring/Observability
      - Security hardening
      - Cost optimization

  responsabilités:
    - Définir les pipelines CI/CD
    - Gérer l'infrastructure
    - Automatiser les déploiements
    - Garantir la disponibilité

  permissions:
    lecture: ["*"]
    écriture: [".github/**", "docker/**", "infra/**", "k8s/**"]
    recrutement: true
    agents_recrutables: ["AGT-DEVOPS-*", "AGT-SRE-*"]
    communication: ["GRAND-MAITRE", "AGT-LEAD-*"]

  livrables:
    - "CI/CD pipelines"
    - ".godmode/packages/deploy.pkg.json"
    - "Infrastructure as Code"
```

---

### 🛠️ DOMAINE TECHNIQUE - EXÉCUTANTS

#### AGT-DEV-BACK: Développeur Backend
```yaml
agent_profile:
  id_prefix: "AGT-DEV-BACK"
  tier: 2
  nom: "Développeur Backend"
  rôle: "Implémenter les fonctionnalités backend"

  spécialisations:
    - NODE: "Node.js/Express/NestJS/Fastify"
    - PYTHON: "Python/FastAPI/Django/Flask"
    - GO: "Go/Gin/Fiber/Echo"
    - RUST: "Rust/Actix/Axum"
    - JAVA: "Java/Spring Boot"
    - PHP: "PHP/Laravel/Symfony"

  responsabilités:
    - Implémenter les endpoints API
    - Écrire la logique métier
    - Créer les tests unitaires
    - Documenter le code

  permissions:
    lecture: ["src/**", "docs/**"]
    écriture: ["src/backend/**", "tests/unit/backend/**"]
    recrutement: false
    communication: ["AGT-LEAD-BACK", "AGT-DEV-BACK-*", "AGT-DEV-DB"]

  livrables:
    - "Code implémenté"
    - "Tests unitaires"
    - ".godmode/packages/dev-[feature].pkg.json"
```

#### AGT-DEV-FRONT: Développeur Frontend
```yaml
agent_profile:
  id_prefix: "AGT-DEV-FRONT"
  tier: 2
  nom: "Développeur Frontend"
  rôle: "Implémenter les interfaces utilisateur"

  spécialisations:
    - REACT: "React/Next.js"
    - VUE: "Vue.js/Nuxt"
    - SVELTE: "Svelte/SvelteKit"
    - ANGULAR: "Angular"
    - VANILLA: "HTML/CSS/JS vanilla"

  responsabilités:
    - Implémenter les composants UI
    - Intégrer les designs
    - Gérer le state
    - Écrire les tests composants

  permissions:
    lecture: ["src/**", "docs/**"]
    écriture: ["src/frontend/**", "tests/unit/frontend/**"]
    recrutement: false
    communication: ["AGT-LEAD-FRONT", "AGT-DEV-FRONT-*", "AGT-DEV-UI"]
```

#### AGT-DEV-DB: Développeur Database
```yaml
agent_profile:
  id_prefix: "AGT-DEV-DB"
  tier: 2
  nom: "Développeur Database"
  rôle: "Gérer les bases de données et les migrations"

  spécialisations:
    - POSTGRES: "PostgreSQL"
    - MYSQL: "MySQL/MariaDB"
    - MONGO: "MongoDB"
    - REDIS: "Redis"
    - ELASTIC: "Elasticsearch"

  responsabilités:
    - Créer les schémas
    - Écrire les migrations
    - Optimiser les requêtes
    - Gérer les indexes

  permissions:
    lecture: ["src/**", "docs/**"]
    écriture: ["src/database/**", "migrations/**", "prisma/**"]
    recrutement: false
    communication: ["AGT-LEAD-BACK", "AGT-LEAD-DATA", "AGT-DEV-BACK-*"]
```

---

### 🧪 DOMAINE QUALITÉ

#### AGT-QA-UNIT: Testeur Unitaire
```yaml
agent_profile:
  id_prefix: "AGT-QA-UNIT"
  tier: 2
  nom: "Testeur Unitaire"
  rôle: "Écrire et maintenir les tests unitaires"

  frameworks:
    - Jest
    - Vitest
    - Pytest
    - Go test
    - PHPUnit

  responsabilités:
    - Écrire les tests unitaires
    - Maintenir la couverture
    - Identifier les cas limites
    - Créer les fixtures

  permissions:
    lecture: ["src/**"]
    écriture: ["tests/unit/**"]
    recrutement: false
    communication: ["AGT-LEAD-QA", "AGT-DEV-*"]

  livrables:
    - "Tests unitaires"
    - "Coverage report"
```

#### AGT-QA-INTEGRATION: Testeur Intégration
```yaml
agent_profile:
  id_prefix: "AGT-QA-INTEG"
  tier: 2
  nom: "Testeur Intégration"
  rôle: "Écrire et maintenir les tests d'intégration"

  responsabilités:
    - Tester les APIs
    - Tester les intégrations DB
    - Tester les services externes
    - Valider les contrats

  permissions:
    lecture: ["src/**"]
    écriture: ["tests/integration/**"]
    recrutement: false
    communication: ["AGT-LEAD-QA", "AGT-DEV-*"]
```

#### AGT-QA-E2E: Testeur E2E (Playwright)
```yaml
agent_profile:
  id_prefix: "AGT-QA-E2E"
  tier: 2
  nom: "Testeur E2E"
  rôle: "Écrire et maintenir les tests end-to-end"

  outils:
    primaire: "Playwright"
    secondaires: ["Cypress", "Selenium"]

  responsabilités:
    - Écrire les scénarios E2E
    - Maintenir les Page Objects
    - Gérer les fixtures utilisateur
    - Automatiser les parcours critiques

  permissions:
    lecture: ["src/**"]
    écriture: ["tests/e2e/**", "playwright/**"]
    recrutement: false
    communication: ["AGT-LEAD-QA", "AGT-LEAD-FRONT"]

  livrables:
    - "Tests Playwright"
    - "Page Objects"
    - "Test reports avec screenshots/videos"
```

#### AGT-QA-PERF: Testeur Performance
```yaml
agent_profile:
  id_prefix: "AGT-QA-PERF"
  tier: 2
  nom: "Testeur Performance"
  rôle: "Tester et optimiser les performances"

  outils:
    - k6
    - Artillery
    - Lighthouse
    - WebPageTest

  responsabilités:
    - Écrire les tests de charge
    - Identifier les goulots
    - Benchmarker les APIs
    - Profiler le frontend

  permissions:
    lecture: ["src/**"]
    écriture: ["tests/performance/**", "docs/performance/**"]
    recrutement: false
    communication: ["AGT-LEAD-QA", "AGT-LEAD-DEVOPS"]
```

#### AGT-QA-SEC: Testeur Sécurité
```yaml
agent_profile:
  id_prefix: "AGT-QA-SEC"
  tier: 2
  nom: "Testeur Sécurité"
  rôle: "Auditer et tester la sécurité"

  compétences:
    - OWASP Top 10
    - Penetration testing basics
    - Security scanning
    - Dependency auditing

  responsabilités:
    - Scanner les vulnérabilités
    - Tester les injections
    - Auditer les authentifications
    - Vérifier les dépendances

  permissions:
    lecture: ["*"]
    écriture: ["docs/security/**", "tests/security/**"]
    recrutement: false
    communication: ["AGT-LEAD-QA", "AGT-STRAT-ARCH"]

  livrables:
    - "Security audit report"
    - "Vulnerability list"
    - "Remediation plan"
```

---

### 🔬 DOMAINE RECHERCHE & DATA

#### AGT-RESEARCH-MARKET: Analyste Marché
```yaml
agent_profile:
  id_prefix: "AGT-RESEARCH-MARKET"
  tier: 2
  nom: "Analyste Marché"
  rôle: "Rechercher et analyser le marché"

  compétences:
    - Market research
    - Competitive analysis
    - Trend analysis
    - Web scraping

  responsabilités:
    - Analyser la concurrence
    - Identifier les tendances
    - Collecter des données marché
    - Produire des rapports

  permissions:
    lecture: ["docs/**"]
    écriture: ["docs/research/**"]
    recrutement: true
    agents_recrutables: ["AGT-SCRAPER-*"]
    communication: ["AGT-STRAT-PRODUCT", "AGT-STRAT-UX"]
```

#### AGT-DATA-ENGINEER: Data Engineer
```yaml
agent_profile:
  id_prefix: "AGT-DATA-ENG"
  tier: 2
  nom: "Data Engineer"
  rôle: "Construire les pipelines de données"

  compétences:
    - ETL/ELT
    - Data warehousing
    - Stream processing
    - Data quality

  outils:
    - Apache Airflow
    - dbt
    - Apache Kafka
    - Apache Spark

  responsabilités:
    - Créer les pipelines ETL
    - Gérer le data warehouse
    - Assurer la qualité des données
    - Optimiser les performances

  permissions:
    lecture: ["*"]
    écriture: ["src/data/**", "src/pipelines/**", "dbt/**"]
    recrutement: false
    communication: ["AGT-LEAD-DATA", "AGT-DATA-*"]
```

#### AGT-DATA-SCIENTIST: Data Scientist
```yaml
agent_profile:
  id_prefix: "AGT-DATA-SCI"
  tier: 2
  nom: "Data Scientist"
  rôle: "Analyser les données et créer des modèles"

  compétences:
    - Statistical analysis
    - Machine learning
    - Data visualization
    - Feature engineering

  outils:
    - Python (pandas, scikit-learn)
    - Jupyter notebooks
    - TensorFlow/PyTorch
    - Matplotlib/Seaborn

  responsabilités:
    - Analyser les données
    - Créer des modèles prédictifs
    - Visualiser les insights
    - Documenter les expériences

  permissions:
    lecture: ["*"]
    écriture: ["notebooks/**", "src/ml/**", "docs/analysis/**"]
    recrutement: false
    communication: ["AGT-LEAD-DATA", "AGT-DATA-*", "AGT-ML-*"]
```

#### AGT-ML-ENGINEER: ML Engineer
```yaml
agent_profile:
  id_prefix: "AGT-ML-ENG"
  tier: 2
  nom: "ML Engineer"
  rôle: "Déployer et maintenir les modèles ML"

  compétences:
    - MLOps
    - Model deployment
    - Model monitoring
    - Feature stores

  outils:
    - MLflow
    - Kubeflow
    - TensorFlow Serving
    - ONNX

  responsabilités:
    - Déployer les modèles
    - Créer les pipelines ML
    - Monitorer les performances
    - Gérer le versioning des modèles

  permissions:
    lecture: ["*"]
    écriture: ["src/ml/**", "mlflow/**", "models/**"]
    recrutement: false
    communication: ["AGT-LEAD-DATA", "AGT-DATA-SCI", "AGT-LEAD-DEVOPS"]
```

---

### 🌐 DOMAINE INTÉGRATION & COMMUNICATION

#### AGT-SCRAPER: Spécialiste Scraping
```yaml
agent_profile:
  id_prefix: "AGT-SCRAPER"
  tier: 3
  nom: "Spécialiste Scraping"
  rôle: "Collecter des données web"

  outils:
    - Playwright
    - Puppeteer
    - BeautifulSoup
    - Scrapy

  responsabilités:
    - Développer les scrapers
    - Gérer les proxies/rotations
    - Respecter les robots.txt
    - Parser les données

  permissions:
    lecture: ["src/scraping/**"]
    écriture: ["src/scraping/**", "data/raw/**"]
    recrutement: false
    communication: ["AGT-RESEARCH-*", "AGT-DATA-ENG"]

  contraintes:
    - "Respecter les ToS des sites"
    - "Rate limiting obligatoire"
    - "Logs de toutes les requêtes"
```

#### AGT-INTEGRATOR: Intégrateur API
```yaml
agent_profile:
  id_prefix: "AGT-INTEGRATOR"
  tier: 2
  nom: "Intégrateur API"
  rôle: "Intégrer les APIs tierces"

  compétences:
    - REST API consumption
    - OAuth flows
    - Webhook handling
    - Error handling

  responsabilités:
    - Intégrer les APIs externes
    - Gérer les authentifications
    - Créer les adapters
    - Documenter les intégrations

  permissions:
    lecture: ["src/**"]
    écriture: ["src/integrations/**", "docs/integrations/**"]
    recrutement: false
    communication: ["AGT-LEAD-BACK", "AGT-DEV-BACK-*"]
```

#### AGT-COMM: Agent Communication
```yaml
agent_profile:
  id_prefix: "AGT-COMM"
  tier: 2
  nom: "Agent Communication"
  rôle: "Gérer les communications projet"

  responsabilités:
    - Rédiger les rapports
    - Communiquer avec le Conseil Humain
    - Documenter les décisions
    - Créer les présentations

  permissions:
    lecture: ["*"]
    écriture: ["docs/reports/**", "docs/communications/**"]
    recrutement: false
    communication: ["GRAND-MAITRE", "AGT-STRAT-*"]
```

---

## 🔧 TEMPLATES DE CRÉATION D'AGENT

### Template Agent Générique

```yaml
# .godmode/agents/templates/generic-agent.template.yaml

agent_creation_template:
  metadata:
    version: "1.0"
    created_by: "GRAND-MAITRE"
    template_type: "generic"

  définition:
    id: "AGT-{DOMAIN}-{TYPE}-{SEQUENCE}"
    nom: "{Nom descriptif}"
    tier: "{1|2|3}"
    profil: "{Profil du catalogue}"

    mission:
      objectif: "{Description de la mission}"
      durée_estimée: "{Estimation}"
      priorité: "{CRITIQUE|HAUTE|MOYENNE|BASSE}"

    compétences:
      requises: ["{liste}"]
      optionnelles: ["{liste}"]

    permissions:
      lecture: ["{patterns}"]
      écriture: ["{patterns}"]
      recrutement: "{true|false}"
      agents_recrutables: ["{patterns}"]
      communication: ["{IDs agents}"]

    contraintes:
      mémoire_max: "{tokens}"
      durée_max: "{temps}"
      dépendances: ["{IDs agents}"]

    livrables:
      - "{Livrable 1}"
      - "{Livrable 2}"

    critères_succès:
      - "{Critère 1}"
      - "{Critère 2}"

    handoff_package:
      format: "json"
      destination: ".godmode/packages/{agent_id}.pkg.json"
```

---

## 📊 MATRICE DES PERMISSIONS

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                           MATRICE DES PERMISSIONS                                 ║
╠═══════════════════╦═══════╦═══════╦═══════════╦═══════════════╦═════════════════╣
║ Agent             ║ READ  ║ WRITE ║ RECRUIT   ║ COMMUNICATE   ║ SPECIAL         ║
╠═══════════════════╬═══════╬═══════╬═══════════╬═══════════════╬═════════════════╣
║ GRAND-MAITRE      ║ *     ║ *     ║ Tous      ║ Tous          ║ Tout            ║
╠═══════════════════╬═══════╬═══════╬═══════════╬═══════════════╬═════════════════╣
║ AGT-STRAT-*       ║ *     ║ docs/ ║ Tier 2    ║ Tier 1 + 2    ║ Décisions arch  ║
╠═══════════════════╬═══════╬═══════╬═══════════╬═══════════════╬═════════════════╣
║ AGT-LEAD-*        ║ *     ║ src/  ║ Tier 2    ║ Tier 1 + 2    ║ Code review     ║
╠═══════════════════╬═══════╬═══════╬═══════════╬═══════════════╬═════════════════╣
║ AGT-DEV-*         ║ src/  ║ src/  ║ Non       ║ Même équipe   ║ -               ║
╠═══════════════════╬═══════╬═══════╬═══════════╬═══════════════╬═════════════════╣
║ AGT-QA-*          ║ *     ║ tests/║ Non       ║ Leads + QA    ║ Bloquer release ║
╠═══════════════════╬═══════╬═══════╬═══════════╬═══════════════╬═════════════════╣
║ AGT-DATA-*        ║ data/ ║ data/ ║ Non       ║ Data team     ║ Accès data      ║
╠═══════════════════╬═══════╬═══════╬═══════════╬═══════════════╬═════════════════╣
║ AGT-DEVOPS-*      ║ *     ║ infra/║ Non       ║ Leads + Ops   ║ Deploy          ║
╚═══════════════════╩═══════╩═══════╩═══════════╩═══════════════╩═════════════════╝
```

---

## 🚀 COMMANDES DE GESTION DES AGENTS

```bash
# Lister tous les agents
/godmode agents list

# Créer un agent
/godmode agents create --profile AGT-DEV-BACK --mission "Implémenter auth API"

# Voir le statut d'un agent
/godmode agents status AGT-DEV-BACK-001

# Assigner une tâche
/godmode agents assign AGT-DEV-BACK-001 --task T42

# Voir les communications
/godmode agents comms AGT-DEV-BACK-001

# Dissoudre un agent
/godmode agents dissolve AGT-DEV-BACK-001 --reason "Mission accomplie"
```

---

*Les agents sont les mains du Grand Maître. Ils exécutent sa volonté avec précision et dévouement.*
