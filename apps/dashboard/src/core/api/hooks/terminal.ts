import { useQuery, useMutation, UseQueryOptions } from '@tanstack/react-query';
import { useEffect, useRef, useState, useCallback } from 'react';
import { apiClient, ApiError } from '../client';
import { queryKeys, useQueryClient } from './common';

// ============================================================================
// Terminal Types
// ============================================================================

export interface TerminalSession {
  id: string;
  agentId: string;
  agentName: string;
  status: 'active' | 'idle' | 'closed';
  pid?: number;
  cols: number;
  rows: number;
  createdAt: string;
  lastActivityAt: string;
}

export interface CreateTerminalResponse {
  session: TerminalSession;
  websocketUrl: string; // e.g., "/api/terminals/term_xxx/ws"
}

export interface ExecuteCommandRequest {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export interface TerminalOutput {
  type: 'stdout' | 'stderr' | 'exit' | 'error';
  data?: string;
  code?: number;
  message?: string;
  timestamp: string;
}

export interface TerminalBuffer {
  sessionId: string;
  lines: string[];
  totalLines: number;
  truncated: boolean;
}

// WebSocket message types
export interface TerminalInputMessage {
  type: 'input';
  data: string;
}

export interface TerminalExecuteMessage {
  type: 'execute';
  command: string;
  args?: string[];
}

export interface TerminalKillMessage {
  type: 'kill';
  signal?: string;
}

export interface TerminalResizeMessage {
  type: 'resize';
  cols: number;
  rows: number;
}

export type TerminalClientMessage =
  | TerminalInputMessage
  | TerminalExecuteMessage
  | TerminalKillMessage
  | TerminalResizeMessage;

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

// ============================================================================
// REST API Hooks
// ============================================================================

/**
 * List all terminal sessions (master only)
 */
export function useTerminalSessions() {
  return useQuery({
    queryKey: queryKeys.terminals.all,
    queryFn: () => apiClient.get<{ sessions: TerminalSession[] }>('/terminals'),
  });
}

/**
 * Create or get terminal session for an agent
 */
export function useCreateTerminalSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (agentId: string) =>
      apiClient.post<CreateTerminalResponse>(`/agents/${agentId}/terminal`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.terminals.all });
    },
  });
}

/**
 * Execute a command in a terminal session
 */
export function useExecuteCommand() {
  return useMutation({
    mutationFn: ({ sessionId, request }: { sessionId: string; request: ExecuteCommandRequest }) =>
      apiClient.post<{ success: boolean }>(`/terminals/${sessionId}/execute`, request),
  });
}

/**
 * Start interactive shell in terminal session
 */
export function useStartShell() {
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiClient.post<{ success: boolean }>(`/terminals/${sessionId}/shell`),
  });
}

/**
 * Send input to terminal session
 */
export function useSendTerminalInput() {
  return useMutation({
    mutationFn: ({ sessionId, input }: { sessionId: string; input: string }) =>
      apiClient.post<{ success: boolean }>(`/terminals/${sessionId}/input`, { input }),
  });
}

/**
 * Kill process in terminal session
 */
export function useKillProcess() {
  return useMutation({
    mutationFn: ({ sessionId, signal }: { sessionId: string; signal?: string }) =>
      apiClient.post<{ success: boolean }>(`/terminals/${sessionId}/kill`, { signal }),
  });
}

/**
 * Close terminal session
 */
