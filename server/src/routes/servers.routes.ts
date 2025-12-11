import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { encrypt, decrypt } from '../utils/crypto.js';

const createServerSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  url: z.string().url(),
  wsUrl: z.string().url().optional(),
  masterToken: z.string().min(1),
  isDefault: z.boolean().optional(),
  autoConnect: z.boolean().optional(),
});

const updateServerSchema = createServerSchema.partial();

export async function serverRoutes(fastify: FastifyInstance) {
  // List servers for current user
  fastify.get('/', {
    schema: {
      tags: ['Servers'],
      description: 'List all server configurations',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { userId } = request.user as { userId: string };

    const servers = await prisma.serverConfiguration.findMany({
      where: { userId },
      include: {
        _count: {
          select: { agents: true, tasks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      servers: servers.map((s) => ({
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
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    };
  });

  // Create server configuration
  fastify.post('/', {
    schema: {
      tags: ['Servers'],
      description: 'Create a new server configuration. Server must be online and reachable.',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const body = createServerSchema.parse(request.body);

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
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const { id } = request.params as { id: string };

    const server = await prisma.serverConfiguration.findFirst({
      where: { id, userId },
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

  // Update server
  fastify.put('/:id', {
    schema: {
      tags: ['Servers'],
      description: 'Update server configuration',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const { id } = request.params as { id: string };
    const body = updateServerSchema.parse(request.body);

    const server = await prisma.serverConfiguration.findFirst({
      where: { id, userId },
    });

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

  // Delete server
  fastify.delete('/:id', {
    schema: {
      tags: ['Servers'],
      description: 'Delete server configuration',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const { id } = request.params as { id: string };

    const server = await prisma.serverConfiguration.findFirst({
      where: { id, userId },
    });

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

  // Test connection
  fastify.post('/:id/test', {
    schema: {
      tags: ['Servers'],
      description: 'Test connection to server',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const { id } = request.params as { id: string };

    const server = await prisma.serverConfiguration.findFirst({
      where: { id, userId },
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
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = z.object({
      url: z.string().url(),
      masterToken: z.string().min(1),
    }).parse(request.body);

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

  // Set as default
  fastify.post('/:id/default', {
    schema: {
      tags: ['Servers'],
      description: 'Set server as default',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const { id } = request.params as { id: string };

    const server = await prisma.serverConfiguration.findFirst({
      where: { id, userId },
    });

    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    // Unset other defaults
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
}
