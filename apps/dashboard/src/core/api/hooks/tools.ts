import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { ToolDefinition, ServerTool, AgentToolPermission } from '@mcp/types';
import { queryKeys, useQueryClient } from './common';

// =====================================================
// Tools Hooks
// =====================================================

export interface ToolHealthCheckResult {
  toolName: string;
  healthStatus: 'HEALTHY' | 'UNHEALTHY' | 'UNKNOWN';
  lastHealthCheck: string;
}

export function useToolsCatalog() {
  return useQuery({
    queryKey: queryKeys.tools.catalog,
    queryFn: async () => {
      const response = await apiClient.get<{ tools: ToolDefinition[] }>('/tools/definitions');
      return response.tools;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - catalog doesn't change often
  });
}

export function useToolDefinitions() {
  return useQuery({
    queryKey: queryKeys.tools.catalog,
    queryFn: async () => {
      const response = await apiClient.get<{ tools: ToolDefinition[] }>('/tools/definitions');
      return response;
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useServerTools(serverId: string) {
  return useQuery({
    queryKey: queryKeys.tools.server(serverId),
    queryFn: async () => {
      const response = await apiClient.get<{ tools: ServerTool[] }>(`/tools/servers/${serverId}`);
      return response.tools;
    },
    enabled: !!serverId,
  });
}

export function useInstallTool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serverId, toolId }: { serverId: string; toolId: string }) =>
      apiClient.post<ServerTool>(`/tools/servers/${serverId}/install`, { toolId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tools.server(variables.serverId) });
    },
  });
}

export function useToolHealthCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serverId, toolId }: { serverId: string; toolId: string }) =>
      apiClient.post<ToolHealthCheckResult>(`/tools/servers/${serverId}/tools/${toolId}/health`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tools.server(variables.serverId) });
    },
  });
}

export function useAgentToolPermissions(agentId: string) {
  return useQuery({
    queryKey: queryKeys.tools.agentPermissions(agentId),
    queryFn: async () => {
      const response = await apiClient.get<{ permissions: AgentToolPermission[] }>(`/tools/agents/${agentId}/permissions`);
      return response.permissions;
    },
    enabled: !!agentId,
  });
}

export function useUpdateAgentToolPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, permissions }: { agentId: string; permissions: Partial<AgentToolPermission>[] }) =>
      apiClient.put(`/tools/agents/${agentId}/permissions`, { permissions }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tools.agentPermissions(variables.agentId) });
    },
  });
}
