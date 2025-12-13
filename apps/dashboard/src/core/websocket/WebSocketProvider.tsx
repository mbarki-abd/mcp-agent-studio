import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { AgentStatusEvent, TodoProgressEvent, ExecutionStreamEvent } from '@mcp/types';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

type EventCallback<T> = (event: T) => void;

// Chat streaming events
export interface ChatStreamStartEvent {
  sessionId: string;
  messageId: string;
  userMessageId: string;
}

export interface ChatStreamChunkEvent {
  sessionId: string;
  messageId: string;
  chunk: string;
  accumulated: string;
}

export interface ChatStreamEndEvent {
  sessionId: string;
  messageId: string;
  content: string;
  toolCalls?: Array<{
    name: string;
    params: Record<string, unknown>;
    result?: string;
  }>;
}

interface WebSocketContextValue {
  isConnected: boolean;
  subscribe: (type: 'agent' | 'server', id: string) => void;
  unsubscribe: (type: 'agent' | 'server', id: string) => void;
  subscribeToChat: (sessionId: string) => void;
  unsubscribeFromChat: (sessionId: string) => void;
  onAgentStatus: (callback: EventCallback<AgentStatusEvent>) => () => void;
  onTodoProgress: (callback: EventCallback<TodoProgressEvent>) => () => void;
  onExecution: (callback: EventCallback<ExecutionStreamEvent>) => () => void;
  onChatStreamStart: (callback: EventCallback<ChatStreamStartEvent>) => () => void;
  onChatStreamChunk: (callback: EventCallback<ChatStreamChunkEvent>) => () => void;
  onChatStreamEnd: (callback: EventCallback<ChatStreamEndEvent>) => () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  isAuthenticated?: boolean;
}

