import { useQuery, useMutation, UseQueryOptions } from '@tanstack/react-query';
import { ApiError } from '../client';
import { useQueryClient } from './common';

// =====================================================
// Presence API Types
// =====================================================

export interface ServerPresence {
  id: string;
  name: string;
  version: string;
  host: string;
  port: number;
  environment: string;
  startedAt: string;
  uptime: number;
  status: 'online' | 'offline' | 'degraded';
}

export interface AgentPresence {
  id: string;
  name: string;
  unixUser: string;
  engineType: 'claude' | 'openai' | 'custom';
  status: 'active' | 'suspended' | 'offline';
  createdAt: string;
  lastActiveAt: string;
  workspacesCount: number;
  projectsCount: number;
  hasTerminalSession: boolean;
}

export interface PresenceStats {
  totalAgents: number;
  activeAgents: number;
  suspendedAgents: number;
  totalWorkspaces: number;
  totalProjects: number;
  activeTerminals: number;
}

export interface MasterConnectionState {
  state: 'connected' | 'connecting' | 'disconnected' | 'error' | 'reconnecting';
  nodeId: string;
  masterUrl: string;
  lastHeartbeat: string;
  failedAttempts: number;
}

export interface PresenceStatus {
  server: ServerPresence;
  agents: {
    list: AgentPresence[];
    count: number;
    byStatus: Record<string, number>;
    byEngine: Record<string, number>;
    withActiveTerminals: number;
  };
  connections: {
    dashboardsConnected: number;
  };
  master: MasterConnectionState;
  timestamp: string;
}

// =====================================================
// Remote Server API Client
// =====================================================

/**
 * Makes API calls to remote mcp-agent-server instances
 */
class RemoteServerClient {
  private async request<T>(
    serverUrl: string,
    token: string,
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: unknown;
      signal?: AbortSignal;
    } = {}
  ): Promise<T> {
    const { method = 'GET', body, signal } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const url = `${serverUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error || errorData.message || 'Remote server request failed',
        response.status,
        errorData
      );
    }

    return response.json();
  }

  get<T>(serverUrl: string, token: string, endpoint: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>(serverUrl, token, endpoint, { method: 'GET', signal });
  }

  post<T>(serverUrl: string, token: string, endpoint: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>(serverUrl, token, endpoint, { method: 'POST', body, signal });
  }
}

const remoteClient = new RemoteServerClient();

// =====================================================
// Query Keys
// =====================================================

export const presenceQueryKeys = {
  all: (serverUrl: string) => ['presence', serverUrl] as const,
  server: (serverUrl: string) => ['presence', serverUrl, 'server'] as const,
  agents: (serverUrl: string) => ['presence', serverUrl, 'agents'] as const,
  stats: (serverUrl: string) => ['presence', serverUrl, 'stats'] as const,
  status: (serverUrl: string) => ['presence', serverUrl, 'status'] as const,
  masterConnection: (serverUrl: string) => ['presence', serverUrl, 'master'] as const,
};

// =====================================================
// Presence Hooks
// =====================================================

/**
 * Fetches server presence information
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param options - React Query options
 */
export function usePresenceServer(
  serverUrl: string,
  token: string,
  options?: Omit<UseQueryOptions<ServerPresence, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: presenceQueryKeys.server(serverUrl),
    queryFn: ({ signal }) =>
      remoteClient.get<ServerPresence>(serverUrl, token, '/api/presence/server', signal),
    enabled: !!serverUrl && !!token,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Auto refresh every 30 seconds
    ...options,
  });
}

/**
 * Fetches all agents with presence information
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param options - React Query options
 */
export function usePresenceAgents(
  serverUrl: string,
  token: string,
  options?: Omit<UseQueryOptions<AgentPresence[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: presenceQueryKeys.agents(serverUrl),
    queryFn: ({ signal }) =>
      remoteClient.get<AgentPresence[]>(serverUrl, token, '/api/presence/agents', signal),
    enabled: !!serverUrl && !!token,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Auto refresh every 30 seconds
    ...options,
  });
}

/**
 * Fetches presence statistics
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param options - React Query options
 */
export function usePresenceStats(
  serverUrl: string,
  token: string,
  options?: Omit<UseQueryOptions<PresenceStats, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: presenceQueryKeys.stats(serverUrl),
    queryFn: ({ signal }) =>
      remoteClient.get<PresenceStats>(serverUrl, token, '/api/presence/stats', signal),
    enabled: !!serverUrl && !!token,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Auto refresh every 30 seconds
    ...options,
  });
}

/**
 * Fetches complete presence status (server + agents + connections + master)
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param options - React Query options
 */
export function usePresenceStatus(
  serverUrl: string,
  token: string,
  options?: Omit<UseQueryOptions<PresenceStatus, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: presenceQueryKeys.status(serverUrl),
    queryFn: ({ signal }) =>
      remoteClient.get<PresenceStatus>(serverUrl, token, '/api/presence/status', signal),
    enabled: !!serverUrl && !!token,
    staleTime: 5 * 1000, // 5 seconds for real-time updates
    refetchInterval: 5 * 1000, // Auto refresh every 5 seconds
    ...options,
  });
}

/**
 * Fetches master dashboard connection state
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param options - React Query options
 */
export function useMasterConnectionState(
  serverUrl: string,
  token: string,
  options?: Omit<UseQueryOptions<MasterConnectionState, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: presenceQueryKeys.masterConnection(serverUrl),
    queryFn: ({ signal }) =>
      remoteClient.get<MasterConnectionState>(serverUrl, token, '/api/presence/master', signal),
    enabled: !!serverUrl && !!token,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Auto refresh every 30 seconds
    ...options,
  });
}

/**
 * Forces reconnection to master dashboard
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 */
export function useReconnectToMaster(serverUrl: string, token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ signal }: { signal?: AbortSignal } = {}) =>
      remoteClient.post<{ success: boolean; message: string }>(
        serverUrl,
        token,
        '/api/presence/master/reconnect',
        {},
        signal
      ),
    onSuccess: () => {
      // Invalidate all presence queries for this server to get fresh data
      queryClient.invalidateQueries({ queryKey: presenceQueryKeys.all(serverUrl) });
    },
  });
}
