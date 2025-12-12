/**
 * Centralized Validation Schemas
 *
 * All Zod schemas for API request validation.
 */
import { z } from 'zod';

// ===================
// Common Schemas
// ===================

export const uuidParam = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ===================
// Auth Schemas
// ===================

export const authSchemas = {
  register: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password too long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    organizationName: z.string().min(2).max(100).optional(),
  }),

  login: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),

  refreshToken: z.object({
    refreshToken: z.string().optional(),
  }),

  changePassword: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  }),

  forgotPassword: z.object({
    email: z.string().email('Invalid email format'),
  }),

  resetPassword: z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  }),

  verifyEmail: z.object({
    token: z.string().min(1, 'Verification token is required'),
  }),

  resendVerification: z.object({
    email: z.string().email('Invalid email format'),
  }),

  updateProfile: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  }),
};

// ===================
// Server Schemas
// ===================

export const serverSchemas = {
  create: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().max(500).optional(),
    url: z.string().url('Invalid URL format'),
    masterToken: z.string().min(1, 'Master token is required'),
    healthCheckInterval: z.number().int().min(5000).max(3600000).optional(),
    maxRetries: z.number().int().min(0).max(10).optional(),
    timeout: z.number().int().min(1000).max(300000).optional(),
  }),

  update: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    url: z.string().url('Invalid URL format').optional(),
    masterToken: z.string().min(1).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).optional(),
    healthCheckInterval: z.number().int().min(5000).max(3600000).optional(),
    maxRetries: z.number().int().min(0).max(10).optional(),
    timeout: z.number().int().min(1000).max(300000).optional(),
  }),

  validate: z.object({
    url: z.string().url('Invalid URL format'),
    masterToken: z.string().min(1, 'Master token is required'),
  }),

  listQuery: paginationQuery.extend({
    status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ERROR']).optional(),
  }),
};

// ===================
// Agent Schemas
// ===================

export const agentSchemas = {
  create: z.object({
    name: z.string().min(1, 'Name is required').max(100)
      .regex(/^[a-z0-9-]+$/, 'Name must be lowercase alphanumeric with dashes'),
    displayName: z.string().min(1).max(100),
    description: z.string().max(1000).optional(),
    serverId: z.string().uuid('Invalid server ID'),
    role: z.enum(['MASTER', 'SUPERVISOR', 'WORKER']),
    supervisorId: z.string().uuid().optional().nullable(),
    capabilities: z.array(z.string()).default([]),
    prompt: z.string().max(10000).optional(),
    maxConcurrentTasks: z.number().int().min(1).max(100).optional(),
    priority: z.number().int().min(0).max(100).optional(),
  }),

  update: z.object({
    displayName: z.string().min(1).max(100).optional(),
    description: z.string().max(1000).optional(),
    role: z.enum(['MASTER', 'SUPERVISOR', 'WORKER']).optional(),
    supervisorId: z.string().uuid().optional().nullable(),
    capabilities: z.array(z.string()).optional(),
    prompt: z.string().max(10000).optional(),
    status: z.enum(['IDLE', 'BUSY', 'OFFLINE', 'ERROR']).optional(),
    maxConcurrentTasks: z.number().int().min(1).max(100).optional(),
    priority: z.number().int().min(0).max(100).optional(),
  }),

  parsePrompt: z.object({
    prompt: z.string().min(10, 'Prompt too short').max(10000, 'Prompt too long'),
  }),

  fromPrompt: z.object({
    prompt: z.string().min(10).max(10000),
    serverId: z.string().uuid('Invalid server ID'),
    supervisorId: z.string().uuid().optional(),
  }),

  listQuery: paginationQuery.extend({
    serverId: z.string().uuid().optional(),
    role: z.enum(['MASTER', 'SUPERVISOR', 'WORKER']).optional(),
    status: z.enum(['IDLE', 'BUSY', 'OFFLINE', 'ERROR']).optional(),
  }),
};

// ===================
// Task Schemas
// ===================

