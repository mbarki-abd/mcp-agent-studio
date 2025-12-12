# Test Credentials

This document contains the test user credentials for E2E testing and local development.

## Database Setup

Before using these credentials, ensure the database is seeded:

```bash
# From server directory
pnpm db:push   # Create/update database schema
pnpm db:seed   # Seed test data
```

## Verify Test Users

To verify that test users are correctly set up:

```bash
# From server directory
pnpm tsx scripts/verify-test-user.ts
```

## Test Credentials

### Test User (Regular User)
- **Email:** `test@example.com`
- **Password:** `password123`
- **Role:** `USER`
- **Organization:** Test Organization (`test-org`)
- **Email Verified:** Yes

### Admin User
- **Email:** `admin@example.com`
- **Password:** `password123`
- **Role:** `ADMIN`
- **Organization:** Test Organization (`test-org`)
- **Email Verified:** Yes

## Usage in E2E Tests

These credentials are used in Playwright E2E tests:

```typescript
// Example E2E test login
await page.goto('http://localhost:5173/login');
await page.fill('input[type="email"]', 'test@example.com');
await page.fill('input[type="password"]', 'password123');
await page.click('button[type="submit"]');
```

## Security Notes

- ⚠️ **These credentials are for LOCAL DEVELOPMENT and TESTING ONLY**
- ⚠️ **NEVER use these credentials in production**
- ⚠️ **The passwords are intentionally simple for testing purposes**
- The passwords are hashed using bcrypt with 12 salt rounds
- The seed script is idempotent (can be run multiple times safely)

## Database Connection

The test users are stored in the PostgreSQL database configured in `.env`:

```bash
DATABASE_URL=postgresql://mcp:mcp_local_password@localhost:5432/mcp_agent_studio
```

## Additional Test Data

The seed script also creates:
- 1 test organization (`test-org`)
- 38 tool definitions (Git, Docker, Kubernetes, etc.)

## Troubleshooting

### Users not found
```bash
# Reset and re-seed the database
pnpm db:push
pnpm db:seed
```

### Password verification fails
```bash
# Run verification script
pnpm tsx scripts/verify-test-user.ts
```

### Database connection issues
Check that PostgreSQL is running:
```bash
docker ps | grep postgres
# Should show: mcp-postgres-local
```

## Related Files

- `server/prisma/seed.ts` - Main seed script
- `server/scripts/verify-test-user.ts` - Verification script
- `server/.env` - Database configuration
- `docker-compose.local.yml` - Local Docker setup
