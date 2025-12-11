import { wsManager } from '../websocket/manager.js';
import type {
  AgentStatusEvent,
  TodoProgressEvent,
  ExecutionStreamEvent,
  ServerStatusEvent,
  ServerToolEvent,
  TaskProgressEvent,
  TerminalOutputEvent,
} from '../websocket/types.js';
import type { AgentStatus } from '@prisma/client';

export class MonitoringService {
  private static instance: MonitoringService;

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  // Helper method for broadcasting agent status (used by scheduler/master-agent)
  broadcastAgentStatus(
    agentId: string,
    status: AgentStatus,
    previousStatus?: AgentStatus,
    reason?: string
  ) {
    this.notifyAgentStatusChange(agentId, status, previousStatus, reason);
  }

  // Helper method for broadcasting execution events (used by scheduler/master-agent)
  broadcastExecution(
    agentId: string,
    taskId: string,
    phase: 'starting' | 'running' | 'completed' | 'failed',
    output?: string
  ) {
    this.notifyExecutionEvent(agentId, taskId, '', phase, { output });
  }

  // Agent status change
  notifyAgentStatusChange(
    agentId: string,
    status: AgentStatus,
    previousStatus?: AgentStatus,
    reason?: string
  ) {
    const event: AgentStatusEvent = {
      type: 'agent:status',
      agentId,
      timestamp: new Date(),
      data: {
        status,
        previousStatus,
        reason,
      },
    };

    wsManager.broadcastToAgent(agentId, event);
  }

  // Todo progress update
  notifyTodoProgress(
    agentId: string,
    todos: Array<{
      id: string;
      content: string;
      status: 'pending' | 'in_progress' | 'completed';
      activeForm: string;
    }>,
    currentTask?: string
  ) {
    const completed = todos.filter((t) => t.status === 'completed').length;
    const total = todos.length;

    const event: TodoProgressEvent = {
      type: 'agent:todo',
      agentId,
      timestamp: new Date(),
      data: {
        todos,
        completed,
        total,
        currentTask,
      },
    };

    wsManager.broadcastToAgent(agentId, event);
  }

  // Execution stream event
  notifyExecutionEvent(
    agentId: string,
    taskId: string,
    executionId: string,
    phase: 'starting' | 'running' | 'completed' | 'failed',
    data?: {
      output?: string;
      toolCall?: { name: string; params: Record<string, unknown> };
      fileChanged?: { path: string; action: 'create' | 'edit' | 'delete'; lines?: { added: number; removed: number } };
      progress?: number;
    }
  ) {
    const event: ExecutionStreamEvent = {
      type: 'agent:execution',
      agentId,
      taskId,
      executionId,
      timestamp: new Date(),
      data: {
        phase,
        ...data,
      },
    };

    wsManager.broadcastToAgent(agentId, event);
  }

  // Server status change
  notifyServerStatusChange(
    serverId: string,
    status: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'UNKNOWN' | 'MAINTENANCE',
    previousStatus?: string
  ) {
    const event: ServerStatusEvent = {
      type: 'server:status',
      serverId,
      timestamp: new Date(),
      data: {
        status,
        previousStatus,
      },
    };

    wsManager.broadcastToServer(serverId, event);
  }

  // Tool status change
  broadcastToolStatus(
    serverId: string,
    toolName: string,
    status: 'INSTALLED' | 'UNINSTALLED' | 'INSTALLING' | 'FAILED'
  ) {
    const event: ServerToolEvent = {
      type: 'server:tool',
      serverId,
      timestamp: new Date(),
      data: {
        toolName,
        status,
      },
    };

    wsManager.broadcast(event);
  }

  // Task execution progress
  broadcastTaskProgress(
    taskId: string,
    executionId: string,
    progress: number,
    message?: string
  ) {
    const event: TaskProgressEvent = {
      type: 'task:progress',
      taskId,
      executionId,
      timestamp: new Date(),
      data: {
        progress,
        message,
      },
    };

    wsManager.broadcast(event);
  }

  // Terminal output stream
  broadcastTerminalOutput(
    executionId: string,
    output: string,
    isError = false
  ) {
    const event: TerminalOutputEvent = {
      type: 'terminal:output',
      executionId,
      timestamp: new Date(),
      data: {
        output,
        isError,
      },
    };

    wsManager.broadcast(event);
  }

  // Get connection stats
  getStats() {
    return wsManager.getStats();
  }
}

export const monitoringService = new MonitoringService();
