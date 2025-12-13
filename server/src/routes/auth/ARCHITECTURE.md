# Architecture du Module Auth

## Vue d'ensemble

Le module Auth est organisé en couches fonctionnelles, chacune responsable d'un aspect spécifique de l'authentification et de l'autorisation.

## Diagramme de Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                     server/src/index.ts                              │
│                                                                      │
│  await fastify.register(authRoutes, { prefix: '/api/auth' })        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ import
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                    routes/auth/index.ts                              │
│                                                                      │
│  export async function authRoutes(fastify) {                        │
│    await fastify.register(authenticationRoutes);                    │
│    await fastify.register(registrationRoutes);                      │
│    await fastify.register(passwordRoutes);                          │
│    await fastify.register(emailVerificationRoutes);                 │
│  }                                                                   │
└──┬────────────┬───────────────┬───────────────┬──────────────────────┘
   │            │               │               │
   │            │               │               │
┌──▼────────┐ ┌─▼──────────┐ ┌─▼──────────┐ ┌─▼─────────────────────┐
│ Authentication │ Registration │  Password   │ Email Verification    │
│     Routes     │    Routes    │   Routes    │      Routes           │
└────────────┘ └──────────┘ └──────────┘ └───────────────────────┘
```

## Flux des Requêtes

```
HTTP Request
     │
     ▼
┌─────────────────────────────────┐
│  Fastify Server (index.ts)      │
│  - CORS                          │
│  - Rate Limiting                 │
│  - Logging                       │
│  - Authentication Decorator      │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Auth Router (auth/index.ts)    │
│  Prefix: /api/auth              │
└────────────┬────────────────────┘
             │
             ├─ /login ─────────────────────┐
             │                              │
             ├─ /register ──────────────────┤
             │                              │
             ├─ /forgot-password ───────────┤
             │                              │
             └─ /verify-email ──────────────┤
                                            │
                                            ▼
                            ┌────────────────────────────┐
                            │  Route Handler             │
                            │  - Schema Validation       │
                            │  - Middlewares             │
                            │  - Business Logic          │
                            └────────┬───────────────────┘
                                     │
                                     ▼
                            ┌────────────────────────────┐
                            │  Database (Prisma)         │
                            │  - Users                   │
                            │  - Sessions                │
                            │  - Tokens                  │
                            │  - Organizations           │
                            └────────┬───────────────────┘
                                     │
                                     ▼
                            ┌────────────────────────────┐
                            │  Response                  │
                            │  - JSON Data               │
                            │  - HTTP Cookies            │
                            │  - Status Code             │
                            └────────────────────────────┘
```

## Couches du Module

### 1. Routing Layer (index.ts)

**Responsabilité:** Enregistrement et organisation des sous-routes

```typescript
export async function authRoutes(fastify: FastifyInstance) {
  await fastify.register(authenticationRoutes);
  await fastify.register(registrationRoutes);
  await fastify.register(passwordRoutes);
  await fastify.register(emailVerificationRoutes);
}
```

### 2. Route Handlers (*.routes.ts)

**Responsabilité:** Définition des endpoints et validation

```typescript
fastify.post('/endpoint', {
  schema: { /* OpenAPI schema */ },
  preHandler: [rateLimitAuth, validate({ body: schema })],
}, async (request, reply) => {
  // Business logic
});
```

### 3. Middleware Layer

**Responsabilités:**
- Validation des entrées (Zod)
- Rate limiting
- Authentication (JWT)
- Audit logging

### 4. Business Logic Layer

**Responsabilités:**
- Hashage de mots de passe
- Génération de tokens
- Gestion de sessions
- Envoi d'emails (TODO)

### 5. Data Layer (Prisma)

**Responsabilités:**
- Transactions ACID
- Requêtes SQL optimisées
- Relations entre entités

## Dépendances entre Modules

```
authentication.routes.ts
├── prisma (User, Session)
├── bcrypt (password verification)
├── crypto (JWT IDs)
├── audit.middleware (login/logout tracking)
└── cookies.utils (setAuthCookies, clearAuthCookies)

registration.routes.ts
├── prisma (User, Organization, Invitation)
├── bcrypt (password hashing)
├── crypto (JWT IDs)
└── cookies.utils (setAuthCookies)

password.routes.ts
├── prisma (User, PasswordResetToken, Session)
├── bcrypt (password hashing/verification)
└── crypto (reset tokens)

email-verification.routes.ts
├── prisma (User, EmailVerificationToken)
└── crypto (verification tokens)
```

## Schémas Prisma Utilisés

```prisma
model User {
  id                String
  email             String
  passwordHash      String
  name              String
  role              Role
  emailVerified     Boolean
  emailVerifiedAt   DateTime?
  organizationId    String
  organization      Organization
  sessions          Session[]
  passwordResets    PasswordResetToken[]
  emailVerifications EmailVerificationToken[]
}

model Session {
  id           String
  userId       String
  token        String
  refreshToken String
  expiresAt    DateTime
  user         User
}

model PasswordResetToken {
  id        String
  userId    String
  token     String
  used      Boolean
  expiresAt DateTime
  user      User
}

model EmailVerificationToken {
  id        String
  userId    String
  token     String
  used      Boolean
  expiresAt DateTime
  user      User
}

