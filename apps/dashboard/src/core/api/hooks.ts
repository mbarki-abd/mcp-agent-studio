import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from './client';
import type {
  User,
  ServerConfiguration,
  Agent,
  Task,
  TaskExecution,
  ToolDefinition,
  ServerTool,
  AgentToolPermission,
  PaginatedResponse,
} from '@mcp/types';

// Query keys
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  servers: {
    all: ['servers'] as const,
    list: (params?: object) => ['servers', 'list', params] as const,
    detail: (id: string) => ['servers', 'detail', id] as const,
  },
  agents: {
    all: ['agents'] as const,
    list: (params?: object) => ['agents', 'list', params] as const,
    detail: (id: string) => ['agents', 'detail', id] as const,
    byServer: (serverId: string) => ['agents', 'server', serverId] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    list: (params?: object) => ['tasks', 'list', params] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
    executions: (taskId: string) => ['tasks', taskId, 'executions'] as const,
  },
  tools: {
    catalog: ['tools', 'catalog'] as const,
    server: (serverId: string) => ['tools', 'server', serverId] as const,
    agentPermissions: (agentId: string) => ['tools', 'agent', agentId, 'permissions'] as const,
  },
};

// Auth hooks
export function useCurrentUser(options?: Omit<UseQueryOptions<User, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => apiClient.get<User>('/auth/me'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// Server hooks
export function useServers(params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: queryKeys.servers.list(params),
    queryFn: () => {
      const query = params ? `?page=${params.page || 1}&pageSize=${params.pageSize || 10}` : '';
      return apiClient.get<PaginatedResponse<ServerConfiguration>>(`/servers${query}`);
    },
  });
}

export function useServer(id: string, options?: Omit<UseQueryOptions<ServerConfiguration, ApiError>, 'queryKey' | 'queryFn'>) {
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
    mutationFn: (id: string) => apiClient.post<{ success: boolean; latency?: number }>(`/servers/${id}/test`),
  });
}

// Agent hooks
export function useAgents(params?: { serverId?: string; status?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: queryKeys.agents.list(params),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.serverId) searchParams.set('serverId', params.serverId);
      if (params?.status) searchParams.set('status', params.status);
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return apiClient.get<PaginatedResponse<Agent>>(`/agents${query}`);
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

export function useValidateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post<Agent>(`/agents/${id}/validate`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
    },
  });
}

// Task hooks
export function useTasks(params?: { status?: string; agentId?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: queryKeys.tasks.list(params),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.agentId) searchParams.set('agentId', params.agentId);
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return apiClient.get<PaginatedResponse<Task>>(`/tasks${query}`);
    },
  });
}

export function useTask(id: string, options?: Omit<UseQueryOptions<Task, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(id),
    queryFn: () => apiClient.get<Task>(`/tasks/${id}`),
    enabled: !!id,
    ...options,
  });
}

export function useTaskExecutions(taskId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.executions(taskId),
    queryFn: () => apiClient.get<TaskExecution[]>(`/tasks/${taskId}/executions`),
    enabled: !!taskId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Task>) => apiClient.post<Task>('/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      apiClient.put<Task>(`/tasks/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

export function useRunTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post<TaskExecution>(`/tasks/${id}/run`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.executions(id) });
    },
  });
}

export function useCancelTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/tasks/${id}/cancel`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.executions(id) });
    },
  });
}

// Tools hooks
export function useToolsCatalog() {
  return useQuery({
    queryKey: queryKeys.tools.catalog,
    queryFn: () => apiClient.get<ToolDefinition[]>('/tools'),
    staleTime: 10 * 60 * 1000, // 10 minutes - catalog doesn't change often
  });
}

export function useServerTools(serverId: string) {
  return useQuery({
    queryKey: queryKeys.tools.server(serverId),
    queryFn: () => apiClient.get<ServerTool[]>(`/tools/server/${serverId}`),
    enabled: !!serverId,
  });
}

export function useInstallTool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serverId, toolId }: { serverId: string; toolId: string }) =>
      apiClient.post<ServerTool>(`/tools/server/${serverId}/install`, { toolId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tools.server(variables.serverId) });
    },
  });
}

export function useAgentToolPermissions(agentId: string) {
  return useQuery({
    queryKey: queryKeys.tools.agentPermissions(agentId),
    queryFn: () => apiClient.get<AgentToolPermission[]>(`/tools/agent/${agentId}/permissions`),
    enabled: !!agentId,
  });
}

export function useUpdateAgentToolPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, permissions }: { agentId: string; permissions: Partial<AgentToolPermission>[] }) =>
      apiClient.put(`/tools/agent/${agentId}/permissions`, { permissions }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tools.agentPermissions(variables.agentId) });
    },
  });
}
