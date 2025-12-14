# 🤖 Templates d'Agents GODMODE

Ce répertoire contient les templates de prompts pour créer des agents spécialisés via le Task tool.

## 📁 Structure

```
templates/
├── tier1/                      # Stratèges et Leads
│   ├── AGT-STRAT-ARCH.template.md
│   ├── AGT-LEAD-BACK.template.md
│   └── AGT-LEAD-FRONT.template.md
├── tier2/                      # Exécutants spécialisés
│   ├── AGT-DEV-BACK-NODE.template.md
│   ├── AGT-DEV-FRONT-REACT.template.md
│   └── AGT-QA-UNIT.template.md
└── tier3/                      # Assistants (à créer)
```

## 🎯 Utilisation

### Option 1: Via le Générateur JavaScript

```bash
# Lister les templates disponibles
node src/agents/prompt-generator.js list

# Voir un exemple de configuration
node src/agents/prompt-generator.js example AGT-DEV-BACK-NODE

# Générer un prompt depuis une config JSON
node src/agents/prompt-generator.js generate examples/agent-config-example.json
```

### Option 2: Utilisation Programmatique

```javascript
const { generatePrompt } = require('./src/agents/prompt-generator');

const config = {
  profile: 'AGT-DEV-BACK-NODE',
  tier: 2,
  mission: 'Implémenter le module Users',
  projectName: 'Mon Projet',
  projectContext: 'Description du contexte',
  referenceFiles: [
    'docs/architecture/README.md',
    'src/backend/app.module.ts',
  ],
  writePermissions: [
    'src/backend/users/**',
    'tests/unit/users/**',
  ],
  deliverables: [
    'src/backend/users/users.module.ts',
    'tests/unit/users/*.spec.ts',
  ],
  deadline: '3 jours',
  superior: 'AGT-LEAD-BACK-001',
};

const prompt = generatePrompt(config);
console.log(prompt);
```

### Option 3: Manuel (Copier/Coller)

1. Ouvrir le template approprié (ex: `tier2/AGT-DEV-BACK-NODE.template.md`)
2. Copier le contenu
3. Remplacer toutes les variables `{VAR_NAME}` par les valeurs appropriées
4. Utiliser le prompt résultant dans le Task tool

## 📋 Variables des Templates

Toutes les variables sont au format `{VAR_NAME}`:

| Variable | Description | Exemple |
|----------|-------------|---------|
| `{AGENT_ID}` | ID unique de l'agent | `AGT-DEV-BACK-001` |
| `{AGENT_PROFILE}` | Profil du catalogue | `AGT-DEV-BACK-NODE` |
| `{MISSION_OBJECTIVE}` | Objectif de la mission | `Implémenter le module Users` |
| `{PROJECT_NAME}` | Nom du projet | `E-Commerce Platform` |
| `{PROJECT_CONTEXT}` | Contexte détaillé | `Plateforme e-commerce...` |
| `{PHASE}` | Phase du projet | `Phase 2 - Développement` |
| `{REFERENCE_FILES}` | Fichiers à lire | Liste Markdown |
| `{READ_PERMISSIONS}` | Permissions de lecture | Patterns de chemins |
| `{WRITE_PERMISSIONS}` | Permissions d'écriture | Patterns de chemins |
| `{EXPECTED_DELIVERABLES}` | Livrables attendus | Liste numérotée |
| `{DEADLINE}` | Date limite | `3 jours` |
| `{SUPERIOR_AGENT}` | Agent superviseur | `AGT-LEAD-BACK-001` |

## 🎨 Créer un Nouveau Template

### Étape 1: Copier un Template Existant

Choisir un template proche de ce que tu veux créer et le copier:

```bash
cp tier2/AGT-DEV-BACK-NODE.template.md tier2/AGT-DEV-BACK-PYTHON.template.md
```

### Étape 2: Adapter le Contenu

Modifier les sections spécifiques:
- **Identité**: Changer `specialty`, `karma`, etc.
- **Standards**: Adapter les exemples de code au langage/framework
- **Livrables**: Ajuster les livrables attendus
- **Règles**: Ajouter des règles spécifiques au profil

