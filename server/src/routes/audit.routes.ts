/**
 * Audit Log Routes
 *
 * API endpoints for querying audit logs (admin only).
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AuditAction, AuditStatus } from '@prisma/client';
import { auditService } from '../services/audit.service.js';

// Query schema
const querySchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.nativeEnum(AuditAction).optional(),
  resource: z.string().optional(),
  resourceId: z.string().optional(),
  status: z.nativeEnum(AuditStatus).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export async function auditRoutes(fastify: FastifyInstance) {
  // All audit routes require admin role
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    await fastify.authenticate(request, reply);
    const user = request.user as { role: string };
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Admin access required' });
    }
  });

  // Query audit logs
  fastify.get('/', {
    schema: {
      tags: ['Audit'],
      description: 'Query audit logs with filters (admin only)',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string', format: 'uuid' },
          action: { type: 'string', enum: Object.values(AuditAction) },
          resource: { type: 'string' },
          resourceId: { type: 'string' },
          status: { type: 'string', enum: Object.values(AuditStatus) },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          offset: { type: 'integer', minimum: 0, default: 0 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = querySchema.parse(request.query);

    const result = await auditService.query({
      ...query,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });

    return result;
  });

  // Get audit statistics
  fastify.get('/stats', {
    schema: {
      tags: ['Audit'],
      description: 'Get audit log statistics (admin only)',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          hours: { type: 'integer', minimum: 1, maximum: 720, default: 24 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { hours = 24 } = request.query as { hours?: number };
    return auditService.getStats(hours);
  });

  // Get failed login attempts
  fastify.get('/failed-logins', {
    schema: {
      tags: ['Audit'],
      description: 'Get failed login attempts (admin only)',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          hours: { type: 'integer', minimum: 1, maximum: 720, default: 24 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 100 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { hours = 24, limit = 100 } = request.query as { hours?: number; limit?: number };
    return auditService.getFailedLogins(hours, limit);
  });

  // Get admin actions
  fastify.get('/admin-actions', {
    schema: {
      tags: ['Audit'],
      description: 'Get recent admin actions (admin only)',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          hours: { type: 'integer', minimum: 1, maximum: 720, default: 24 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { hours = 24 } = request.query as { hours?: number };
    return auditService.getAdminActions(hours);
  });

  // Get user activity
  fastify.get('/user/:userId', {
    schema: {
      tags: ['Audit'],
      description: 'Get activity for a specific user (admin only)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as { userId: string };
    const { limit = 50 } = request.query as { limit?: number };
    return auditService.getUserActivity(userId, limit);
  });

  // Get resource history
  fastify.get('/resource/:resource/:resourceId', {
    schema: {
      tags: ['Audit'],
      description: 'Get audit history for a specific resource (admin only)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['resource', 'resourceId'],
        properties: {
          resource: { type: 'string' },
          resourceId: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { resource, resourceId } = request.params as { resource: string; resourceId: string };
    const { limit = 20 } = request.query as { limit?: number };
    return auditService.getResourceHistory(resource, resourceId, limit);
  });

  // Cleanup old logs (dangerous - requires explicit confirmation)
  fastify.delete('/cleanup', {
    schema: {
      tags: ['Audit'],
      description: 'Delete old audit logs (admin only, requires confirmation)',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['confirm', 'daysToKeep'],
        properties: {
          confirm: { type: 'boolean', const: true },
          daysToKeep: { type: 'integer', minimum: 30, maximum: 365 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { confirm, daysToKeep } = request.body as { confirm: boolean; daysToKeep: number };

    if (!confirm) {
      return reply.status(400).send({ error: 'Confirmation required' });
    }

    const result = await auditService.cleanup(daysToKeep);
    return {
      message: `Deleted ${result.deleted} audit logs older than ${daysToKeep} days`,
      ...result,
    };
  });
}
