import { useQuery, useMutation, UseQueryOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../client';
import type { Agent, PaginatedResponse } from '@mcp/types';
import { queryKeys, useQueryClient } from './common';

// =====================================================
// Agent Hooks
// =====================================================

export interface ParsedAgentConfig {
  name: string;
  role: 'MASTER' | 'SUPERVISOR' | 'WORKER';
  capabilities: string[];
  prompt: string;
  originalPrompt: string;
}

export interface AgentStatsApiResponse {
  agentId: string;
  agentName: string;
  period: {
    from: string;
    to: string;
  };
  summary: {
    totalExecutions: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    avgDurationMs: number;
    avgTokensUsed: number;
    totalTokensUsed: number;
  };
  breakdown: Record<string, number>;
}

export interface AgentExecutionsApiResponse {
  executions: Array<{
    id: string;
    taskId: string;
    taskTitle: string;
    taskPriority: string;
    status: string;
    prompt: string;
    output: string | null;
    error: string | null;
    exitCode: number | null;
    tokensUsed: number | null;
    durationMs: number | null;
    startedAt: string;
    completedAt: string | null;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface AgentHierarchyNode {
  id: string;
  name: string;
  displayName: string;
  role: string;
  status: string;
  supervisorId: string | null;
  children: AgentHierarchyNode[];
}

export interface AgentHierarchyApiResponse {
  hierarchy: AgentHierarchyNode[];
}

export function useAgents(params?: { serverId?: string; status?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: queryKeys.agents.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.serverId) searchParams.set('serverId', params.serverId);
      if (params?.status) searchParams.set('status', params.status);
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const response = await apiClient.get<{ agents: Agent[] } | PaginatedResponse<Agent>>(`/agents${query}`);
      // Transform API response to standard format
      if ('agents' in response) {
        return {
          items: response.agents,
          total: response.agents.length,
          page: params?.page || 1,
          pageSize: params?.pageSize || 10,
          totalPages: 1,
        } as PaginatedResponse<Agent>;
      }
      return response;
    },
  });
}

export function useAgent(id: string, options?: Omit<UseQueryOptions<Agent, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.agents.detail(id),
    queryFn: () => apiClient.get<Agent>(`/agents/${id}`),
    enabled: !!id,
    ...options,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Agent>) => apiClient.post<Agent>('/agents', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Agent> }) =>
      apiClient.put<Agent>(`/agents/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/agents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
    },
  });
}

export function useParseAgentPrompt() {
  return useMutation({
    mutationFn: (prompt: string) =>
      apiClient.post<ParsedAgentConfig>('/agents/parse-prompt', { prompt }),
  });
}

export function useCreateAgentFromPrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { prompt: string; serverId: string; supervisorId?: string }) =>
      apiClient.post<Agent>('/agents/from-prompt', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
    },
  });
}

export function useValidateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post<Agent>(`/agents/${id}/validate`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
    },
  });
}

export function useAgentStats(agentId: string, since?: string) {
  return useQuery({
    queryKey: queryKeys.agents.stats(agentId),
    queryFn: () => {
      const params = since ? `?since=${encodeURIComponent(since)}` : '';
      return apiClient.get<AgentStatsApiResponse>(`/agents/${agentId}/stats${params}`);
    },
    enabled: !!agentId,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useAgentExecutions(agentId: string, params?: { page?: number; pageSize?: number; status?: string }) {
  return useQuery({
    queryKey: ['agents', agentId, 'executions', params] as const,
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
      if (params?.status) searchParams.set('status', params.status);
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return apiClient.get<AgentExecutionsApiResponse>(`/agents/${agentId}/executions${query}`);
    },
    enabled: !!agentId,
  });
}

export function useAgentHierarchy(serverId?: string) {
  return useQuery({
    queryKey: queryKeys.agents.hierarchy(serverId),
    queryFn: () => {
      const params = serverId ? `?serverId=${serverId}` : '';
      return apiClient.get<AgentHierarchyApiResponse>(`/agents/hierarchy${params}`);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
