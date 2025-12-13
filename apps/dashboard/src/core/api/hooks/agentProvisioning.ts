import { useQuery, useMutation, UseQueryOptions } from '@tanstack/react-query';
import { queryKeys, useQueryClient } from './common';

// =====================================================
// Agent Provisioning Hooks (Remote mcp-agent-server)
// =====================================================

/**
 * Types for agent provisioning on remote mcp-agent-server
 */

export interface ProvisionAgentRequest {
  name: string;
  engineType: 'claude' | 'openai' | 'custom';
  apiKey?: string; // Claude/OpenAI API key
  description?: string;
  capabilities?: string[];
  role?: 'master' | 'supervisor' | 'worker';
}

export interface ProvisionAgentResponse {
  success: boolean;
  agent: {
    id: string;
    name: string;
    unixUser: string;
    engineType: string;
    status: string;
    homeDir: string;
  };
  credentials: {
    agentId: string;
    token: string;
    tokenId: string;
  };
  setupScript: string;
}

export interface RemoteAgent {
  id: string;
  name: string;
  unixUser: string;
  role: 'master' | 'supervisor' | 'worker';
  status: 'active' | 'suspended' | 'offline';
  homeDir: string;
  engineType: 'claude' | 'openai' | 'custom';
  capabilities: string[];
  createdAt: string;
  lastActiveAt?: string;
}

export interface RemoteAgentListResponse {
  agents: RemoteAgent[];
  total: number;
}

export interface ActivateAgentResponse {
  success: boolean;
  agent: RemoteAgent;
  message: string;
}

export interface SuspendAgentResponse {
  success: boolean;
  agent: RemoteAgent;
  message: string;
}

export interface SyncAgentsResponse {
  success: boolean;
  synced: number;
  agents: RemoteAgent[];
  message: string;
}

/**
 * Custom API client for remote server calls
 */
class RemoteApiClient {
  private async request<T>(
    serverUrl: string,
    token: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${serverUrl.replace(/\/$/, '')}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async get<T>(serverUrl: string, token: string, endpoint: string): Promise<T> {
    return this.request<T>(serverUrl, token, endpoint, { method: 'GET' });
  }

  async post<T>(serverUrl: string, token: string, endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(serverUrl, token, endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(serverUrl: string, token: string, endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(serverUrl, token, endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(serverUrl: string, token: string, endpoint: string): Promise<T> {
    return this.request<T>(serverUrl, token, endpoint, { method: 'DELETE' });
  }
}

const remoteApiClient = new RemoteApiClient();

/**
 * Query Keys for remote agent operations
 */
const remoteQueryKeys = {
  remoteAgents: (serverUrl: string) => ['remote-agents', serverUrl] as const,
  remoteAgent: (serverUrl: string, agentId: string) => ['remote-agents', serverUrl, agentId] as const,
};

/**
 * Hook: List all agents on remote mcp-agent-server
 *
 * @param serverUrl - Remote server URL (e.g., http://192.168.1.100:3000)
 * @param token - Authentication token for remote server
 * @param options - React Query options
 */
export function useRemoteAgents(
  serverUrl: string,
  token: string,
  options?: Omit<UseQueryOptions<RemoteAgentListResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: remoteQueryKeys.remoteAgents(serverUrl),
    queryFn: () => remoteApiClient.get<RemoteAgentListResponse>(serverUrl, token, '/api/agents'),
    enabled: !!serverUrl && !!token,
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
}

/**
 * Hook: Get a single agent from remote mcp-agent-server
 *
 * @param serverUrl - Remote server URL
 * @param token - Authentication token
 * @param agentId - Agent ID to fetch
 * @param options - React Query options
 */
export function useRemoteAgent(
  serverUrl: string,
  token: string,
  agentId: string,
  options?: Omit<UseQueryOptions<RemoteAgent, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: remoteQueryKeys.remoteAgent(serverUrl, agentId),
    queryFn: () => remoteApiClient.get<RemoteAgent>(serverUrl, token, `/api/agents/${agentId}`),
    enabled: !!serverUrl && !!token && !!agentId,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Hook: Provision a new agent on remote mcp-agent-server
 *
 * @param serverUrl - Remote server URL
 * @param token - Authentication token
 *
 * @returns Mutation with provision function
 *
 * @example
 * const provision = useProvisionAgent(serverUrl, token);
 *
 * provision.mutate({
 *   name: 'agent1',
 *   engineType: 'claude',
 *   apiKey: 'sk-ant-xxx',
 *   description: 'Development agent'
 * }, {
 *   onSuccess: (response) => {
 *     console.log('Agent provisioned:', response.agent);
 *     console.log('Credentials (SHOW ONCE):', response.credentials);
 *   }
 * });
 */
export function useProvisionAgent(serverUrl: string, token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProvisionAgentRequest) =>
      remoteApiClient.post<ProvisionAgentResponse>(serverUrl, token, '/api/agents/provision', data),
    onSuccess: () => {
      // Invalidate remote agents list
      queryClient.invalidateQueries({ queryKey: remoteQueryKeys.remoteAgents(serverUrl) });

      // Also invalidate local agents list (they might be synced)
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
    },
  });
}

/**
 * Hook: Activate a suspended agent on remote mcp-agent-server
 *
 * @param serverUrl - Remote server URL
 * @param token - Authentication token
 *
 * @returns Mutation with activate function
 *
 * @example
 * const activate = useActivateAgent(serverUrl, token);
 *
 * activate.mutate('agent-id-123', {
 *   onSuccess: (response) => {
 *     console.log('Agent activated:', response.agent);
 *   }
 * });
 */
export function useActivateAgent(serverUrl: string, token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agentId: string) =>
      remoteApiClient.post<ActivateAgentResponse>(serverUrl, token, `/api/agents/${agentId}/activate`),
    onMutate: async (agentId) => {
      // Optimistic update: set agent status to 'active'
      await queryClient.cancelQueries({ queryKey: remoteQueryKeys.remoteAgent(serverUrl, agentId) });

      const previousAgent = queryClient.getQueryData<RemoteAgent>(
        remoteQueryKeys.remoteAgent(serverUrl, agentId)
      );

      if (previousAgent) {
        queryClient.setQueryData<RemoteAgent>(
          remoteQueryKeys.remoteAgent(serverUrl, agentId),
          { ...previousAgent, status: 'active' }
        );
      }

      return { previousAgent };
    },
    onError: (_error, agentId, context) => {
      // Rollback on error
      if (context?.previousAgent) {
        queryClient.setQueryData(
          remoteQueryKeys.remoteAgent(serverUrl, agentId),
          context.previousAgent
        );
      }
    },
    onSuccess: (_, agentId) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: remoteQueryKeys.remoteAgent(serverUrl, agentId) });
      queryClient.invalidateQueries({ queryKey: remoteQueryKeys.remoteAgents(serverUrl) });
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
    },
  });
}

