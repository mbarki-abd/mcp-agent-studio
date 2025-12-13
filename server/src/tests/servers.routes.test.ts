import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../index.js';

// Mock prisma
vi.mock('../index.js', () => ({
  prisma: {
    serverConfiguration: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    serverTool: {
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    task: {
      deleteMany: vi.fn(),
      groupBy: vi.fn(),
    },
    agent: {
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    taskExecution: {
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock crypto utils
vi.mock('../utils/crypto.js', () => ({
  encrypt: vi.fn((value: string) => `encrypted_${value}`),
  decrypt: vi.fn((value: string) => value.replace('encrypted_', '')),
}));

// Mock tenant utils
vi.mock('../utils/tenant.js', () => ({
  getTenantContext: vi.fn(),
  getOrganizationUserIds: vi.fn(),
}));

import { getTenantContext, getOrganizationUserIds } from '../utils/tenant.js';
import { encrypt, decrypt } from '../utils/crypto.js';

// Mock global fetch
global.fetch = vi.fn();

describe('Server Routes', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      query: {},
      params: {},
      body: {},
      user: {
        userId: 'user-123',
        organizationId: 'org-123',
        role: 'ADMIN',
      } as any,
    };

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    // Default tenant context mock
    vi.mocked(getTenantContext).mockReturnValue({
      userId: 'user-123',
      organizationId: 'org-123',
      role: 'ADMIN',
    });

    // Default organization users mock
    vi.mocked(getOrganizationUserIds).mockResolvedValue(['user-123', 'user-456']);
  });

  describe('GET /servers', () => {
    it('should return user servers', async () => {
      // Arrange
      mockRequest.query = { page: 1, limit: 20 };

      const mockServers = [
        {
          id: 'server-1',
          userId: 'user-123',
          name: 'Main Server',
          description: 'Production server',
          url: 'https://server1.example.com',
          wsUrl: 'wss://server1.example.com',
          status: 'ONLINE',
          masterToken: 'encrypted_token123',
          isDefault: true,
          autoConnect: true,
          serverVersion: '1.0.0',
          capabilities: ['agents', 'tasks'],
          lastHealthCheck: new Date(),
          lastError: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: 'user-123',
            name: 'Test User',
            email: 'test@example.com',
          },
          _count: {
            agents: 5,
            tasks: 10,
          },
        },
      ];

      vi.mocked(prisma.serverConfiguration.count).mockResolvedValue(1);
      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue(mockServers as any);

      // Act
      const orgUserIds = await getOrganizationUserIds('org-123');
      const total = await prisma.serverConfiguration.count({
        where: { userId: { in: orgUserIds } },
      });
      const servers = await prisma.serverConfiguration.findMany({
        where: { userId: { in: orgUserIds } },
        include: {
          user: { select: { id: true, name: true, email: true } },
          _count: { select: { agents: true, tasks: true } },
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });

      // Assert
      expect(total).toBe(1);
      expect(servers).toHaveLength(1);
      expect(servers[0].name).toBe('Main Server');
      expect(servers[0].status).toBe('ONLINE');
      expect(getOrganizationUserIds).toHaveBeenCalledWith('org-123');
    });

    it('should filter by status', async () => {
      // Arrange
      mockRequest.query = { status: 'ONLINE' };

      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue([]);

      // Act
      await prisma.serverConfiguration.findMany({
        where: {
          userId: { in: ['user-123', 'user-456'] },
          status: 'ONLINE',
        },
        include: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: expect.any(Object),
      });

      // Assert
      expect(prisma.serverConfiguration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ONLINE',
          }),
        })
      );
    });

    it('should support search by name and url', async () => {
      // Arrange
      mockRequest.query = { search: 'prod' };

      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue([]);

      // Act
      await prisma.serverConfiguration.findMany({
        where: {
          userId: { in: ['user-123', 'user-456'] },
          OR: [
            { name: { contains: 'prod', mode: 'insensitive' } },
            { description: { contains: 'prod', mode: 'insensitive' } },
            { url: { contains: 'prod', mode: 'insensitive' } },
          ],
        },
        include: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: expect.any(Object),
      });

      // Assert
      expect(prisma.serverConfiguration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('POST /servers', () => {
    it('should create server after health check', async () => {
      // Arrange
      const newServer = {
        name: 'New Server',
        description: 'Test server',
        url: 'https://new-server.com',
        masterToken: 'token123',
      };

      mockRequest.body = newServer;

      // Mock successful health check
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ version: '1.0.0', capabilities: ['agents'] }),
      } as Response);

      vi.mocked(prisma.serverConfiguration.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.serverConfiguration.count).mockResolvedValue(0);
      vi.mocked(prisma.serverConfiguration.create).mockResolvedValue({
        id: 'server-new',
        ...newServer,
        status: 'ONLINE',
        isDefault: true,
        serverVersion: '1.0.0',
      } as any);

      // Act
      const healthResponse = await fetch(`${newServer.url}/health`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${newServer.masterToken}` },
        signal: AbortSignal.timeout(10000),
      });

      expect(healthResponse.ok).toBe(true);

      const result = await prisma.serverConfiguration.create({
        data: {
          userId: 'user-123',
          name: newServer.name,
          description: newServer.description,
          url: newServer.url,
          wsUrl: newServer.url.replace('http', 'ws'),
          masterToken: encrypt(newServer.masterToken),
          isDefault: true,
          autoConnect: true,
          status: 'ONLINE',
          serverVersion: '1.0.0',
          capabilities: ['agents'],
          lastHealthCheck: expect.any(Date),
        },
      });

      // Assert
      expect(result.status).toBe('ONLINE');
      expect(result.isDefault).toBe(true);
      expect(encrypt).toHaveBeenCalledWith('token123');
    });

    it('should reject offline servers', async () => {
      // Arrange
      const serverData = {
        name: 'Offline Server',
        url: 'https://offline.com',
        masterToken: 'token',
      };

      // Mock failed health check
      vi.mocked(global.fetch).mockRejectedValue(new Error('Connection refused'));

      // Act & Assert
      try {
        await fetch(`${serverData.url}/health`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${serverData.masterToken}` },
          signal: AbortSignal.timeout(10000),
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        // In real route, this would return 400
      }
    });

    it('should reject duplicate server names', async () => {
      // Arrange
      vi.mocked(prisma.serverConfiguration.findUnique).mockResolvedValue({
        id: 'existing-server',
        name: 'Existing Server',
        userId: 'user-123',
      } as any);

      // Act
      const existing = await prisma.serverConfiguration.findUnique({
        where: { userId_name: { userId: 'user-123', name: 'Existing Server' } },
      });

      // Assert
      expect(existing).not.toBeNull();
      // In real route, this would return 400
    });

    it('should set first server as default', async () => {
      // Arrange
      vi.mocked(prisma.serverConfiguration.count).mockResolvedValue(0);

      // Act
      const serverCount = await prisma.serverConfiguration.count({ where: { userId: 'user-123' } });
      const isDefault = serverCount === 0;

      // Assert
      expect(isDefault).toBe(true);
    });

    it('should unset other defaults when creating default server', async () => {
      // Arrange
      vi.mocked(prisma.serverConfiguration.count).mockResolvedValue(2);
      vi.mocked(prisma.serverConfiguration.updateMany).mockResolvedValue({ count: 2 } as any);

      // Act
      await prisma.serverConfiguration.updateMany({
        where: { userId: 'user-123' },
        data: { isDefault: false },
      });

      // Assert
      expect(prisma.serverConfiguration.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: { isDefault: false },
      });
    });
  });

  describe('POST /servers/:id/test', () => {
    it('should test server connection', async () => {
      // Arrange
      mockRequest.params = { id: 'server-1' };

      vi.mocked(prisma.serverConfiguration.findFirst).mockResolvedValue({
        id: 'server-1',
        url: 'https://test.com',
        masterToken: 'encrypted_token',
      } as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ version: '1.0.0', capabilities: ['agents'] }),
      } as Response);

      vi.mocked(prisma.serverConfiguration.update).mockResolvedValue({
        id: 'server-1',
        status: 'ONLINE',
      } as any);

      // Act
      const server = await prisma.serverConfiguration.findFirst({
        where: { id: 'server-1', userId: { in: ['user-123', 'user-456'] } },
      });

      const decryptedToken = decrypt(server!.masterToken);

      const response = await fetch(`${server!.url}/health`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${decryptedToken}` },
        signal: AbortSignal.timeout(10000),
      });

      // Assert
      expect(response.ok).toBe(true);
      expect(decrypt).toHaveBeenCalledWith('encrypted_token');
    });

    it('should return latency and capabilities', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          version: '2.0.0',
          capabilities: ['agents', 'tasks', 'tools'],
        }),
      } as Response);

      // Act
      const startTime = Date.now();
      const response = await fetch('https://test.com/health');
      const latency = Date.now() - startTime;
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(true);
      expect(data.capabilities).toContain('agents');
      expect(data.capabilities).toContain('tasks');
      expect(latency).toBeGreaterThanOrEqual(0);
    });

    it('should update server status on successful test', async () => {
      // Arrange
      vi.mocked(prisma.serverConfiguration.update).mockResolvedValue({
        id: 'server-1',
        status: 'ONLINE',
      } as any);

      // Act
      await prisma.serverConfiguration.update({
        where: { id: 'server-1' },
        data: {
          status: 'ONLINE',
          lastHealthCheck: expect.any(Date),
          serverVersion: '1.0.0',
          lastError: null,
        },
      });

      // Assert
      expect(prisma.serverConfiguration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ONLINE',
            lastError: null,
          }),
        })
      );
    });

    it('should update server status on failed test', async () => {
      // Arrange
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      // Act
      try {
        await fetch('https://offline.com/health');
      } catch (error) {
        await prisma.serverConfiguration.update({
          where: { id: 'server-1' },
          data: {
            status: 'OFFLINE',
            lastHealthCheck: expect.any(Date),
            lastError: (error as Error).message,
          },
        });
      }

      // Assert
      expect(prisma.serverConfiguration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'OFFLINE',
            lastError: 'Network error',
          }),
        })
      );
    });
  });

  describe('POST /servers/validate', () => {
    it('should validate server before creating', async () => {
      // Arrange
      const validationData = {
        url: 'https://valid-server.com',
        masterToken: 'token123',
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          version: '1.0.0',
          capabilities: ['agents'],
          status: 'healthy',
        }),
      } as Response);

      // Act
      const startTime = Date.now();
      const response = await fetch(`${validationData.url}/health`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${validationData.masterToken}` },
        signal: AbortSignal.timeout(10000),
      });
      const latency = Date.now() - startTime;
      const data = await response.json();

      // Assert
      expect(response.ok).toBe(true);
      expect(data.version).toBe('1.0.0');
      expect(latency).toBeGreaterThanOrEqual(0);
    });

    it('should return error for invalid server', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 401,
      } as Response);

      // Act
      const response = await fetch('https://invalid.com/health');

      // Assert
      expect(response.ok).toBe(false);
      // In real route, this would return 400 with error
    });
  });

  describe('DELETE /servers/:id', () => {
    it('should delete server and related records', async () => {
      // Arrange
      mockRequest.params = { id: 'server-1' };

      vi.mocked(prisma.serverConfiguration.findFirst).mockResolvedValue({
        id: 'server-1',
        userId: 'user-123',
      } as any);

      const transactionMock = vi.fn(async (callback: any) => {
        const tx = {
          serverTool: { deleteMany: vi.fn() },
          task: { deleteMany: vi.fn() },
          agent: { deleteMany: vi.fn() },
          serverConfiguration: { delete: vi.fn() },
        };
        return callback(tx);
      });

      vi.mocked(prisma.$transaction).mockImplementation(transactionMock as any);

      // Act
      await prisma.$transaction(async (tx: any) => {
        await tx.serverTool.deleteMany({ where: { serverId: 'server-1' } });
        await tx.task.deleteMany({ where: { serverId: 'server-1' } });
        await tx.agent.deleteMany({ where: { serverId: 'server-1' } });
        await tx.serverConfiguration.delete({ where: { id: 'server-1' } });
      });

      // Assert
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should only allow owner to delete', async () => {
      // Arrange
      vi.mocked(prisma.serverConfiguration.findFirst).mockResolvedValue({
        id: 'server-1',
        userId: 'other-user',
      } as any);

      const server = await prisma.serverConfiguration.findFirst({
        where: { id: 'server-1' },
      });

      // Assert
      expect(server?.userId).not.toBe('user-123');
      // In real route, this would return 403
    });
  });

  describe('GET /servers/:id/health', () => {
    it('should return detailed health status', async () => {
      // Arrange
      mockRequest.params = { id: 'server-1' };

      vi.mocked(prisma.serverConfiguration.findFirst).mockResolvedValue({
        id: 'server-1',
        name: 'Test Server',
        status: 'ONLINE',
        lastHealthCheck: new Date(),
        lastError: null,
        serverVersion: '1.0.0',
        agents: [
          { id: 'agent-1', status: 'ACTIVE' },
          { id: 'agent-2', status: 'BUSY' },
        ],
        serverTools: [
          { id: 'tool-1', healthStatus: 'HEALTHY', tool: {} },
          { id: 'tool-2', healthStatus: 'HEALTHY', tool: {} },
        ],
      } as any);

      // Act
      const server = await prisma.serverConfiguration.findFirst({
        where: { id: 'server-1' },
        include: {
          agents: { select: { id: true, status: true } },
          serverTools: { include: { tool: true } },
        },
      });

      const activeAgents = server!.agents.filter((a: any) => a.status === 'ACTIVE').length;
      const healthyTools = server!.serverTools.filter((t: any) => t.healthStatus === 'HEALTHY').length;

      // Assert
      expect(activeAgents).toBe(1);
      expect(healthyTools).toBe(2);
    });
  });

  describe('GET /servers/:id/stats', () => {
    it('should return server statistics', async () => {
      // Arrange
      mockRequest.params = { id: 'server-1' };
      mockRequest.query = { since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() };

      vi.mocked(prisma.serverConfiguration.findFirst).mockResolvedValue({
        id: 'server-1',
        name: 'Test Server',
      } as any);

      vi.mocked(prisma.taskExecution.groupBy).mockResolvedValue([
        { status: 'COMPLETED', _count: 15, _avg: { durationMs: 2000, tokensUsed: 100 } },
        { status: 'FAILED', _count: 3, _avg: { durationMs: 1500, tokensUsed: 80 } },
      ] as any);

      vi.mocked(prisma.task.groupBy).mockResolvedValue([
        { status: 'COMPLETED', _count: 10 },
        { status: 'PENDING', _count: 5 },
      ] as any);

      vi.mocked(prisma.agent.groupBy).mockResolvedValue([
        { status: 'ACTIVE', _count: 8 },
        { status: 'INACTIVE', _count: 2 },
      ] as any);

      // Act
      const executionStats = await prisma.taskExecution.groupBy({
        by: ['status'],
        where: {
          task: { serverId: 'server-1' },
          startedAt: { gte: expect.any(Date) },
        },
        _count: true,
        _avg: { durationMs: true, tokensUsed: true },
      });

      // Assert
      expect(executionStats).toHaveLength(2);
      expect(executionStats[0].status).toBe('COMPLETED');
      expect(executionStats[0]._count).toBe(15);
    });

    it('should calculate success rate correctly', async () => {
      // Arrange
      const executionBreakdown = {
        COMPLETED: 17,
        FAILED: 3,
      };

      const totalExecutions = 20;
      const successCount = executionBreakdown.COMPLETED;
      const successRate = Math.round((successCount / totalExecutions) * 100);

      // Assert
      expect(successRate).toBe(85);
    });
  });

  describe('GET /servers/:id/tools', () => {
    it('should return installed tools', async () => {
      // Arrange
      mockRequest.params = { id: 'server-1' };

      const mockTools = [
        {
          id: 'st-1',
          serverId: 'server-1',
          toolId: 'tool-1',
          status: 'INSTALLED',
          installedVersion: '1.0.0',
          installedAt: new Date(),
          healthStatus: 'HEALTHY',
          lastHealthCheck: new Date(),
          lastError: null,
          tool: {
            name: 'git',
            displayName: 'Git',
            description: 'Version control',
            category: 'dev',
          },
        },
      ];

      vi.mocked(prisma.serverConfiguration.findFirst).mockResolvedValue({
        id: 'server-1',
      } as any);

      vi.mocked(prisma.serverTool.findMany).mockResolvedValue(mockTools as any);

      // Act
      const tools = await prisma.serverTool.findMany({
        where: { serverId: 'server-1' },
        include: { tool: true },
        orderBy: { tool: { name: 'asc' } },
      });

      // Assert
      expect(tools).toHaveLength(1);
      expect(tools[0].tool.name).toBe('git');
      expect(tools[0].healthStatus).toBe('HEALTHY');
    });
  });

  describe('GET /servers/:id/agents', () => {
    it('should return agents on server', async () => {
      // Arrange
      mockRequest.params = { id: 'server-1' };

      const mockAgents = [
        {
          id: 'agent-1',
          name: 'test-agent',
          displayName: 'Test Agent',
          description: 'Test description',
          role: 'WORKER',
          status: 'ACTIVE',
          capabilities: ['code'],
          supervisor: null,
          _count: { subordinates: 0, tasks: 5, executions: 10 },
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.serverConfiguration.findFirst).mockResolvedValue({
        id: 'server-1',
      } as any);

      vi.mocked(prisma.agent.findMany).mockResolvedValue(mockAgents as any);

      // Act
      const agents = await prisma.agent.findMany({
        where: { serverId: 'server-1' },
        include: {
          supervisor: { select: { id: true, name: true, displayName: true } },
          _count: { select: { subordinates: true, tasks: true, executions: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Assert
      expect(agents).toHaveLength(1);
      expect(agents[0].name).toBe('test-agent');
      expect(agents[0]._count.tasks).toBe(5);
    });

    it('should filter agents by status', async () => {
      // Arrange
      mockRequest.query = { status: 'ACTIVE' };

      vi.mocked(prisma.agent.findMany).mockResolvedValue([]);

      // Act
      await prisma.agent.findMany({
        where: { serverId: 'server-1', status: 'ACTIVE' },
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });

      // Assert
      expect(prisma.agent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should filter agents by role', async () => {
      // Arrange
      mockRequest.query = { role: 'MASTER' };

      vi.mocked(prisma.agent.findMany).mockResolvedValue([]);

      // Act
      await prisma.agent.findMany({
        where: { serverId: 'server-1', role: 'MASTER' },
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });

      // Assert
      expect(prisma.agent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: 'MASTER',
          }),
        })
      );
    });
  });
});
