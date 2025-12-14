# 📖 Guide d'Utilisation des Templates d'Agents GODMODE

## 🎯 Introduction

Ce guide explique comment utiliser les templates d'agents pour recruter des agents spécialisés via le **Task tool** de Claude.

## 🚀 Workflow de Recrutement

```
1. IDENTIFIER LE BESOIN
   └─▶ Quelle tâche doit être réalisée?
   └─▶ Quel profil d'agent est approprié?

2. CHOISIR LE TEMPLATE
   └─▶ Consulter CATALOGUE-AGENTS.md
   └─▶ Sélectionner le profil approprié

3. GÉNÉRER LE PROMPT
   └─▶ Option A: Script JavaScript (recommandé)
   └─▶ Option B: Substitution manuelle

4. RECRUTER L'AGENT
   └─▶ Utiliser le Task tool avec le prompt généré
   └─▶ Fournir les fichiers de référence

5. SUPERVISER
   └─▶ Suivre le travail de l'agent
   └─▶ Valider les livrables
```

## 📋 Méthode 1: Générateur JavaScript (Recommandé)

### Étape 1: Créer la Configuration

Créer un fichier JSON avec la configuration de l'agent:

```json
{
  "profile": "AGT-DEV-BACK-NODE",
  "tier": 2,
  "mission": "Implémenter le module Users",
  "projectName": "Mon Projet",
  "projectContext": "Description du contexte",
  "phase": "Phase 2 - Développement",
  "referenceFiles": [
    "docs/architecture/README.md",
    "src/backend/app.module.ts"
  ],
  "writePermissions": [
    "src/backend/users/**",
    "tests/unit/users/**"
  ],
  "deliverables": [
    "src/backend/users/users.module.ts",
    "tests/unit/users/*.spec.ts"
  ],
  "deadline": "3 jours",
  "superior": "AGT-LEAD-BACK-001"
}
```

### Étape 2: Générer le Prompt

```bash
node src/agents/prompt-generator.js generate my-config.json
```

Le prompt sera généré dans `.godmode/agents/prompts/`.

### Étape 3: Utiliser avec Task Tool

Copier le contenu du prompt généré et l'utiliser avec le Task tool:

```javascript
// Dans Claude Code
Task({
  subagent_type: "general-purpose",
  description: "Agent AGT-DEV-BACK-001 - Dev Backend",
  prompt: `[COLLER LE PROMPT GÉNÉRÉ ICI]`
})
```

## 📝 Méthode 2: Substitution Manuelle

### Étape 1: Choisir le Template

Ouvrir le fichier template approprié dans `.godmode/agents/templates/`.

Exemple: `tier2/AGT-DEV-BACK-NODE.template.md`

### Étape 2: Remplacer les Variables

Remplacer toutes les occurrences de `{VAR_NAME}` par les valeurs appropriées:

| Variable | Remplacer par |
|----------|---------------|
| `{AGENT_ID}` | `AGT-DEV-BACK-001` |
| `{MISSION_OBJECTIVE}` | `Implémenter le module Users` |
| `{PROJECT_NAME}` | `Mon Projet` |
| etc. | ... |

### Étape 3: Utiliser avec Task Tool

Copier le prompt modifié et l'utiliser avec le Task tool.

## 🎨 Exemples de Scénarios

### Scénario 1: Conception d'Architecture

```json
{
  "profile": "AGT-STRAT-ARCH",
  "tier": 1,
  "mission": "Concevoir l'architecture du système d'authentification",
  "projectName": "E-Commerce Platform",
  "projectContext": "Plateforme nécessitant OAuth2, JWT, et multi-tenant",
  "phase": "Phase 1 - Architecture",
  "referenceFiles": [
    "docs/requirements/AUTH-REQUIREMENTS.md",
    "docs/architecture/EXISTING-SYSTEM.md"
  ],
  "writePermissions": [
    "docs/architecture/**",
    ".godmode/decisions/**"
  ],
  "deliverables": [
    "docs/architecture/auth/README.md",
    "docs/architecture/adr/ADR-001-auth.md",
    "docs/architecture/diagrams/auth-flow.mermaid"
  ],
  "deadline": "5 jours"
}
```

**Résultat attendu**:
- Documentation architecturale complète
- ADR (Architecture Decision Records)
- Diagrammes Mermaid
- Package de handoff pour les développeurs

### Scénario 2: Développement Backend

```json
{
  "profile": "AGT-DEV-BACK-NODE",
  "tier": 2,
  "mission": "Implémenter l'API de gestion des produits",
  "projectName": "E-Commerce Platform",
  "projectContext": "API RESTful avec NestJS, PostgreSQL, et Redis pour le cache",
  "phase": "Phase 2 - Développement",
  "referenceFiles": [
    "docs/architecture/README.md",
    "docs/api/PRODUCTS-SPEC.yaml",
    "src/backend/app.module.ts",
    "src/backend/categories/categories.module.ts"
  ],
  "writePermissions": [
    "src/backend/products/**",
    "tests/unit/products/**"
  ],
  "deliverables": [
    "src/backend/products/products.module.ts",
    "src/backend/products/products.controller.ts",
    "src/backend/products/products.service.ts",
    "src/backend/products/dto/*.dto.ts",
    "tests/unit/products/*.spec.ts"
  ],
  "deadline": "4 jours",
  "superior": "AGT-LEAD-BACK-001"
}
```

