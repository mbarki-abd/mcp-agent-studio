import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { AgentStatusEvent, TodoProgressEvent, ExecutionStreamEvent } from '@mcp/types';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

type EventCallback<T> = (event: T) => void;

interface WebSocketContextValue {
  isConnected: boolean;
  subscribe: (type: 'agent' | 'server', id: string) => void;
  unsubscribe: (type: 'agent' | 'server', id: string) => void;
  onAgentStatus: (callback: EventCallback<AgentStatusEvent>) => () => void;
  onTodoProgress: (callback: EventCallback<TodoProgressEvent>) => () => void;
  onExecution: (callback: EventCallback<ExecutionStreamEvent>) => () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Event listeners storage
  const agentStatusListeners = useRef<Set<EventCallback<AgentStatusEvent>>>(new Set());
  const todoProgressListeners = useRef<Set<EventCallback<TodoProgressEvent>>>(new Set());
  const executionListeners = useRef<Set<EventCallback<ExecutionStreamEvent>>>(new Set());

  // Current subscriptions
  const subscriptions = useRef<Set<string>>(new Set());

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Re-subscribe to all previous subscriptions
      subscriptions.current.forEach(sub => {
        const [type, id] = sub.split(':');
        socket.emit(`subscribe:${type}`, { id });
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Handle events
    socket.on('agent:status', (event: AgentStatusEvent) => {
      agentStatusListeners.current.forEach(cb => cb(event));
    });

    socket.on('agent:todo', (event: TodoProgressEvent) => {
      todoProgressListeners.current.forEach(cb => cb(event));
    });

    socket.on('agent:execution', (event: ExecutionStreamEvent) => {
      executionListeners.current.forEach(cb => cb(event));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const subscribe = useCallback((type: 'agent' | 'server', id: string) => {
    const key = `${type}:${id}`;
    if (subscriptions.current.has(key)) return;

    subscriptions.current.add(key);
    if (socketRef.current?.connected) {
      socketRef.current.emit(`subscribe:${type}`, { id });
    }
  }, []);

  const unsubscribe = useCallback((type: 'agent' | 'server', id: string) => {
    const key = `${type}:${id}`;
    subscriptions.current.delete(key);
    if (socketRef.current?.connected) {
      socketRef.current.emit(`unsubscribe:${type}`, { id });
    }
  }, []);

  const onAgentStatus = useCallback((callback: EventCallback<AgentStatusEvent>) => {
    agentStatusListeners.current.add(callback);
    return () => {
      agentStatusListeners.current.delete(callback);
    };
  }, []);

  const onTodoProgress = useCallback((callback: EventCallback<TodoProgressEvent>) => {
    todoProgressListeners.current.add(callback);
    return () => {
      todoProgressListeners.current.delete(callback);
    };
  }, []);

  const onExecution = useCallback((callback: EventCallback<ExecutionStreamEvent>) => {
    executionListeners.current.add(callback);
    return () => {
      executionListeners.current.delete(callback);
    };
  }, []);

  const value: WebSocketContextValue = {
    isConnected,
    subscribe,
    unsubscribe,
    onAgentStatus,
    onTodoProgress,
    onExecution,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

// Hook to subscribe to agent events
export function useAgentSubscription(agentId: string | undefined) {
  const { subscribe, unsubscribe } = useWebSocket();

  useEffect(() => {
    if (!agentId) return;
    subscribe('agent', agentId);
    return () => unsubscribe('agent', agentId);
  }, [agentId, subscribe, unsubscribe]);
}

// Hook to listen for agent status changes
export function useAgentStatus(callback: EventCallback<AgentStatusEvent>) {
  const { onAgentStatus } = useWebSocket();

  useEffect(() => {
    return onAgentStatus(callback);
  }, [callback, onAgentStatus]);
}

// Hook to listen for todo progress
export function useTodoProgress(callback: EventCallback<TodoProgressEvent>) {
  const { onTodoProgress } = useWebSocket();

  useEffect(() => {
    return onTodoProgress(callback);
  }, [callback, onTodoProgress]);
}

// Hook to listen for execution events
export function useExecutionStream(callback: EventCallback<ExecutionStreamEvent>) {
  const { onExecution } = useWebSocket();

  useEffect(() => {
    return onExecution(callback);
  }, [callback, onExecution]);
}
