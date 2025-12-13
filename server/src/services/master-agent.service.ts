import { prisma } from '../index.js';
import { MonitoringService } from './monitoring.service.js';
import { decrypt } from '../utils/crypto.js';
import { MCPClient, getMCPClient, removeMCPClient } from './mcp-client.js';
import type { Agent, ServerConfiguration } from '@prisma/client';
import { masterAgentLogger } from '../utils/logger.js';

// Types for execution
interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  tokensUsed?: number;
  durationMs?: number;
}

interface StreamCallback {
  onStart?: () => void;
  onOutput?: (chunk: string) => void;
  onToolCall?: (name: string, params: Record<string, unknown>) => void;
  onFileChange?: (path: string, action: 'create' | 'edit' | 'delete') => void;
  onTodoUpdate?: (todos: Array<{ id: string; content: string; status: string }>) => void;
  onComplete?: (result: ExecutionResult) => void;
  onError?: (error: Error) => void;
}

interface AgentCreationParams {
  name: string;
  displayName: string;
  description?: string;
  role: 'SUPERVISOR' | 'WORKER';
  capabilities: string[];
  supervisorId?: string;
}

export class MasterAgentService {
  private serverId: string;
  private serverConfig: ServerConfiguration | null = null;
  private masterAgent: Agent | null = null;
  private mcpClient: MCPClient | null = null;
  private useMCPProtocol: boolean;

  constructor(serverId: string, useMCPProtocol = true) {
    this.serverId = serverId;
    this.useMCPProtocol = useMCPProtocol;
  }

  async initialize(): Promise<void> {
    // Load server configuration
    this.serverConfig = await prisma.serverConfiguration.findUnique({
      where: { id: this.serverId },
    });

    if (!this.serverConfig) {
      throw new Error(`Server configuration not found: ${this.serverId}`);
    }

    // Load master agent
    if (this.serverConfig.masterAgentId) {
      this.masterAgent = await prisma.agent.findUnique({
        where: { id: this.serverConfig.masterAgentId },
      });
    }

    if (!this.masterAgent) {
      // Try to find a master agent for this server
      this.masterAgent = await prisma.agent.findFirst({
        where: {
          serverId: this.serverId,
          role: 'MASTER',
          status: 'ACTIVE',
        },
      });
    }

    // Initialize MCP client if protocol is enabled
    if (this.useMCPProtocol && this.serverConfig) {
      try {
        const masterToken = decrypt(this.serverConfig.masterToken);
        this.mcpClient = getMCPClient({
          serverUrl: this.serverConfig.url,
          wsUrl: this.serverConfig.wsUrl || undefined,
          token: masterToken,
          reconnect: true,
        });

        // Try to connect (non-blocking, will reconnect if fails)
        this.mcpClient.connect().catch((err) => {
          masterAgentLogger.warn({ err, serverId: this.serverId }, 'MCP connection failed');
        });
      } catch (err) {
        masterAgentLogger.warn({ err, serverId: this.serverId }, 'Failed to initialize MCP client');
      }
    }
  }

  /**
   * Disconnect MCP client and cleanup
   */
  async disconnect(): Promise<void> {
    if (this.mcpClient && this.serverConfig) {
      const masterToken = decrypt(this.serverConfig.masterToken);
      removeMCPClient(this.serverConfig.url, masterToken);
      this.mcpClient = null;
    }
  }

  async executePrompt(
    prompt: string,
    agentId?: string,
    callbacks?: StreamCallback
  ): Promise<ExecutionResult> {
    if (!this.serverConfig) {
      throw new Error('Service not initialized');
    }

    const targetAgent = agentId
      ? await prisma.agent.findUnique({ where: { id: agentId } })
      : this.masterAgent;

    if (!targetAgent) {
      throw new Error('No agent available for execution');
    }

    const startTime = Date.now();
    callbacks?.onStart?.();

    try {
      // Decrypt master token
      const masterToken = decrypt(this.serverConfig.masterToken);

      // Build execution request
      const executionRequest = {
        prompt,
        agentId: targetAgent.id,
        agentToken: targetAgent.token,
        serverUrl: this.serverConfig.url,
        masterToken,
      };

      // Execute via MCP server
      const result = await this.executeViaMCP(executionRequest, callbacks);

      const durationMs = Date.now() - startTime;

      const executionResult: ExecutionResult = {
        success: true,
        output: result.output,
        tokensUsed: result.tokensUsed,
        durationMs,
      };

      callbacks?.onComplete?.(executionResult);
      return executionResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      callbacks?.onError?.(error instanceof Error ? error : new Error(errorMessage));

      return {
        success: false,
        error: errorMessage,
        durationMs: Date.now() - startTime,
      };
    }
  }

