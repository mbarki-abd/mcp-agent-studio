import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../index.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { getTenantContext, getOrganizationUserIds } from '../utils/tenant.js';
import { validate } from '../middleware/validation.middleware.js';
import { serverSchemas, uuidParam } from '../schemas/index.js';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import {
  parsePagination,
  buildPaginatedResponse,
  calculateSkip,
  buildOrderBy,
  validateSortField,
} from '../utils/pagination.js';

// Extended schema for local use (includes wsUrl, isDefault, autoConnect)
const createServerSchema = serverSchemas.create.extend({
  wsUrl: z.string().url().optional(),
  isDefault: z.boolean().optional(),
  autoConnect: z.boolean().optional(),
});

const updateServerSchema = createServerSchema.partial();

// Allowed sort fields for servers
const SERVER_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'status'];

export async function serverRoutes(fastify: FastifyInstance) {
  // List servers for organization (all members can see org servers)
  fastify.get('/', {
    schema: {
      tags: ['Servers'],
      description: 'List all server configurations for the organization',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          sortBy: { type: 'string', enum: SERVER_SORT_FIELDS },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          status: { type: 'string' },
          search: { type: 'string' },
        },
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { organizationId } = getTenantContext(request.user);
    const query = request.query as {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      status?: string;
      search?: string;
    };

    // Parse pagination
    const pagination = parsePagination(query);
    const validSortBy = validateSortField(pagination.sortBy, SERVER_SORT_FIELDS);

    // Get all user IDs in the organization
    const orgUserIds = await getOrganizationUserIds(organizationId);

    // Build where clause with filters
    const where: Prisma.ServerConfigurationWhereInput = { userId: { in: orgUserIds } };
    if (query.status) {
      where.status = query.status as any;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { url: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.serverConfiguration.count({ where });

    const servers = await prisma.serverConfiguration.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: {
          select: { agents: true, tasks: true },
        },
      },
      skip: calculateSkip(pagination.page, pagination.limit),
      take: pagination.limit,
      orderBy: buildOrderBy(validSortBy, pagination.sortOrder),
    });

    const data = servers.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      url: s.url,
      wsUrl: s.wsUrl,
      status: s.status,
      lastHealthCheck: s.lastHealthCheck,
      lastError: s.lastError,
      isDefault: s.isDefault,
      autoConnect: s.autoConnect,
      serverVersion: s.serverVersion,
      capabilities: s.capabilities,
      agentCount: s._count.agents,
      taskCount: s._count.tasks,
      owner: s.user,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    return buildPaginatedResponse(data, total, pagination.page, pagination.limit);
  });

  // Create server configuration
  fastify.post('/', {
    schema: {
      tags: ['Servers'],
      description: 'Create a new server configuration. Server must be online and reachable.',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate, validate({ body: createServerSchema })],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const body = request.body as z.infer<typeof createServerSchema>;

    // Check if name already exists
    const existing = await prisma.serverConfiguration.findUnique({
      where: { userId_name: { userId, name: body.name } },
    });

    if (existing) {
      return reply.status(400).send({ error: 'Server with this name already exists' });
    }

    // VALIDATION: Server must be online before being added
    let serverVersion: string | null = null;
    let capabilities: string[] = [];
    try {
      const healthResponse = await fetch(`${body.url}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${body.masterToken}`,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!healthResponse.ok) {
        return reply.status(400).send({
          error: `Server is not reachable or returned error: HTTP ${healthResponse.status}. Server must be online to be added.`
        });
      }

      const healthData = await healthResponse.json() as { version?: string; capabilities?: string[] };
      serverVersion = healthData.version || null;
      capabilities = healthData.capabilities || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(400).send({
        error: `Cannot connect to server: ${errorMessage}. Server must be online to be added.`
      });
    }

    // If this is the first server or isDefault is true, make it default
    const serverCount = await prisma.serverConfiguration.count({ where: { userId } });
    const isDefault = body.isDefault || serverCount === 0;

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.serverConfiguration.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const server = await prisma.serverConfiguration.create({
      data: {
        userId,
        name: body.name,
        description: body.description,
        url: body.url,
        wsUrl: body.wsUrl || body.url.replace('http', 'ws'),
        masterToken: encrypt(body.masterToken),
        isDefault,
        autoConnect: body.autoConnect ?? true,
        status: 'ONLINE',
        serverVersion,
        capabilities,
        lastHealthCheck: new Date(),
      },
    });

    return {
      id: server.id,
      name: server.name,
      url: server.url,
      status: server.status,
      isDefault: server.isDefault,
      serverVersion,
    };
  });

  // Get server by ID
  fastify.get('/:id', {
    schema: {
      tags: ['Servers'],
      description: 'Get server configuration by ID',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate, validate({ params: uuidParam })],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { organizationId } = getTenantContext(request.user);
    const { id } = request.params as { id: string };

    // Get org user IDs for filtering
    const orgUserIds = await getOrganizationUserIds(organizationId);

    const server = await prisma.serverConfiguration.findFirst({
      where: { id, userId: { in: orgUserIds } },
      include: {
        agents: {
          select: { id: true, name: true, displayName: true, status: true },
        },
        serverTools: {
          include: { tool: true },
        },
      },
    });

    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    return {
      id: server.id,
      name: server.name,
      description: server.description,
      url: server.url,
      wsUrl: server.wsUrl,
      status: server.status,
      lastHealthCheck: server.lastHealthCheck,
      lastError: server.lastError,
      isDefault: server.isDefault,
      autoConnect: server.autoConnect,
      serverVersion: server.serverVersion,
      capabilities: server.capabilities,
      agents: server.agents,
      tools: server.serverTools.map((st) => ({
        id: st.id,
        name: st.tool.name,
        displayName: st.tool.displayName,
        status: st.status,
        installedVersion: st.installedVersion,
        healthStatus: st.healthStatus,
      })),
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
    };
  });

  // Update server (only owner can update)
  fastify.put('/:id', {
    schema: {
      tags: ['Servers'],
      description: 'Update server configuration (owner only)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate, validate({ params: uuidParam, body: updateServerSchema })],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, organizationId } = getTenantContext(request.user);
    const { id } = request.params as { id: string };
    const body = request.body as z.infer<typeof updateServerSchema>;

    // Get org user IDs for filtering
    const orgUserIds = await getOrganizationUserIds(organizationId);

    const server = await prisma.serverConfiguration.findFirst({
      where: { id, userId: { in: orgUserIds } },
    });

    // Only owner can update
    if (server && server.userId !== userId) {
      return reply.status(403).send({ error: 'Only the owner can update this server' });
    }

    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    // If setting as default, unset other defaults
    if (body.isDefault) {
      await prisma.serverConfiguration.updateMany({
        where: { userId, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.serverConfiguration.update({
      where: { id },
      data: {
        ...body,
        masterToken: body.masterToken ? encrypt(body.masterToken) : undefined,
        wsUrl: body.wsUrl || (body.url ? body.url.replace('http', 'ws') : undefined),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      url: updated.url,
      status: updated.status,
      isDefault: updated.isDefault,
    };
  });

  // Delete server (only owner can delete)
  fastify.delete('/:id', {
    schema: {
      tags: ['Servers'],
      description: 'Delete server configuration (owner only)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate, validate({ params: uuidParam })],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, organizationId } = getTenantContext(request.user);
    const { id } = request.params as { id: string };

    // Get org user IDs for filtering
    const orgUserIds = await getOrganizationUserIds(organizationId);

    const server = await prisma.serverConfiguration.findFirst({
      where: { id, userId: { in: orgUserIds } },
    });

    // Only owner can delete
    if (server && server.userId !== userId) {
      return reply.status(403).send({ error: 'Only the owner can delete this server' });
    }

    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    // Delete related records first (cascade delete)
    await prisma.$transaction(async (tx) => {
      // Delete server tools
      await tx.serverTool.deleteMany({ where: { serverId: id } });

      // Delete tasks associated with this server
      await tx.task.deleteMany({ where: { serverId: id } });

      // Delete agents associated with this server
      await tx.agent.deleteMany({ where: { serverId: id } });

      // Finally delete the server configuration
      await tx.serverConfiguration.delete({ where: { id } });
    });

    return { message: 'Server deleted successfully' };
  });

  // Test connection (any org member can test)
  fastify.post('/:id/test', {
    schema: {
      tags: ['Servers'],
      description: 'Test connection to server',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate, validate({ params: uuidParam })],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { organizationId } = getTenantContext(request.user);
    const { id } = request.params as { id: string };

    // Get org user IDs for filtering
    const orgUserIds = await getOrganizationUserIds(organizationId);

    const server = await prisma.serverConfiguration.findFirst({
      where: { id, userId: { in: orgUserIds } },
    });

    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    try {
      // Decrypt token for use
      const decryptedToken = decrypt(server.masterToken);

      // Test health endpoint
      const response = await fetch(`${server.url}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${decryptedToken}`,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json();

        await prisma.serverConfiguration.update({
          where: { id },
          data: {
            status: 'ONLINE',
            lastHealthCheck: new Date(),
            serverVersion: data.version,
            lastError: null,
          },
        });

        return {
          success: true,
          status: 'ONLINE',
          version: data.version,
        };
      } else {
        await prisma.serverConfiguration.update({
          where: { id },
          data: {
            status: 'DEGRADED',
            lastHealthCheck: new Date(),
            lastError: `HTTP ${response.status}`,
          },
        });

        return {
          success: false,
          status: 'DEGRADED',
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await prisma.serverConfiguration.update({
        where: { id },
        data: {
          status: 'OFFLINE',
          lastHealthCheck: new Date(),
          lastError: errorMessage,
        },
      });

      return {
        success: false,
        status: 'OFFLINE',
        error: errorMessage,
      };
    }
  });

  // Pre-validate server connection (before creating)
  fastify.post('/validate', {
    schema: {
      tags: ['Servers'],
      description: 'Validate server connection before creating',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate, validate({ body: serverSchemas.validate })],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { url: string; masterToken: string };

    try {
      const startTime = Date.now();
      const response = await fetch(`${body.url}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${body.masterToken}`,
        },
        signal: AbortSignal.timeout(10000),
      });

      const latency = Date.now() - startTime;

      if (!response.ok) {
        return reply.status(400).send({
          valid: false,
          error: `Server returned HTTP ${response.status}`,
          latency,
        });
      }

      const data = await response.json() as {
        version?: string;
        capabilities?: string[];
        status?: string;
      };

      return {
        valid: true,
        latency,
        serverVersion: data.version || 'unknown',
        capabilities: data.capabilities || [],
        status: data.status || 'healthy',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(400).send({
        valid: false,
        error: errorMessage,
      });
    }
  });

  // Set as default (user-specific default, org members can set their own)
  fastify.post('/:id/default', {
    schema: {
      tags: ['Servers'],
      description: 'Set server as your default',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate, validate({ params: uuidParam })],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, organizationId } = getTenantContext(request.user);
    const { id } = request.params as { id: string };

    // Get org user IDs for filtering
    const orgUserIds = await getOrganizationUserIds(organizationId);

    const server = await prisma.serverConfiguration.findFirst({
      where: { id, userId: { in: orgUserIds } },
    });

    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    // Unset other defaults for this user only
    await prisma.serverConfiguration.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    // Set this as default
    await prisma.serverConfiguration.update({
      where: { id },
      data: { isDefault: true },
    });

    return { message: 'Server set as default' };
  });

  // Get detailed health status for a server
  fastify.get('/:id/health', {
    schema: {
      tags: ['Servers'],
      description: 'Get detailed health status for a server',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate, validate({ params: uuidParam })],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { organizationId } = getTenantContext(request.user);
    const { id } = request.params as { id: string };

    const orgUserIds = await getOrganizationUserIds(organizationId);

    const server = await prisma.serverConfiguration.findFirst({
      where: { id, userId: { in: orgUserIds } },
      include: {
        agents: {
          select: { id: true, status: true },
        },
        serverTools: {
          include: { tool: true },
        },
      },
    });

    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    // Calculate agent health
    const totalAgents = server.agents.length;
    const activeAgents = server.agents.filter(a => a.status === 'ACTIVE').length;
    const busyAgents = server.agents.filter(a => a.status === 'BUSY').length;
    const errorAgents = server.agents.filter(a => a.status === 'ERROR').length;

    // Calculate tool health
    const totalTools = server.serverTools.length;
    const healthyTools = server.serverTools.filter(t => t.healthStatus === 'HEALTHY').length;
    const unhealthyTools = server.serverTools.filter(t => t.healthStatus === 'UNHEALTHY').length;

    // Determine overall health
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (server.status === 'OFFLINE') {
      overallStatus = 'unhealthy';
    } else if (server.status === 'DEGRADED' || errorAgents > 0 || unhealthyTools > 0) {
      overallStatus = 'degraded';
    }

    return {
      serverId: server.id,
      serverName: server.name,
      status: overallStatus,
      serverStatus: server.status,
      lastHealthCheck: server.lastHealthCheck,
      lastError: server.lastError,
      serverVersion: server.serverVersion,
      components: {
        agents: {
          total: totalAgents,
          active: activeAgents,
          busy: busyAgents,
          error: errorAgents,
          healthScore: totalAgents > 0 ? Math.round(((activeAgents + busyAgents) / totalAgents) * 100) : 100,
        },
        tools: {
          total: totalTools,
          healthy: healthyTools,
          unhealthy: unhealthyTools,
          healthScore: totalTools > 0 ? Math.round((healthyTools / totalTools) * 100) : 100,
        },
      },
      uptime: server.lastHealthCheck ? {
        lastCheck: server.lastHealthCheck,
        checkAge: Math.round((Date.now() - server.lastHealthCheck.getTime()) / 1000),
      } : null,
    };
  });

  // Get server statistics
  fastify.get('/:id/stats', {
    schema: {
      tags: ['Servers'],
      description: 'Get statistics for a server',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          since: { type: 'string', format: 'date-time' },
        },
      },
    },
    preHandler: [fastify.authenticate, validate({ params: uuidParam })],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { organizationId } = getTenantContext(request.user);
    const { id } = request.params as { id: string };
    const query = request.query as { since?: string };

    const orgUserIds = await getOrganizationUserIds(organizationId);

    const server = await prisma.serverConfiguration.findFirst({
      where: { id, userId: { in: orgUserIds } },
    });

    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    const sinceDate = query.since ? new Date(query.since) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get execution stats for this server
    const [executionStats, taskStats, agentStats] = await Promise.all([
      prisma.taskExecution.groupBy({
        by: ['status'],
        where: {
          task: { serverId: id },
          startedAt: { gte: sinceDate },
        },
        _count: true,
        _avg: { durationMs: true, tokensUsed: true },
      }),
      prisma.task.groupBy({
        by: ['status'],
        where: { serverId: id },
        _count: true,
      }),
      prisma.agent.groupBy({
        by: ['status'],
        where: { serverId: id },
        _count: true,
      }),
    ]);

    // Build execution breakdown
    const executionBreakdown: Record<string, number> = {};
    let totalExecutions = 0;
    let avgDuration = 0;
    let avgTokens = 0;
    for (const stat of executionStats) {
      executionBreakdown[stat.status] = stat._count;
      totalExecutions += stat._count;
      if (stat._avg.durationMs) avgDuration += stat._avg.durationMs * stat._count;
      if (stat._avg.tokensUsed) avgTokens += stat._avg.tokensUsed * stat._count;
    }

    // Build task breakdown
    const taskBreakdown: Record<string, number> = {};
    let totalTasks = 0;
    for (const stat of taskStats) {
      taskBreakdown[stat.status] = stat._count;
      totalTasks += stat._count;
    }

    // Build agent breakdown
    const agentBreakdown: Record<string, number> = {};
    let totalAgents = 0;
    for (const stat of agentStats) {
      agentBreakdown[stat.status] = stat._count;
      totalAgents += stat._count;
    }

    const successCount = executionBreakdown['COMPLETED'] || 0;

    return {
      serverId: id,
      serverName: server.name,
      period: {
        from: sinceDate.toISOString(),
        to: new Date().toISOString(),
      },
      executions: {
        total: totalExecutions,
        success: successCount,
        successRate: totalExecutions > 0 ? Math.round((successCount / totalExecutions) * 100) : 0,
        avgDurationMs: totalExecutions > 0 ? Math.round(avgDuration / totalExecutions) : 0,
        avgTokensUsed: totalExecutions > 0 ? Math.round(avgTokens / totalExecutions) : 0,
        breakdown: executionBreakdown,
      },
      tasks: {
        total: totalTasks,
        breakdown: taskBreakdown,
      },
      agents: {
        total: totalAgents,
        breakdown: agentBreakdown,
      },
    };
  });

  // Get tools installed on a server
  fastify.get('/:id/tools', {
    schema: {
      tags: ['Servers'],
      description: 'Get tools installed on a server',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate, validate({ params: uuidParam })],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { organizationId } = getTenantContext(request.user);
    const { id } = request.params as { id: string };

    const orgUserIds = await getOrganizationUserIds(organizationId);

    const server = await prisma.serverConfiguration.findFirst({
      where: { id, userId: { in: orgUserIds } },
    });

    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    const serverTools = await prisma.serverTool.findMany({
      where: { serverId: id },
      include: {
        tool: true,
      },
      orderBy: { tool: { name: 'asc' } },
    });

    return {
      tools: serverTools.map((st) => ({
        id: st.id,
        toolId: st.toolId,
        name: st.tool.name,
        displayName: st.tool.displayName,
        description: st.tool.description,
        category: st.tool.category,
        status: st.status,
        installedVersion: st.installedVersion,
        installedAt: st.installedAt,
        healthStatus: st.healthStatus,
        lastHealthCheck: st.lastHealthCheck,
        lastError: st.lastError,
      })),
    };
  });

  // Get agents on a server
  fastify.get('/:id/agents', {
    schema: {
      tags: ['Servers'],
      description: 'Get agents registered on a server',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          role: { type: 'string' },
        },
      },
    },
    preHandler: [fastify.authenticate, validate({ params: uuidParam })],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { organizationId } = getTenantContext(request.user);
    const { id } = request.params as { id: string };
    const query = request.query as { status?: string; role?: string };

    const orgUserIds = await getOrganizationUserIds(organizationId);

    const server = await prisma.serverConfiguration.findFirst({
      where: { id, userId: { in: orgUserIds } },
    });

    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    const agents = await prisma.agent.findMany({
      where: {
        serverId: id,
        ...(query.status && { status: query.status as any }),
        ...(query.role && { role: query.role as any }),
      },
      include: {
        supervisor: { select: { id: true, name: true, displayName: true } },
        _count: { select: { subordinates: true, tasks: true, executions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      agents: agents.map((a) => ({
        id: a.id,
        name: a.name,
        displayName: a.displayName,
        description: a.description,
        role: a.role,
        status: a.status,
        capabilities: a.capabilities,
        supervisor: a.supervisor,
        subordinateCount: a._count.subordinates,
        taskCount: a._count.tasks,
        executionCount: a._count.executions,
        createdAt: a.createdAt,
      })),
    };
  });
}
