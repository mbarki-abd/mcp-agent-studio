# Module Auth - Documentation

## Vue d'ensemble

Ce module regroupe toutes les fonctionnalités d'authentification et d'autorisation de l'application.

## Structure

```
auth/
├── index.ts                      # Point d'entrée principal - enregistre tous les sous-modules
├── authentication.routes.ts      # Authentification et sessions
├── registration.routes.ts        # Inscription et invitations
├── password.routes.ts            # Gestion des mots de passe
└── email-verification.routes.ts  # Vérification des emails
```

## Routes disponibles

### Authentication (authentication.routes.ts)

| Méthode | Endpoint | Description | Auth requise |
|---------|----------|-------------|--------------|
| POST | `/api/auth/login` | Connexion utilisateur | ❌ |
| GET | `/api/auth/me` | Profil utilisateur connecté | ✅ |
| POST | `/api/auth/logout` | Déconnexion | ✅ |
| POST | `/api/auth/refresh` | Rafraîchir les tokens | ❌ |
| PATCH | `/api/auth/profile` | Mettre à jour le profil | ✅ |

### Registration (registration.routes.ts)

| Méthode | Endpoint | Description | Auth requise |
|---------|----------|-------------|--------------|
| POST | `/api/auth/register` | Créer un nouveau compte | ❌ |
| POST | `/api/auth/accept-invitation` | Accepter invitation organisation | ❌ |
| GET | `/api/auth/invitation/:token` | Voir détails invitation | ❌ |

### Password (password.routes.ts)

| Méthode | Endpoint | Description | Auth requise |
|---------|----------|-------------|--------------|
| POST | `/api/auth/change-password` | Changer mot de passe | ✅ |
| POST | `/api/auth/forgot-password` | Demander reset mot de passe | ❌ |
| POST | `/api/auth/reset-password` | Réinitialiser mot de passe | ❌ |

### Email Verification (email-verification.routes.ts)

| Méthode | Endpoint | Description | Auth requise |
|---------|----------|-------------|--------------|
| POST | `/api/auth/verify-email` | Vérifier email avec token | ❌ |
| POST | `/api/auth/send-verification` | Envoyer email vérification | ✅ |
| POST | `/api/auth/resend-verification` | Renvoyer email vérification | ❌ |

## Utilisation

### Importer le module

```typescript
import { authRoutes } from './routes/auth/index.js';

// Enregistrer avec préfixe
await fastify.register(authRoutes, { prefix: '/api/auth' });
```

### Ajouter une nouvelle route

1. Identifier le module approprié (authentication, registration, password, email-verification)
2. Ajouter la route dans le fichier correspondant
3. Suivre le pattern existant :
   - Définir le schema OpenAPI
   - Ajouter les middlewares nécessaires (validation, auth, rate limiting)
   - Implémenter la logique métier
   - Retourner une réponse appropriée

Exemple :

```typescript
export async function authenticationRoutes(fastify: FastifyInstance) {
  // Nouvelle route
  fastify.post('/ma-nouvelle-route', {
    schema: {
      tags: ['Auth'],
      description: 'Description de la route',
      security: [{ bearerAuth: [] }], // Si auth requise
    },
    preHandler: [fastify.authenticate, validate({ body: schema })],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // Logique métier
    return { success: true };
  });
}
```

## Middlewares utilisés

### Rate Limiting
- `rateLimitAuth` : Appliqué sur les routes sensibles (login, register, forgot-password, etc.)

### Validation
- `validate({ body: schema })` : Validation Zod des corps de requête

### Authentication
- `fastify.authenticate` : Vérifie le JWT token et ajoute `request.user`

### Audit
- `auditLogin()` : Enregistre les tentatives de connexion
- `auditLogout()` : Enregistre les déconnexions

## Schémas Zod

Tous les schémas de validation sont importés depuis `../../schemas/index.js` :

```typescript
import { authSchemas } from '../../schemas/index.js';

// Utilisation
validate({ body: authSchemas.login })
validate({ body: authSchemas.register })
validate({ body: authSchemas.changePassword })
// etc.
```

## Cookies HTTP-Only

Le module utilise des cookies sécurisés pour stocker les tokens :

```typescript
import {
  setAuthCookies,
  clearAuthCookies,
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
} from '../../utils/cookies.js';

// Définir les cookies
setAuthCookies(reply, accessToken, refreshToken);

// Effacer les cookies
clearAuthCookies(reply);
```

## Sécurité

### Tokens JWT
- **Access Token** : Expire en 30 minutes
- **Refresh Token** : Expire en 7 jours
- Tous les tokens incluent un `jti` (JWT ID) unique

### Mots de passe
- Hashés avec `bcrypt` (rounds: 14)
- Validation : minimum 8 caractères

### Reset Tokens
- Tokens de reset générés avec `crypto.randomBytes(32)`
- Stockés hashés (SHA-256)
- Expiration : 1 heure

### Verification Tokens
- Tokens de vérification générés avec `crypto.randomBytes(32)`
- Stockés hashés (SHA-256)
- Expiration : 24 heures

## Sessions

Les sessions sont stockées en base de données (Prisma) :

```typescript
await prisma.session.create({
  data: {
    userId: user.id,
    token: accessToken,
    refreshToken,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  },
});
```

## Organisation et Invitations

### Création d'organisation
Lors de l'inscription, une organisation par défaut est créée automatiquement.

### Invitations
Les invitations permettent d'ajouter des utilisateurs à une organisation existante :
1. Admin crée une invitation (voir `organization.routes.ts`)
2. Utilisateur reçoit le token par email
3. Utilisateur accepte via `POST /api/auth/accept-invitation`
4. Compte créé et lié à l'organisation

## TODO (Email Integration)

Les fonctionnalités suivantes nécessitent une intégration email :
- `forgot-password` : Envoyer le lien de reset
- `send-verification` : Envoyer le lien de vérification
- `resend-verification` : Renvoyer le lien

Intégrations recommandées :
- SendGrid
- AWS SES
- Mailgun
- Postmark

## Migration depuis auth.routes.ts

Si vous migrez depuis l'ancien fichier monolithique :

1. ✅ Le nouveau module est compatible à 100%
2. ✅ Aucun changement d'API
3. ✅ Tous les middlewares préservés
4. ✅ Schémas Zod identiques
5. ⚠️ L'ancien fichier peut être supprimé après validation

## Tests

Pour tester le module :

```bash
# Lancer le serveur
pnpm run dev

# Tester une route
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Support

En cas de problème, vérifier :
1. Les logs serveur (`pnpm run dev`)
2. Le rapport de refactoring (`server/REFACTORING-AUTH-REPORT.md`)
3. Les erreurs TypeScript (`pnpm turbo run typecheck`)

---

**Version:** 1.0.0
**Dernière mise à jour:** 2025-12-13
**Maintenu par:** AGT-DEV-BACK-001