/**
 * Hook: Suspend an active agent on remote mcp-agent-server
 *
 * @param serverUrl - Remote server URL
 * @param token - Authentication token
 *
 * @returns Mutation with suspend function
 *
 * @example
 * const suspend = useSuspendAgent(serverUrl, token);
 *
 * suspend.mutate('agent-id-123', {
 *   onSuccess: (response) => {
 *     console.log('Agent suspended:', response.agent);
 *   }
 * });
 */
export function useSuspendAgent(serverUrl: string, token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agentId: string) =>
      remoteApiClient.post<SuspendAgentResponse>(serverUrl, token, `/api/agents/${agentId}/suspend`),
    onMutate: async (agentId) => {
      // Optimistic update: set agent status to 'suspended'
      await queryClient.cancelQueries({ queryKey: remoteQueryKeys.remoteAgent(serverUrl, agentId) });

      const previousAgent = queryClient.getQueryData<RemoteAgent>(
        remoteQueryKeys.remoteAgent(serverUrl, agentId)
      );

      if (previousAgent) {
        queryClient.setQueryData<RemoteAgent>(
          remoteQueryKeys.remoteAgent(serverUrl, agentId),
          { ...previousAgent, status: 'suspended' }
        );
      }

      return { previousAgent };
    },
    onError: (_error, agentId, context) => {
      // Rollback on error
      if (context?.previousAgent) {
        queryClient.setQueryData(
          remoteQueryKeys.remoteAgent(serverUrl, agentId),
          context.previousAgent
        );
      }
    },
    onSuccess: (_, agentId) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: remoteQueryKeys.remoteAgent(serverUrl, agentId) });
      queryClient.invalidateQueries({ queryKey: remoteQueryKeys.remoteAgents(serverUrl) });
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
    },
  });
}

/**
 * Hook: Sync agents from registry on remote mcp-agent-server
 *
 * Discovers and registers agents from the system registry/database
 *
 * @param serverUrl - Remote server URL
 * @param token - Authentication token
 *
 * @returns Mutation with sync function
 *
 * @example
 * const sync = useSyncAgents(serverUrl, token);
 *
 * sync.mutate(undefined, {
 *   onSuccess: (response) => {
 *     console.log(`Synced ${response.synced} agents`);
 *   }
 * });
 */
export function useSyncAgents(serverUrl: string, token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      remoteApiClient.post<SyncAgentsResponse>(serverUrl, token, '/api/agents/sync'),
    onSuccess: () => {
      // Invalidate all agent-related queries
      queryClient.invalidateQueries({ queryKey: remoteQueryKeys.remoteAgents(serverUrl) });
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
    },
  });
}

/**
 * Re-export remote query keys for external use
 */
export { remoteQueryKeys };