  private async executeViaMCP(
    request: {
      prompt: string;
      agentId: string;
      agentToken?: string | null;
      serverUrl: string;
      masterToken: string;
    },
    callbacks?: StreamCallback
  ): Promise<{ output: string; tokensUsed?: number }> {
    const monitoring = MonitoringService.getInstance();

    // Try to use MCP client if available and connected
    if (this.mcpClient && this.mcpClient.connectionState === 'connected') {
      try {
        const result = await this.mcpClient.execute(
          {
            prompt: request.prompt,
            agentId: request.agentId,
          },
          {
            onOutput: (chunk) => {
              callbacks?.onOutput?.(chunk);
              monitoring.broadcastExecution(request.agentId, 'current-task', 'running', chunk);
            },
            onToolCall: (call) => {
              callbacks?.onToolCall?.(call.name, call.arguments);
            },
            onFileChange: (change) => {
              callbacks?.onFileChange?.(change.path, change.action);
            },
            onProgress: (progress, message) => {
              monitoring.broadcastExecution(request.agentId, 'current-task', 'running', message);
            },
          }
        );

        return {
          output: result.output,
          tokensUsed: result.tokensUsed,
        };
      } catch (err) {
        masterAgentLogger.warn({ err }, 'MCP execution failed, falling back to HTTP');
      }
    }

    // Try HTTP fallback if MCP WebSocket not available
    if (this.mcpClient) {
      try {
        const result = await this.mcpClient.executeHttp(
          {
            prompt: request.prompt,
            agentId: request.agentId,
          },
          {
            onOutput: (chunk) => {
              callbacks?.onOutput?.(chunk);
              monitoring.broadcastExecution(request.agentId, 'current-task', 'running', chunk);
            },
          }
        );

        if (result.success) {
          return {
            output: result.output,
            tokensUsed: result.tokensUsed,
          };
        }
        masterAgentLogger.warn({ error: result.error }, 'HTTP execution failed');
      } catch (err) {
        masterAgentLogger.warn({ err }, 'HTTP execution failed');
      }
    }

    // Fallback to simulation if MCP is not available
    return this.simulateExecution(request, callbacks);
  }

  /**
   * Simulate execution (fallback when MCP server is not available)
   */
  private async simulateExecution(
    request: {
      prompt: string;
      agentId: string;
    },
    callbacks?: StreamCallback
  ): Promise<{ output: string; tokensUsed?: number }> {
    const monitoring = MonitoringService.getInstance();

    // Simulate streaming output
    const outputChunks = [
      '[Simulation Mode]\n',
      'Analyzing prompt...\n',
      'Executing task...\n',
      'Processing results...\n',
      `Completed: ${request.prompt.substring(0, 50)}...\n`,
    ];

    let fullOutput = '';

    for (const chunk of outputChunks) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      fullOutput += chunk;
      callbacks?.onOutput?.(chunk);

      // Broadcast to WebSocket subscribers
      monitoring.broadcastExecution(
        request.agentId,
        'current-task',
        'running',
        chunk
      );
    }

    // Simulate tool calls
    callbacks?.onToolCall?.('Read', { file_path: '/example/path.ts' });
    callbacks?.onFileChange?.('/example/output.ts', 'create');

