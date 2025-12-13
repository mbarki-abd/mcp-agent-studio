# Guide de Migration - Auth Routes

## Avant / Après

### Structure AVANT
```
server/src/routes/
└── auth.routes.ts  (934 lignes - MONOLITHIQUE)
    ├── register
    ├── login
    ├── me
    ├── logout
    ├── refresh
    ├── forgot-password
    ├── reset-password
    ├── send-verification
    ├── resend-verification
    ├── verify-email
    ├── profile
    ├── change-password
    ├── accept-invitation
    └── invitation/:token
```

### Structure APRÈS
```
server/src/routes/auth/  (MODULAIRE)
├── index.ts                      (29 lignes)
│   └── Enregistre tous les sous-modules
│
├── authentication.routes.ts      (296 lignes)
│   ├── login
│   ├── me
│   ├── logout
│   ├── refresh
│   └── profile
│
├── registration.routes.ts        (282 lignes)
│   ├── register
│   ├── accept-invitation
│   └── invitation/:token
│
├── password.routes.ts            (199 lignes)
│   ├── change-password
│   ├── forgot-password
│   └── reset-password
│
└── email-verification.routes.ts (181 lignes)
    ├── verify-email
    ├── send-verification
    └── resend-verification
```

## Import AVANT
```typescript
// server/src/index.ts
const { authRoutes } = await import('./routes/auth.routes.js');
await fastify.register(authRoutes, { prefix: '/api/auth' });
```

## Import APRÈS
```typescript
// server/src/index.ts
const { authRoutes } = await import('./routes/auth/index.js');
await fastify.register(authRoutes, { prefix: '/api/auth' });
```

## API Endpoints (INCHANGÉS)

Tous les endpoints restent identiques :

| Endpoint | Avant | Après | Status |
|----------|-------|-------|--------|
| POST /api/auth/register | ✅ | ✅ | Identique |
| POST /api/auth/login | ✅ | ✅ | Identique |
| GET /api/auth/me | ✅ | ✅ | Identique |
| POST /api/auth/logout | ✅ | ✅ | Identique |
| POST /api/auth/refresh | ✅ | ✅ | Identique |
| PATCH /api/auth/profile | ✅ | ✅ | Identique |
| POST /api/auth/change-password | ✅ | ✅ | Identique |
| POST /api/auth/forgot-password | ✅ | ✅ | Identique |
| POST /api/auth/reset-password | ✅ | ✅ | Identique |
| POST /api/auth/verify-email | ✅ | ✅ | Identique |
| POST /api/auth/send-verification | ✅ | ✅ | Identique |
| POST /api/auth/resend-verification | ✅ | ✅ | Identique |
| POST /api/auth/accept-invitation | ✅ | ✅ | Identique |
| GET /api/auth/invitation/:token | ✅ | ✅ | Identique |

## Checklist de Migration

### Étape 1 : Validation ✅
- [x] Créer le dossier `server/src/routes/auth/`
- [x] Créer les 5 fichiers modulaires
- [x] Mettre à jour `server/src/index.ts`
- [x] Vérifier la compilation TypeScript
- [x] Démarrer le serveur de dev

### Étape 2 : Tests
- [ ] Tester POST /api/auth/login
- [ ] Tester POST /api/auth/register
- [ ] Tester GET /api/auth/me
- [ ] Tester POST /api/auth/logout
- [ ] Tester POST /api/auth/refresh
- [ ] Tester POST /api/auth/forgot-password
- [ ] Tester POST /api/auth/reset-password
- [ ] Tester POST /api/auth/change-password
- [ ] Tester POST /api/auth/verify-email
- [ ] Tester POST /api/auth/accept-invitation
- [ ] Tester GET /api/auth/invitation/:token

### Étape 3 : Nettoyage
- [ ] Vérifier que tous les tests E2E passent
- [ ] Supprimer `server/src/routes/auth.routes.ts`
- [ ] Commit des changements

## Commandes de Test

```bash
# Démarrer le serveur
pnpm run dev

# Test Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"new@example.com","password":"password123","name":"New User"}'

# Test Me (nécessite token)
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Test Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Avantages de la Migration

### Maintenabilité
✅ Fichiers plus petits et ciblés
✅ Séparation claire des responsabilités
✅ Navigation plus facile

### Scalabilité
✅ Ajout de nouvelles routes simplifié
✅ Modifications isolées par domaine
✅ Possibilité d'extraire en microservices

### Code Review
✅ PRs plus petites et ciblées
✅ Contexte clair pour les reviewers
✅ Moins de conflits Git

## Rollback (si nécessaire)

En cas de problème, rollback simple :

```bash
# Restaurer l'import original
git checkout HEAD -- server/src/index.ts

# Supprimer le nouveau dossier
rm -rf server/src/routes/auth/

# Redémarrer le serveur
pnpm run dev
```

## Support

**Documentation complète:** `server/src/routes/auth/README.md`
**Rapport détaillé:** `server/REFACTORING-AUTH-REPORT.md`

---

**Date de migration:** 2025-12-13
**Agent responsable:** AGT-DEV-BACK-001
**Status:** ✅ PRÊT POUR VALIDATION
