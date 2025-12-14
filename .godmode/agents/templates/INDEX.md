# 📚 INDEX - Templates d'Agents GODMODE

## 📖 Documentation

| Document | Description | Chemin |
|----------|-------------|--------|
| **README** | Vue d'ensemble et structure | [README.md](./README.md) |
| **USAGE GUIDE** | Guide d'utilisation complet | [USAGE-GUIDE.md](./USAGE-GUIDE.md) |
| **COMPLETION REPORT** | Rapport de réalisation | [COMPLETION-REPORT.md](./COMPLETION-REPORT.md) |

## 🎯 Templates Disponibles

### Tier 1 - Stratèges et Leads

| ID | Profil | Fichier | Taille | Status |
|----|--------|---------|--------|--------|
| AGT-STRAT-ARCH | Architecte Système | [AGT-STRAT-ARCH.template.md](./tier1/AGT-STRAT-ARCH.template.md) | 8KB | ✅ |
| AGT-LEAD-BACK | Lead Backend | [AGT-LEAD-BACK.template.md](./tier1/AGT-LEAD-BACK.template.md) | 10KB | ✅ |
| AGT-LEAD-FRONT | Lead Frontend | [AGT-LEAD-FRONT.template.md](./tier1/AGT-LEAD-FRONT.template.md) | 12KB | ✅ |

**Caractéristiques Tier 1**:
- Capacité de recrutement (Tier 2)
- Supervision et coordination
- Décisions architecturales
- Communication avec Grand Maître
- Karma initial: 750-800

### Tier 2 - Exécutants Spécialisés

| ID | Profil | Fichier | Taille | Status |
|----|--------|---------|--------|--------|
| AGT-DEV-BACK-NODE | Développeur Backend Node.js | [AGT-DEV-BACK-NODE.template.md](./tier2/AGT-DEV-BACK-NODE.template.md) | 12KB | ✅ |
| AGT-DEV-FRONT-REACT | Développeur Frontend React | [AGT-DEV-FRONT-REACT.template.md](./tier2/AGT-DEV-FRONT-REACT.template.md) | 12KB | ✅ |
| AGT-QA-UNIT | Testeur Unitaire | [AGT-QA-UNIT.template.md](./tier2/AGT-QA-UNIT.template.md) | 13KB | ✅ |

**Caractéristiques Tier 2**:
- Exécution de tâches spécifiques
- Expertise technique pointue
- Tests obligatoires (>80%)
- Pas de recrutement
- Karma initial: 500

### Tier 3 - Assistants (À venir)

| ID | Profil | Status |
|----|--------|--------|
| AGT-SCRAPER | Spécialiste Scraping | 📅 Planifié |
| AGT-DOC | Rédacteur Documentation | 📅 Planifié |
| AGT-REFACTOR | Spécialiste Refactoring | 📅 Planifié |

## 🛠️ Outils

### Générateur de Prompts

**Fichier**: `src/agents/prompt-generator.js`
**Type**: CLI + API JavaScript
**Status**: ✅ Opérationnel

**Commandes**:
```bash
# Lister tous les templates
node src/agents/prompt-generator.js list

# Voir un exemple de config
node src/agents/prompt-generator.js example AGT-DEV-BACK-NODE

# Générer un prompt depuis une config JSON
node src/agents/prompt-generator.js generate my-config.json

# Aide
node src/agents/prompt-generator.js help
```

**API JavaScript**:
```javascript
const {
  generatePrompt,
  listAvailableTemplates,
  getExampleConfig,
  loadTemplate,
  savePrompt
} = require('./src/agents/prompt-generator');

// Lister templates
const templates = listAvailableTemplates();

// Générer prompt
const prompt = generatePrompt(config);

// Sauvegarder
savePrompt(agentId, prompt);
```

## 📋 Exemples

### Configurations

| Fichier | Profil | Description |
|---------|--------|-------------|
| `examples/agent-config-example.json` | AGT-DEV-BACK-NODE | Configuration complète pour dev backend |

### Prompts Générés

| Fichier | Agent | Description |
|---------|-------|-------------|
| `.godmode/agents/prompts/AGT-DEV-BACK-001.prompt.md` | AGT-DEV-BACK-001 | Prompt complet pour module Users |

## 🚀 Quick Start

### Pour Recruter un Agent

1. **Choisir le profil** dans ce document ou [CATALOGUE-AGENTS.md](../CATALOGUE-AGENTS.md)

2. **Créer une configuration**:
   ```bash
   # Copier l'exemple
   cp examples/agent-config-example.json my-agent.json

   # Éditer my-agent.json avec vos valeurs
   ```

3. **Générer le prompt**:
   ```bash
   node src/agents/prompt-generator.js generate my-agent.json
   ```

4. **Recruter via Task tool**:
   ```javascript
   Task({
     subagent_type: "general-purpose",
     description: "Agent [PROFILE] - [MISSION]",
     prompt: `[COPIER LE CONTENU DU PROMPT GÉNÉRÉ]`
   })
   ```

