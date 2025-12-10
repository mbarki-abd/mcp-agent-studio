import { wsManager } from '../websocket/manager.js';
import type {
  AgentStatusEvent,
  TodoProgressEvent,
  ExecutionStreamEvent,
  ServerStatusEvent,
} from '../websocket/types.js';
import type { AgentStatus } from '@prisma/client';

export class MonitoringService {
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

  // Get connection stats
  getStats() {
    return wsManager.getStats();
  }
}

export const monitoringService = new MonitoringService();
