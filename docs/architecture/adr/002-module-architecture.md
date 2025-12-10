# ADR-002: Module Architecture

## Status: ACCEPTED

**Date:** 2025-12-10

---

## Context

Le dashboard doit supporter:
- Fonctionnalités extensibles (plugins/modules)
- Lazy loading pour performance
- RBAC par module
- Navigation dynamique

---

## Decision

Adopter une **architecture modulaire** avec:

### Module Definition

```typescript
interface ModuleDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  icon?: React.ComponentType;

  // Dependencies
  dependencies?: string[];
  peerDependencies?: string[];

  // Routes & Navigation
  routes: ModuleRoute[];
  navigation?: NavigationItem[];

  // Permissions
  permissions?: PermissionDefinition[];

  // Lifecycle
  hooks?: {
    onInit?: (context: ModuleContext) => void;
    onDestroy?: () => void;
    onUserLogin?: (user: User) => void;
    onUserLogout?: () => void;
  };

  // Extension points
  slots?: Record<string, React.ComponentType[]>;
}
```

### Module Registry

```typescript
class ModuleRegistry {
  private modules: Map<string, ModuleDefinition>;

  register(module: ModuleDefinition): void;
  unregister(id: string): void;
  get(id: string): ModuleDefinition | undefined;
  getAll(): ModuleDefinition[];
  isEnabled(id: string): boolean;
}
```

### Module Loader

```typescript
// Lazy loading with React.lazy
const ModuleLoader: React.FC<{ moduleId: string }> = ({ moduleId }) => {
  const module = useModule(moduleId);
  const LazyComponent = React.lazy(() => import(`@/modules/${moduleId}`));

  return (
    <Suspense fallback={<ModuleSkeleton />}>
      <LazyComponent />
    </Suspense>
  );
};
```

### Core Modules

| Module | Path | Description |
|--------|------|-------------|
| agents | `/agents/*` | Gestion agents |
| tasks | `/tasks/*` | Création/scheduling tâches |
| monitoring | `/monitoring/*` | Control center temps réel |
| tools | `/tools/*` | Gestion outils Unix |
| chat | `/chat/*` | Chat par agent |
| settings | `/settings/*` | Configuration |

### Folder Structure

```
apps/dashboard/
├── src/
│   ├── core/              # Core (non-modulaire)
│   │   ├── auth/
│   │   ├── api/
│   │   ├── modules/       # Module system
│   │   └── layout/
│   │
│   └── modules/           # Feature modules
│       ├── agents/
│       │   ├── index.ts   # ModuleDefinition export
│       │   ├── routes.tsx
│       │   ├── pages/
│       │   ├── components/
│       │   └── stores/
│       ├── tasks/
│       ├── monitoring/
│       ├── tools/
│       └── chat/
```

---

## Alternatives Considered

### Micro-frontends

| Pros | Cons |
|------|------|
| Isolation complète | Complexity overhead |
| Deploy indépendant | Shared state difficile |
| Tech agnostic | Performance (bundle size) |

**Decision:** Trop complexe pour notre scope. Modules internes suffisent.

### Single Monolith

| Pros | Cons |
|------|------|
| Simple | Hard to extend |
| No overhead | Tight coupling |

**Decision:** Pas assez flexible pour features futures.

---

## Consequences

### Positive
- Features ajoutées sans modifier le core
- Lazy loading améliore initial load
- Navigation générée automatiquement
- RBAC appliqué par module

### Negative
- Overhead initial pour setup module system
- Convention stricte à suivre

### Migration Path
1. Implémenter core module system
2. Migrer features existantes en modules
3. Documenter pattern pour nouveaux modules

---

## Related

- ADR-001: Tech Stack
- PLAN-003: Dashboard Modules
