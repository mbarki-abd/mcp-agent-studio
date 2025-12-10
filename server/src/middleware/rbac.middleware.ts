import { AbilityBuilder, PureAbility, AbilityClass } from '@casl/ability';
import { PrismaQuery, Subjects, createPrismaAbility } from '@casl/prisma';
import { FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import type { JWTPayload } from './auth.middleware.js';

// Define all subjects (Prisma models)
type AppSubjects =
  | 'User'
  | 'Organization'
  | 'ServerConfiguration'
  | 'Agent'
  | 'Task'
  | 'TaskExecution'
  | 'ToolDefinition'
  | 'ServerTool'
  | 'AgentToolPermission'
  | 'Project'
  | 'AuditLog'
  | 'all';

// Define actions
type AppActions = 'create' | 'read' | 'update' | 'delete' | 'manage' | 'execute' | 'validate';

// Define ability type
export type AppAbility = PureAbility<[AppActions, AppSubjects], PrismaQuery>;
const AppAbilityClass = PureAbility as AbilityClass<AppAbility>;

// Define abilities based on role
export function defineAbilitiesFor(user: JWTPayload): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(AppAbilityClass);
  const role = user.role || 'VIEWER';

  switch (role) {
    case 'ADMIN':
      // Admin can do everything
      can('manage', 'all');
      break;

    case 'MANAGER':
      // Manager can manage most resources
      can('manage', 'ServerConfiguration');
      can('manage', 'Agent');
      can('manage', 'Task');
      can('manage', 'TaskExecution');
      can('manage', 'ServerTool');
      can('manage', 'AgentToolPermission');
      can('manage', 'Project');
      can('read', 'ToolDefinition');
      can('read', 'User');
      can('read', 'Organization');
      can('read', 'AuditLog');
      // Cannot manage users or organization
      cannot('manage', 'User');
      cannot('manage', 'Organization');
      break;

    case 'OPERATOR':
      // Operator can execute and manage tasks
      can('read', 'ServerConfiguration');
      can('read', 'Agent');
      can('execute', 'Agent');
      can('manage', 'Task');
      can('read', 'TaskExecution');
      can('read', 'ServerTool');
      can('read', 'AgentToolPermission');
      can('read', 'Project');
      can('read', 'ToolDefinition');
      // Cannot create/delete servers or agents
      cannot('create', 'ServerConfiguration');
      cannot('delete', 'ServerConfiguration');
      cannot('create', 'Agent');
      cannot('delete', 'Agent');
      cannot('validate', 'Agent');
      break;

    case 'VIEWER':
    default:
      // Viewer can only read
      can('read', 'ServerConfiguration');
      can('read', 'Agent');
      can('read', 'Task');
      can('read', 'TaskExecution');
      can('read', 'ServerTool');
      can('read', 'ToolDefinition');
      can('read', 'Project');
      // Cannot modify anything
      cannot('create', 'all');
      cannot('update', 'all');
      cannot('delete', 'all');
      cannot('execute', 'all');
      break;
  }

  return build();
}

// Fastify plugin to add ability to request
declare module 'fastify' {
  interface FastifyRequest {
    ability: AppAbility;
  }
}

async function rbacPlugin(fastify: ReturnType<typeof import('fastify').default>) {
  fastify.decorateRequest('ability', null);

  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    if (request.user) {
      request.ability = defineAbilitiesFor(request.user as JWTPayload);
    }
  });
}

export default fp(rbacPlugin, {
  name: 'rbac-plugin',
  dependencies: ['auth-plugin'],
});

// Helper middleware to check permissions
export function requirePermission(action: AppActions, subject: AppSubjects) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.ability) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    if (!request.ability.can(action, subject)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `You don't have permission to ${action} ${subject}`,
      });
    }
  };
}

// Helper to check specific resource permission
export function canAccess(ability: AppAbility, action: AppActions, subject: AppSubjects): boolean {
  return ability.can(action, subject);
}