### Étape 3: Conserver la Structure

Garder ces sections obligatoires:
- 📜 IDENTITÉ
- 🎯 TA MISSION
- 📋 CONTEXTE DU PROJET
- 📁 FICHIERS DE RÉFÉRENCE
- 🔐 TES PERMISSIONS
- 📦 LIVRABLES ATTENDUS
- ⏰ DEADLINE
- 📜 RÈGLES DU REGISTRE GODMODE
- 🔄 PROCESSUS DE TRAVAIL
- 📊 FORMAT DE RAPPORT FINAL
- 🧬 COMPRESSION SÉMANTIQUE
- ⚠️ RÈGLES ABSOLUES
- 🚀 COMMENCE TA MISSION

### Étape 4: Ajouter au Catalogue

Documenter le nouveau profil dans `CATALOGUE-AGENTS.md`.

## 📊 Exemples de Configurations

Voir le répertoire `examples/` pour des exemples complets:

- `agent-config-example.json` - Configuration complète pour AGT-DEV-BACK-NODE
- Plus d'exemples à venir...

## 🔧 Maintenance

### Mettre à Jour un Template

1. Modifier le fichier `.template.md`
2. Tester la génération avec le script
3. Vérifier que toutes les variables sont bien interpolées
4. Mettre à jour cette documentation si nécessaire

### Versionning

Les templates suivent le versionning sémantique:
- **Major**: Changements incompatibles (nouvelles variables requises)
- **Minor**: Nouvelles fonctionnalités (nouvelles sections optionnelles)
- **Patch**: Corrections de bugs (typos, clarifications)

Actuellement: **v1.0.0**

## ✅ Checklist de Qualité d'un Template

Avant d'ajouter un nouveau template, vérifier:

- [ ] Toutes les sections obligatoires sont présentes
- [ ] Les variables utilisent le format `{VAR_NAME}`
- [ ] Les exemples de code sont corrects et à jour
- [ ] Les règles sont claires et sans ambiguïté
- [ ] Le processus de travail est détaillé
- [ ] Le format de rapport est complet
- [ ] La compression sémantique (ARCH.spec) est documentée
- [ ] Les règles absolues sont explicites
- [ ] Le template a été testé avec le générateur
- [ ] Le profil est documenté dans CATALOGUE-AGENTS.md

## 🚀 Roadmap

Templates à créer:

### Tier 1 (Leads/Stratèges)
- [x] AGT-STRAT-ARCH - Architecte Système
- [x] AGT-LEAD-BACK - Lead Backend
- [x] AGT-LEAD-FRONT - Lead Frontend
- [ ] AGT-LEAD-DATA - Lead Data
- [ ] AGT-LEAD-QA - Lead QA
- [ ] AGT-LEAD-DEVOPS - Lead DevOps
- [ ] AGT-STRAT-PRODUCT - Product Owner
- [ ] AGT-STRAT-UX - UX Strategist

### Tier 2 (Exécutants)
- [x] AGT-DEV-BACK-NODE - Dev Backend Node.js
- [ ] AGT-DEV-BACK-PYTHON - Dev Backend Python
- [ ] AGT-DEV-BACK-GO - Dev Backend Go
- [x] AGT-DEV-FRONT-REACT - Dev Frontend React
- [ ] AGT-DEV-FRONT-VUE - Dev Frontend Vue
- [ ] AGT-DEV-DB-POSTGRES - Dev Database PostgreSQL
- [x] AGT-QA-UNIT - Testeur Unitaire
- [ ] AGT-QA-E2E - Testeur E2E
- [ ] AGT-QA-PERF - Testeur Performance
- [ ] AGT-INTEGRATOR - Intégrateur API

### Tier 3 (Assistants)
- [ ] AGT-SCRAPER - Spécialiste Scraping
- [ ] AGT-DOC - Rédacteur Documentation
- [ ] AGT-REFACTOR - Spécialiste Refactoring

---

**Version**: 1.0.0
**Dernière mise à jour**: 2024-12-13
**Mainteneur**: AGT-STRAT-ARCH-002
