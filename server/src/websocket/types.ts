import type { AgentStatus } from '@prisma/client';

export interface WebSocketClient {
  userId: string;
  subscribedAgents: Set<string>;
  subscribedServers: Set<string>;
}

export interface AgentStatusEvent {
  type: 'agent:status';
  agentId: string;
  timestamp: Date;
  data: {
    status: AgentStatus;
    previousStatus?: AgentStatus;
    reason?: string;
  };
}

export interface TodoProgressEvent {
  type: 'agent:todo';
  agentId: string;
  timestamp: Date;
  data: {
    todos: Array<{
      id: string;
      content: string;
      status: 'pending' | 'in_progress' | 'completed';
      activeForm: string;
    }>;
    completed: number;
    total: number;
    currentTask?: string;
  };
}

export interface ExecutionStreamEvent {
  type: 'agent:execution';
  agentId: string;
  taskId: string;
  executionId: string;
  timestamp: Date;
  data: {
    phase: 'starting' | 'running' | 'completed' | 'failed' | 'queued' | 'cancelled';
    output?: string;
    toolCall?: {
      name: string;
      params: Record<string, unknown>;
    };
    fileChanged?: {
      path: string;
      action: 'create' | 'edit' | 'delete';
      lines?: { added: number; removed: number };
    };
    progress?: number;
  };
}

export interface ServerStatusEvent {
  type: 'server:status';
  serverId: string;
  timestamp: Date;
  data: {
    status: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'UNKNOWN' | 'MAINTENANCE';
    previousStatus?: string;
  };
}

export interface ServerToolEvent {
  type: 'server:tool';
  serverId: string;
  timestamp: Date;
  data: {
    toolName: string;
    status: 'INSTALLED' | 'UNINSTALLED' | 'INSTALLING' | 'FAILED';
  };
}

export interface TaskProgressEvent {
  type: 'task:progress';
  taskId: string;
  executionId: string;
  timestamp: Date;
  data: {
    progress: number;
    message?: string;
  };
}

export interface TerminalOutputEvent {
  type: 'terminal:output';
  executionId: string;
  timestamp: Date;
  data: {
    output: string;
    isError: boolean;
  };
}

export type RealtimeEvent =
  | AgentStatusEvent
  | TodoProgressEvent
  | ExecutionStreamEvent
  | ServerStatusEvent
  | ServerToolEvent
  | TaskProgressEvent
  | TerminalOutputEvent;

export interface ClientMessage {
  action: 'subscribe' | 'unsubscribe';
  type: 'agent' | 'server';
  id: string;
}