export function useCloseTerminal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => apiClient.delete(`/terminals/${sessionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.terminals.all });
    },
  });
}

/**
 * Get terminal output history/buffer
 */
export function useTerminalBuffer(
  sessionId: string,
  options?: Omit<UseQueryOptions<TerminalBuffer, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.terminals.buffer(sessionId),
    queryFn: () => apiClient.get<TerminalBuffer>(`/terminals/${sessionId}/buffer`),
    enabled: !!sessionId,
    ...options,
  });
}

// ============================================================================
// WebSocket Hook
// ============================================================================

interface UseTerminalWebSocketOptions {
  serverUrl: string;
  token: string;
  sessionId: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  maxBufferSize?: number;
}

interface TerminalWebSocketReturn {
  // Connection state
  isConnected: boolean;
  connectionState: ConnectionState;
  reconnectAttempt: number;

  // Output buffer
  output: TerminalOutput[];
  clearOutput: () => void;

  // Actions
  connect: () => void;
  disconnect: () => void;
  send: (message: TerminalClientMessage) => void;
  execute: (command: string, args?: string[]) => void;
  sendInput: (data: string) => void;
  kill: (signal?: string) => void;
  resize: (cols: number, rows: number) => void;
}

/**
 * WebSocket hook for real-time terminal streaming
 *
 * @example
 * ```tsx
 * const terminal = useTerminalWebSocket({
 *   serverUrl: 'http://localhost:3000',
 *   token: authToken,
 *   sessionId: 'term_123',
 *   autoConnect: true
 * });
 *
 * // Execute command
 * terminal.execute('ls', ['-la']);
 *
 * // Send input
 * terminal.sendInput('hello\n');
 *
 * // Resize
 * terminal.resize(80, 24);
 *
 * // Kill process
 * terminal.kill('SIGTERM');
 * ```
 */
export function useTerminalWebSocket(
  options: UseTerminalWebSocketOptions
): TerminalWebSocketReturn {
  const {
    serverUrl,
    token,
    sessionId,
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 1000,
    maxBufferSize = 1000,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Output buffer (keep recent outputs)
  const [output, setOutput] = useState<TerminalOutput[]>([]);

  // ============================================================================
  // WebSocket Message Handling
  // ============================================================================

  const send = useCallback((message: TerminalClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[Terminal] Cannot send message - WebSocket not connected');
    }
  }, []);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as TerminalOutput;

        setOutput((prev) => {
          const newOutput = [...prev, message];
          // Keep buffer size limited
          if (newOutput.length > maxBufferSize) {
            return newOutput.slice(-maxBufferSize);
          }
          return newOutput;
        });

        // Log errors to console
        if (message.type === 'error') {
          console.error('[Terminal] Error:', message.message);
        }

        // Log exit codes
        if (message.type === 'exit') {
          console.log('[Terminal] Process exited with code:', message.code);
        }
      } catch (error) {
        console.error('[Terminal] Failed to parse message:', error);
      }
    },
    [maxBufferSize]
  );

  // ============================================================================
  // Connection Management
  // ============================================================================

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempt >= reconnectAttempts) {
      console.error('[Terminal] Max reconnection attempts reached');
      setConnectionState('error');
      return;
    }

    const delay = reconnectDelay * Math.pow(2, reconnectAttempt); // Exponential backoff
    console.log(
      `[Terminal] Reconnecting in ${delay}ms (attempt ${reconnectAttempt + 1}/${reconnectAttempts})`
    );

    setConnectionState('reconnecting');
    reconnectTimeoutRef.current = setTimeout(() => {
      setReconnectAttempt((prev) => prev + 1);
      connect();
    }, delay);
  }, [reconnectAttempt, reconnectAttempts, reconnectDelay]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.warn('[Terminal] Already connected');
      return;
    }

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      setConnectionState('connecting');

      // Convert HTTP(S) URL to WS(S) URL and add token to query string
      const wsUrl =
        serverUrl.replace(/^http/, 'ws') +
        `/api/terminals/${sessionId}/ws?token=${encodeURIComponent(token)}`;

      console.log('[Terminal] Connecting to:', wsUrl.replace(token, '***'));

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Terminal] Connected');
        setConnectionState('connected');
        setReconnectAttempt(0);

        // Start ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Ping every 30 seconds
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        console.error('[Terminal] WebSocket error:', error);
        setConnectionState('error');
      };

      ws.onclose = (event) => {
        console.log('[Terminal] Disconnected:', event.code, event.reason);
        setConnectionState('disconnected');

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Auto-reconnect if it wasn't a manual disconnect (code 1000)
        if (event.code !== 1000 && connectionState !== 'error') {
          scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('[Terminal] Failed to connect:', error);
      setConnectionState('error');
    }
  }, [serverUrl, sessionId, token, handleMessage, scheduleReconnect, connectionState]);

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
      wsRef.current.close(1000, 'Manual disconnect'); // Normal closure
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
  // Terminal Actions
  // ============================================================================

  const execute = useCallback(
    (command: string, args?: string[]) => {
      send({ type: 'execute', command, args });
    },
    [send]
  );

  const sendInput = useCallback(
    (data: string) => {
      send({ type: 'input', data });
    },
    [send]
  );

  const kill = useCallback(
    (signal?: string) => {
      send({ type: 'kill', signal });
    },
    [send]
  );

  const resize = useCallback(
    (cols: number, rows: number) => {
      send({ type: 'resize', cols, rows });
    },
    [send]
  );

  const clearOutput = useCallback(() => {
    setOutput([]);
  }, []);

  // ============================================================================
  // Return Value
  // ============================================================================

  return {
    isConnected: connectionState === 'connected',
    connectionState,
    reconnectAttempt,
    output,
    clearOutput,
    connect,
    disconnect,
    send,
    execute,
    sendInput,
    kill,
    resize,
  };
}
