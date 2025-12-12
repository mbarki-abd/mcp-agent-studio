/**
 * Audit Middleware
 *
 * Automatically logs HTTP requests and responses for audit trail.
 */

import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { AuditAction } from '@prisma/client';
import { auditService, extractAuditContext } from '../services/audit.service.js';

// Routes that should not be logged (health checks, static assets, etc.)
const EXCLUDED_PATHS = [
  '/health',
  '/ready',
  '/metrics',
  '/favicon.ico',
];

// Map HTTP methods to audit actions for CRUD operations
const METHOD_TO_ACTION: Record<string, AuditAction> = {
  GET: 'READ',
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

// Extract resource name from path
function extractResource(path: string): string {
  // Remove query string
  const cleanPath = path.split('?')[0];

  // Get first meaningful segment (e.g., /api/servers/123 -> servers)
  const segments = cleanPath.split('/').filter(Boolean);

  // Skip 'api' prefix if present
  const resourceIndex = segments[0] === 'api' ? 1 : 0;
  return segments[resourceIndex] || 'unknown';
}

// Extract resource ID from path if present
function extractResourceId(path: string): string | undefined {
  const cleanPath = path.split('?')[0];
  const segments = cleanPath.split('/').filter(Boolean);

  // Look for UUID pattern in segments
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  for (const segment of segments) {
    if (uuidPattern.test(segment)) {
      return segment;
    }
  }

  // Also check for numeric IDs
  const resourceIndex = segments[0] === 'api' ? 2 : 1;
  if (segments[resourceIndex] && /^\d+$/.test(segments[resourceIndex])) {
    return segments[resourceIndex];
  }

  return undefined;
}

// Determine if request body should be logged
function shouldLogBody(method: string, path: string): boolean {
  // Don't log bodies for sensitive routes
  const sensitiveRoutes = ['/auth/login', '/auth/register', '/auth/password'];
  return !sensitiveRoutes.some(route => path.includes(route));
}

// Sanitize body by removing sensitive fields
function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;

  const sensitiveFields = ['password', 'passwordHash', 'token', 'refreshToken', 'secret', 'apiKey', 'masterToken'];
  const sanitized = { ...body as Record<string, unknown> };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

export function registerAuditMiddleware(fastify: FastifyInstance): void {
  // Store request start time
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    (request as FastifyRequest & { auditStartTime: number }).auditStartTime = Date.now();
  });

  // Log after response is sent
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const path = request.url;

    // Skip excluded paths
    if (EXCLUDED_PATHS.some(excluded => path.startsWith(excluded))) {
      return;
    }

    const startTime = (request as FastifyRequest & { auditStartTime: number }).auditStartTime || Date.now();
    const duration = Date.now() - startTime;
    const method = request.method;
    const statusCode = reply.statusCode;
    const resource = extractResource(path);
    const resourceId = extractResourceId(path);

    // Determine action
    let action: AuditAction = METHOD_TO_ACTION[method] || 'READ';

    // Override for specific routes
    if (path.includes('/auth/login')) {
      action = statusCode < 400 ? 'LOGIN' : 'LOGIN_FAILED';
    } else if (path.includes('/auth/logout')) {
      action = 'LOGOUT';
    } else if (path.includes('/auth/refresh')) {
      action = 'TOKEN_REFRESH';
    } else if (path.includes('/health-check')) {
      action = 'HEALTH_CHECK';
    }

    // Build context
    const context = extractAuditContext({
      user: (request as FastifyRequest & { user?: { id: string; email: string } }).user,
      ip: request.ip,
      headers: request.headers as Record<string, string>,
      method,
      url: path,
    });

    // Prepare metadata
    const metadata: Record<string, unknown> = {};

    if (shouldLogBody(method, path) && request.body) {
      metadata.requestBody = sanitizeBody(request.body);
    }

    // Log the audit entry
    await auditService.log({
      ...context,
      action,
      resource,
      resourceId,
      status: statusCode < 400 ? 'SUCCESS' : 'FAILURE',
      statusCode,
      duration,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    });
  });
}

/**
 * Manual audit logging helpers for specific operations
 */

export async function auditLogin(
  request: FastifyRequest,
  success: boolean,
  userId?: string,
  userEmail?: string,
  errorMessage?: string
): Promise<void> {
  const context = extractAuditContext({
    ip: request.ip,
    headers: request.headers as Record<string, string>,
    method: request.method,
    url: request.url,
  });

  if (success) {
    await auditService.logSuccess('LOGIN', 'auth', {
      ...context,
      userId,
      userEmail,
    });
  } else {
    await auditService.logFailure('LOGIN_FAILED', 'auth', errorMessage || 'Invalid credentials', {
      ...context,
      userEmail, // Log attempted email even on failure
    });
  }
}

export async function auditLogout(
  request: FastifyRequest,
  userId: string,
  userEmail: string
): Promise<void> {
  const context = extractAuditContext({
    user: { id: userId, email: userEmail },
    ip: request.ip,
    headers: request.headers as Record<string, string>,
    method: request.method,
    url: request.url,
  });

  await auditService.logSuccess('LOGOUT', 'auth', context);
}

export async function auditResourceChange(
  request: FastifyRequest,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  resource: string,
  resourceId: string,
  oldValue?: unknown,
  newValue?: unknown
): Promise<void> {
  const context = extractAuditContext({
    user: (request as FastifyRequest & { user?: { id: string; email: string } }).user,
    ip: request.ip,
    headers: request.headers as Record<string, string>,
    method: request.method,
    url: request.url,
  });

  await auditService.logSuccess(action, resource, {
    ...context,
    resourceId,
    oldValue: oldValue ? sanitizeBody(oldValue) : undefined,
    newValue: newValue ? sanitizeBody(newValue) : undefined,
  });
}
