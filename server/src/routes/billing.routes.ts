import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getTenantContext } from '../utils/tenant.js';
import { billingService, PLAN_CONFIG } from '../services/billing.service.js';

const changePlanSchema = z.object({
  plan: z.enum(['FREE', 'STARTER', 'PRO', 'ENTERPRISE']),
});

export async function billingRoutes(fastify: FastifyInstance) {
  // Get current billing info
  fastify.get('/', {
    schema: {
      tags: ['Billing'],
      description: 'Get current billing information',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { organizationId } = getTenantContext(request.user);

    const billingInfo = await billingService.getBillingInfo(organizationId);
    if (!billingInfo) {
      return reply.status(404).send({ error: 'Organization not found' });
    }

    const planConfig = PLAN_CONFIG[billingInfo.plan];

    return {
      ...billingInfo,
      planDetails: {
        name: planConfig.name,
        priceMonthly: planConfig.priceMonthly,
        priceYearly: planConfig.priceYearly,
        features: planConfig.features,
        limits: planConfig.limits,
      },
    };
  });

  // Get all available plans
  fastify.get('/plans', {
    schema: {
      tags: ['Billing'],
      description: 'Get all available subscription plans',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { organizationId } = getTenantContext(request.user);
    const billingInfo = await billingService.getBillingInfo(organizationId);

    return {
      currentPlan: billingInfo?.plan || 'FREE',
      plans: billingService.getPlans(),
    };
  });

  // Preview plan change
  fastify.post('/preview', {
    schema: {
      tags: ['Billing'],
      description: 'Preview plan change (prorated amounts)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate, fastify.requireRole('ADMIN')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { organizationId } = getTenantContext(request.user);
    const body = changePlanSchema.parse(request.body);

    try {
      const preview = await billingService.previewPlanChange(organizationId, body.plan);
      return preview;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Preview failed';
      return reply.status(400).send({ error: message });
    }
  });

  // Change plan (admin only)
  fastify.post('/change-plan', {
    schema: {
      tags: ['Billing'],
      description: 'Change subscription plan (admin only)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate, fastify.requireRole('ADMIN')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { organizationId } = getTenantContext(request.user);
    const body = changePlanSchema.parse(request.body);

    try {
      const result = await billingService.changePlan(organizationId, body.plan);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Plan change failed';
      return reply.status(400).send({ error: message });
    }
  });

  // Get usage report
  fastify.get('/usage', {
    schema: {
      tags: ['Billing'],
      description: 'Get detailed usage report for current billing period',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { organizationId } = getTenantContext(request.user);

    try {
      const report = await billingService.getUsageReport(organizationId);
      return report;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get usage';
      return reply.status(400).send({ error: message });
    }
  });

  // Check quota for resource
  fastify.get('/quota/:resource', {
    schema: {
      tags: ['Billing'],
      description: 'Check if quota allows creating a new resource',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { organizationId } = getTenantContext(request.user);
    const { resource } = request.params as { resource: string };

    if (!['users', 'servers', 'agents', 'tasks'].includes(resource)) {
      return reply.status(400).send({ error: 'Invalid resource type' });
    }

    const quota = await billingService.checkQuota(
      organizationId,
      resource as 'users' | 'servers' | 'agents' | 'tasks'
    );

    return quota;
  });
}
