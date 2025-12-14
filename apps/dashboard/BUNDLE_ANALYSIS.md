# Guide d'Analyse du Bundle

## Vue d'ensemble

Le dashboard dispose d'outils avancés pour analyser et optimiser la taille du bundle JavaScript.

## Outils Disponibles

### 1. Analyse Visuelle du Bundle

```bash
pnpm run analyze
```

**Ce que ça fait:**
- Build le projet en mode production
- Génère un rapport visuel interactif (`dist/stats.html`)
- Ouvre automatiquement le rapport dans le navigateur

**Le rapport contient:**
- 🗺️ Treemap interactive des modules
- 📊 Tailles réelles, gzipped, et brotli
- 🔗 Graphe de dépendances
- ⚠️ Identification des duplications

### 2. Comparaison avec un Commit Précédent

```bash
./scripts/compare-bundle-sizes.sh [commit-hash]
```

**Exemples:**
```bash
# Comparer avec le commit précédent
./scripts/compare-bundle-sizes.sh

# Comparer avec un commit spécifique
./scripts/compare-bundle-sizes.sh abc123

# Comparer avec la branche main
./scripts/compare-bundle-sizes.sh origin/main
```

**Sortie:**
```
🔍 Comparing bundle sizes...
Current: HEAD
Previous: HEAD~1

📦 Building current version...
Current build:
  - Total JS: 1.2MiB
  - Gzipped:  370KiB

📦 Building previous version (HEAD~1)...
Previous build (HEAD~1):
  - Total JS: 1.3MiB
  - Gzipped:  390KiB

📊 Changes:
  - Total JS: -100KiB (-7.69%)
  - Gzipped:  -20KiB

🎉 Great! Bundle size decreased by more than 10%!
```

### 3. Build Standard

```bash
pnpm run build
```

Génère le build de production sans ouvrir le rapport visuel.

## Structure des Chunks

Le build est divisé en **8 chunks vendors** + code applicatif:

| Chunk | Contenu | Taille (gzipped) | Stratégie Cache |
|-------|---------|------------------|-----------------|
| `react-vendor` | React core | 58 KB | Long (stable) |
| `ui-vendor` | Radix UI | 30 KB | Long (stable) |
| `query-vendor` | React Query + Zustand | 13 KB | Moyen |
| `chart-vendor` | Recharts | 106 KB | Long (lazy) |
| `terminal-vendor` | XTerm.js | 73 KB | Long (lazy) |
| `form-vendor` | React Hook Form + Zod | 22 KB | Moyen |
| `i18n-vendor` | i18next | 16 KB | Long (stable) |
| `utils-vendor` | Utilitaires divers | 20 KB | Moyen |

## Interprétation du Rapport

### Treemap

Les rectangles représentent les modules:
- **Taille:** Proportionnelle au poids du module
- **Couleur:** Par bibliothèque (même couleur = même package)
- **Clic:** Affiche les détails (taille réelle, gzipped, brotli)

### Zones à Surveiller

#### ⚠️ Modules Larges (> 100 KB)
Si un module dépasse 100 KB (non compressé), considérez:
- Le charger en lazy loading
- Chercher une alternative plus légère
- Le splitter en sous-modules

#### ⚠️ Duplications
Si vous voyez plusieurs versions d'un même package:
```
lodash@4.17.21 (50 KB)
lodash@4.17.20 (50 KB)
```

**Solution:**
```bash
# Forcer une résolution unique dans package.json
"pnpm": {
  "overrides": {
    "lodash": "4.17.21"
  }
}
```

#### ⚠️ Imports Inutilisés
Si un module apparaît mais n'est pas utilisé:
```bash
# Chercher les imports
grep -r "import.*from.*'package-name'" src/
```

## Objectifs de Performance

### Seuils d'Alerte

