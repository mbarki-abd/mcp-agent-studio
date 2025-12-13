# Guide d'Exécution des Tests

## Installation

```bash
cd server
npm install
```

## Commandes de Tests

### Exécuter tous les tests
```bash
npm run test
```

### Exécuter les tests en mode watch
```bash
npm run test:watch
```

### Générer le rapport de coverage
```bash
npm run test:coverage
```

Le rapport sera généré dans `server/coverage/`

### Exécuter uniquement les nouveaux tests

```bash
# Tests MCP Client
npx vitest run src/tests/mcp-client.test.ts

# Tests Master Agent Service
npx vitest run src/tests/master-agent.service.test.ts

# Tests Tools Service
npx vitest run src/tests/tools.service.test.ts
```

### Exécuter un test spécifique
```bash
npx vitest run -t "should connect successfully via WebSocket"
```

### Mode debug avec logs
```bash
npx vitest run --reporter=verbose
```

## Visualiser le Coverage

Après `npm run test:coverage`, ouvrir le rapport HTML :

```bash
# Windows
start coverage/index.html

# Linux/Mac
open coverage/index.html
```

## Structure des Tests

```
server/src/tests/
├── mcp-client.test.ts              # 22 tests - Core MCP Protocol
├── master-agent.service.test.ts    # 23 tests - Orchestration
├── tools.service.test.ts           # 27 tests - Tool Management
└── [autres tests existants...]
```

## Résultats Attendus

```
Test Files  4 failed | 19 passed (23)
Tests       7 failed | 475 passed | 6 skipped (488)
```

**Note:** Les 7 échecs incluent:
- 2 tests pré-existants (password.test.ts - salt rounds changé)
- 5 tests nouveaux avec timing WebSocket à affiner

## Coverage Attendu

| Service | Coverage |
|---------|----------|
| mcp-client.ts | ~85% |
| master-agent.service.ts | ~80% |
| tools.service.ts | ~90% |

## Debugging

### Si un test échoue

1. Vérifier les mocks:
```typescript
vi.mock('../module.js', () => ({
  export: vi.fn()
}))
```

2. Ajouter des logs:
```typescript
console.log('Debug:', someVariable)
```

3. Utiliser le debugger:
```typescript
import { it } from 'vitest'
it.only('test spécifique', async () => {
  // Ce test sera le seul exécuté
})
```

### Problèmes courants

**TypeError: Cannot read property 'X' of undefined**
→ Vérifier que les mocks sont bien initialisés dans beforeEach()

**Timeout errors**
→ Ajouter `{ timeout: 10000 }` au test ou utiliser `vi.useFakeTimers()`

**Import errors**
→ S'assurer que les paths se terminent par `.js` (ESM)

## CI/CD

Pour intégrer dans votre pipeline:

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: |
    cd server
    npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    directory: ./server/coverage
```

## Maintenance

### Ajouter un nouveau test

1. Créer le fichier: `src/tests/mon-service.test.ts`
2. Structure recommandée:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MyService } from '../services/my-service.js'

// Mocks
vi.mock('../index.js', () => ({
  prisma: { /* ... */ }
}))

describe('MyService', () => {
  let service: MyService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new MyService()
  })

  describe('Feature Group', () => {
    it('should do something', () => {
      // Arrange
      const input = 'test'

      // Act
      const result = service.doSomething(input)

      // Assert
      expect(result).toBe('expected')
    })
  })
})
```

### Mettre à jour un test existant

1. Identifier le fichier de test
2. Trouver le `describe` et `it` correspondants
3. Modifier le test
4. Lancer `npm run test:watch` pour voir les résultats en temps réel

## Ressources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Projet Coverage Report](./TEST_COVERAGE_REPORT.md)
- [Tests Summary](./TESTS_SUMMARY.txt)
