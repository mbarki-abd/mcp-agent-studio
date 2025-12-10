import { prisma } from '../index.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import type { ServerStatus } from '@prisma/client';

export interface CreateServerInput {
  userId: string;
  name: string;
  description?: string;
  url: string;
  wsUrl?: string;
  masterToken: string;
  isDefault?: boolean;
  autoConnect?: boolean;
}

export interface UpdateServerInput {
  name?: string;
  description?: string;
  url?: string;
  wsUrl?: string;
  masterToken?: string;
  isDefault?: boolean;
  autoConnect?: boolean;
}

export interface ServerTestResult {
  success: boolean;
  status: ServerStatus;
  version?: string;
  error?: string;
}

export class ServerConfigService {
  async list(userId: string) {
    const servers = await prisma.serverConfiguration.findMany({
      where: { userId },
      include: {
        _count: {
          select: { agents: true, tasks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return servers.map((s) => ({
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
    }));
  }

  async create(input: CreateServerInput) {
    // Check if name already exists
    const existing = await prisma.serverConfiguration.findUnique({
      where: { userId_name: { userId: input.userId, name: input.name } },
    });

    if (existing) {
      throw new Error('Server with this name already exists');
    }

    // If this is the first server or isDefault is true, make it default
    const serverCount = await prisma.serverConfiguration.count({
      where: { userId: input.userId },
    });
    const isDefault = input.isDefault || serverCount === 0;

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.serverConfiguration.updateMany({
        where: { userId: input.userId },
        data: { isDefault: false },
      });
    }

    // Encrypt master token
    const encryptedToken = encrypt(input.masterToken);

    const server = await prisma.serverConfiguration.create({
      data: {
        userId: input.userId,
        name: input.name,
        description: input.description,
        url: input.url,
        wsUrl: input.wsUrl || input.url.replace('http', 'ws'),
        masterToken: encryptedToken,
        isDefault,
        autoConnect: input.autoConnect ?? true,
        status: 'UNKNOWN',
      },
    });

    return {
      id: server.id,
      name: server.name,
      url: server.url,
      status: server.status,
      isDefault: server.isDefault,
    };
  }

  async getById(id: string, userId: string) {
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
      return null;
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
  }

  async update(id: string, userId: string, input: UpdateServerInput) {
    const server = await prisma.serverConfiguration.findFirst({
      where: { id, userId },
    });

    if (!server) {
      throw new Error('Server not found');
    }

    // If setting as default, unset other defaults
    if (input.isDefault) {
      await prisma.serverConfiguration.updateMany({
        where: { userId, id: { not: id } },
        data: { isDefault: false },
      });
    }

    // Encrypt master token if provided
    const data: any = { ...input };
    if (input.masterToken) {
      data.masterToken = encrypt(input.masterToken);
    }
    if (input.url && !input.wsUrl) {
      data.wsUrl = input.url.replace('http', 'ws');
    }

    const updated = await prisma.serverConfiguration.update({
      where: { id },
      data,
    });

    return {
      id: updated.id,
      name: updated.name,
      url: updated.url,
      status: updated.status,
      isDefault: updated.isDefault,
    };
  }

  async delete(id: string, userId: string) {
    const server = await prisma.serverConfiguration.findFirst({
      where: { id, userId },
    });

    if (!server) {
      throw new Error('Server not found');
    }

    await prisma.serverConfiguration.delete({ where: { id } });
  }

  async testConnection(id: string, userId: string): Promise<ServerTestResult> {
    const server = await prisma.serverConfiguration.findFirst({
      where: { id, userId },
    });

    if (!server) {
      throw new Error('Server not found');
    }

    // Decrypt master token
    const masterToken = decrypt(server.masterToken);

    try {
      // Test health endpoint
      const response = await fetch(`${server.url}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${masterToken}`,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json() as { version?: string };

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
  }

  async setDefault(id: string, userId: string) {
    const server = await prisma.serverConfiguration.findFirst({
      where: { id, userId },
    });

    if (!server) {
      throw new Error('Server not found');
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
  }

  async getDefaultServer(userId: string) {
    return prisma.serverConfiguration.findFirst({
      where: { userId, isDefault: true },
    });
  }

  getMasterToken(server: { masterToken: string }): string {
    return decrypt(server.masterToken);
  }
}
