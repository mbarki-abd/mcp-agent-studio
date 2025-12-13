/**
 * DEPRECATED: This file is kept for backward compatibility.
 * Use individual route modules from ./tasks/ instead.
 *
 * The routes have been refactored into:
 * - tasks/crud.routes.ts - CRUD operations
 * - tasks/execution.routes.ts - Task execution and status
 * - tasks/dependencies.routes.ts - Dependency management
 * - tasks/bulk.routes.ts - Bulk operations
 * - tasks/index.ts - Main plugin composition
 */

export { taskRoutes } from './tasks/index.js';
