import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentService } from '../services/agent.service.js';
import { prisma } from '../index.js';

// Mock Prisma
vi.mock('../index.js', () => ({
  prisma: {
    serverConfiguration: {
      findMany: vi.fn(),
    },
    agent: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    agentToolPermission: {
      deleteMany: vi.fn(),
    },
  },
}));

describe('AgentService', () => {
  let service: AgentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AgentService();
  });

  describe('list', () => {
    it('should list agents for user servers', async () => {
      // Arrange
      const userId = 'user-123';
      const mockServers = [{ id: 'server-1' }, { id: 'server-2' }];
      const mockAgents = [
        {
          id: 'agent-1',
          serverId: 'server-1',
          name: 'agent-1',
          displayName: 'Agent 1',
          description: 'Test agent',
          role: 'WORKER',
          status: 'ACTIVE',
          capabilities: ['read', 'write'],
          server: { name: 'Server 1' },
          supervisor: null,
          _count: { subordinates: 0, tasks: 5 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue(mockServers as any);
      vi.mocked(prisma.agent.findMany).mockResolvedValue(mockAgents as any);

      // Act
      const result = await service.list(userId);

      // Assert
      expect(prisma.serverConfiguration.findMany).toHaveBeenCalledWith({
        where: { userId },
        select: { id: true },
      });
      expect(prisma.agent.findMany).toHaveBeenCalledWith({
        where: { serverId: { in: ['server-1', 'server-2'] } },
        include: {
          server: { select: { name: true } },
          supervisor: { select: { id: true, name: true, displayName: true } },
          _count: { select: { subordinates: true, tasks: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].serverName).toBe('Server 1');
      expect(result[0].subordinateCount).toBe(0);
      expect(result[0].taskCount).toBe(5);
    });

    it('should filter by serverId', async () => {
      // Arrange
      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue([]);
      vi.mocked(prisma.agent.findMany).mockResolvedValue([]);

      // Act
      await service.list('user-123', { serverId: 'server-1' });

      // Assert
      expect(prisma.agent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { serverId: 'server-1' },
        })
      );
    });

    it('should filter by status', async () => {
      // Arrange
      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue([{ id: 'server-1' }] as any);
      vi.mocked(prisma.agent.findMany).mockResolvedValue([]);

      // Act
      await service.list('user-123', { status: 'ACTIVE' });

      // Assert
      expect(prisma.agent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        })
      );
    });

    it('should filter by role', async () => {
      // Arrange
      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue([{ id: 'server-1' }] as any);
      vi.mocked(prisma.agent.findMany).mockResolvedValue([]);

      // Act
      await service.list('user-123', { role: 'MASTER' });

      // Assert
      expect(prisma.agent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'MASTER' }),
        })
      );
    });
  });

  describe('create', () => {
    it('should create a new agent', async () => {
      // Arrange
      const input = {
        serverId: 'server-123',
        name: 'new-agent',
        displayName: 'New Agent',
        description: 'A new agent',
        capabilities: ['read', 'write'],
        createdById: 'user-123',
      };

      const mockAgent = {
        id: 'agent-123',
        name: 'new-agent',
        displayName: 'New Agent',
        status: 'PENDING_VALIDATION',
      };

      vi.mocked(prisma.agent.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.agent.create).mockResolvedValue(mockAgent as any);

      // Act
      const result = await service.create(input);

      // Assert
      expect(prisma.agent.findUnique).toHaveBeenCalledWith({
        where: { serverId_name: { serverId: 'server-123', name: 'new-agent' } },
      });
      expect(prisma.agent.create).toHaveBeenCalledWith({
        data: {
          serverId: 'server-123',
          name: 'new-agent',
          displayName: 'New Agent',
          description: 'A new agent',
          role: 'WORKER',
          status: 'PENDING_VALIDATION',
          supervisorId: undefined,
          capabilities: ['read', 'write'],
          createdById: 'user-123',
        },
      });
      expect(result.status).toBe('PENDING_VALIDATION');
    });

    it('should throw error if agent name already exists', async () => {
      // Arrange
      const input = {
        serverId: 'server-123',
        name: 'existing-agent',
        displayName: 'Existing Agent',
        createdById: 'user-123',
      };

      vi.mocked(prisma.agent.findUnique).mockResolvedValue({ id: 'agent-123' } as any);

      // Act & Assert
      await expect(service.create(input)).rejects.toThrow(
        'Agent with this name already exists on this server'
      );
    });

    it('should use default role when not specified', async () => {
      // Arrange
      const input = {
        serverId: 'server-123',
        name: 'new-agent',
        displayName: 'New Agent',
        createdById: 'user-123',
      };

      vi.mocked(prisma.agent.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.agent.create).mockResolvedValue({
        id: 'agent-123',
        name: 'new-agent',
        displayName: 'New Agent',
        status: 'PENDING_VALIDATION',
      } as any);

      // Act
      await service.create(input);

      // Assert
      expect(prisma.agent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: 'WORKER',
          capabilities: [],
        }),
      });
    });

    it('should create agent with MASTER role', async () => {
      // Arrange
      const input = {
        serverId: 'server-123',
        name: 'master-agent',
        displayName: 'Master Agent',
        role: 'MASTER' as const,
        createdById: 'user-123',
      };

      vi.mocked(prisma.agent.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.agent.create).mockResolvedValue({
        id: 'agent-123',
        name: 'master-agent',
        displayName: 'Master Agent',
        status: 'PENDING_VALIDATION',
      } as any);

      // Act
      await service.create(input);

      // Assert
      expect(prisma.agent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: 'MASTER',
        }),
      });
    });

    it('should create agent with supervisor', async () => {
      // Arrange
      const input = {
        serverId: 'server-123',
        name: 'worker-agent',
        displayName: 'Worker Agent',
        supervisorId: 'supervisor-123',
        createdById: 'user-123',
      };

      vi.mocked(prisma.agent.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.agent.create).mockResolvedValue({
        id: 'agent-123',
        name: 'worker-agent',
        displayName: 'Worker Agent',
        status: 'PENDING_VALIDATION',
      } as any);

      // Act
      await service.create(input);

      // Assert
      expect(prisma.agent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          supervisorId: 'supervisor-123',
        }),
      });
    });
  });

  describe('getById', () => {
    it('should return agent with full details', async () => {
      // Arrange
      const mockServers = [{ id: 'server-1' }];
      const mockAgent = {
        id: 'agent-123',
        serverId: 'server-1',
        name: 'agent-1',
        displayName: 'Agent 1',
        description: 'Test agent',
        role: 'WORKER',
        status: 'ACTIVE',
        unixUser: 'agent1',
        homeDir: '/home/agent1',
        capabilities: ['read'],
        server: { id: 'server-1', name: 'Server 1', url: 'http://localhost:8080' },
        supervisor: { id: 'sup-1', name: 'supervisor', displayName: 'Supervisor' },
        subordinates: [],
        toolPermissions: [
          {
            toolId: 'tool-1',
            tool: { name: 'read_file', displayName: 'Read File' },
            canUse: true,
            canSudo: false,
            rateLimit: 100,
          },
        ],
        createdBy: { id: 'user-1', name: 'Admin', email: 'admin@test.com' },
        validatedBy: { id: 'user-1', name: 'Admin', email: 'admin@test.com' },
        validatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue(mockServers as any);
      vi.mocked(prisma.agent.findFirst).mockResolvedValue(mockAgent as any);

      // Act
      const result = await service.getById('agent-123', 'user-123');

      // Assert
      expect(result).toBeTruthy();
      expect(result?.toolPermissions).toHaveLength(1);
      expect(result?.toolPermissions[0].toolName).toBe('read_file');
    });

    it('should return null when agent not found', async () => {
      // Arrange
      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue([{ id: 'server-1' }] as any);
      vi.mocked(prisma.agent.findFirst).mockResolvedValue(null);

      // Act
      const result = await service.getById('agent-123', 'user-123');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when user has no servers', async () => {
      // Arrange
      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue([]);

      // Act
      const result = await service.getById('agent-123', 'user-123');

      // Assert
      expect(prisma.agent.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'agent-123', serverId: { in: [] } },
        })
      );
    });
  });

  describe('update', () => {
    it('should update agent successfully', async () => {
      // Arrange
      const mockServers = [{ id: 'server-1' }];
      const mockAgent = { id: 'agent-123', serverId: 'server-1' };
      const updatedAgent = {
        id: 'agent-123',
        name: 'agent-1',
        displayName: 'Updated Agent',
        status: 'ACTIVE',
      };

      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue(mockServers as any);
      vi.mocked(prisma.agent.findFirst).mockResolvedValue(mockAgent as any);
      vi.mocked(prisma.agent.update).mockResolvedValue(updatedAgent as any);

      // Act
      const result = await service.update('agent-123', 'user-123', { displayName: 'Updated Agent' });

      // Assert
      expect(prisma.agent.update).toHaveBeenCalledWith({
        where: { id: 'agent-123' },
        data: { displayName: 'Updated Agent' },
      });
      expect(result.displayName).toBe('Updated Agent');
    });

    it('should throw error when agent not found', async () => {
      // Arrange
      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue([{ id: 'server-1' }] as any);
      vi.mocked(prisma.agent.findFirst).mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update('agent-123', 'user-123', { displayName: 'New Name' })
      ).rejects.toThrow('Agent not found');
    });

    it('should update agent capabilities', async () => {
      // Arrange
      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue([{ id: 'server-1' }] as any);
      vi.mocked(prisma.agent.findFirst).mockResolvedValue({ id: 'agent-123' } as any);
      vi.mocked(prisma.agent.update).mockResolvedValue({
        id: 'agent-123',
        name: 'agent-1',
        displayName: 'Agent 1',
        status: 'ACTIVE',
      } as any);

      // Act
      await service.update('agent-123', 'user-123', { capabilities: ['read', 'write', 'execute'] });

      // Assert
      expect(prisma.agent.update).toHaveBeenCalledWith({
        where: { id: 'agent-123' },
        data: { capabilities: ['read', 'write', 'execute'] },
      });
    });

    it('should update agent status', async () => {
      // Arrange
      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue([{ id: 'server-1' }] as any);
      vi.mocked(prisma.agent.findFirst).mockResolvedValue({ id: 'agent-123' } as any);
      vi.mocked(prisma.agent.update).mockResolvedValue({
        id: 'agent-123',
        name: 'agent-1',
        displayName: 'Agent 1',
        status: 'INACTIVE',
      } as any);

      // Act
      await service.update('agent-123', 'user-123', { status: 'INACTIVE' });

      // Assert
      expect(prisma.agent.update).toHaveBeenCalledWith({
        where: { id: 'agent-123' },
        data: { status: 'INACTIVE' },
      });
    });
  });

  describe('delete', () => {
    it('should delete agent and related records', async () => {
      // Arrange
      const mockServers = [{ id: 'server-1' }];
      const mockAgent = { id: 'agent-123', serverId: 'server-1' };

      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue(mockServers as any);
      vi.mocked(prisma.agent.findFirst).mockResolvedValue(mockAgent as any);
      vi.mocked(prisma.agentToolPermission.deleteMany).mockResolvedValue({ count: 3 });
      vi.mocked(prisma.agent.delete).mockResolvedValue(mockAgent as any);

      // Act
      await service.delete('agent-123', 'user-123');

      // Assert
      expect(prisma.agentToolPermission.deleteMany).toHaveBeenCalledWith({
        where: { agentId: 'agent-123' },
      });
      expect(prisma.agent.delete).toHaveBeenCalledWith({
        where: { id: 'agent-123' },
      });
    });

    it('should throw error when agent not found', async () => {
      // Arrange
      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue([{ id: 'server-1' }] as any);
      vi.mocked(prisma.agent.findFirst).mockResolvedValue(null);

      // Act & Assert
      await expect(service.delete('agent-123', 'user-123')).rejects.toThrow('Agent not found');
    });
  });

  describe('validate', () => {
    it('should validate agent when user is ADMIN', async () => {
      // Arrange
      const mockServers = [{ id: 'server-1' }];
      const mockAgent = { id: 'agent-123', serverId: 'server-1', status: 'PENDING_VALIDATION' };
      const validatedAgent = { id: 'agent-123', name: 'agent-1', status: 'ACTIVE' };

      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue(mockServers as any);
      vi.mocked(prisma.agent.findFirst).mockResolvedValue(mockAgent as any);
      vi.mocked(prisma.agent.update).mockResolvedValue(validatedAgent as any);

      // Act
      const result = await service.validate('agent-123', 'user-123', 'ADMIN');

      // Assert
      expect(prisma.agent.update).toHaveBeenCalledWith({
        where: { id: 'agent-123' },
        data: {
          status: 'ACTIVE',
          validatedById: 'user-123',
          validatedAt: expect.any(Date),
        },
      });
      expect(result.status).toBe('ACTIVE');
    });

    it('should validate agent when user is MANAGER', async () => {
      // Arrange
      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue([{ id: 'server-1' }] as any);
      vi.mocked(prisma.agent.findFirst).mockResolvedValue({
        id: 'agent-123',
        status: 'PENDING_VALIDATION',
      } as any);
      vi.mocked(prisma.agent.update).mockResolvedValue({
        id: 'agent-123',
        name: 'agent-1',
        status: 'ACTIVE',
      } as any);

      // Act
      const result = await service.validate('agent-123', 'user-123', 'MANAGER');

      // Assert
      expect(result.status).toBe('ACTIVE');
    });

    it('should throw error when user is not ADMIN or MANAGER', async () => {
      // Act & Assert
      await expect(service.validate('agent-123', 'user-123', 'OPERATOR')).rejects.toThrow(
        'Only admins can validate agents'
      );
    });

    it('should throw error when agent not found', async () => {
      // Arrange
      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue([{ id: 'server-1' }] as any);
      vi.mocked(prisma.agent.findFirst).mockResolvedValue(null);

      // Act & Assert
      await expect(service.validate('agent-123', 'user-123', 'ADMIN')).rejects.toThrow(
        'Agent not found'
      );
    });

    it('should throw error when agent is not pending validation', async () => {
      // Arrange
      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue([{ id: 'server-1' }] as any);
      vi.mocked(prisma.agent.findFirst).mockResolvedValue({
        id: 'agent-123',
        status: 'ACTIVE',
      } as any);

      // Act & Assert
      await expect(service.validate('agent-123', 'user-123', 'ADMIN')).rejects.toThrow(
        'Agent is not pending validation'
      );
    });
  });

  describe('getHierarchy', () => {
    it('should return hierarchy tree for all servers', async () => {
      // Arrange
      const mockServers = [{ id: 'server-1' }];
      const mockAgents = [
        { id: 'master-1', name: 'master', displayName: 'Master', role: 'MASTER', status: 'ACTIVE', supervisorId: null },
        { id: 'sup-1', name: 'supervisor', displayName: 'Supervisor', role: 'SUPERVISOR', status: 'ACTIVE', supervisorId: 'master-1' },
        { id: 'worker-1', name: 'worker1', displayName: 'Worker 1', role: 'WORKER', status: 'ACTIVE', supervisorId: 'sup-1' },
        { id: 'worker-2', name: 'worker2', displayName: 'Worker 2', role: 'WORKER', status: 'ACTIVE', supervisorId: 'sup-1' },
      ];

      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue(mockServers as any);
      vi.mocked(prisma.agent.findMany).mockResolvedValue(mockAgents as any);

      // Act
      const result = await service.getHierarchy('user-123');

      // Assert
      expect(result).toHaveLength(1); // Only master at root
      expect(result[0].id).toBe('master-1');
      expect(result[0].children).toHaveLength(1); // Supervisor
      expect(result[0].children[0].id).toBe('sup-1');
      expect(result[0].children[0].children).toHaveLength(2); // Workers
    });

    it('should filter by serverId when provided', async () => {
      // Arrange
      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue([{ id: 'server-1' }] as any);
      vi.mocked(prisma.agent.findMany).mockResolvedValue([]);

      // Act
      await service.getHierarchy('user-123', 'server-1');

      // Assert
      expect(prisma.agent.findMany).toHaveBeenCalledWith({
        where: { serverId: 'server-1' },
        select: {
          id: true,
          name: true,
          displayName: true,
          role: true,
          status: true,
          supervisorId: true,
        },
      });
    });

    it('should return empty array when no agents', async () => {
      // Arrange
      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue([{ id: 'server-1' }] as any);
      vi.mocked(prisma.agent.findMany).mockResolvedValue([]);

      // Act
      const result = await service.getHierarchy('user-123');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('verifyOwnership', () => {
    it('should return true when user owns the agent', async () => {
      // Arrange
      const mockServers = [{ id: 'server-1' }];
      const mockAgent = { id: 'agent-123', serverId: 'server-1' };

      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue(mockServers as any);
      vi.mocked(prisma.agent.findFirst).mockResolvedValue(mockAgent as any);

      // Act
      const result = await service.verifyOwnership('agent-123', 'user-123');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user does not own the agent', async () => {
      // Arrange
      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue([{ id: 'server-1' }] as any);
      vi.mocked(prisma.agent.findFirst).mockResolvedValue(null);

      // Act
      const result = await service.verifyOwnership('agent-123', 'user-123');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when user has no servers', async () => {
      // Arrange
      vi.mocked(prisma.serverConfiguration.findMany).mockResolvedValue([]);

      // Act
      const result = await service.verifyOwnership('agent-123', 'user-123');

      // Assert
      expect(prisma.agent.findFirst).toHaveBeenCalledWith({
        where: { id: 'agent-123', serverId: { in: [] } },
      });
      expect(result).toBe(false);
    });
  });
});
