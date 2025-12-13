import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolsService } from '../services/tools.service.js';
import type { ToolDefinition, ServerTool, AgentToolPermission, Agent, ToolCategory, ToolStatus, HealthStatus } from '@prisma/client';

// Mock Prisma - must be defined inline without external variables
vi.mock('../index.js', () => ({
  prisma: {
    toolDefinition: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    serverConfiguration: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    serverTool: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    agent: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    agentToolPermission: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

// Mock master-agent.service
vi.mock('../services/master-agent.service.js', () => ({
  getMasterAgentService: vi.fn(),
}));

describe('ToolsService', () => {
  let service: ToolsService;
  let mockPrismaToolDefinition: any;
  let mockPrismaServerConfiguration: any;
  let mockPrismaServerTool: any;
  let mockPrismaAgent: any;
  let mockPrismaAgentToolPermission: any;
  let mockGetMasterAgentService: any;

  const mockToolDefinition: ToolDefinition = {
    id: 'tool-1',
    name: 'git',
    displayName: 'Git',
    description: 'Version control system',
    category: 'VERSION_CONTROL',
    website: 'https://git-scm.com',
    documentation: 'https://git-scm.com/docs',
    icon: null,
    tags: ['vcs', 'scm'],
    requiresSudo: true,
    dependencies: [],
    installCommand: 'apt-get install -y git',
    versionCommand: 'git --version',
    uninstallCommand: null,
    versionRegex: null,
    minDiskSpace: null,
  };

  const mockServerTool: ServerTool & { tool: ToolDefinition } = {
    id: 'server-tool-1',
    serverId: 'server-1',
    toolId: 'tool-1',
    status: 'INSTALLED',
    installedVersion: '2.34.1',
    installedAt: new Date(),
    installedBy: 'user-1',
    healthStatus: 'HEALTHY',
    lastHealthCheck: new Date(),
    lastError: null,
    configPath: null,
    customConfig: null,
    tool: mockToolDefinition,
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get references to mocked Prisma objects
    const { prisma } = await import('../index.js');
    mockPrismaToolDefinition = prisma.toolDefinition;
    mockPrismaServerConfiguration = prisma.serverConfiguration;
    mockPrismaServerTool = prisma.serverTool;
    mockPrismaAgent = prisma.agent;
    mockPrismaAgentToolPermission = prisma.agentToolPermission;

    // Get reference to mocked master-agent service
    const masterAgentModule = await import('../services/master-agent.service.js');
    mockGetMasterAgentService = masterAgentModule.getMasterAgentService;

    service = new ToolsService();
  });

  describe('listDefinitions', () => {
    it('should list all tool definitions', async () => {
      const tools: ToolDefinition[] = [
        mockToolDefinition,
        { ...mockToolDefinition, id: 'tool-2', name: 'docker', category: 'CONTAINER' },
      ];

      mockPrismaToolDefinition.findMany.mockResolvedValue(tools);

      const result = await service.listDefinitions();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('git');
      expect(result[1].name).toBe('docker');
      expect(mockPrismaToolDefinition.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
    });

    it('should filter tools by category', async () => {
      const tools: ToolDefinition[] = [mockToolDefinition];
      mockPrismaToolDefinition.findMany.mockResolvedValue(tools);

      const result = await service.listDefinitions('VERSION_CONTROL');

      expect(result).toHaveLength(1);
      expect(mockPrismaToolDefinition.findMany).toHaveBeenCalledWith({
        where: { category: 'VERSION_CONTROL' },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
    });

    it('should return formatted tool data', async () => {
      mockPrismaToolDefinition.findMany.mockResolvedValue([mockToolDefinition]);

      const result = await service.listDefinitions();

      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('displayName');
      expect(result[0]).toHaveProperty('category');
      expect(result[0]).not.toHaveProperty('installCommand');
    });
  });

  describe('getServerTools', () => {
    it('should get tools for a server', async () => {
      mockPrismaServerConfiguration.findFirst.mockResolvedValue({
        id: 'server-1',
        userId: 'user-1',
      });

      mockPrismaServerTool.findMany.mockResolvedValue([mockServerTool]);

      const result = await service.getServerTools('server-1', 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0].tool.name).toBe('git');
      expect(result[0].status).toBe('INSTALLED');
      expect(mockPrismaServerTool.findMany).toHaveBeenCalledWith({
        where: { serverId: 'server-1' },
        include: { tool: true },
      });
    });

    it('should throw error if server not found', async () => {
      mockPrismaServerConfiguration.findFirst.mockResolvedValue(null);

      await expect(service.getServerTools('invalid-server', 'user-1'))
        .rejects.toThrow('Server not found');
    });

    it('should verify server belongs to user', async () => {
      mockPrismaServerConfiguration.findFirst.mockResolvedValue(null);

      await expect(service.getServerTools('server-1', 'wrong-user'))
        .rejects.toThrow('Server not found');

      expect(mockPrismaServerConfiguration.findFirst).toHaveBeenCalledWith({
        where: { id: 'server-1', userId: 'wrong-user' },
      });
    });
  });

  describe('installTool', () => {
    it('should install tool successfully', async () => {
      mockPrismaServerConfiguration.findFirst.mockResolvedValue({
        id: 'server-1',
        userId: 'user-1',
      });
      mockPrismaToolDefinition.findUnique.mockResolvedValue(mockToolDefinition);
      mockPrismaServerTool.findUnique.mockResolvedValue(null);
      mockPrismaServerTool.create.mockResolvedValue({
        id: 'new-server-tool',
        serverId: 'server-1',
        toolId: 'tool-1',
        status: 'INSTALLING',
        installedBy: 'user-1',
      });

      const result = await service.installTool({
        serverId: 'server-1',
        toolId: 'tool-1',
        userId: 'user-1',
      });

      expect(result.id).toBe('new-server-tool');
      expect(result.status).toBe('INSTALLING');
      expect(mockPrismaServerTool.create).toHaveBeenCalledWith({
        data: {
          serverId: 'server-1',
          toolId: 'tool-1',
          status: 'INSTALLING',
          installedBy: 'user-1',
        },
      });
    });

    it('should throw error if server not found', async () => {
      mockPrismaServerConfiguration.findFirst.mockResolvedValue(null);

      await expect(service.installTool({
        serverId: 'invalid-server',
        toolId: 'tool-1',
        userId: 'user-1',
      })).rejects.toThrow('Server not found');
    });

    it('should throw error if tool not found', async () => {
      mockPrismaServerConfiguration.findFirst.mockResolvedValue({
        id: 'server-1',
        userId: 'user-1',
      });
      mockPrismaToolDefinition.findUnique.mockResolvedValue(null);

      await expect(service.installTool({
        serverId: 'server-1',
        toolId: 'invalid-tool',
        userId: 'user-1',
      })).rejects.toThrow('Tool not found');
    });

    it('should throw error if tool already installed', async () => {
      mockPrismaServerConfiguration.findFirst.mockResolvedValue({
        id: 'server-1',
        userId: 'user-1',
      });
      mockPrismaToolDefinition.findUnique.mockResolvedValue(mockToolDefinition);
      mockPrismaServerTool.findUnique.mockResolvedValue(mockServerTool);

      await expect(service.installTool({
        serverId: 'server-1',
        toolId: 'tool-1',
        userId: 'user-1',
      })).rejects.toThrow('Tool already installed on this server');
    });

    it('should create permissions for all agents when allowAllAgents is true', async () => {
      mockPrismaServerConfiguration.findFirst.mockResolvedValue({
        id: 'server-1',
        userId: 'user-1',
      });
      mockPrismaToolDefinition.findUnique.mockResolvedValue(mockToolDefinition);
      mockPrismaServerTool.findUnique.mockResolvedValue(null);
      mockPrismaServerTool.create.mockResolvedValue({
        id: 'new-server-tool',
        serverId: 'server-1',
        toolId: 'tool-1',
        status: 'INSTALLING',
      });

      const agents: Pick<Agent, 'id'>[] = [
        { id: 'agent-1' },
        { id: 'agent-2' },
      ];
      mockPrismaAgent.findMany.mockResolvedValue(agents);

      await service.installTool({
        serverId: 'server-1',
        toolId: 'tool-1',
        userId: 'user-1',
        allowAllAgents: true,
      });

      expect(mockPrismaAgentToolPermission.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            agentId: 'agent-1',
            toolId: 'tool-1',
            canUse: true,
          }),
          expect.objectContaining({
            agentId: 'agent-2',
            toolId: 'tool-1',
            canUse: true,
          }),
        ]),
      });
    });

    it('should create specific agent permissions when provided', async () => {
      mockPrismaServerConfiguration.findFirst.mockResolvedValue({
        id: 'server-1',
        userId: 'user-1',
      });
      mockPrismaToolDefinition.findUnique.mockResolvedValue(mockToolDefinition);
      mockPrismaServerTool.findUnique.mockResolvedValue(null);
      mockPrismaServerTool.create.mockResolvedValue({
        id: 'new-server-tool',
        serverId: 'server-1',
        toolId: 'tool-1',
        status: 'INSTALLING',
      });

      await service.installTool({
        serverId: 'server-1',
        toolId: 'tool-1',
        userId: 'user-1',
        agentPermissions: [
          { agentId: 'agent-1', canUse: true, canSudo: true, rateLimit: 10 },
        ],
      });

      expect(mockPrismaAgentToolPermission.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            agentId: 'agent-1',
            toolId: 'tool-1',
            canUse: true,
            canSudo: true,
            rateLimit: 10,
          }),
        ]),
      });
    });
  });

  describe('uninstallTool', () => {
    it('should uninstall tool successfully', async () => {
      mockPrismaServerConfiguration.findFirst.mockResolvedValue({
        id: 'server-1',
        userId: 'user-1',
      });
      mockPrismaServerTool.findUnique.mockResolvedValue(mockServerTool);
      mockPrismaAgentToolPermission.deleteMany.mockResolvedValue({ count: 2 });
      mockPrismaServerTool.delete.mockResolvedValue(mockServerTool);

      await service.uninstallTool('server-1', 'tool-1', 'user-1');

      expect(mockPrismaAgentToolPermission.deleteMany).toHaveBeenCalledWith({
        where: {
          toolId: 'tool-1',
          agent: { serverId: 'server-1' },
        },
      });
      expect(mockPrismaServerTool.delete).toHaveBeenCalledWith({
        where: { id: mockServerTool.id },
      });
    });

    it('should throw error if server not found', async () => {
      mockPrismaServerConfiguration.findFirst.mockResolvedValue(null);

      await expect(service.uninstallTool('invalid-server', 'tool-1', 'user-1'))
        .rejects.toThrow('Server not found');
    });

    it('should throw error if tool not installed', async () => {
      mockPrismaServerConfiguration.findFirst.mockResolvedValue({
        id: 'server-1',
        userId: 'user-1',
      });
      mockPrismaServerTool.findUnique.mockResolvedValue(null);

      await expect(service.uninstallTool('server-1', 'tool-1', 'user-1'))
        .rejects.toThrow('Tool not installed on this server');
    });
  });

  describe('checkToolHealth', () => {
    it('should check tool health successfully', async () => {
      mockPrismaServerConfiguration.findFirst.mockResolvedValue({
        id: 'server-1',
        userId: 'user-1',
      });
      mockPrismaServerTool.findUnique.mockResolvedValue(mockServerTool);
      mockPrismaServerTool.update.mockResolvedValue({
        ...mockServerTool,
        healthStatus: 'HEALTHY',
        lastHealthCheck: new Date(),
      });

      // Mock master agent service to return successful health check
      const mockMasterService = {
        executePrompt: vi.fn().mockResolvedValue({
          success: true,
          output: 'git version 2.34.1',
        }),
      };
      mockGetMasterAgentService.mockResolvedValue(mockMasterService);

      const result = await service.checkToolHealth('server-1', 'tool-1', 'user-1');

      expect(result.toolName).toBe('git');
      expect(result.healthStatus).toBe('HEALTHY');
      expect(mockPrismaServerTool.update).toHaveBeenCalledWith({
        where: { id: mockServerTool.id },
        data: expect.objectContaining({
          healthStatus: 'HEALTHY',
        }),
      });
    });

    it('should throw error if server not found', async () => {
      mockPrismaServerConfiguration.findFirst.mockResolvedValue(null);

      await expect(service.checkToolHealth('invalid-server', 'tool-1', 'user-1'))
        .rejects.toThrow('Server not found');
    });

    it('should throw error if tool not installed', async () => {
      mockPrismaServerConfiguration.findFirst.mockResolvedValue({
        id: 'server-1',
        userId: 'user-1',
      });
      mockPrismaServerTool.findUnique.mockResolvedValue(null);

      await expect(service.checkToolHealth('server-1', 'tool-1', 'user-1'))
        .rejects.toThrow('Tool not installed on this server');
    });
  });

  describe('getAgentPermissions', () => {
    it('should get permissions for an agent', async () => {
      mockPrismaServerConfiguration.findMany.mockResolvedValue([
        { id: 'server-1' },
      ]);
      mockPrismaAgent.findFirst.mockResolvedValue({
        id: 'agent-1',
        serverId: 'server-1',
      });

      const permissions: (AgentToolPermission & { tool: ToolDefinition })[] = [
        {
          id: 'perm-1',
          agentId: 'agent-1',
          toolId: 'tool-1',
          canUse: true,
          canSudo: false,
          rateLimit: 10,
          allowedCommands: [],
          blockedCommands: [],
          grantedBy: 'user-1',
          grantedAt: new Date(),
          reason: null,
          tool: mockToolDefinition,
        },
      ];

      mockPrismaAgentToolPermission.findMany.mockResolvedValue(permissions);

      const result = await service.getAgentPermissions('agent-1', 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0].tool.name).toBe('git');
      expect(result[0].canUse).toBe(true);
      expect(result[0].rateLimit).toBe(10);
    });

    it('should throw error if agent not found', async () => {
      mockPrismaServerConfiguration.findMany.mockResolvedValue([
        { id: 'server-1' },
      ]);
      mockPrismaAgent.findFirst.mockResolvedValue(null);

      await expect(service.getAgentPermissions('invalid-agent', 'user-1'))
        .rejects.toThrow('Agent not found');
    });
  });

  describe('updateAgentPermission', () => {
    it('should update existing permission', async () => {
      mockPrismaServerConfiguration.findMany.mockResolvedValue([
        { id: 'server-1' },
      ]);
      mockPrismaAgent.findFirst.mockResolvedValue({
        id: 'agent-1',
        serverId: 'server-1',
      });

      const updatedPermission: AgentToolPermission = {
        id: 'perm-1',
        agentId: 'agent-1',
        toolId: 'tool-1',
        canUse: true,
        canSudo: true,
        rateLimit: 20,
        allowedCommands: [],
        blockedCommands: [],
        grantedBy: 'user-1',
        grantedAt: new Date(),
        reason: null,
      };

      mockPrismaAgentToolPermission.upsert.mockResolvedValue(updatedPermission);

      const result = await service.updateAgentPermission(
        'agent-1',
        'tool-1',
        'user-1',
        { canSudo: true, rateLimit: 20 }
      );

      expect(result.canSudo).toBe(true);
      expect(result.rateLimit).toBe(20);
      expect(mockPrismaAgentToolPermission.upsert).toHaveBeenCalled();
    });

    it('should create permission if not exists', async () => {
      mockPrismaServerConfiguration.findMany.mockResolvedValue([
        { id: 'server-1' },
      ]);
      mockPrismaAgent.findFirst.mockResolvedValue({
        id: 'agent-1',
        serverId: 'server-1',
      });

      const newPermission: AgentToolPermission = {
        id: 'perm-new',
        agentId: 'agent-1',
        toolId: 'tool-1',
        canUse: true,
        canSudo: false,
        rateLimit: null,
        allowedCommands: [],
        blockedCommands: [],
        grantedBy: 'user-1',
        grantedAt: new Date(),
        reason: null,
      };

      mockPrismaAgentToolPermission.upsert.mockResolvedValue(newPermission);

      const result = await service.updateAgentPermission(
        'agent-1',
        'tool-1',
        'user-1',
        { canUse: true }
      );

      expect(result.id).toBe('perm-new');
      expect(mockPrismaAgentToolPermission.upsert).toHaveBeenCalledWith({
        where: { agentId_toolId: { agentId: 'agent-1', toolId: 'tool-1' } },
        create: expect.objectContaining({
          agentId: 'agent-1',
          toolId: 'tool-1',
          canUse: true,
        }),
        update: { canUse: true },
      });
    });

    it('should throw error if agent not found', async () => {
      mockPrismaServerConfiguration.findMany.mockResolvedValue([
        { id: 'server-1' },
      ]);
      mockPrismaAgent.findFirst.mockResolvedValue(null);

      await expect(service.updateAgentPermission(
        'invalid-agent',
        'tool-1',
        'user-1',
        { canUse: true }
      )).rejects.toThrow('Agent not found');
    });
  });

  describe('updateToolStatus', () => {
    it('should update tool status to INSTALLED', async () => {
      const updatedTool: ServerTool = {
        ...mockServerTool,
        status: 'INSTALLED',
        installedVersion: '2.40.0',
        installedAt: new Date(),
      };

      mockPrismaServerTool.update.mockResolvedValue(updatedTool);

      const result = await service.updateToolStatus(
        'server-tool-1',
        'INSTALLED',
        { installedVersion: '2.40.0' }
      );

      expect(result.status).toBe('INSTALLED');
      expect(result.installedVersion).toBe('2.40.0');
    });

    it('should update tool status to FAILED with error', async () => {
      const failedTool: ServerTool = {
        ...mockServerTool,
        status: 'FAILED',
        lastError: 'Installation failed',
      };

      mockPrismaServerTool.update.mockResolvedValue(failedTool);

      const result = await service.updateToolStatus(
        'server-tool-1',
        'FAILED',
        { lastError: 'Installation failed' }
      );

      expect(result.status).toBe('FAILED');
      expect(result.lastError).toBe('Installation failed');
    });
  });

  describe('seedDefaultTools', () => {
    it('should seed default tools', async () => {
      mockPrismaToolDefinition.upsert.mockResolvedValue(mockToolDefinition);

      const count = await service.seedDefaultTools();

      expect(count).toBeGreaterThan(0);
      expect(mockPrismaToolDefinition.upsert).toHaveBeenCalled();
      expect(mockPrismaToolDefinition.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { name: 'git' },
        })
      );
    });

    it('should not duplicate existing tools', async () => {
      mockPrismaToolDefinition.upsert.mockResolvedValue(mockToolDefinition);

      await service.seedDefaultTools();

      // Verify upsert was used (which won't duplicate)
      expect(mockPrismaToolDefinition.upsert).toHaveBeenCalled();
    });
  });
});