| Métrique | Seuil | Action |
|----------|-------|--------|
| Bundle total (gzipped) | > 500 KB | Investigation requise |
| Chunk individuel | > 150 KB | Lazy loading recommandé |
| Augmentation | > 10% | Review obligatoire |

### Cibles Actuelles

- ✅ Bundle total: ~370 KB (gzipped)
- ✅ Plus gros chunk: 106 KB (chart-vendor)
- ✅ Code applicatif: ~22 KB (index)

## Optimisations Recommandées

### Court Terme

#### 1. Lazy Loading des Routes

**Actuellement:**
```typescript
import { CreateServer } from './pages/CreateServer';
```

**Optimisé:**
```typescript
const CreateServer = lazy(() => import('./pages/CreateServer'));
```

**Impact estimé:** -30% du bundle initial

#### 2. Preload des Chunks Critiques

```html
<link rel="preload" href="/assets/react-vendor.js" as="script">
```

**Impact estimé:** -200ms temps de chargement

### Moyen Terme

#### 3. Remplacer Date-fns par date-fns-esm

```bash
pnpm remove date-fns
pnpm add date-fns-esm
```

**Impact estimé:** -15 KB (gzipped)

#### 4. Alternatives aux Bibliothèques Lourdes

| Actuel | Alternative | Gain |
|--------|-------------|------|
| recharts (393 KB) | visx (~200 KB) | -193 KB |
| framer-motion (62 KB) | CSS animations | -62 KB |

### Long Terme

#### 5. Module Federation (Microfrontends)

Pour une architecture scalable, considérer:
- Séparer le dashboard en modules indépendants
- Partager les vendors via Module Federation
- Permettre le développement décentralisé

## Monitoring Continu

### Dans la CI/CD

Ajoutez ce step dans `.github/workflows/ci.yml`:

```yaml
- name: Bundle Size Check
  run: |
    pnpm run build
    chmod +x ./scripts/compare-bundle-sizes.sh
    ./scripts/compare-bundle-sizes.sh origin/main
```

**Comportement:**
- ✅ Passe si < 10% d'augmentation
- ❌ Échoue si > 10% d'augmentation
- 💬 Commente sur la PR avec les stats

### Dashboards Externes

Intégrations possibles:
- **Bundlephobia:** https://bundlephobia.com (analyse automatique)
- **Bundle Buddy:** https://bundle-buddy.com (duplicate detection)
- **Source Map Explorer:** Analyse locale détaillée

## Dépannage

### Le build échoue avec "Out of memory"

```bash
# Augmenter la mémoire Node.js
NODE_OPTIONS=--max-old-space-size=4096 pnpm run build
```

### Stats.html n'est pas généré

Vérifiez que `rollup-plugin-visualizer` est installé:
```bash
pnpm add -D rollup-plugin-visualizer
```

### Les chunks ne sont pas séparés

Vérifiez `vite.config.ts`:
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        // Configuration ici
      }
    }
  }
}
```

## Ressources

### Documentation
- [Vite Build Optimization](https://vitejs.dev/guide/build.html)
- [Rollup Manual Chunks](https://rollupjs.org/guide/en/#outputmanualchunks)
- [Bundle Size Optimization Guide](https://web.dev/reduce-javascript-payloads-with-code-splitting/)

### Outils
- [Bundlephobia](https://bundlephobia.com) - Analyse de packages
- [Bundle Buddy](https://bundle-buddy.com) - Détection de duplications
- [Webpack Bundle Analyzer](https://www.npmjs.com/package/webpack-bundle-analyzer) - Pour Webpack

## Support

Pour toute question sur l'analyse du bundle:
1. Consultez `BUILD_OPTIMIZATION_REPORT.md`
2. Exécutez `pnpm run analyze` pour une vue visuelle
3. Ouvrez une issue sur GitHub avec le tag `performance`

---

**Dernière mise à jour:** 2025-12-13
**Maintenu par:** AGT-BUILD-001 (GODMODE Build Agent)
