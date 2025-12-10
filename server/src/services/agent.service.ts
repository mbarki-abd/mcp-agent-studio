import { prisma } from '../index.js';
import type { AgentRole, AgentStatus } from '@prisma/client';

export interface CreateAgentInput {
  serverId: string;
  name: string;
  displayName: string;
  description?: string;
  role?: AgentRole;
  supervisorId?: string;
  capabilities?: string[];
  createdById: string;
}

export interface UpdateAgentInput {
  displayName?: string;
  description?: string;
  role?: AgentRole;
  supervisorId?: string | null;
  capabilities?: string[];
  status?: AgentStatus;
}

export class AgentService {
  async list(userId: string, filters?: { serverId?: string; status?: string; role?: string }) {
    // Get user's servers
    const servers = await prisma.serverConfiguration.findMany({
      where: { userId },
      select: { id: true },
    });
    const serverIds = servers.map((s) => s.id);

    const agents = await prisma.agent.findMany({
      where: {
        serverId: filters?.serverId || { in: serverIds },
        ...(filters?.status && { status: filters.status as AgentStatus }),
        ...(filters?.role && { role: filters.role as AgentRole }),
      },
      include: {
        server: { select: { name: true } },
        supervisor: { select: { id: true, name: true, displayName: true } },
        _count: { select: { subordinates: true, tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return agents.map((a) => ({
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
    }));
  }

  async create(input: CreateAgentInput) {
    // Check if agent name exists on server
    const existing = await prisma.agent.findUnique({
      where: { serverId_name: { serverId: input.serverId, name: input.name } },
    });

    if (existing) {
      throw new Error('Agent with this name already exists on this server');
    }

    const agent = await prisma.agent.create({
      data: {
        serverId: input.serverId,
        name: input.name,
        displayName: input.displayName,
        description: input.description,
        role: input.role || 'WORKER',
        status: 'PENDING_VALIDATION',
        supervisorId: input.supervisorId,
        capabilities: input.capabilities || [],
        createdById: input.createdById,
      },
    });

    return {
      id: agent.id,
      name: agent.name,
      displayName: agent.displayName,
      status: agent.status,
    };
  }

  async getById(id: string, userId: string) {
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
      return null;
    }

    return {
      id: agent.id,
      server: agent.server,
      name: agent.name,
      displayName: agent.displayName,
      description: agent.description,
      role: agent.role,
      status: agent.status,
      unixUser: agent.unixUser,
      homeDir: agent.homeDir,
      capabilities: agent.capabilities,
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
  }

  async update(id: string, userId: string, input: UpdateAgentInput) {
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
      throw new Error('Agent not found');
    }

    const updated = await prisma.agent.update({
      where: { id },
      data: input,
    });

    return {
      id: updated.id,
      name: updated.name,
      displayName: updated.displayName,
      status: updated.status,
    };
  }

  async delete(id: string, userId: string) {
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
      throw new Error('Agent not found');
    }

    // Delete related records first
    await prisma.agentToolPermission.deleteMany({ where: { agentId: id } });
    await prisma.agent.delete({ where: { id } });
  }

  async validate(id: string, userId: string, role: string) {
    if (role !== 'ADMIN' && role !== 'MANAGER') {
      throw new Error('Only admins can validate agents');
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
      throw new Error('Agent not found');
    }

    if (agent.status !== 'PENDING_VALIDATION') {
      throw new Error('Agent is not pending validation');
    }

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
    };
  }

  async getHierarchy(userId: string, serverId?: string) {
    // Get user's servers
    const servers = await prisma.serverConfiguration.findMany({
      where: { userId },
      select: { id: true },
    });
    const serverIds = servers.map((s) => s.id);

    const agents = await prisma.agent.findMany({
      where: {
        serverId: serverId || { in: serverIds },
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

    return buildTree(null);
  }

  async verifyOwnership(agentId: string, userId: string): Promise<boolean> {
    const servers = await prisma.serverConfiguration.findMany({
      where: { userId },
      select: { id: true },
    });
    const serverIds = servers.map((s) => s.id);

    const agent = await prisma.agent.findFirst({
      where: { id: agentId, serverId: { in: serverIds } },
    });

    return !!agent;
  }
}
