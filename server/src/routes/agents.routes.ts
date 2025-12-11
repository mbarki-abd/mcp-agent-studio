import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';

const createAgentSchema = z.object({
  serverId: z.string().uuid(),
  name: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  displayName: z.string().min(1).max(100),
  description: z.string().optional(),
  role: z.enum(['MASTER', 'SUPERVISOR', 'WORKER']).optional(),
  supervisorId: z.string().uuid().optional(),
  capabilities: z.array(z.string()).optional(),
});

const updateAgentSchema = z.object({
  serverId: z.string().uuid().optional(),
  displayName: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  role: z.enum(['MASTER', 'SUPERVISOR', 'WORKER']).optional(),
  supervisorId: z.string().uuid().nullable().optional(),
  capabilities: z.array(z.string()).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  unixUser: z.string().optional(),
  homeDir: z.string().optional(),
});

export async function agentRoutes(fastify: FastifyInstance) {
  // List agents
  fastify.get('/', {
    schema: {
      tags: ['Agents'],
      description: 'List all agents',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          serverId: { type: 'string' },
          status: { type: 'string' },
          role: { type: 'string' },
        },
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { userId } = request.user as { userId: string };
    const query = request.query as { serverId?: string; status?: string; role?: string };

    // Get user's servers
    const servers = await prisma.serverConfiguration.findMany({
      where: { userId },
      select: { id: true },
    });
    const serverIds = servers.map((s) => s.id);

    const agents = await prisma.agent.findMany({
      where: {
        serverId: query.serverId || { in: serverIds },
        ...(query.status && { status: query.status as any }),
        ...(query.role && { role: query.role as any }),
      },
      include: {
        server: { select: { name: true } },
        supervisor: { select: { id: true, name: true, displayName: true } },
        _count: { select: { subordinates: true, tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      agents: agents.map((a) => ({
        id: a.id,
        serverId: a.serverId,
        serverName: a.server.name,
        name: a.name,
        displayName: a.displayName,
        description: a.description,
        role: a.role,
        status: a.status,
        capabilities: a.capabilities,
        supervisor: a.supervisor,
        subordinateCount: a._count.subordinates,
        taskCount: a._count.tasks,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
    };
  });

  // Create agent
  fastify.post('/', {
    schema: {
      tags: ['Agents'],
      description: 'Create a new agent (pending validation)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const body = createAgentSchema.parse(request.body);

    // Verify server belongs to user
    const server = await prisma.serverConfiguration.findFirst({
      where: { id: body.serverId, userId },
    });

    if (!server) {
      return reply.status(404).send({ error: 'Server not found' });
    }

    // Check if agent name exists on server
    const existing = await prisma.agent.findUnique({
      where: { serverId_name: { serverId: body.serverId, name: body.name } },
    });

    if (existing) {
      return reply.status(400).send({ error: 'Agent with this name already exists on this server' });
    }

    // Create agent (pending validation)
    const agent = await prisma.agent.create({
      data: {
        serverId: body.serverId,
        name: body.name,
        displayName: body.displayName,
        description: body.description,
        role: body.role || 'WORKER',
        status: 'PENDING_VALIDATION',
        supervisorId: body.supervisorId,
        capabilities: body.capabilities || [],
        createdById: userId,
      },
    });

    return {
      id: agent.id,
      name: agent.name,
      displayName: agent.displayName,
      status: agent.status,
      message: 'Agent created and pending admin validation',
    };
  });

  // Get agent by ID
  fastify.get('/:id', {
    schema: {
      tags: ['Agents'],
      description: 'Get agent by ID',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const { id } = request.params as { id: string };

    // Get user's servers
    const servers = await prisma.serverConfiguration.findMany({
      where: { userId },
      select: { id: true },
    });
    const serverIds = servers.map((s) => s.id);

    const agent = await prisma.agent.findFirst({
      where: { id, serverId: { in: serverIds } },
      include: {
        server: { select: { id: true, name: true, url: true } },
        supervisor: { select: { id: true, name: true, displayName: true } },
        subordinates: { select: { id: true, name: true, displayName: true, status: true } },
        toolPermissions: {
          include: { tool: true },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        validatedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    return {
      id: agent.id,
      serverId: agent.serverId,
      server: agent.server,
      name: agent.name,
      displayName: agent.displayName,
      description: agent.description,
      role: agent.role,
      status: agent.status,
      unixUser: agent.unixUser,
      homeDir: agent.homeDir,
      capabilities: agent.capabilities,
      supervisorId: agent.supervisorId,
      supervisor: agent.supervisor,
      subordinates: agent.subordinates,
      toolPermissions: agent.toolPermissions.map((tp) => ({
        toolId: tp.toolId,
        toolName: tp.tool.name,
        toolDisplayName: tp.tool.displayName,
        canUse: tp.canUse,
        canSudo: tp.canSudo,
        rateLimit: tp.rateLimit,
      })),
      createdBy: agent.createdBy,
      validatedBy: agent.validatedBy,
      validatedAt: agent.validatedAt,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  });

  // Update agent
  fastify.put('/:id', {
    schema: {
      tags: ['Agents'],
      description: 'Update agent',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const { id } = request.params as { id: string };
    const body = updateAgentSchema.parse(request.body);

    // Get user's servers
    const servers = await prisma.serverConfiguration.findMany({
      where: { userId },
      select: { id: true },
    });
    const serverIds = servers.map((s) => s.id);

    const agent = await prisma.agent.findFirst({
      where: { id, serverId: { in: serverIds } },
    });

    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    const updated = await prisma.agent.update({
      where: { id },
      data: body,
    });

    return {
      id: updated.id,
      name: updated.name,
      displayName: updated.displayName,
      status: updated.status,
    };
  });

  // Delete agent
  fastify.delete('/:id', {
    schema: {
      tags: ['Agents'],
      description: 'Delete agent',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };
    const { id } = request.params as { id: string };

    // Get user's servers
    const servers = await prisma.serverConfiguration.findMany({
      where: { userId },
      select: { id: true },
    });
    const serverIds = servers.map((s) => s.id);

    const agent = await prisma.agent.findFirst({
      where: { id, serverId: { in: serverIds } },
    });

    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    // Delete related records first
    await prisma.agentToolPermission.deleteMany({ where: { agentId: id } });
    await prisma.agent.delete({ where: { id } });

    return { message: 'Agent deleted successfully' };
  });

  // Validate agent (Admin only)
  fastify.post('/:id/validate', {
    schema: {
      tags: ['Agents'],
      description: 'Validate/approve a pending agent (Admin only)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, role } = request.user as { userId: string; role: string };
    const { id } = request.params as { id: string };

    if (role !== 'ADMIN' && role !== 'MANAGER') {
      return reply.status(403).send({ error: 'Only admins can validate agents' });
    }

    // Get user's servers
    const servers = await prisma.serverConfiguration.findMany({
      where: { userId },
      select: { id: true },
    });
    const serverIds = servers.map((s) => s.id);

    const agent = await prisma.agent.findFirst({
      where: { id, serverId: { in: serverIds } },
    });

    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    if (agent.status !== 'PENDING_VALIDATION') {
      return reply.status(400).send({ error: 'Agent is not pending validation' });
    }

    // TODO: Execute creation on server via master agent

    const updated = await prisma.agent.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        validatedById: userId,
        validatedAt: new Date(),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      status: updated.status,
      message: 'Agent validated and activated',
    };
  });

  // Get agent hierarchy
  fastify.get('/hierarchy', {
    schema: {
      tags: ['Agents'],
      description: 'Get agent hierarchy tree',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          serverId: { type: 'string' },
        },
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { userId } = request.user as { userId: string };
    const query = request.query as { serverId?: string };

    // Get user's servers
    const servers = await prisma.serverConfiguration.findMany({
      where: { userId },
      select: { id: true },
    });
    const serverIds = servers.map((s) => s.id);

    const agents = await prisma.agent.findMany({
      where: {
        serverId: query.serverId || { in: serverIds },
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        role: true,
        status: true,
        supervisorId: true,
      },
    });

    // Build hierarchy tree
    const buildTree = (parentId: string | null): any[] => {
      return agents
        .filter((a) => a.supervisorId === parentId)
        .map((a) => ({
          ...a,
          children: buildTree(a.id),
        }));
    };

    return {
      hierarchy: buildTree(null),
    };
  });
}