export const taskSchemas = {
  create: z.object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().max(5000).optional(),
    agentId: z.string().uuid('Invalid agent ID'),
    type: z.enum(['COMMAND', 'SCRIPT', 'WORKFLOW', 'SCHEDULED']).default('COMMAND'),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).default('NORMAL'),
    payload: z.record(z.unknown()).optional(),
    schedule: z.string().optional(), // Cron expression
    timeout: z.number().int().min(1000).max(86400000).optional(), // Max 24h
    retryCount: z.number().int().min(0).max(10).optional(),
    dependsOnIds: z.array(z.string().uuid()).optional(),
  }),

  update: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    agentId: z.string().uuid().optional(),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).optional(),
    payload: z.record(z.unknown()).optional(),
    schedule: z.string().nullable().optional(),
    timeout: z.number().int().min(1000).max(86400000).optional(),
    retryCount: z.number().int().min(0).max(10).optional(),
  }),

  addDependencies: z.object({
    dependsOnIds: z.array(z.string().uuid()).min(1, 'At least one dependency required'),
  }),

  removeDependencies: z.object({
    dependsOnIds: z.array(z.string().uuid()).min(1),
  }),

  listQuery: paginationQuery.extend({
    agentId: z.string().uuid().optional(),
    status: z.enum(['PENDING', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
    type: z.enum(['COMMAND', 'SCRIPT', 'WORKFLOW', 'SCHEDULED']).optional(),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).optional(),
  }),
};

// ===================
// Tools Schemas
// ===================

export const toolSchemas = {
  install: z.object({
    toolId: z.string().uuid('Invalid tool ID'),
    agentPermissions: z.array(z.object({
      agentId: z.string().uuid(),
      canUse: z.boolean().default(true),
      canSudo: z.boolean().default(false),
      rateLimit: z.number().int().min(1).optional(),
    })).optional(),
    allowAllAgents: z.boolean().optional(),
  }),

  updatePermission: z.object({
    canUse: z.boolean().optional(),
    canSudo: z.boolean().optional(),
    rateLimit: z.number().int().min(1).nullable().optional(),
    allowedCommands: z.array(z.string()).optional(),
    blockedCommands: z.array(z.string()).optional(),
  }),

  listQuery: z.object({
    category: z.enum([
      'VERSION_CONTROL',
      'CONTAINER',
      'LANGUAGE_RUNTIME',
      'KUBERNETES',
      'CLOUD_CLI',
      'DEVOPS',
      'DATABASE',
      'MONITORING',
      'OTHER',
    ]).optional(),
  }),
};

// ===================
// Chat Schemas
// ===================

export const chatSchemas = {
  createSession: z.object({
    agentId: z.string().uuid('Invalid agent ID'),
  }),

  sendMessage: z.object({
    content: z.string()
      .min(1, 'Message cannot be empty')
      .max(10000, 'Message too long'),
  }),

  listQuery: z.object({
    agentId: z.string().uuid().optional(),
  }),
};

// ===================
// Audit Schemas
// ===================

export const auditSchemas = {
  listQuery: paginationQuery.extend({
    userId: z.string().uuid().optional(),
    action: z.enum([
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'TOKEN_REFRESH',
      'CREATE', 'READ', 'UPDATE', 'DELETE',
      'SERVER_CONNECT', 'SERVER_DISCONNECT', 'HEALTH_CHECK',
      'AGENT_VALIDATE',
    ]).optional(),
    resource: z.string().optional(),
    resourceId: z.string().optional(),
    status: z.enum(['SUCCESS', 'FAILURE', 'PARTIAL']).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),

  cleanup: z.object({
    confirm: z.literal(true, { errorMap: () => ({ message: 'Confirmation required' }) }),
    daysToKeep: z.number().int().min(1).max(365).default(90),
  }),

  statsQuery: z.object({
    hours: z.coerce.number().int().min(1).max(720).default(24),
  }),
};

// Export all schemas
export const schemas = {
  auth: authSchemas,
  server: serverSchemas,
  agent: agentSchemas,
  task: taskSchemas,
  tool: toolSchemas,
  chat: chatSchemas,
  audit: auditSchemas,
  common: {
    uuid: uuidParam,
    pagination: paginationQuery,
  },
};
