import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';

// ============================================================================
// Types - Server Events
// ============================================================================

export interface MCPAgent {
  id: string;
  name: string;
  displayName: string;
  status: 'idle' | 'busy' | 'error' | 'stopped';
  serverId: string;
  capabilities: string[];
  currentTask?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MCPProject {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  serverId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MCPTask {
  id: string;
  agentId: string;
  projectId?: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface SystemStats {
  activeAgents: number;
  totalAgents: number;
  activeTasks: number;
  totalTasks: number;
  cpu?: number;
  memory?: number;
  uptime?: number;
}

// Server -> Client Events
export interface InitialStateEvent {
  event: 'initial_state';
  data: {
    agents: MCPAgent[];
    projects: MCPProject[];
    tasks: MCPTask[];
    stats: SystemStats;
  };
}

export interface AgentUpdateEvent {
  event: 'agent_update';
  data: MCPAgent;
}

export interface AgentCreatedEvent {
  event: 'agent_created';
  data: MCPAgent;
}

export interface AgentDeletedEvent {
  event: 'agent_deleted';
  data: {
    agentId: string;
  };
}

export interface ProjectCreatedEvent {
  event: 'project_created';
  data: MCPProject;
}

export interface ProjectUpdateEvent {
  event: 'project_update';
  data: MCPProject;
}

export interface ProjectDeletedEvent {
  event: 'project_deleted';
  data: {
    projectId: string;
  };
}

export interface TaskStartedEvent {
  event: 'task_started';
  data: MCPTask;
}

export interface TaskProgressEvent {
  event: 'task_progress';
  data: {
    taskId: string;
    progress: number;
    message?: string;
  };
}

export interface TaskCompletedEvent {
  event: 'task_completed';
  data: MCPTask;
}

export interface TaskErrorEvent {
  event: 'task_error';
  data: {
    taskId: string;
    error: string;
  };
}

export interface SystemStatsEvent {
  event: 'system_stats';
  data: SystemStats;
}

export interface HeartbeatEvent {
  event: 'heartbeat';
  data: {
    timestamp: number;
  };
}

export type MCPServerEvent =
  | InitialStateEvent
  | AgentUpdateEvent
  | AgentCreatedEvent
  | AgentDeletedEvent
  | ProjectCreatedEvent
  | ProjectUpdateEvent
  | ProjectDeletedEvent
  | TaskStartedEvent
  | TaskProgressEvent
  | TaskCompletedEvent
  | TaskErrorEvent
  | SystemStatsEvent
  | HeartbeatEvent;

// Client -> Server Messages
export interface PingMessage {
  action: 'ping';
}

export interface SubscribeMessage {
  action: 'subscribe';
  topic: MCPTopic;
}

export interface UnsubscribeMessage {
  action: 'unsubscribe';
  topic: MCPTopic;
}

export interface GetStateMessage {
  action: 'get_state';
}

export interface GetAgentDetailsMessage {
  action: 'get_agent_details';
  agentId: string;
}

export type MCPClientMessage =
  | PingMessage
  | SubscribeMessage
  | UnsubscribeMessage
  | GetStateMessage
  | GetAgentDetailsMessage;

// Topic types
export type MCPTopic =
  | 'agents'
  | 'tasks'
  | 'projects'
  | 'system'
  | `agent:${string}`
  | `project:${string}`;

// ============================================================================
// Event Callback Types
// ============================================================================

type EventCallback<T> = (event: T) => void;

// ============================================================================
// Connection State
// ============================================================================

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

export interface MCPServerState {
  agents: MCPAgent[];
  projects: MCPProject[];
  tasks: MCPTask[];
  stats: SystemStats;
  lastUpdate: number;
}

// ============================================================================
// Context Interface
// ============================================================================

interface MCPServerContextValue {
  // Connection
  serverUrl: string;
  connectionState: ConnectionState;
  isConnected: boolean;
  reconnectAttempt: number;
  maxReconnectAttempts: number;

  // State
  state: MCPServerState;

  // Actions
  connect: () => void;
  disconnect: () => void;
  subscribe: (topic: MCPTopic) => void;
  unsubscribe: (topic: MCPTopic) => void;
  getState: () => void;
  getAgentDetails: (agentId: string) => void;

  // Event listeners
  onAgentUpdate: (callback: EventCallback<AgentUpdateEvent['data']>) => () => void;
  onAgentCreated: (callback: EventCallback<AgentCreatedEvent['data']>) => () => void;
  onAgentDeleted: (callback: EventCallback<AgentDeletedEvent['data']>) => () => void;
  onProjectCreated: (callback: EventCallback<ProjectCreatedEvent['data']>) => () => void;
  onProjectUpdate: (callback: EventCallback<ProjectUpdateEvent['data']>) => () => void;
  onProjectDeleted: (callback: EventCallback<ProjectDeletedEvent['data']>) => () => void;
  onTaskStarted: (callback: EventCallback<TaskStartedEvent['data']>) => () => void;
  onTaskProgress: (callback: EventCallback<TaskProgressEvent['data']>) => () => void;
  onTaskCompleted: (callback: EventCallback<TaskCompletedEvent['data']>) => () => void;
  onTaskError: (callback: EventCallback<TaskErrorEvent['data']>) => () => void;
  onSystemStats: (callback: EventCallback<SystemStatsEvent['data']>) => () => void;
}

const MCPServerContext = createContext<MCPServerContextValue | null>(null);

// ============================================================================
// Provider Props
// ============================================================================

interface MCPServerProviderProps {
  children: ReactNode;
  serverUrl: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

// ============================================================================
// Provider Component
// ============================================================================

export function MCPServerProvider({
  children,
  serverUrl,
  autoConnect = true,
  reconnectAttempts = 5,
  reconnectDelay = 1000,
}: MCPServerProviderProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // State
  const [state, setState] = useState<MCPServerState>({
    agents: [],
    projects: [],
    tasks: [],
    stats: {
      activeAgents: 0,
      totalAgents: 0,
      activeTasks: 0,
      totalTasks: 0,
    },
    lastUpdate: Date.now(),
  });

  // Event listeners
  const agentUpdateListeners = useRef<Set<EventCallback<AgentUpdateEvent['data']>>>(new Set());
  const agentCreatedListeners = useRef<Set<EventCallback<AgentCreatedEvent['data']>>>(new Set());
  const agentDeletedListeners = useRef<Set<EventCallback<AgentDeletedEvent['data']>>>(new Set());
  const projectCreatedListeners = useRef<Set<EventCallback<ProjectCreatedEvent['data']>>>(new Set());
  const projectUpdateListeners = useRef<Set<EventCallback<ProjectUpdateEvent['data']>>>(new Set());
  const projectDeletedListeners = useRef<Set<EventCallback<ProjectDeletedEvent['data']>>>(new Set());
  const taskStartedListeners = useRef<Set<EventCallback<TaskStartedEvent['data']>>>(new Set());
  const taskProgressListeners = useRef<Set<EventCallback<TaskProgressEvent['data']>>>(new Set());
  const taskCompletedListeners = useRef<Set<EventCallback<TaskCompletedEvent['data']>>>(new Set());
  const taskErrorListeners = useRef<Set<EventCallback<TaskErrorEvent['data']>>>(new Set());
  const systemStatsListeners = useRef<Set<EventCallback<SystemStatsEvent['data']>>>(new Set());

  // Subscriptions
  const subscriptions = useRef<Set<MCPTopic>>(new Set());

  // ============================================================================
  // WebSocket Message Handling
  // ============================================================================

  const send = useCallback((message: MCPClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data) as MCPServerEvent;

      switch (message.event) {
        case 'initial_state':
          setState({
            agents: message.data.agents,
            projects: message.data.projects,
            tasks: message.data.tasks,
            stats: message.data.stats,
            lastUpdate: Date.now(),
          });
          break;

        case 'agent_update':
          setState(prev => ({
            ...prev,
            agents: prev.agents.map(a => a.id === message.data.id ? message.data : a),
            lastUpdate: Date.now(),
          }));
          agentUpdateListeners.current.forEach(cb => cb(message.data));
          break;

        case 'agent_created':
          setState(prev => ({
            ...prev,
            agents: [...prev.agents, message.data],
            lastUpdate: Date.now(),
          }));
          agentCreatedListeners.current.forEach(cb => cb(message.data));
          break;

        case 'agent_deleted':
          setState(prev => ({
            ...prev,
            agents: prev.agents.filter(a => a.id !== message.data.agentId),
            lastUpdate: Date.now(),
          }));
          agentDeletedListeners.current.forEach(cb => cb(message.data));
          break;

        case 'project_created':
          setState(prev => ({
            ...prev,
            projects: [...prev.projects, message.data],
            lastUpdate: Date.now(),
          }));
          projectCreatedListeners.current.forEach(cb => cb(message.data));
          break;

        case 'project_update':
          setState(prev => ({
            ...prev,
            projects: prev.projects.map(p => p.id === message.data.id ? message.data : p),
            lastUpdate: Date.now(),
          }));
          projectUpdateListeners.current.forEach(cb => cb(message.data));
          break;

        case 'project_deleted':
          setState(prev => ({
            ...prev,
            projects: prev.projects.filter(p => p.id !== message.data.projectId),
            lastUpdate: Date.now(),
          }));
          projectDeletedListeners.current.forEach(cb => cb(message.data));
          break;

        case 'task_started':
          setState(prev => ({
            ...prev,
            tasks: [...prev.tasks, message.data],
            lastUpdate: Date.now(),
          }));
          taskStartedListeners.current.forEach(cb => cb(message.data));
          break;

        case 'task_progress':
          setState(prev => ({
            ...prev,
            tasks: prev.tasks.map(t =>
              t.id === message.data.taskId
                ? { ...t, progress: message.data.progress }
                : t
            ),
            lastUpdate: Date.now(),
          }));
          taskProgressListeners.current.forEach(cb => cb(message.data));
          break;

        case 'task_completed':
          setState(prev => ({
            ...prev,
            tasks: prev.tasks.map(t => t.id === message.data.id ? message.data : t),
            lastUpdate: Date.now(),
          }));
          taskCompletedListeners.current.forEach(cb => cb(message.data));
          break;

        case 'task_error':
          setState(prev => ({
            ...prev,
            tasks: prev.tasks.map(t =>
              t.id === message.data.taskId
                ? { ...t, status: 'failed' as const, error: message.data.error }
                : t
            ),
            lastUpdate: Date.now(),
          }));
          taskErrorListeners.current.forEach(cb => cb(message.data));
          break;

        case 'system_stats':
          setState(prev => ({
            ...prev,
            stats: message.data,
            lastUpdate: Date.now(),
          }));
          systemStatsListeners.current.forEach(cb => cb(message.data));
          break;

        case 'heartbeat':
          // Heartbeat received, connection is alive
          break;

        default:
          console.warn('[MCPServer] Unknown event type:', message);
      }
    } catch (error) {
      console.error('[MCPServer] Failed to parse message:', error);
    }
  }, []);

  // ============================================================================
  // Connection Management
  // ============================================================================

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempt >= reconnectAttempts) {
      console.error('[MCPServer] Max reconnection attempts reached');
      setConnectionState('error');
      return;
    }

    const delay = reconnectDelay * Math.pow(2, reconnectAttempt); // Exponential backoff
    console.log(`[MCPServer] Reconnecting in ${delay}ms (attempt ${reconnectAttempt + 1}/${reconnectAttempts})`);

    setConnectionState('reconnecting');
    reconnectTimeoutRef.current = setTimeout(() => {
      setReconnectAttempt(prev => prev + 1);
      connect();
    }, delay);
  }, [reconnectAttempt, reconnectAttempts, reconnectDelay]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.warn('[MCPServer] Already connected');
      return;
    }

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      setConnectionState('connecting');

      // Convert HTTP(S) URL to WS(S) URL
      const wsUrl = serverUrl.replace(/^http/, 'ws') + '/ws/dashboard';
      console.log('[MCPServer] Connecting to:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[MCPServer] Connected');
        setConnectionState('connected');
        setReconnectAttempt(0);

        // Request initial state
        send({ action: 'get_state' });

        // Re-subscribe to previous topics
        subscriptions.current.forEach(topic => {
          send({ action: 'subscribe', topic });
        });

        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          send({ action: 'ping' });
        }, 30000); // Ping every 30 seconds
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        console.error('[MCPServer] WebSocket error:', error);
        setConnectionState('error');
      };

      ws.onclose = () => {
        console.log('[MCPServer] Disconnected');
        setConnectionState('disconnected');

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Auto-reconnect if it wasn't a manual disconnect
        if (connectionState !== 'error') {
          scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('[MCPServer] Failed to connect:', error);
      setConnectionState('error');
    }
  }, [serverUrl, send, handleMessage, scheduleReconnect, connectionState]);

  const disconnect = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clear ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionState('disconnected');
    setReconnectAttempt(0);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]); // Only run on mount/unmount

  // ============================================================================
  // Subscription Management
  // ============================================================================

  const subscribe = useCallback((topic: MCPTopic) => {
    if (subscriptions.current.has(topic)) return;

    subscriptions.current.add(topic);
    send({ action: 'subscribe', topic });
  }, [send]);

  const unsubscribe = useCallback((topic: MCPTopic) => {
    subscriptions.current.delete(topic);
    send({ action: 'unsubscribe', topic });
  }, [send]);

  const getState = useCallback(() => {
    send({ action: 'get_state' });
  }, [send]);

  const getAgentDetails = useCallback((agentId: string) => {
    send({ action: 'get_agent_details', agentId });
  }, [send]);

  // ============================================================================
  // Event Listener Registration
  // ============================================================================

  const onAgentUpdate = useCallback((callback: EventCallback<AgentUpdateEvent['data']>) => {
    agentUpdateListeners.current.add(callback);
    return () => {
      agentUpdateListeners.current.delete(callback);
    };
  }, []);

  const onAgentCreated = useCallback((callback: EventCallback<AgentCreatedEvent['data']>) => {
    agentCreatedListeners.current.add(callback);
    return () => {
      agentCreatedListeners.current.delete(callback);
    };
  }, []);

  const onAgentDeleted = useCallback((callback: EventCallback<AgentDeletedEvent['data']>) => {
    agentDeletedListeners.current.add(callback);
    return () => {
      agentDeletedListeners.current.delete(callback);
    };
  }, []);

  const onProjectCreated = useCallback((callback: EventCallback<ProjectCreatedEvent['data']>) => {
    projectCreatedListeners.current.add(callback);
    return () => {
      projectCreatedListeners.current.delete(callback);
    };
  }, []);

  const onProjectUpdate = useCallback((callback: EventCallback<ProjectUpdateEvent['data']>) => {
    projectUpdateListeners.current.add(callback);
    return () => {
      projectUpdateListeners.current.delete(callback);
    };
  }, []);

  const onProjectDeleted = useCallback((callback: EventCallback<ProjectDeletedEvent['data']>) => {
    projectDeletedListeners.current.add(callback);
    return () => {
      projectDeletedListeners.current.delete(callback);
    };
  }, []);

  const onTaskStarted = useCallback((callback: EventCallback<TaskStartedEvent['data']>) => {
    taskStartedListeners.current.add(callback);
    return () => {
      taskStartedListeners.current.delete(callback);
    };
  }, []);

  const onTaskProgress = useCallback((callback: EventCallback<TaskProgressEvent['data']>) => {
    taskProgressListeners.current.add(callback);
    return () => {
      taskProgressListeners.current.delete(callback);
    };
  }, []);

  const onTaskCompleted = useCallback((callback: EventCallback<TaskCompletedEvent['data']>) => {
    taskCompletedListeners.current.add(callback);
    return () => {
      taskCompletedListeners.current.delete(callback);
    };
  }, []);

  const onTaskError = useCallback((callback: EventCallback<TaskErrorEvent['data']>) => {
    taskErrorListeners.current.add(callback);
    return () => {
      taskErrorListeners.current.delete(callback);
    };
  }, []);

  const onSystemStats = useCallback((callback: EventCallback<SystemStatsEvent['data']>) => {
    systemStatsListeners.current.add(callback);
    return () => {
      systemStatsListeners.current.delete(callback);
    };
  }, []);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value: MCPServerContextValue = {
    serverUrl,
    connectionState,
    isConnected: connectionState === 'connected',
    reconnectAttempt,
    maxReconnectAttempts: reconnectAttempts,
    state,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    getState,
    getAgentDetails,
    onAgentUpdate,
    onAgentCreated,
    onAgentDeleted,
    onProjectCreated,
    onProjectUpdate,
    onProjectDeleted,
    onTaskStarted,
    onTaskProgress,
    onTaskCompleted,
    onTaskError,
    onSystemStats,
  };

  return (
    <MCPServerContext.Provider value={value}>
      {children}
    </MCPServerContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Access the MCP Server WebSocket context
 */
export function useMCPServer() {
  const context = useContext(MCPServerContext);
  if (!context) {
    throw new Error('useMCPServer must be used within MCPServerProvider');
  }
  return context;
}

/**
 * Access the current server state (agents, projects, tasks, stats)
 */
export function useMCPServerState() {
  const { state } = useMCPServer();
  return state;
}

/**
 * Subscribe to a topic on mount and unsubscribe on unmount
 *
 * @example
 * ```tsx
 * useMCPServerSubscription('agents');
 * useMCPServerSubscription('agent:agent_123');
 * ```
 */
export function useMCPServerSubscription(topic: MCPTopic | undefined) {
  const { subscribe, unsubscribe } = useMCPServer();

  useEffect(() => {
    if (!topic) return;
    subscribe(topic);
    return () => unsubscribe(topic);
  }, [topic, subscribe, unsubscribe]);
}

/**
 * Subscribe to multiple topics
 *
 * @example
 * ```tsx
 * useMCPServerSubscriptions(['agents', 'tasks', 'system']);
 * ```
 */
export function useMCPServerSubscriptions(topics: MCPTopic[]) {
  const { subscribe, unsubscribe } = useMCPServer();

  useEffect(() => {
    if (!topics || topics.length === 0) return;

    topics.forEach(topic => subscribe(topic));
    return () => {
      topics.forEach(topic => unsubscribe(topic));
    };
  }, [topics.join(','), subscribe, unsubscribe]);
}

/**
 * Listen for agent update events
 *
 * IMPORTANT: Wrap callback with useCallback to prevent memory leaks
 *
 * @example
 * ```tsx
 * const handleUpdate = useCallback((agent) => {
 *   console.log('Agent updated:', agent);
 * }, []);
 *
 * useMCPAgentUpdate(handleUpdate);
 * ```
 */
export function useMCPAgentUpdate(callback: EventCallback<AgentUpdateEvent['data']>) {
  const { onAgentUpdate } = useMCPServer();

  useEffect(() => {
    return onAgentUpdate(callback);
  }, [callback, onAgentUpdate]);
}

/**
 * Listen for agent created events
 *
 * IMPORTANT: Wrap callback with useCallback to prevent memory leaks
 */
export function useMCPAgentCreated(callback: EventCallback<AgentCreatedEvent['data']>) {
  const { onAgentCreated } = useMCPServer();

  useEffect(() => {
    return onAgentCreated(callback);
  }, [callback, onAgentCreated]);
}

/**
 * Listen for agent deleted events
 *
 * IMPORTANT: Wrap callback with useCallback to prevent memory leaks
 */
export function useMCPAgentDeleted(callback: EventCallback<AgentDeletedEvent['data']>) {
  const { onAgentDeleted } = useMCPServer();

  useEffect(() => {
    return onAgentDeleted(callback);
  }, [callback, onAgentDeleted]);
}

/**
 * Listen for project created events
 *
 * IMPORTANT: Wrap callback with useCallback to prevent memory leaks
 */
export function useMCPProjectCreated(callback: EventCallback<ProjectCreatedEvent['data']>) {
  const { onProjectCreated } = useMCPServer();

  useEffect(() => {
    return onProjectCreated(callback);
  }, [callback, onProjectCreated]);
}

/**
 * Listen for project update events
 *
 * IMPORTANT: Wrap callback with useCallback to prevent memory leaks
 */
export function useMCPProjectUpdate(callback: EventCallback<ProjectUpdateEvent['data']>) {
  const { onProjectUpdate } = useMCPServer();

  useEffect(() => {
    return onProjectUpdate(callback);
  }, [callback, onProjectUpdate]);
}

/**
 * Listen for project deleted events
 *
 * IMPORTANT: Wrap callback with useCallback to prevent memory leaks
 */
export function useMCPProjectDeleted(callback: EventCallback<ProjectDeletedEvent['data']>) {
  const { onProjectDeleted } = useMCPServer();

  useEffect(() => {
    return onProjectDeleted(callback);
  }, [callback, onProjectDeleted]);
}

/**
 * Listen for task started events
 *
 * IMPORTANT: Wrap callback with useCallback to prevent memory leaks
 */
export function useMCPTaskStarted(callback: EventCallback<TaskStartedEvent['data']>) {
  const { onTaskStarted } = useMCPServer();

  useEffect(() => {
    return onTaskStarted(callback);
  }, [callback, onTaskStarted]);
}

/**
 * Listen for task progress events
 *
 * IMPORTANT: Wrap callback with useCallback to prevent memory leaks
 */
export function useMCPTaskProgress(callback: EventCallback<TaskProgressEvent['data']>) {
  const { onTaskProgress } = useMCPServer();

  useEffect(() => {
    return onTaskProgress(callback);
  }, [callback, onTaskProgress]);
}

/**
 * Listen for task completed events
 *
 * IMPORTANT: Wrap callback with useCallback to prevent memory leaks
 */
export function useMCPTaskCompleted(callback: EventCallback<TaskCompletedEvent['data']>) {
  const { onTaskCompleted } = useMCPServer();

  useEffect(() => {
    return onTaskCompleted(callback);
  }, [callback, onTaskCompleted]);
}

/**
 * Listen for task error events
 *
 * IMPORTANT: Wrap callback with useCallback to prevent memory leaks
 */
export function useMCPTaskError(callback: EventCallback<TaskErrorEvent['data']>) {
  const { onTaskError } = useMCPServer();

  useEffect(() => {
    return onTaskError(callback);
  }, [callback, onTaskError]);
}

/**
 * Listen for system stats events
 *
 * IMPORTANT: Wrap callback with useCallback to prevent memory leaks
 */
export function useMCPSystemStats(callback: EventCallback<SystemStatsEvent['data']>) {
  const { onSystemStats } = useMCPServer();

  useEffect(() => {
    return onSystemStats(callback);
  }, [callback, onSystemStats]);
}
