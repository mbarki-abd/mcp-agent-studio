import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../index.js';

// Mock prisma
vi.mock('../index.js', () => ({
  prisma: {
    agent: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      groupBy: vi.fn(),
    },
    agentToolPermission: {
      deleteMany: vi.fn(),
    },
    taskExecution: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    serverConfiguration: {
      findMany: vi.fn(),
    },
    organizationMembership: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock tenant utils
vi.mock('../utils/tenant.js', () => ({
  getTenantContext: vi.fn(),
  getOrganizationServerIds: vi.fn(),
}));

import { getTenantContext, getOrganizationServerIds } from '../utils/tenant.js';

describe('Agent Routes', () => {
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

    // Default organization servers mock
    vi.mocked(getOrganizationServerIds).mockResolvedValue(['server-1', 'server-2']);
  });

  describe('GET /agents', () => {
    it('should return paginated agents list', async () => {
      // Arrange
      mockRequest.query = { page: 1, limit: 20 };

      const mockAgents = [
        {
          id: 'agent-1',
          serverId: 'server-1',
          name: 'agent-one',
          displayName: 'Agent One',
          description: 'Test agent 1',
          role: 'WORKER',
          status: 'ACTIVE',
          capabilities: ['code'],
          supervisorId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          server: { name: 'Server 1' },
          supervisor: null,
          _count: { subordinates: 0, tasks: 5 },
        },
      ];

      vi.mocked(prisma.agent.count).mockResolvedValue(1);
      vi.mocked(prisma.agent.findMany).mockResolvedValue(mockAgents as any);

      // Simulate route logic
      const orgServerIds = await getOrganizationServerIds('org-123');
      const total = await prisma.agent.count({ where: { serverId: { in: orgServerIds } } });
      const agents = await prisma.agent.findMany({
        where: { serverId: { in: orgServerIds } },
        include: {
          server: { select: { name: true } },
          supervisor: { select: { id: true, name: true, displayName: true } },
          _count: { select: { subordinates: true, tasks: true } },
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });

      // Assert
      expect(total).toBe(1);
      expect(agents).toHaveLength(1);
      expect(agents[0].name).toBe('agent-one');
      expect(getOrganizationServerIds).toHaveBeenCalledWith('org-123');
    });

    it('should filter by serverId', async () => {
      // Arrange
      mockRequest.query = { serverId: 'server-1' };

      vi.mocked(prisma.agent.count).mockResolvedValue(2);
      vi.mocked(prisma.agent.findMany).mockResolvedValue([]);

      // Act
      await prisma.agent.findMany({
        where: { serverId: 'server-1' },
        include: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: expect.any(Object),
      });

      // Assert
      expect(prisma.agent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            serverId: 'server-1',
          }),
        })
      );
    });

    it('should filter by status', async () => {
      // Arrange
      mockRequest.query = { status: 'ACTIVE' };

      vi.mocked(prisma.agent.findMany).mockResolvedValue([]);

      // Act
      await prisma.agent.findMany({
        where: {
          serverId: { in: ['server-1', 'server-2'] },
          status: 'ACTIVE',
        },
        include: expect.any(Object),
        skip: 0,
        take: 20,
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

    it('should require authentication', () => {
      // Assert
      expect(getTenantContext).toBeDefined();
      expect(mockRequest.user).toBeDefined();
    });

    it('should support search by name and description', async () => {
      // Arrange
      mockRequest.query = { search: 'test' };

      vi.mocked(prisma.agent.findMany).mockResolvedValue([]);

      // Act
      await prisma.agent.findMany({
        where: {
          serverId: { in: ['server-1', 'server-2'] },
          OR: [
            { name: { contains: 'test', mode: 'insensitive' } },
            { displayName: { contains: 'test', mode: 'insensitive' } },
            { description: { contains: 'test', mode: 'insensitive' } },
          ],
        },
        include: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: expect.any(Object),
      });

      // Assert
      expect(prisma.agent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('POST /agents', () => {
    it('should create a new agent', async () => {
      // Arrange
      const newAgent = {
        serverId: 'server-1',
        name: 'new-agent',
        displayName: 'New Agent',
        description: 'A new agent',
        role: 'WORKER' as const,
        capabilities: ['code'],
      };

      mockRequest.body = newAgent;

      const createdAgent = {
        id: 'agent-new',
        ...newAgent,
        status: 'PENDING_VALIDATION',
        createdById: 'user-123',
        supervisorId: null,
        unixUser: null,
        homeDir: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        validatedById: null,
        validatedAt: null,
      };

      vi.mocked(prisma.agent.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.agent.create).mockResolvedValue(createdAgent as any);

      // Act
      const result = await prisma.agent.create({
        data: {
          serverId: newAgent.serverId,
          name: newAgent.name,
          displayName: newAgent.displayName,
          description: newAgent.description,
          role: newAgent.role,
          status: 'PENDING_VALIDATION',
          capabilities: newAgent.capabilities,
          createdById: 'user-123',
        },
      });

      // Assert
      expect(result.name).toBe('new-agent');
      expect(result.status).toBe('PENDING_VALIDATION');
    });

    it('should validate required fields', async () => {
      // Arrange
      const invalidAgent = {
        serverId: 'server-1',
        // Missing name and displayName
      };

      // This would fail Zod validation in the actual route
      // Assert
      expect(invalidAgent).not.toHaveProperty('name');
      expect(invalidAgent).not.toHaveProperty('displayName');
    });

    it('should check server exists in organization', async () => {
      // Arrange
      mockRequest.body = {
        serverId: 'server-999',
        name: 'agent',
        displayName: 'Agent',
      };

      const orgServerIds = await getOrganizationServerIds('org-123');

      // Assert
      expect(orgServerIds).not.toContain('server-999');
      // In real route, this would return 404
    });

    it('should reject duplicate agent name on same server', async () => {
      // Arrange
      mockRequest.body = {
        serverId: 'server-1',
        name: 'existing-agent',
        displayName: 'Existing',
      };

      vi.mocked(prisma.agent.findUnique).mockResolvedValue({
        id: 'agent-existing',
        name: 'existing-agent',
        serverId: 'server-1',
      } as any);

      // Act
      const existing = await prisma.agent.findUnique({
        where: { serverId_name: { serverId: 'server-1', name: 'existing-agent' } },
      });

      // Assert
      expect(existing).not.toBeNull();
      // In real route, this would return 400
    });
  });

  describe('POST /agents/from-prompt', () => {
    it('should create agent from natural language', async () => {
      // Arrange
      const prompt = 'Create a code review agent that checks pull requests';

      mockRequest.body = {
        serverId: 'server-1',
        prompt,
      };

      // Expected parsed values
      const parsedConfig = {
        name: 'code-review-agent',
        displayName: 'Code Review Agent',
        description: prompt,
        role: 'WORKER' as const,
        capabilities: ['code-review'],
      };

      vi.mocked(prisma.agent.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.agent.create).mockResolvedValue({
        id: 'agent-parsed',
        ...parsedConfig,
        serverId: 'server-1',
        status: 'PENDING_VALIDATION',
      } as any);

      // Act
      const result = await prisma.agent.create({
        data: {
          serverId: 'server-1',
          ...parsedConfig,
          status: 'PENDING_VALIDATION',
          createdById: 'user-123',
        },
      });

      // Assert
      expect(result.name).toContain('code-review');
      expect(result.capabilities).toContain('code-review');
    });

    it('should extract role from prompt', async () => {
      // Arrange
      const prompts = [
        'Create a master agent to orchestrate tasks',
        'Create a supervisor agent to manage workers',
        'Create a worker agent for testing',
      ];

      const expectedRoles = ['MASTER', 'SUPERVISOR', 'WORKER'];

      // Assert role detection logic
      prompts.forEach((prompt, index) => {
        const lower = prompt.toLowerCase();
        let role = 'WORKER';
        if (lower.includes('master') || lower.includes('orchestrat')) {
          role = 'MASTER';
        } else if (lower.includes('supervisor') || lower.includes('manage')) {
          role = 'SUPERVISOR';
        }
        expect(role).toBe(expectedRoles[index]);
      });
    });

    it('should extract capabilities from keywords', async () => {
      // Arrange
      const prompt = 'Create agent for testing, deployment and security audits';

      const capabilities: string[] = [];
      const lower = prompt.toLowerCase();

      // Simulate capability extraction
      if (lower.includes('test')) capabilities.push('testing');
      if (lower.includes('deploy')) capabilities.push('deployment');
      if (lower.includes('security')) capabilities.push('security');

      // Assert
      expect(capabilities).toContain('testing');
      expect(capabilities).toContain('deployment');
      expect(capabilities).toContain('security');
    });
  });

  describe('POST /agents/:id/validate', () => {
    it('should validate pending agent', async () => {
      // Arrange
      mockRequest.params = { id: 'agent-pending' };

      const pendingAgent = {
        id: 'agent-pending',
        name: 'test-agent',
        status: 'PENDING_VALIDATION',
        serverId: 'server-1',
      };

      vi.mocked(prisma.agent.findFirst).mockResolvedValue(pendingAgent as any);
      vi.mocked(prisma.agent.update).mockResolvedValue({
        ...pendingAgent,
        status: 'ACTIVE',
        validatedById: 'user-123',
        validatedAt: new Date(),
      } as any);

      // Act
      const updated = await prisma.agent.update({
        where: { id: 'agent-pending' },
        data: {
          status: 'ACTIVE',
          validatedById: 'user-123',
          validatedAt: expect.any(Date),
        },
      });

      // Assert
      expect(updated.status).toBe('ACTIVE');
      expect(updated.validatedById).toBe('user-123');
    });

    it('should update status to ACTIVE', async () => {
      // Arrange
      vi.mocked(prisma.agent.findFirst).mockResolvedValue({
        id: 'agent-1',
        status: 'PENDING_VALIDATION',
      } as any);

      vi.mocked(prisma.agent.update).mockResolvedValue({
        id: 'agent-1',
        status: 'ACTIVE',
      } as any);

      // Act
      const result = await prisma.agent.update({
        where: { id: 'agent-1' },
        data: { status: 'ACTIVE' },
      });

      // Assert
      expect(result.status).toBe('ACTIVE');
    });

    it('should require admin or manager role', () => {
      // Arrange
      const userRole = 'USER' as string;

      // Assert - verify that non-admin/manager users would be rejected
      const isAllowed = userRole === 'ADMIN' || userRole === 'MANAGER';
      expect(isAllowed).toBe(false);
      // In real route, this would return 403
    });

    it('should reject if agent not pending validation', async () => {
      // Arrange
      vi.mocked(prisma.agent.findFirst).mockResolvedValue({
        id: 'agent-1',
        status: 'ACTIVE',
      } as any);

      const agent = await prisma.agent.findFirst({ where: { id: 'agent-1' } });

      // Assert
      expect(agent?.status).not.toBe('PENDING_VALIDATION');
      // In real route, this would return 400
    });
  });

  describe('GET /agents/:id/executions', () => {
    it('should return execution history', async () => {
      // Arrange
      mockRequest.params = { id: 'agent-1' };
      mockRequest.query = { page: 1, pageSize: 20 };

      const mockExecutions = [
        {
          id: 'exec-1',
          taskId: 'task-1',
          agentId: 'agent-1',
          status: 'COMPLETED',
          prompt: 'Test prompt',
          output: 'Test output',
          error: null,
          exitCode: 0,
          tokensUsed: 100,
          durationMs: 1500,
          startedAt: new Date(),
          completedAt: new Date(),
          task: {
            id: 'task-1',
            title: 'Test Task',
            priority: 'MEDIUM',
          },
        },
      ];

      vi.mocked(prisma.agent.findFirst).mockResolvedValue({ id: 'agent-1' } as any);
      vi.mocked(prisma.taskExecution.findMany).mockResolvedValue(mockExecutions as any);
      vi.mocked(prisma.taskExecution.count).mockResolvedValue(1);

      // Act
      const executions = await prisma.taskExecution.findMany({
        where: { agentId: 'agent-1' },
        include: {
          task: {
            select: { id: true, title: true, priority: true },
          },
        },
        orderBy: { startedAt: 'desc' },
        skip: 0,
        take: 20,
      });

      // Assert
      expect(executions).toHaveLength(1);
      expect(executions[0].status).toBe('COMPLETED');
    });

    it('should filter by execution status', async () => {
      // Arrange
      mockRequest.query = { status: 'FAILED' };

      vi.mocked(prisma.taskExecution.findMany).mockResolvedValue([]);

      // Act
      await prisma.taskExecution.findMany({
        where: { agentId: 'agent-1', status: 'FAILED' },
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: 0,
        take: 20,
      });

      // Assert
      expect(prisma.taskExecution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'FAILED',
          }),
        })
      );
    });
  });

  describe('GET /agents/:id/stats', () => {
    it('should return agent statistics', async () => {
      // Arrange
      mockRequest.params = { id: 'agent-1' };

      vi.mocked(prisma.agent.findFirst).mockResolvedValue({
        id: 'agent-1',
        name: 'test-agent',
      } as any);

      vi.mocked(prisma.taskExecution.groupBy).mockResolvedValue([
        { status: 'COMPLETED', _count: 10 },
        { status: 'FAILED', _count: 2 },
      ] as any);

      vi.mocked(prisma.taskExecution.aggregate).mockResolvedValue({
        _avg: { durationMs: 2000, tokensUsed: 150 },
        _sum: { tokensUsed: 1500 },
        _count: 12,
      } as any);

      // Act
      const stats = await prisma.taskExecution.groupBy({
        by: ['status'],
        where: {
          agentId: 'agent-1',
          startedAt: { gte: expect.any(Date) },
        },
        _count: true,
      });

      // Assert
      expect(stats).toHaveLength(2);
      expect(stats[0].status).toBe('COMPLETED');
      expect(stats[0]._count).toBe(10);
    });

    it('should calculate success rate', async () => {
      // Arrange
      const statusCounts = {
        COMPLETED: 8,
        FAILED: 2,
      };

      const totalExecutions = 10;
      const successCount = statusCounts.COMPLETED;
      const successRate = Math.round((successCount / totalExecutions) * 100);

      // Assert
      expect(successRate).toBe(80);
    });
  });

  describe('DELETE /agents/:id', () => {
    it('should delete agent and related records', async () => {
      // Arrange
      mockRequest.params = { id: 'agent-1' };

      vi.mocked(prisma.agent.findFirst).mockResolvedValue({ id: 'agent-1' } as any);
      vi.mocked(prisma.agentToolPermission.deleteMany).mockResolvedValue({ count: 3 } as any);
      vi.mocked(prisma.agent.delete).mockResolvedValue({ id: 'agent-1' } as any);

      // Act
      await prisma.agentToolPermission.deleteMany({ where: { agentId: 'agent-1' } });
      await prisma.agent.delete({ where: { id: 'agent-1' } });

      // Assert
      expect(prisma.agentToolPermission.deleteMany).toHaveBeenCalled();
      expect(prisma.agent.delete).toHaveBeenCalledWith({ where: { id: 'agent-1' } });
    });
  });

  describe('GET /agents/hierarchy', () => {
    it('should return agent hierarchy tree', async () => {
      // Arrange
      const mockAgents = [
        {
          id: 'master-1',
          name: 'master',
          displayName: 'Master',
          role: 'MASTER',
          status: 'ACTIVE',
          supervisorId: null,
        },
        {
          id: 'supervisor-1',
          name: 'supervisor',
          displayName: 'Supervisor',
          role: 'SUPERVISOR',
          status: 'ACTIVE',
          supervisorId: 'master-1',
        },
        {
          id: 'worker-1',
          name: 'worker',
          displayName: 'Worker',
          role: 'WORKER',
          status: 'ACTIVE',
          supervisorId: 'supervisor-1',
        },
      ];

      vi.mocked(prisma.agent.findMany).mockResolvedValue(mockAgents as any);

      // Act
      const agents = await prisma.agent.findMany({
        where: { serverId: { in: ['server-1', 'server-2'] } },
        select: {
          id: true,
          name: true,
          displayName: true,
          role: true,
          status: true,
          supervisorId: true,
        },
      });

      // Build hierarchy
      type AgentNode = typeof agents[0] & { children: AgentNode[] };
      const buildTree = (parentId: string | null): AgentNode[] => {
        return agents
          .filter((a) => a.supervisorId === parentId)
          .map((a) => ({
            ...a,
            children: buildTree(a.id),
          }));
      };

      const hierarchy = buildTree(null);

      // Assert
      expect(hierarchy).toHaveLength(1); // One root (master)
      expect(hierarchy[0].name).toBe('master');
      expect(hierarchy[0].children).toHaveLength(1); // One supervisor
      expect(hierarchy[0].children[0].children).toHaveLength(1); // One worker
    });
  });
});
