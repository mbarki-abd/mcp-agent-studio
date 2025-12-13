# Tasks Routes - Modular Architecture

## Overview

The tasks routes have been refactored from a single monolithic file (1129 LOC) into a modular structure for better maintainability and separation of concerns.

## Structure

```
server/src/routes/tasks/
├── README.md                    # This file
├── index.ts                     # Main plugin composition
├── crud.routes.ts               # CRUD operations (403 LOC)
├── execution.routes.ts          # Execution & status (181 LOC)
├── dependencies.routes.ts       # Dependencies management (150 LOC)
└── bulk.routes.ts               # Bulk operations (395 LOC)
```

## Route Organization

### 1. CRUD Operations (`crud.routes.ts`)
**Base path:** `/tasks`

- `GET /` - List all tasks (paginated, filtered, searchable)
- `POST /` - Create a new task
- `GET /:id` - Get task by ID (with executions, dependencies)
- `PUT /:id` - Update task (owner only)
- `DELETE /:id` - Delete task (owner only)

### 2. Execution Operations (`execution.routes.ts`)
**Base path:** `/tasks`

- `POST /:id/execute` - Execute task immediately
- `POST /execute-prompt` - Execute prompt directly on agent (no task creation)
- `POST /executions/:executionId/retry` - Retry failed execution
- `POST /:id/cancel` - Cancel running/queued task
- `GET /:id/executions` - Get task execution history

### 3. Dependencies Management (`dependencies.routes.ts`)
**Base path:** `/tasks`

- `GET /:id/dependencies` - Check task dependencies status
- `POST /:id/dependencies` - Add dependencies to task
- `DELETE /:id/dependencies` - Remove dependencies from task

### 4. Bulk Operations (`bulk.routes.ts`)
**Base path:** `/tasks/bulk`

- `POST /cancel` - Cancel multiple tasks
- `POST /delete` - Delete multiple tasks (with force option)
- `POST /status` - Update status of multiple tasks
- `POST /execute` - Execute multiple tasks (sequential or parallel)
- `POST /retry` - Retry multiple failed tasks

## Backward Compatibility

The original `tasks.routes.ts` file has been converted to a compatibility layer that re-exports the new modular structure:

```typescript
// server/src/routes/tasks.routes.ts
export { taskRoutes } from './tasks/index.js';
```

This ensures that existing imports in `server/src/index.ts` continue to work without modification.

## Benefits

1. **Maintainability**: Each module has a single responsibility
2. **Readability**: Smaller files are easier to navigate and understand
3. **Scalability**: New features can be added to specific modules without cluttering others
4. **Testing**: Modules can be tested independently
5. **Code Review**: Changes are isolated to specific modules

## Migration Guide

### For New Code

Import specific route modules:

```typescript
import { taskCrudRoutes } from './routes/tasks/crud.routes.js';
import { taskExecutionRoutes } from './routes/tasks/execution.routes.js';
import { taskDependenciesRoutes } from './routes/tasks/dependencies.routes.js';
import { taskBulkRoutes } from './routes/tasks/bulk.routes.js';
```

### For Existing Code

No changes required. The existing import continues to work:

```typescript
import { taskRoutes } from './routes/tasks.routes.js';
```

## API Endpoints Summary

| Method | Path | Module | Description |
|--------|------|--------|-------------|
| GET | `/tasks` | crud | List tasks |
| POST | `/tasks` | crud | Create task |
| GET | `/tasks/:id` | crud | Get task details |
| PUT | `/tasks/:id` | crud | Update task |
| DELETE | `/tasks/:id` | crud | Delete task |
| POST | `/tasks/:id/execute` | execution | Execute task |
| POST | `/tasks/execute-prompt` | execution | Execute prompt directly |
| POST | `/tasks/executions/:id/retry` | execution | Retry execution |
| POST | `/tasks/:id/cancel` | execution | Cancel task |
| GET | `/tasks/:id/executions` | execution | Get execution history |
| GET | `/tasks/:id/dependencies` | dependencies | Check dependencies |
| POST | `/tasks/:id/dependencies` | dependencies | Add dependencies |
| DELETE | `/tasks/:id/dependencies` | dependencies | Remove dependencies |
| POST | `/tasks/bulk/cancel` | bulk | Bulk cancel |
| POST | `/tasks/bulk/delete` | bulk | Bulk delete |
| POST | `/tasks/bulk/status` | bulk | Bulk status update |
| POST | `/tasks/bulk/execute` | bulk | Bulk execute |
| POST | `/tasks/bulk/retry` | bulk | Bulk retry |

## Shared Dependencies

All modules share common dependencies:

- **Fastify**: Web framework
- **Zod**: Schema validation
- **Prisma**: Database ORM
- **Tenant Utils**: Multi-tenancy support
- **Pagination Utils**: Paginated responses

## Testing

To test the refactored routes:

```bash
# Build the server
npm run build

# Run tests (if available)
npm test

# Start the server and test endpoints
npm run dev
```

## Future Improvements

1. Add unit tests for each module
2. Add integration tests for route combinations
3. Consider adding a `scheduling.routes.ts` module if scheduling logic grows
4. Add OpenAPI/Swagger documentation generation
5. Implement rate limiting per module

---

**Refactored by:** AGT-REFACTOR-ROUTES
**Date:** 2025-12-13
**Original File Size:** 1129 LOC
**New Total Size:** ~1129 LOC (split across 4 modules + 1 index)
