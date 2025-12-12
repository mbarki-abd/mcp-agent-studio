import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getTenantContext } from '../utils/tenant.js';
import { analyticsService } from '../services/analytics.service.js';

const periodQuerySchema = z.object({
  days: z.coerce.number().min(1).max(365).default(30),
});

export async function analyticsRoutes(fastify: FastifyInstance) {
  // Get overview analytics
  fastify.get('/overview', {
    schema: {
      tags: ['Analytics'],
      description: 'Get comprehensive analytics overview',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'integer', minimum: 1, maximum: 365, default: 30 },
        },
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { organizationId } = getTenantContext(request.user);
    const query = periodQuerySchema.parse(request.query);

    const overview = await analyticsService.getOverview(organizationId, query.days);
    return overview;
  });

  // Get task analytics
  fastify.get('/tasks', {
    schema: {
      tags: ['Analytics'],
      description: 'Get task-specific analytics',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'integer', minimum: 1, maximum: 365, default: 30 },
        },
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { organizationId } = getTenantContext(request.user);
    const query = periodQuerySchema.parse(request.query);

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - query.days * 24 * 60 * 60 * 1000);

    const analytics = await analyticsService.getTaskAnalytics(organizationId, startDate, endDate);
    return {
      ...analytics,
      period: { start: startDate, end: endDate, days: query.days },
    };
  });

  // Get agent analytics
  fastify.get('/agents', {
    schema: {
      tags: ['Analytics'],
      description: 'Get agent-specific analytics',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'integer', minimum: 1, maximum: 365, default: 30 },
        },
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { organizationId } = getTenantContext(request.user);
    const query = periodQuerySchema.parse(request.query);

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - query.days * 24 * 60 * 60 * 1000);

    const analytics = await analyticsService.getAgentAnalytics(organizationId, startDate, endDate);
    return {
      ...analytics,
      period: { start: startDate, end: endDate, days: query.days },
    };
  });

  // Get server analytics
  fastify.get('/servers', {
    schema: {
      tags: ['Analytics'],
      description: 'Get server-specific analytics',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { organizationId } = getTenantContext(request.user);

    const analytics = await analyticsService.getServerAnalytics(organizationId);
    return analytics;
  });

  // Get execution analytics
  fastify.get('/executions', {
    schema: {
      tags: ['Analytics'],
      description: 'Get execution-specific analytics',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'integer', minimum: 1, maximum: 365, default: 30 },
        },
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { organizationId } = getTenantContext(request.user);
    const query = periodQuerySchema.parse(request.query);

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - query.days * 24 * 60 * 60 * 1000);

    const analytics = await analyticsService.getExecutionAnalytics(organizationId, startDate, endDate);
    return {
      ...analytics,
      period: { start: startDate, end: endDate, days: query.days },
    };
  });

  // Export analytics report
  fastify.get('/export', {
    schema: {
      tags: ['Analytics'],
      description: 'Export analytics data as JSON',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'integer', minimum: 1, maximum: 365, default: 30 },
          format: { type: 'string', enum: ['json'], default: 'json' },
        },
      },
    },
    preHandler: [fastify.authenticate, fastify.requireRole('MANAGER')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { organizationId } = getTenantContext(request.user);
    const query = request.query as { days?: number; format?: string };
    const days = query.days || 30;

    const overview = await analyticsService.getOverview(organizationId, days);

    const exportData = {
      exportedAt: new Date().toISOString(),
      organizationId,
      period: overview.period,
      data: overview,
    };

    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', `attachment; filename=analytics-${organizationId}-${days}d.json`);

    return exportData;
  });
}
