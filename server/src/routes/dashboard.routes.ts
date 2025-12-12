import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../index.js';
import { getTenantContext, getOrganizationServerIds, getOrganizationUserIds } from '../utils/tenant.js';

export async function dashboardRoutes(fastify: FastifyInstance) {
  // Get dashboard overview statistics
  fastify.get('/stats', {
    schema: {
      tags: ['Dashboard'],
      description: 'Get dashboard overview statistics',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { organizationId } = getTenantContext(request.user);

    // Get organization's servers and users
    const [orgServerIds, orgUserIds] = await Promise.all([
      getOrganizationServerIds(organizationId),
      getOrganizationUserIds(organizationId),
    ]);

    // Parallel stats queries
    const [
      serverCount,
      serversOnline,
      agentCount,
      agentsActive,
      taskCount,
      tasksRunning,
      tasksPending,
      recentExecutions,
      executionStats,
    ] = await Promise.all([
      // Server counts
      prisma.serverConfiguration.count({
        where: { id: { in: orgServerIds } },
      }),
      prisma.serverConfiguration.count({
        where: { id: { in: orgServerIds }, status: 'ONLINE' },
      }),

      // Agent counts
      prisma.agent.count({
        where: { serverId: { in: orgServerIds } },
      }),
      prisma.agent.count({
        where: { serverId: { in: orgServerIds }, status: 'ACTIVE' },
      }),

      // Task counts
      prisma.task.count({
        where: { createdById: { in: orgUserIds } },
      }),
      prisma.task.count({
        where: { createdById: { in: orgUserIds }, status: 'RUNNING' },
      }),
      prisma.task.count({
        where: { createdById: { in: orgUserIds }, status: 'PENDING' },
      }),

      // Recent executions (last 24 hours)
      prisma.taskExecution.findMany({
        where: {
          task: { createdById: { in: orgUserIds } },
          startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        select: {
          id: true,
          status: true,
          durationMs: true,
          tokensUsed: true,
          startedAt: true,
          completedAt: true,
          task: { select: { title: true } },
          agent: { select: { name: true, displayName: true } },
        },
        orderBy: { startedAt: 'desc' },
        take: 10,
      }),

      // Execution stats (last 7 days)
      prisma.taskExecution.groupBy({
        by: ['status'],
        where: {
          task: { createdById: { in: orgUserIds } },
          startedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        _count: true,
      }),
    ]);

    // Build execution breakdown
    const executionBreakdown: Record<string, number> = {};
    let totalExecutions = 0;
    for (const stat of executionStats) {
      executionBreakdown[stat.status] = stat._count;
      totalExecutions += stat._count;
    }

    const successCount = executionBreakdown['COMPLETED'] || 0;
    const failureCount = (executionBreakdown['FAILED'] || 0) + (executionBreakdown['TIMEOUT'] || 0);

    return {
      overview: {
        servers: {
          total: serverCount,
          online: serversOnline,
          offline: serverCount - serversOnline,
        },
        agents: {
          total: agentCount,
          active: agentsActive,
          inactive: agentCount - agentsActive,
        },
        tasks: {
          total: taskCount,
          running: tasksRunning,
          pending: tasksPending,
        },
      },
      executionStats: {
        period: '7d',
        total: totalExecutions,
        success: successCount,
        failure: failureCount,
        successRate: totalExecutions > 0 ? Math.round((successCount / totalExecutions) * 100) : 0,
        breakdown: executionBreakdown,
      },
      recentExecutions: recentExecutions.map((e) => ({
        id: e.id,
        taskTitle: e.task.title,
        agentName: e.agent.displayName || e.agent.name,
        status: e.status,
        durationMs: e.durationMs,
        tokensUsed: e.tokensUsed,
        startedAt: e.startedAt,
        completedAt: e.completedAt,
      })),
    };
  });

  // Get activity feed (recent events)
  fastify.get('/activity', {
    schema: {
      tags: ['Dashboard'],
      description: 'Get recent activity feed',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { organizationId } = getTenantContext(request.user);
    const query = request.query as { limit?: number };
    const limit = query.limit || 20;

    const [orgServerIds, orgUserIds] = await Promise.all([
      getOrganizationServerIds(organizationId),
      getOrganizationUserIds(organizationId),
    ]);

    // Get recent audit logs for the organization
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        userId: { in: orgUserIds },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return {
      activities: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        status: log.status,
        userEmail: log.userEmail,
        timestamp: log.timestamp,
        metadata: log.metadata,
      })),
    };
  });

  // Get system health overview
  fastify.get('/health', {
    schema: {
      tags: ['Dashboard'],
      description: 'Get system health overview',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { organizationId } = getTenantContext(request.user);

    const orgServerIds = await getOrganizationServerIds(organizationId);

    // Get server health statuses
    const servers = await prisma.serverConfiguration.findMany({
      where: { id: { in: orgServerIds } },
      select: {
        id: true,
        name: true,
        status: true,
        lastHealthCheck: true,
        lastError: true,
      },
    });

    // Check database connectivity
    const dbHealthy = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);

    // Determine overall health
    const allServersOnline = servers.every((s) => s.status === 'ONLINE');
    const someServersOnline = servers.some((s) => s.status === 'ONLINE');

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (!dbHealthy) {
      overallStatus = 'unhealthy';
    } else if (!allServersOnline) {
      overallStatus = someServersOnline ? 'degraded' : 'unhealthy';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      components: {
        database: {
          status: dbHealthy ? 'healthy' : 'unhealthy',
        },
        servers: servers.map((s) => ({
          id: s.id,
          name: s.name,
          status: s.status === 'ONLINE' ? 'healthy' : s.status === 'DEGRADED' ? 'degraded' : 'unhealthy',
          lastCheck: s.lastHealthCheck,
          error: s.lastError,
        })),
      },
    };
  });
}