**Résultat attendu**:
- Module NestJS complet
- Tous les endpoints CRUD
- Tests unitaires (>80% coverage)
- Package de handoff avec ARCH.spec

### Scénario 3: Tests Unitaires

```json
{
  "profile": "AGT-QA-UNIT",
  "tier": 2,
  "mission": "Écrire les tests unitaires pour le module Products",
  "projectName": "E-Commerce Platform",
  "projectContext": "Tests avec Jest et Testing Library",
  "phase": "Phase 2 - Tests",
  "referenceFiles": [
    "src/backend/products/products.service.ts",
    "src/backend/products/products.controller.ts"
  ],
  "writePermissions": [
    "tests/unit/products/**",
    "tests/fixtures/products/**"
  ],
  "deliverables": [
    "tests/unit/products/products.service.spec.ts",
    "tests/unit/products/products.controller.spec.ts",
    "tests/fixtures/products/products.fixture.ts"
  ],
  "deadline": "2 jours",
  "superior": "AGT-LEAD-QA-001"
}
```

**Résultat attendu**:
- Tests unitaires complets
- Fixtures réutilisables
- Rapport de couverture
- Documentation des cas testés

### Scénario 4: Interface Frontend

```json
{
  "profile": "AGT-DEV-FRONT-REACT",
  "tier": 2,
  "mission": "Créer la page de liste des produits",
  "projectName": "E-Commerce Platform",
  "projectContext": "Interface avec React, Next.js, et Tailwind CSS",
  "phase": "Phase 2 - Développement",
  "referenceFiles": [
    "src/components/design-system/Card/Card.tsx",
    "src/components/design-system/Button/Button.tsx",
    "docs/design-system/GUIDELINES.md",
    "src/hooks/useProducts.ts"
  ],
  "writePermissions": [
    "src/pages/products/index.tsx",
    "src/components/products/**",
    "tests/unit/products/**"
  ],
  "deliverables": [
    "src/pages/products/index.tsx",
    "src/components/products/ProductCard/ProductCard.tsx",
    "src/components/products/ProductList/ProductList.tsx",
    "tests/unit/products/*.test.tsx",
    "src/components/products/**/*.stories.tsx"
  ],
  "deadline": "3 jours",
  "superior": "AGT-LEAD-FRONT-001"
}
```

**Résultat attendu**:
- Page complète et responsive
- Composants réutilisables
- Tests unitaires et d'accessibilité
- Stories Storybook

## 🔍 Vérification avant Recrutement

Avant de recruter un agent, vérifier:

- [ ] Le profil choisi correspond bien à la tâche
- [ ] La mission est claire et précise
- [ ] Les fichiers de référence existent et sont pertinents
- [ ] Les permissions d'écriture sont correctement définies
- [ ] Les livrables attendus sont explicites
- [ ] La deadline est réaliste
- [ ] Le superviseur est identifié

## 📊 Suivi et Validation

### Pendant la Mission

1. **Vérifier régulièrement** que l'agent respecte ses permissions
2. **Valider les décisions** importantes avec le superviseur
3. **Fournir des clarifications** si l'agent pose des questions

### À la Fin de la Mission

1. **Reviewer les livrables** produits
2. **Vérifier la qualité** (tests, documentation, etc.)
3. **Valider le package de handoff**
4. **Mettre à jour le KARMA** de l'agent si approprié

## 🛠️ Conseils et Bonnes Pratiques

### DO

✅ Fournir un contexte clair et complet
✅ Lister TOUS les fichiers de référence pertinents
✅ Définir des livrables précis et mesurables
✅ Respecter la hiérarchie (Tier 1 recrute Tier 2, etc.)
✅ Utiliser le générateur JavaScript pour la cohérence

### DON'T

❌ Assigner des tâches floues ou trop larges
❌ Oublier de spécifier les permissions d'écriture
❌ Négliger les fichiers de référence
❌ Recruter un agent Tier 1 pour une tâche Tier 2
❌ Modifier manuellement les templates (risque d'erreur)

## 🔧 Dépannage

### Problème: Le prompt généré est incomplet

**Solution**: Vérifier que toutes les variables requises sont dans la config JSON.

### Problème: L'agent ne respecte pas ses permissions

**Solution**: Clarifier les permissions dans la config et dans le brief initial.

### Problème: Les livrables ne correspondent pas

**Solution**: Être plus explicite dans la liste des deliverables.

### Problème: L'agent demande des clarifications constamment

**Solution**: Fournir plus de contexte et de fichiers de référence.

## 📚 Ressources

- **CATALOGUE-AGENTS.md** - Liste complète des profils disponibles
- **SYSTEME-RECRUTEMENT.md** - Protocole de recrutement détaillé
- **README.md** - Documentation des templates
- **examples/** - Exemples de configurations

## 🚀 Prochaines Étapes

Après avoir maîtrisé ce guide:

1. Explorer les templates avancés (Tier 1)
2. Créer ses propres templates personnalisés
3. Contribuer de nouveaux profils au catalogue
4. Optimiser les configurations pour son projet

---

**Version**: 1.0.0
**Dernière mise à jour**: 2024-12-13
**Mainteneur**: AGT-STRAT-ARCH-002