export function WebSocketProvider({ children, isAuthenticated = false }: WebSocketProviderProps) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Event listeners storage
  const agentStatusListeners = useRef<Set<EventCallback<AgentStatusEvent>>>(new Set());
  const todoProgressListeners = useRef<Set<EventCallback<TodoProgressEvent>>>(new Set());
  const executionListeners = useRef<Set<EventCallback<ExecutionStreamEvent>>>(new Set());
  const chatStreamStartListeners = useRef<Set<EventCallback<ChatStreamStartEvent>>>(new Set());
  const chatStreamChunkListeners = useRef<Set<EventCallback<ChatStreamChunkEvent>>>(new Set());
  const chatStreamEndListeners = useRef<Set<EventCallback<ChatStreamEndEvent>>>(new Set());

  // Current subscriptions
  const subscriptions = useRef<Set<string>>(new Set());
  const chatSubscriptions = useRef<Set<string>>(new Set());

  // Memoized event handlers to prevent re-registration on each render
  const handleConnect = useCallback(() => {
    setIsConnected(true);
    // Re-subscribe to all previous subscriptions
    subscriptions.current.forEach(sub => {
      const [type, id] = sub.split(':');
      socketRef.current?.emit(`subscribe:${type}`, { id });
    });
  }, []);

  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
  }, []);

  const handleAgentStatus = useCallback((event: AgentStatusEvent) => {
    agentStatusListeners.current.forEach(cb => cb(event));
  }, []);

  const handleTodoProgress = useCallback((event: TodoProgressEvent) => {
    todoProgressListeners.current.forEach(cb => cb(event));
  }, []);

  const handleExecution = useCallback((event: ExecutionStreamEvent) => {
    executionListeners.current.forEach(cb => cb(event));
  }, []);

  const handleChatStreamStart = useCallback((event: ChatStreamStartEvent) => {
    chatStreamStartListeners.current.forEach(cb => cb(event));
  }, []);

  const handleChatStreamChunk = useCallback((event: ChatStreamChunkEvent) => {
    chatStreamChunkListeners.current.forEach(cb => cb(event));
  }, []);

  const handleChatStreamEnd = useCallback((event: ChatStreamEndEvent) => {
    chatStreamEndListeners.current.forEach(cb => cb(event));
  }, []);

  // Initialize socket connection when authenticated
  useEffect(() => {
    // Only connect when authenticated (cookies will be sent automatically)
    if (!isAuthenticated) return;

    const socket = io(WS_URL, {
      withCredentials: true, // Send cookies with WebSocket connection
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Register memoized handlers
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('agent:status', handleAgentStatus);
    socket.on('agent:todo', handleTodoProgress);
    socket.on('agent:execution', handleExecution);
    socket.on('chat:stream:start', handleChatStreamStart);
    socket.on('chat:stream:chunk', handleChatStreamChunk);
    socket.on('chat:stream:end', handleChatStreamEnd);

    return () => {
      // Proper cleanup: remove all listeners before disconnect
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('agent:status', handleAgentStatus);
      socket.off('agent:todo', handleTodoProgress);
      socket.off('agent:execution', handleExecution);
      socket.off('chat:stream:start', handleChatStreamStart);
      socket.off('chat:stream:chunk', handleChatStreamChunk);
      socket.off('chat:stream:end', handleChatStreamEnd);

      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    isAuthenticated,
    handleConnect,
    handleDisconnect,
    handleAgentStatus,
    handleTodoProgress,
    handleExecution,
    handleChatStreamStart,
    handleChatStreamChunk,
    handleChatStreamEnd,
  ]);

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

  // Chat subscriptions
  const subscribeToChat = useCallback((sessionId: string) => {
    if (chatSubscriptions.current.has(sessionId)) return;

    chatSubscriptions.current.add(sessionId);
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe:chat', { sessionId });
    }
  }, []);

  const unsubscribeFromChat = useCallback((sessionId: string) => {
    chatSubscriptions.current.delete(sessionId);
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe:chat', { sessionId });
    }
  }, []);

  const onChatStreamStart = useCallback((callback: EventCallback<ChatStreamStartEvent>) => {
    chatStreamStartListeners.current.add(callback);
    return () => {
      chatStreamStartListeners.current.delete(callback);
    };
  }, []);

  const onChatStreamChunk = useCallback((callback: EventCallback<ChatStreamChunkEvent>) => {
    chatStreamChunkListeners.current.add(callback);
    return () => {
      chatStreamChunkListeners.current.delete(callback);
    };
  }, []);

  const onChatStreamEnd = useCallback((callback: EventCallback<ChatStreamEndEvent>) => {
    chatStreamEndListeners.current.add(callback);
    return () => {
      chatStreamEndListeners.current.delete(callback);
    };
  }, []);

  const value: WebSocketContextValue = {
    isConnected,
    subscribe,
    unsubscribe,
    subscribeToChat,
    unsubscribeFromChat,
    onAgentStatus,
    onTodoProgress,
    onExecution,
    onChatStreamStart,
    onChatStreamChunk,
    onChatStreamEnd,
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

// Hook to subscribe to multiple agents at once (avoids hooks-in-loop)
export function useAgentsSubscription(agentIds: string[]) {
  const { subscribe, unsubscribe } = useWebSocket();

  useEffect(() => {
    if (!agentIds || agentIds.length === 0) return;

    // Subscribe to all agents
    agentIds.forEach(id => subscribe('agent', id));

    // Cleanup: unsubscribe from all
    return () => {
      agentIds.forEach(id => unsubscribe('agent', id));
    };
  }, [agentIds.join(','), subscribe, unsubscribe]); // Use join for stable dependency
}

/**
 * Hook to listen for agent status changes
 *
 * IMPORTANT: To prevent memory leaks and infinite re-subscriptions,
 * the callback MUST be memoized with useCallback:
 *
 * @example
 * ```tsx
 * const handleStatus = useCallback((event) => {
 *   // handle event
 * }, [deps]);
 *
 * useAgentStatus(handleStatus);
 * ```
 */
export function useAgentStatus(callback: EventCallback<AgentStatusEvent>) {
  const { onAgentStatus } = useWebSocket();

  useEffect(() => {
    return onAgentStatus(callback);
  }, [callback, onAgentStatus]);
}

/**
 * Hook to listen for todo progress events
 *
 * IMPORTANT: To prevent memory leaks, wrap your callback with useCallback
 */
export function useTodoProgress(callback: EventCallback<TodoProgressEvent>) {
  const { onTodoProgress } = useWebSocket();

  useEffect(() => {
    return onTodoProgress(callback);
  }, [callback, onTodoProgress]);
}

/**
 * Hook to listen for execution events
 *
 * IMPORTANT: To prevent memory leaks, wrap your callback with useCallback
 */
export function useExecutionStream(callback: EventCallback<ExecutionStreamEvent>) {
  const { onExecution } = useWebSocket();

  useEffect(() => {
    return onExecution(callback);
  }, [callback, onExecution]);
}

// Chat streaming hooks
export function useChatSubscription(sessionId: string | undefined) {
  const { subscribeToChat, unsubscribeFromChat } = useWebSocket();

  useEffect(() => {
    if (!sessionId) return;
    subscribeToChat(sessionId);
    return () => unsubscribeFromChat(sessionId);
  }, [sessionId, subscribeToChat, unsubscribeFromChat]);
}

/**
 * Hook to listen for chat stream start events
 *
 * IMPORTANT: To prevent memory leaks, wrap your callback with useCallback
 */
export function useChatStreamStart(callback: EventCallback<ChatStreamStartEvent>) {
  const { onChatStreamStart } = useWebSocket();

  useEffect(() => {
    return onChatStreamStart(callback);
  }, [callback, onChatStreamStart]);
}

/**
 * Hook to listen for chat stream chunk events
 *
 * IMPORTANT: To prevent memory leaks, wrap your callback with useCallback
 */
export function useChatStreamChunk(callback: EventCallback<ChatStreamChunkEvent>) {
  const { onChatStreamChunk } = useWebSocket();

  useEffect(() => {
    return onChatStreamChunk(callback);
  }, [callback, onChatStreamChunk]);
}

/**
 * Hook to listen for chat stream end events
 *
 * IMPORTANT: To prevent memory leaks, wrap your callback with useCallback
 */
export function useChatStreamEnd(callback: EventCallback<ChatStreamEndEvent>) {
  const { onChatStreamEnd } = useWebSocket();

  useEffect(() => {
    return onChatStreamEnd(callback);
  }, [callback, onChatStreamEnd]);
}
