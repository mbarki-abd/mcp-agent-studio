import { FastifyInstance } from 'fastify';
import { taskCrudRoutes } from './crud.routes.js';
import { taskExecutionRoutes } from './execution.routes.js';
import { taskDependenciesRoutes } from './dependencies.routes.js';
import { taskBulkRoutes } from './bulk.routes.js';

/**
 * Main tasks plugin that composes all task-related routes
 */
export async function taskRoutes(fastify: FastifyInstance) {
  // CRUD operations (GET, POST, PUT, DELETE on /tasks)
  await fastify.register(taskCrudRoutes);

  // Execution operations (execute, cancel, executions history)
  await fastify.register(taskExecutionRoutes);

  // Dependencies management
  await fastify.register(taskDependenciesRoutes);

  // Bulk operations (on /tasks/bulk/*)
  await fastify.register(taskBulkRoutes, { prefix: '/bulk' });
}