model OrganizationInvitation {
  id             String
  organizationId String
  email          String
  role           Role
  token          String
  acceptedAt     DateTime?
  expiresAt      DateTime
  organization   Organization
}
```

## Flow d'Authentification

### Login Flow
```
1. POST /api/auth/login
   ├─ Validate email/password (Zod)
   ├─ Rate limit check
   ├─ Find user in DB
   ├─ Verify password (bcrypt)
   ├─ Generate JWT tokens
   ├─ Create session in DB
   ├─ Set HTTP-only cookies
   ├─ Audit log (success/failure)
   └─ Return user data
```

### Registration Flow
```
1. POST /api/auth/register
   ├─ Validate input (Zod)
   ├─ Rate limit check
   ├─ Check email uniqueness
   ├─ Hash password (bcrypt, 14 rounds)
   ├─ Create organization
   ├─ Create user (ADMIN role)
   ├─ Generate JWT tokens
   ├─ Create session
   ├─ Set HTTP-only cookies
   └─ Return user data
```

### Token Refresh Flow
```
1. POST /api/auth/refresh
   ├─ Read refresh token (cookie or body)
   ├─ Validate token exists
   ├─ Find session in DB
   ├─ Verify JWT signature
   ├─ Check token type === 'refresh'
   ├─ Generate new token pair
   ├─ Update session in DB
   ├─ Set new HTTP-only cookies
   └─ Return success
```

### Password Reset Flow
```
1. POST /api/auth/forgot-password
   ├─ Validate email (Zod)
   ├─ Rate limit check
   ├─ Find user (don't reveal existence)
   ├─ Invalidate old reset tokens
   ├─ Generate reset token (crypto.randomBytes)
   ├─ Hash token (SHA-256)
   ├─ Store in DB (expires 1h)
   ├─ TODO: Send email
   └─ Return generic success

2. POST /api/auth/reset-password
   ├─ Validate token + new password (Zod)
   ├─ Rate limit check
   ├─ Hash token for lookup
   ├─ Find valid reset token
   ├─ Verify expiration
   ├─ Hash new password (bcrypt)
   ├─ Transaction:
   │  ├─ Update user password
   │  ├─ Mark token as used
   │  └─ Delete all sessions (force re-login)
   └─ Return success
```

## Sécurité

### Tokens JWT

```javascript
// Access Token (30min)
{
  userId: string,
  email: string,
  role: Role,
  jti: UUID,  // Unique ID per token
  exp: timestamp
}

// Refresh Token (7 days)
{
  userId: string,
  type: 'refresh',
  jti: UUID,
  exp: timestamp
}
```

### Password Hashing

```javascript
bcrypt.hash(password, 14)  // 14 rounds = ~1-2s
```

### Reset/Verification Tokens

```javascript
// Generate
const token = crypto.randomBytes(32).toString('hex')
const hash = crypto.createHash('sha256').update(token).digest('hex')

// Store hash in DB, send plaintext token via email
```

### HTTP-Only Cookies

```javascript
{
  httpOnly: true,      // No JavaScript access
  secure: true,        // HTTPS only (production)
  sameSite: 'strict',  // CSRF protection
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
}
```

## Performance

### Database Indexes

```prisma
@@unique([email])           // User lookup
@@unique([token])           // Session lookup
@@unique([refreshToken])    // Refresh token lookup
@@index([userId])           // User relations
@@index([expiresAt])        // Token cleanup
```

### Rate Limiting

```javascript
// Auth endpoints
- 10 requests / 15 minutes (login, register)
- 5 requests / 15 minutes (password reset)
```

### Session Cleanup

```javascript
// Automatic cleanup of expired sessions
prisma.session.deleteMany({
  where: { expiresAt: { lt: new Date() } }
})
```

## Extensibilité

### Ajout de nouveaux providers

Créer un nouveau fichier `oauth.routes.ts` :

```typescript
export async function oauthRoutes(fastify: FastifyInstance) {
  fastify.get('/google', googleOAuthHandler);
  fastify.get('/github', githubOAuthHandler);
}
```

Enregistrer dans `index.ts` :

```typescript
await fastify.register(oauthRoutes);
```

### Ajout de 2FA

Créer `two-factor.routes.ts` :

```typescript
export async function twoFactorRoutes(fastify: FastifyInstance) {
  fastify.post('/2fa/enable', enable2FAHandler);
  fastify.post('/2fa/verify', verify2FAHandler);
  fastify.post('/2fa/disable', disable2FAHandler);
}
```

## Monitoring

### Audit Logs

Toutes les actions sensibles sont loguées :
- Login (succès/échec)
- Logout
- Password change
- Password reset
- Email verification

### Métriques

```javascript
// Track
- Login success rate
- Failed login attempts (by IP)
- Session duration
- Token refresh rate
- Password reset requests
```

## Tests Recommandés

### Unit Tests
- Token generation
- Password hashing
- Token validation
- Email generation

### Integration Tests
- Login flow
- Registration flow
- Password reset flow
- Token refresh flow

### E2E Tests
- Complete user journey
- Error scenarios
- Rate limiting
- Session management

---

**Version:** 1.0.0
**Dernière mise à jour:** 2025-12-13
**Mainteneur:** AGT-DEV-BACK-001