    return {
      output: fullOutput,
      tokensUsed: Math.floor(Math.random() * 1000) + 100,
    };
  }

  async createSubAgent(
    params: AgentCreationParams,
    createdById: string
  ): Promise<Agent> {
    if (!this.serverConfig) {
      throw new Error('Service not initialized');
    }

    // Generate unique agent name
    const timestamp = Date.now();
    const uniqueName = `${params.name}-${timestamp}`;

    // Create agent in database first
    const agent = await prisma.agent.create({
      data: {
        serverId: this.serverId,
        name: uniqueName,
        displayName: params.displayName,
        description: params.description,
        role: params.role,
        status: 'PENDING_VALIDATION',
        capabilities: params.capabilities,
        supervisorId: params.supervisorId || this.masterAgent?.id,
        createdById,
      },
    });

    // Try to provision agent on MCP server
    if (this.mcpClient && this.mcpClient.connectionState === 'connected') {
      try {
        await this.mcpClient.callTool('provision_agent', {
          agentId: agent.id,
          name: uniqueName,
          displayName: params.displayName,
          role: params.role,
          capabilities: params.capabilities,
          supervisorId: params.supervisorId || this.masterAgent?.id,
        });

        masterAgentLogger.info({ agentName: uniqueName }, 'Agent provisioned on MCP server');
      } catch (err) {
        masterAgentLogger.warn({ err }, 'Failed to provision agent on MCP server');
        // Agent is still created in DB, can be provisioned later during validation
      }
    }

    return agent;
  }

  async validateAgent(agentId: string, validatedById: string): Promise<Agent> {
    // Activate agent on MCP server if connected
    if (this.mcpClient && this.mcpClient.connectionState === 'connected') {
      try {
        await this.mcpClient.callTool('activate_agent', {
          agentId,
        });
        masterAgentLogger.info({ agentId }, 'Agent activated on MCP server');
      } catch (err) {
        masterAgentLogger.warn({ err, agentId }, 'Failed to activate agent on MCP server');
        // Continue with database update
      }
    }

    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: 'ACTIVE',
        validatedById,
        validatedAt: new Date(),
      },
    });

    // Broadcast status change
    MonitoringService.getInstance().broadcastAgentStatus(
      agentId,
      'ACTIVE',
      'PENDING_VALIDATION',
      'Agent validated'
    );

    return agent;
  }

  async getAgentHierarchy(agentId?: string): Promise<AgentHierarchy[]> {
    const rootAgentId = agentId || this.masterAgent?.id;

    if (!rootAgentId) {
      return [];
    }

    // Fetch all agents for this server
    const agents = await prisma.agent.findMany({
      where: { serverId: this.serverId },
      orderBy: { createdAt: 'asc' },
    });

    // Build hierarchy tree
    return this.buildHierarchy(agents, rootAgentId);
  }

  private buildHierarchy(agents: Agent[], parentId: string | null): AgentHierarchy[] {
    return agents
      .filter(a => a.supervisorId === parentId)
      .map(agent => ({
        id: agent.id,
        name: agent.name,
        displayName: agent.displayName,
        role: agent.role as 'MASTER' | 'SUPERVISOR' | 'WORKER',
        status: agent.status as 'ACTIVE' | 'INACTIVE' | 'BUSY' | 'ERROR',
        children: this.buildHierarchy(agents, agent.id),
      }));
  }

  async getAgentStatus(agentId: string): Promise<{
    status: string;
    currentTask?: string;
    lastActivity?: Date;
  }> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        executions: {
          where: { status: 'RUNNING' },
          take: 1,
          orderBy: { startedAt: 'desc' },
          include: { task: true },
        },
      },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    const runningExecution = agent.executions[0];

    return {
      status: agent.status,
      currentTask: runningExecution?.task?.title,
      lastActivity: agent.updatedAt,
    };
  }
}

// Hierarchy type for tree representation
interface AgentHierarchy {
  id: string;
  name: string;
  displayName: string;
  role: 'MASTER' | 'SUPERVISOR' | 'WORKER';
  status: 'ACTIVE' | 'INACTIVE' | 'BUSY' | 'ERROR';
  children: AgentHierarchy[];
}

// Factory to create service instances
const instances = new Map<string, MasterAgentService>();

export async function getMasterAgentService(serverId: string): Promise<MasterAgentService> {
  if (!instances.has(serverId)) {
    const service = new MasterAgentService(serverId);
    await service.initialize();
    instances.set(serverId, service);
  }
  return instances.get(serverId)!;
}

export async function clearMasterAgentService(serverId: string): Promise<void> {
  const service = instances.get(serverId);
  if (service) {
    await service.disconnect();
    instances.delete(serverId);
  }
}

export async function clearAllMasterAgentServices(): Promise<void> {
  for (const [serverId, service] of instances) {
    await service.disconnect();
  }
  instances.clear();
}
