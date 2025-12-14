import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MasterAgentService, getMasterAgentService, clearMasterAgentService } from '../services/master-agent.service.js';
import { MCPClient } from '../services/mcp-client.js';
import type { ServerConfiguration, Agent } from '@prisma/client';

// Mock Prisma - must be defined before vi.mock
vi.mock('../index.js', () => ({
  prisma: {
    agent: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    serverConfiguration: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

// Mock MCP Client
const mockMCPClient = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  execute: vi.fn(),
  executeHttp: vi.fn(),
  callTool: vi.fn(),
  connectionState: 'disconnected' as 'disconnected' | 'connecting' | 'connected' | 'error',
};

vi.mock('../services/mcp-client.js', () => ({
  MCPClient: vi.fn(() => mockMCPClient),
  getMCPClient: vi.fn(() => mockMCPClient),
  removeMCPClient: vi.fn(),
  clearMCPClients: vi.fn(),
}));

// Mock crypto
vi.mock('../utils/crypto.js', () => ({
  decrypt: vi.fn((encrypted: string) => `decrypted-${encrypted}`),
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
  masterAgentLogger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock MonitoringService
const mockMonitoringService = {
  broadcastExecution: vi.fn(),
  broadcastAgentStatus: vi.fn(),
};

vi.mock('../services/monitoring.service.js', () => ({
  MonitoringService: {
    getInstance: () => mockMonitoringService,
  },
}));

describe('MasterAgentService', () => {
  let service: MasterAgentService;
  let mockPrismaAgent: any;
  let mockPrismaServerConfig: any;
  const serverId = 'test-server-id';

  beforeEach(async () => {
    // Get references to mocked Prisma objects
    const { prisma } = await import('../index.js');
    mockPrismaAgent = prisma.agent;
    mockPrismaServerConfig = prisma.serverConfiguration;
  });

  const mockServerConfig: ServerConfiguration = {
    id: serverId,
    userId: 'user-1',
    name: 'Test Server',
    description: 'Test server description',
    url: 'http://localhost:3000',
    wsUrl: 'ws://localhost:3000',
    masterToken: 'encrypted-token',
    masterAgentId: 'master-agent-1',
    status: 'ONLINE',
    lastHealthCheck: null,
    lastError: null,
    isDefault: false,
    autoConnect: true,
    priority: 0,
    serverVersion: '1.0.0',
    capabilities: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMasterAgent: Agent = {
    id: 'master-agent-1',
    serverId,
    name: 'master',
    displayName: 'Master Agent',
    description: 'Master agent',
    role: 'MASTER',
    status: 'ACTIVE',
    capabilities: ['orchestration', 'supervision'],
    supervisorId: null,
    createdById: 'user-1',
    validatedById: 'user-1',
    validatedAt: new Date(),
    token: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    unixUser: 'agent',
    homeDir: '/home/agent',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMCPClient.connectionState = 'disconnected';
  });

  afterEach(async () => {
    if (service) {
      await service.disconnect();
    }
  });

  describe('Initialization', () => {
    it('should initialize with server config and master agent', async () => {
      mockPrismaServerConfig.findUnique.mockResolvedValue(mockServerConfig);
      mockPrismaAgent.findUnique.mockResolvedValue(mockMasterAgent);

      service = new MasterAgentService(serverId);
      await service.initialize();

      expect(mockPrismaServerConfig.findUnique).toHaveBeenCalledWith({
        where: { id: serverId },
      });
      expect(mockPrismaAgent.findUnique).toHaveBeenCalledWith({
        where: { id: mockServerConfig.masterAgentId },
      });
    });

    it('should throw error if server config not found', async () => {
      mockPrismaServerConfig.findUnique.mockResolvedValue(null);

      service = new MasterAgentService(serverId);

      await expect(service.initialize()).rejects.toThrow(
        `Server configuration not found: ${serverId}`
      );
    });

    it('should find master agent if not set in config', async () => {
      const configWithoutMaster = { ...mockServerConfig, masterAgentId: null };
      mockPrismaServerConfig.findUnique.mockResolvedValue(configWithoutMaster);
      mockPrismaAgent.findUnique.mockResolvedValue(null);
      mockPrismaAgent.findFirst.mockResolvedValue(mockMasterAgent);

      service = new MasterAgentService(serverId);
      await service.initialize();

      expect(mockPrismaAgent.findFirst).toHaveBeenCalledWith({
        where: {
          serverId,
          role: 'MASTER',
          status: 'ACTIVE',
        },
      });
    });

    it('should initialize MCP client when protocol enabled', async () => {
      mockPrismaServerConfig.findUnique.mockResolvedValue(mockServerConfig);
      mockPrismaAgent.findUnique.mockResolvedValue(mockMasterAgent);
      mockMCPClient.connect.mockResolvedValue(undefined);

      service = new MasterAgentService(serverId, true);
      await service.initialize();

      expect(mockMCPClient.connect).toHaveBeenCalled();
    });

    it('should not crash if MCP connection fails', async () => {
      mockPrismaServerConfig.findUnique.mockResolvedValue(mockServerConfig);
      mockPrismaAgent.findUnique.mockResolvedValue(mockMasterAgent);
      mockMCPClient.connect.mockRejectedValue(new Error('Connection failed'));

      service = new MasterAgentService(serverId, true);

      // Should not throw
      await expect(service.initialize()).resolves.toBeUndefined();
    });
  });

  describe('Disconnect', () => {
    it('should disconnect MCP client', async () => {
      mockPrismaServerConfig.findUnique.mockResolvedValue(mockServerConfig);
      mockPrismaAgent.findUnique.mockResolvedValue(mockMasterAgent);

      service = new MasterAgentService(serverId);
      await service.initialize();
      await service.disconnect();

      const { removeMCPClient } = await import('../services/mcp-client.js');
      expect(removeMCPClient).toHaveBeenCalled();
    });
  });

  describe('Execute Prompt', () => {
    beforeEach(async () => {
      mockPrismaServerConfig.findUnique.mockResolvedValue(mockServerConfig);
      mockPrismaAgent.findUnique.mockResolvedValue(mockMasterAgent);

      service = new MasterAgentService(serverId);
      await service.initialize();
    });

    it('should execute prompt successfully via MCP', async () => {
      mockMCPClient.connectionState = 'connected';
      mockMCPClient.execute.mockResolvedValue({
        success: true,
        output: 'Task completed',
        tokensUsed: 100,
      });

      const callbacks = {
        onStart: vi.fn(),
        onOutput: vi.fn(),
        onComplete: vi.fn(),
      };

      const result = await service.executePrompt('Test prompt', undefined, callbacks);

      expect(result.success).toBe(true);
      expect(result.output).toBe('Task completed');
      expect(result.tokensUsed).toBe(100);
      expect(callbacks.onStart).toHaveBeenCalled();
      expect(callbacks.onComplete).toHaveBeenCalled();
    });

    it('should call onOutput callback during execution', async () => {
      mockMCPClient.connectionState = 'connected';

      let capturedOnOutput: ((chunk: string) => void) | undefined;
      mockMCPClient.execute.mockImplementation(async (_req, callbacks) => {
        capturedOnOutput = callbacks?.onOutput;
        // Simulate streaming output
        capturedOnOutput?.('Chunk 1');
        capturedOnOutput?.('Chunk 2');
        return { success: true, output: 'Done', tokensUsed: 50 };
      });

      const onOutput = vi.fn();
      await service.executePrompt('Test', undefined, { onOutput });

      expect(onOutput).toHaveBeenCalledWith('Chunk 1');
      expect(onOutput).toHaveBeenCalledWith('Chunk 2');
    });

    it('should handle execution with specific agent', async () => {
      const workerAgent: Agent = {
        ...mockMasterAgent,
        id: 'worker-1',
        name: 'worker',
        role: 'WORKER',
      };

      mockPrismaAgent.findUnique.mockResolvedValue(workerAgent);
      mockMCPClient.connectionState = 'connected';
      mockMCPClient.execute.mockResolvedValue({
        success: true,
        output: 'Worker done',
        tokensUsed: 75,
      });

      const result = await service.executePrompt('Worker task', 'worker-1');

      expect(result.success).toBe(true);
      expect(mockPrismaAgent.findUnique).toHaveBeenCalledWith({
        where: { id: 'worker-1' },
      });
    });

    it('should handle tool calls during execution', async () => {
      mockMCPClient.connectionState = 'connected';

      let capturedOnToolCall: ((call: { id: string; name: string; arguments: Record<string, unknown> }) => void) | undefined;
      mockMCPClient.execute.mockImplementation(async (_req, callbacks) => {
        capturedOnToolCall = callbacks?.onToolCall;
        capturedOnToolCall?.({
          id: 'call-1',
          name: 'Read',
          arguments: { file_path: '/test.ts' },
        });
        return { success: true, output: 'Done', tokensUsed: 50 };
      });

      const onToolCall = vi.fn();
      await service.executePrompt('Test', undefined, { onToolCall });

      expect(onToolCall).toHaveBeenCalledWith('Read', { file_path: '/test.ts' });
    });

    it('should fallback to HTTP when WebSocket not connected', async () => {
      mockMCPClient.connectionState = 'disconnected';
      mockMCPClient.execute.mockRejectedValue(new Error('Not connected'));
      mockMCPClient.executeHttp.mockResolvedValue({
        success: true,
        output: 'HTTP result',
        tokensUsed: 80,
      });

      const result = await service.executePrompt('Test');

      expect(result.success).toBe(true);
      expect(result.output).toBe('HTTP result');
      expect(mockMCPClient.executeHttp).toHaveBeenCalled();
    });

    it('should fallback to simulation when MCP fails', async () => {
      mockMCPClient.connectionState = 'disconnected';
      mockMCPClient.execute.mockRejectedValue(new Error('Not connected'));
      mockMCPClient.executeHttp.mockRejectedValue(new Error('HTTP failed'));

      const onOutput = vi.fn();
      const result = await service.executePrompt('Test', undefined, { onOutput });

      expect(result.success).toBe(true);
      expect(result.output).toContain('[Simulation Mode]');
      expect(onOutput).toHaveBeenCalled();
    });

    it('should handle execution error', async () => {
      mockPrismaAgent.findUnique.mockResolvedValue(null);

      const onError = vi.fn();

      // executePrompt throws an error when no agent is available
      await expect(service.executePrompt('Test', 'invalid-agent', { onError }))
        .rejects.toThrow('No agent available');
    });

    it('should throw error if service not initialized', async () => {
      const uninitializedService = new MasterAgentService('uninitialized-server');

      await expect(uninitializedService.executePrompt('Test'))
        .rejects.toThrow('Service not initialized');
    });
  });

  describe('Create Sub-Agent', () => {
    beforeEach(async () => {
      mockPrismaServerConfig.findUnique.mockResolvedValue(mockServerConfig);
      mockPrismaAgent.findUnique.mockResolvedValue(mockMasterAgent);

      service = new MasterAgentService(serverId);
      await service.initialize();
    });

    it('should create sub-agent successfully', async () => {
      const newAgent: Agent = {
        id: 'new-agent-1',
        serverId,
        name: 'worker-123',
        displayName: 'Worker Agent',
        description: 'Test worker',
        role: 'WORKER',
        status: 'PENDING_VALIDATION',
        capabilities: ['coding', 'testing'],
        supervisorId: mockMasterAgent.id,
        createdById: 'user-1',
        validatedById: null,
        validatedAt: null,
        token: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        unixUser: 'worker',
        homeDir: '/home/worker',
      };

      mockPrismaAgent.create.mockResolvedValue(newAgent);

      const result = await service.createSubAgent(
        {
          name: 'worker',
          displayName: 'Worker Agent',
          description: 'Test worker',
          role: 'WORKER',
          capabilities: ['coding', 'testing'],
        },
        'user-1'
      );

      expect(result.id).toBe('new-agent-1');
      expect(result.status).toBe('PENDING_VALIDATION');
      expect(mockPrismaAgent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          serverId,
          displayName: 'Worker Agent',
          role: 'WORKER',
          status: 'PENDING_VALIDATION',
          supervisorId: mockMasterAgent.id,
        }),
      });
    });

    it('should provision agent on MCP server when connected', async () => {
      mockMCPClient.connectionState = 'connected';
      mockMCPClient.callTool.mockResolvedValue({ success: true });

      const newAgent: Agent = {
        id: 'new-agent-2',
        serverId,
        name: 'worker-456',
        displayName: 'Worker 2',
        description: null,
        role: 'WORKER',
        status: 'PENDING_VALIDATION',
        capabilities: ['analysis'],
        supervisorId: mockMasterAgent.id,
        createdById: 'user-1',
        validatedById: null,
        validatedAt: null,
        token: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        unixUser: 'worker2',
        homeDir: '/home/worker2',
      };

      mockPrismaAgent.create.mockResolvedValue(newAgent);

      await service.createSubAgent(
        {
          name: 'worker',
          displayName: 'Worker 2',
          role: 'WORKER',
          capabilities: ['analysis'],
        },
        'user-1'
      );

      expect(mockMCPClient.callTool).toHaveBeenCalledWith(
        'provision_agent',
        expect.objectContaining({
          agentId: 'new-agent-2',
          displayName: 'Worker 2',
          role: 'WORKER',
        })
      );
    });

    it('should continue if MCP provisioning fails', async () => {
      mockMCPClient.connectionState = 'connected';
      mockMCPClient.callTool.mockRejectedValue(new Error('Provisioning failed'));

      const newAgent: Agent = {
        id: 'new-agent-3',
        serverId,
        name: 'worker-789',
        displayName: 'Worker 3',
        description: null,
        role: 'WORKER',
        status: 'PENDING_VALIDATION',
        capabilities: [],
        supervisorId: mockMasterAgent.id,
        createdById: 'user-1',
        validatedById: null,
        validatedAt: null,
        token: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        unixUser: 'worker3',
        homeDir: '/home/worker3',
      };

      mockPrismaAgent.create.mockResolvedValue(newAgent);

      const result = await service.createSubAgent(
        {
          name: 'worker',
          displayName: 'Worker 3',
          role: 'WORKER',
          capabilities: [],
        },
        'user-1'
      );

      // Agent should still be created despite MCP failure
      expect(result.id).toBe('new-agent-3');
    });
  });

  describe('Validate Agent', () => {
    beforeEach(async () => {
      mockPrismaServerConfig.findUnique.mockResolvedValue(mockServerConfig);
      mockPrismaAgent.findUnique.mockResolvedValue(mockMasterAgent);

      service = new MasterAgentService(serverId);
      await service.initialize();
    });

    it('should validate and activate agent', async () => {
      const validatedAgent: Agent = {
        ...mockMasterAgent,
        id: 'agent-to-validate',
        status: 'ACTIVE',
        validatedById: 'user-1',
        validatedAt: new Date(),
      };

      mockPrismaAgent.update.mockResolvedValue(validatedAgent);

      const result = await service.validateAgent('agent-to-validate', 'user-1');

      expect(result.status).toBe('ACTIVE');
      expect(mockPrismaAgent.update).toHaveBeenCalledWith({
        where: { id: 'agent-to-validate' },
        data: expect.objectContaining({
          status: 'ACTIVE',
          validatedById: 'user-1',
        }),
      });
      expect(mockMonitoringService.broadcastAgentStatus).toHaveBeenCalled();
    });

    it('should activate agent on MCP server when connected', async () => {
      mockMCPClient.connectionState = 'connected';
      mockMCPClient.callTool.mockResolvedValue({ success: true });
      mockPrismaAgent.update.mockResolvedValue({
        ...mockMasterAgent,
        status: 'ACTIVE',
      });

      await service.validateAgent('agent-1', 'user-1');

      expect(mockMCPClient.callTool).toHaveBeenCalledWith('activate_agent', {
        agentId: 'agent-1',
      });
    });
  });

  describe('Get Agent Hierarchy', () => {
    beforeEach(async () => {
      mockPrismaServerConfig.findUnique.mockResolvedValue(mockServerConfig);
      mockPrismaAgent.findUnique.mockResolvedValue(mockMasterAgent);

      service = new MasterAgentService(serverId);
      await service.initialize();
    });

    it('should build agent hierarchy tree', async () => {
      const agents: Agent[] = [
        mockMasterAgent,
        {
          ...mockMasterAgent,
          id: 'supervisor-1',
          name: 'supervisor',
          role: 'SUPERVISOR',
          supervisorId: mockMasterAgent.id,
        },
        {
          ...mockMasterAgent,
          id: 'worker-1',
          name: 'worker',
          role: 'WORKER',
          supervisorId: 'supervisor-1',
        },
      ];

      mockPrismaAgent.findMany.mockResolvedValue(agents);

      const hierarchy = await service.getAgentHierarchy();

      // getAgentHierarchy returns children of the root agent (masterAgent)
      // So hierarchy[0] is supervisor-1 (direct child of master-agent-1)
      expect(hierarchy).toHaveLength(1);
      expect(hierarchy[0].id).toBe('supervisor-1');
      expect(hierarchy[0].children).toHaveLength(1);
      expect(hierarchy[0].children[0].id).toBe('worker-1');
    });

    it('should return empty array if no master agent', async () => {
      mockPrismaAgent.findUnique.mockResolvedValue(null);
      mockPrismaAgent.findFirst.mockResolvedValue(null);

      const uninitializedService = new MasterAgentService('no-master-server');
      await uninitializedService.initialize().catch(() => {});

      const hierarchy = await uninitializedService.getAgentHierarchy();

      expect(hierarchy).toEqual([]);
    });
  });

  describe('Service Factory', () => {
    it('should create and cache service instance', async () => {
      mockPrismaServerConfig.findUnique.mockResolvedValue(mockServerConfig);
      mockPrismaAgent.findUnique.mockResolvedValue(mockMasterAgent);

      const service1 = await getMasterAgentService(serverId);
      const service2 = await getMasterAgentService(serverId);

      expect(service1).toBe(service2);
    });

    it('should clear service instance', async () => {
      mockPrismaServerConfig.findUnique.mockResolvedValue(mockServerConfig);
      mockPrismaAgent.findUnique.mockResolvedValue(mockMasterAgent);

      const service1 = await getMasterAgentService(serverId);
      await clearMasterAgentService(serverId);
      const service2 = await getMasterAgentService(serverId);

      expect(service1).not.toBe(service2);
    });
  });
});
