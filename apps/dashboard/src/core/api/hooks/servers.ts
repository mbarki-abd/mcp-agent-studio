import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { ServerConfiguration, PaginatedResponse } from '@mcp/types';
import { queryKeys, useQueryClient } from './common';

// =====================================================
// Server Hooks
// =====================================================

export interface ServerValidationResult {
  valid: boolean;
  latency?: number;
  serverVersion?: string;
  capabilities?: string[];
  status?: string;
  error?: string;
}

export interface ServerHealthApiResponse {
  serverId: string;
  serverName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  serverStatus: string;
  lastHealthCheck: string | null;
  lastError: string | null;
  serverVersion: string | null;
  components: {
    agents: {
      total: number;
      active: number;
      busy: number;
      error: number;
      healthScore: number;
    };
    tools: {
      total: number;
      healthy: number;
      unhealthy: number;
      healthScore: number;
    };
  };
  uptime: {
    lastCheck: string;
    checkAge: number;
  } | null;
}

export interface ServerStatsApiResponse {
  serverId: string;
  serverName: string;
  period: {
    from: string;
    to: string;
  };
  executions: {
    total: number;
    success: number;
    successRate: number;
    avgDurationMs: number;
    avgTokensUsed: number;
    breakdown: Record<string, number>;
  };
  tasks: {
    total: number;
    breakdown: Record<string, number>;
  };
  agents: {
    total: number;
    breakdown: Record<string, number>;
  };
}

export function useServers(params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: queryKeys.servers.list(params),
    queryFn: async () => {
      const query = params ? `?page=${params.page || 1}&pageSize=${params.pageSize || 10}` : '';
      const response = await apiClient.get<{ servers: ServerConfiguration[] } | PaginatedResponse<ServerConfiguration>>(`/servers${query}`);
      // Transform API response to standard format
      if ('servers' in response) {
        return {
          items: response.servers,
          total: response.servers.length,
          page: params?.page || 1,
          pageSize: params?.pageSize || 10,
          totalPages: 1,
        } as PaginatedResponse<ServerConfiguration>;
      }
      return response;
    },
  });
}

export function useServer(id: string, options?: any) {
  return useQuery({
    queryKey: queryKeys.servers.detail(id),
    queryFn: () => apiClient.get<ServerConfiguration>(`/servers/${id}`),
    enabled: !!id,
    ...options,
  });
}

export function useCreateServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ServerConfiguration>) =>
      apiClient.post<ServerConfiguration>('/servers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.all });
    },
  });
}

export function useUpdateServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ServerConfiguration> }) =>
      apiClient.put<ServerConfiguration>(`/servers/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.all });
    },
  });
}

export function useDeleteServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/servers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.all });
    },
  });
}

export function useTestServerConnection() {
  return useMutation({
    mutationFn: (id: string) => apiClient.post<{ success: boolean; latency?: number }>(`/servers/${id}/test`, {}),
  });
}

export function useValidateServerConnection() {
  return useMutation({
    mutationFn: (data: { url: string; masterToken: string }) =>
      apiClient.post<ServerValidationResult>('/servers/validate', data),
  });
}

export function useServerHealth(serverId: string) {
  return useQuery({
    queryKey: ['servers', serverId, 'health'] as const,
    queryFn: () => apiClient.get<ServerHealthApiResponse>(`/servers/${serverId}/health`),
    enabled: !!serverId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto refresh every minute
  });
}

export function useServerStats(serverId: string, since?: string) {
  return useQuery({
    queryKey: ['servers', serverId, 'stats', since] as const,
    queryFn: () => {
      const params = since ? `?since=${encodeURIComponent(since)}` : '';
      return apiClient.get<ServerStatsApiResponse>(`/servers/${serverId}/stats${params}`);
    },
    enabled: !!serverId,
    staleTime: 60 * 1000,
  });
}

export function useUninstallTool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serverId, toolId }: { serverId: string; toolId: string }) =>
      apiClient.delete(`/tools/servers/${serverId}/tools/${toolId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tools.server(variables.serverId) });
    },
  });
}