### Variables Requises

Configuration minimale:
```json
{
  "profile": "AGT-DEV-BACK-NODE",
  "mission": "Description de la mission",
  "projectName": "Nom du projet"
}
```

Configuration complète:
```json
{
  "profile": "AGT-DEV-BACK-NODE",
  "tier": 2,
  "agentId": "AGT-DEV-BACK-001",
  "mission": "Implémenter module Users",
  "projectName": "E-Commerce Platform",
  "projectContext": "Contexte détaillé...",
  "phase": "Phase 2 - Développement",
  "referenceFiles": ["file1.md", "file2.ts"],
  "readPermissions": ["src/**", "docs/**"],
  "writePermissions": ["src/backend/users/**"],
  "deliverables": ["users.module.ts", "tests/*.spec.ts"],
  "deadline": "3 jours",
  "superior": "AGT-LEAD-BACK-001"
}
```

## 📊 Statistiques

### Templates

- **Total**: 6 templates
- **Tier 1**: 3 templates (Stratèges/Leads)
- **Tier 2**: 3 templates (Exécutants)
- **Tier 3**: 0 templates (à créer)

### Lignes de Code

- **Templates**: ~2550 lignes
- **Générateur**: ~350 lignes
- **Documentation**: ~900 lignes
- **Total**: ~3800 lignes

### Couverture

| Domaine | Templates | Couverture |
|---------|-----------|------------|
| Architecture | 1 | ✅ |
| Backend | 1 | ⚠️ Partiel (Node.js seulement) |
| Frontend | 1 | ⚠️ Partiel (React seulement) |
| QA | 1 | ⚠️ Partiel (Unit seulement) |
| Data | 0 | ❌ À faire |
| DevOps | 0 | ❌ À faire |

## 🗺️ Roadmap

### Court Terme (0-2 semaines)

- [ ] AGT-DEV-BACK-PYTHON
- [ ] AGT-DEV-BACK-GO
- [ ] AGT-DEV-FRONT-VUE
- [ ] AGT-QA-E2E
- [ ] AGT-QA-PERF

### Moyen Terme (2-4 semaines)

- [ ] AGT-LEAD-DATA
- [ ] AGT-LEAD-QA
- [ ] AGT-LEAD-DEVOPS
- [ ] AGT-DATA-ENG
- [ ] AGT-DEVOPS-INFRA

### Long Terme (1-3 mois)

- [ ] Templates Tier 3 (assistants)
- [ ] Générateur de templates (meta-template)
- [ ] Validation stricte des configs
- [ ] Tests unitaires du générateur
- [ ] Interface web pour création

## 🔗 Références Croisées

### Documentation Principale

- [CATALOGUE-AGENTS.md](../CATALOGUE-AGENTS.md) - Catalogue complet des profils
- [SYSTEME-RECRUTEMENT.md](../SYSTEME-RECRUTEMENT.md) - Protocole de recrutement
- [GRAND-MAITRE.md](../../core/GRAND-MAITRE.md) - Architecture du Grand Maître
- [SEMANTIC-COMPRESSION-PROTOCOL.md](../../core/SEMANTIC-COMPRESSION-PROTOCOL.md) - Protocole de compression

### Workflows

- [WORKFLOWS-PAR-TYPE.md](../../workflows/WORKFLOWS-PAR-TYPE.md) - Workflows par type de projet

### Système

- [KARMA-SYSTEM.md](../../core/KARMA-SYSTEM.md) - Système de karma
- [OMNISCIENT-SYSTEM.md](../../core/OMNISCIENT-SYSTEM.md) - Surveillance temps réel

## 💡 Aide

### Problèmes Courants

**Q: Le générateur ne trouve pas mon template**
```bash
# Vérifier que le template existe
ls .godmode/agents/templates/tier2/

# Utiliser le bon ID de profil
node src/agents/prompt-generator.js list
```

**Q: Variables non remplacées dans le prompt**
```bash
# Vérifier la config JSON
cat my-config.json

# Vérifier les noms de variables (case-sensitive)
# Doit être "mission" pas "Mission"
```

**Q: Comment ajouter un nouveau template?**
```bash
# Copier un template existant
cp tier2/AGT-DEV-BACK-NODE.template.md tier2/AGT-DEV-BACK-PYTHON.template.md

# Éditer le nouveau template
# Ajouter au CATALOGUE-AGENTS.md
# Tester avec le générateur
```

### Support

- **Documentation**: Lire [USAGE-GUIDE.md](./USAGE-GUIDE.md)
- **Exemples**: Voir `examples/`
- **Issues**: Rapporter dans le projet GODMODE

---

**Version**: 1.0.0
**Dernière mise à jour**: 2024-12-13
**Mainteneur**: AGT-STRAT-ARCH-002
