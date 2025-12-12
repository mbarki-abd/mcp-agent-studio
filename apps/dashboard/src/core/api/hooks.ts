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
    hierarchy: (serverId?: string) => ['agents', 'hierarchy', serverId] as const,
    stats: (agentId: string) => ['agents', agentId, 'stats'] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    list: (params?: object) => ['tasks', 'list', params] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
    executions: (taskId: string) => ['tasks', taskId, 'executions'] as const,
    dependencies: (taskId: string) => ['tasks', taskId, 'dependencies'] as const,
  },
  chat: {
    sessions: ['chat', 'sessions'] as const,
    messages: (sessionId: string) => ['chat', 'messages', sessionId] as const,
  },
  tools: {
    catalog: ['tools', 'catalog'] as const,
    server: (serverId: string) => ['tools', 'server', serverId] as const,
    agentPermissions: (agentId: string) => ['tools', 'agent', agentId, 'permissions'] as const,
  },
  audit: {
    all: ['audit'] as const,
    list: (params?: object) => ['audit', 'list', params] as const,
    stats: (hours?: number) => ['audit', 'stats', hours] as const,
    failedLogins: (hours?: number) => ['audit', 'failed-logins', hours] as const,
    adminActions: (hours?: number) => ['audit', 'admin-actions', hours] as const,
    user: (userId: string) => ['audit', 'user', userId] as const,
    resource: (resource: string, resourceId: string) => ['audit', 'resource', resource, resourceId] as const,
  },
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
    activity: (limit?: number) => ['dashboard', 'activity', limit] as const,
    health: ['dashboard', 'health'] as const,
  },
  organization: {
    current: ['organization'] as const,
    members: ['organization', 'members'] as const,
    invitations: ['organization', 'invitations'] as const,
    usage: ['organization', 'usage'] as const,
    plans: ['organization', 'plans'] as const,
  },
  apiKeys: {
    all: ['apiKeys'] as const,
    list: ['apiKeys', 'list'] as const,
    detail: (keyId: string) => ['apiKeys', 'detail', keyId] as const,
    usage: (keyId: string) => ['apiKeys', keyId, 'usage'] as const,
    orgAll: ['apiKeys', 'org'] as const,
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
    mutationFn: (id: string) => apiClient.post<{ success: boolean; latency?: number }>(`/servers/${id}/test`, {}),
  });
}

export interface ServerValidationResult {
  valid: boolean;
  latency?: number;
  serverVersion?: string;
  capabilities?: string[];
  status?: string;
  error?: string;
}

export function useValidateServerConnection() {
  return useMutation({
    mutationFn: (data: { url: string; masterToken: string }) =>
      apiClient.post<ServerValidationResult>('/servers/validate', data),
  });
}

// Server Health API Response
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

// Server Stats API Response
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

// Agent hooks
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

// Agent prompt creation hooks
export interface ParsedAgentConfig {
  name: string;
  role: 'MASTER' | 'SUPERVISOR' | 'WORKER';
  capabilities: string[];
  prompt: string;
  originalPrompt: string;
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

// Agent Stats API Response
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

// Agent Executions API Response
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

// Agent Hierarchy API Response
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

// Task hooks
export function useTasks(params?: { status?: string; agentId?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: queryKeys.tasks.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.agentId) searchParams.set('agentId', params.agentId);
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const response = await apiClient.get<{ tasks: Task[] } | PaginatedResponse<Task>>(`/tasks${query}`);
      // Transform API response to standard format
      if ('tasks' in response) {
        return {
          items: response.tasks,
          total: response.tasks.length,
          page: params?.page || 1,
          pageSize: params?.pageSize || 10,
          totalPages: 1,
        } as PaginatedResponse<Task>;
      }
      return response;
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

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

export function useRunTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post<TaskExecution>(`/tasks/${id}/execute`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.executions(id) });
    },
  });
}

export function useCancelTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/tasks/${id}/cancel`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.executions(id) });
    },
  });
}

// Bulk operations response type
export interface BulkOperationResult {
  success: boolean;
  results: Array<{
    id: string;
    success: boolean;
    error?: string;
  }>;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

// Bulk cancel tasks
export function useBulkCancelTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskIds: string[]) =>
      apiClient.post<BulkOperationResult>('/tasks/bulk/cancel', { taskIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

// Bulk delete tasks
export function useBulkDeleteTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskIds: string[]) =>
      apiClient.post<BulkOperationResult>('/tasks/bulk/delete', { taskIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

// Bulk update task status
export function useBulkUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskIds, status }: { taskIds: string[]; status: 'DRAFT' | 'PENDING' | 'SCHEDULED' | 'CANCELLED' }) =>
      apiClient.post<BulkOperationResult>('/tasks/bulk/status', { taskIds, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

// Bulk execute tasks
export function useBulkExecuteTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskIds: string[]) =>
      apiClient.post<BulkOperationResult>('/tasks/bulk/execute', { taskIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

// Bulk retry failed tasks
export function useBulkRetryTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskIds: string[]) =>
      apiClient.post<BulkOperationResult>('/tasks/bulk/retry', { taskIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

// Task Dependencies hooks
export interface TaskDependency {
  id: string;
  title: string;
  status: string;
}

export interface TaskDependenciesResponse {
  taskId: string;
  canExecute: boolean;
  dependencies: Array<{
    id: string;
    title: string;
    status: string;
    completed: boolean;
  }>;
  blockedBy: TaskDependency[];
}

export function useTaskDependencies(taskId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.dependencies(taskId),
    queryFn: () => apiClient.get<TaskDependenciesResponse>(`/tasks/${taskId}/dependencies`),
    enabled: !!taskId,
  });
}

export function useAddTaskDependencies() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, dependsOnIds }: { taskId: string; dependsOnIds: string[] }) =>
      apiClient.post<{ dependsOnIds: string[] }>(`/tasks/${taskId}/dependencies`, { dependsOnIds }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.dependencies(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.taskId) });
    },
  });
}

export function useRemoveTaskDependencies() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, dependsOnIds }: { taskId: string; dependsOnIds: string[] }) =>
      apiClient.delete(`/tasks/${taskId}/dependencies`, { data: { dependsOnIds } }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.dependencies(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.taskId) });
    },
  });
}

// Tools hooks
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

export interface ToolHealthCheckResult {
  toolName: string;
  healthStatus: 'HEALTHY' | 'UNHEALTHY' | 'UNKNOWN';
  lastHealthCheck: string;
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

// Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentId?: string;
  toolCalls?: Array<{
    name: string;
    params: Record<string, unknown>;
    result?: string;
  }>;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  agentId: string;
  createdAt: string;
  updatedAt: string;
}

// Chat hooks
export function useChatSessions(agentId?: string) {
  return useQuery({
    queryKey: agentId ? ['chat', 'sessions', agentId] : queryKeys.chat.sessions,
    queryFn: async () => {
      const query = agentId ? `?agentId=${agentId}` : '';
      const response = await apiClient.get<{ sessions: ChatSession[] }>(`/chat/sessions${query}`);
      return response.sessions;
    },
  });
}

export function useCreateChatSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (agentId: string) =>
      apiClient.post<ChatSession>('/chat/sessions', { agentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.sessions });
    },
  });
}

export function useChatMessages(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['chat', 'messages', sessionId],
    queryFn: async () => {
      const response = await apiClient.get<{ messages: ChatMessage[] }>(`/chat/sessions/${sessionId}/messages`);
      return response.messages;
    },
    enabled: !!sessionId,
  });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, content }: { sessionId: string; content: string }) =>
      apiClient.post<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(
        `/chat/sessions/${sessionId}/messages`,
        { content }
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', variables.sessionId] });
    },
  });
}

export function useSendChatMessageStreaming() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, content }: { sessionId: string; content: string }) =>
      apiClient.post<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(
        `/chat/sessions/${sessionId}/stream`,
        { content }
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', variables.sessionId] });
    },
  });
}

export function useClearChatSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiClient.delete(`/chat/sessions/${sessionId}`),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', sessionId] });
    },
  });
}

// Audit types (match Prisma AuditAction enum)
export type AuditAction =
  | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'PASSWORD_CHANGE' | 'TOKEN_REFRESH'
  | 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
  | 'SERVER_CONNECT' | 'SERVER_DISCONNECT' | 'HEALTH_CHECK'
  | 'AGENT_VALIDATE';
export type AuditStatus = 'SUCCESS' | 'FAILURE' | 'PARTIAL';

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
  status: AuditStatus;
  errorMessage?: string;
  duration?: number;
  timestamp: string;
}

export interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditStats {
  totalLogs: number;
  byAction: Record<string, number>;
  byStatus: Record<string, number>;
  byResource: Record<string, number>;
  avgDuration?: number;
}

export interface AuditQueryParams {
  userId?: string;
  action?: AuditAction;
  resource?: string;
  resourceId?: string;
  status?: AuditStatus;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// Audit hooks
export function useAuditLogs(params?: AuditQueryParams) {
  return useQuery({
    queryKey: queryKeys.audit.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.userId) searchParams.set('userId', params.userId);
      if (params?.action) searchParams.set('action', params.action);
      if (params?.resource) searchParams.set('resource', params.resource);
      if (params?.resourceId) searchParams.set('resourceId', params.resourceId);
      if (params?.status) searchParams.set('status', params.status);
      if (params?.startDate) searchParams.set('startDate', params.startDate);
      if (params?.endDate) searchParams.set('endDate', params.endDate);
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.offset) searchParams.set('offset', String(params.offset));
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return apiClient.get<AuditLogsResponse>(`/audit${query}`);
    },
    staleTime: 30 * 1000, // 30 seconds - audit logs can change frequently
  });
}

export function useAuditStats(hours: number = 24) {
  return useQuery({
    queryKey: queryKeys.audit.stats(hours),
    queryFn: () => apiClient.get<AuditStats>(`/audit/stats?hours=${hours}`),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useFailedLogins(hours: number = 24, limit: number = 100) {
  return useQuery({
    queryKey: queryKeys.audit.failedLogins(hours),
    queryFn: () => apiClient.get<AuditLogEntry[]>(`/audit/failed-logins?hours=${hours}&limit=${limit}`),
    staleTime: 30 * 1000,
  });
}

export function useAdminActions(hours: number = 24) {
  return useQuery({
    queryKey: queryKeys.audit.adminActions(hours),
    queryFn: () => apiClient.get<AuditLogEntry[]>(`/audit/admin-actions?hours=${hours}`),
    staleTime: 30 * 1000,
  });
}

export function useUserActivity(userId: string, limit: number = 50) {
  return useQuery({
    queryKey: queryKeys.audit.user(userId),
    queryFn: () => apiClient.get<AuditLogEntry[]>(`/audit/user/${userId}?limit=${limit}`),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useResourceHistory(resource: string, resourceId: string, limit: number = 20) {
  return useQuery({
    queryKey: queryKeys.audit.resource(resource, resourceId),
    queryFn: () => apiClient.get<AuditLogEntry[]>(`/audit/resource/${resource}/${resourceId}?limit=${limit}`),
    enabled: !!resource && !!resourceId,
    staleTime: 30 * 1000,
  });
}

export function useCleanupAuditLogs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (daysToKeep: number) =>
      apiClient.delete<{ deleted: number; remaining: number }>('/audit/cleanup', {
        data: { confirm: true, daysToKeep },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.audit.all });
    },
  });
}

export interface AuditExportParams {
  startDate?: string;
  endDate?: string;
  format?: 'json' | 'csv';
}

export interface AuditExportResult {
  logs: AuditLogEntry[];
  count: number;
  exportedAt: string;
}

export function useAuditExport() {
  return useMutation({
    mutationFn: async ({ startDate, endDate, format = 'json' }: AuditExportParams) => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('format', format);

      if (format === 'csv') {
        const response = await apiClient.get<string>(`/audit/export?${params.toString()}`);
        return { csv: response, format: 'csv' as const };
      }
      return apiClient.get<AuditExportResult>(`/audit/export?${params.toString()}`);
    },
  });
}

export interface IntegrityCheckResult {
  valid: boolean;
  total: number;
  checked: number;
  invalid: number;
  errors: Array<{ id: string; error: string }>;
}

export function useVerifyAuditIntegrity(limit: number = 100) {
  return useQuery({
    queryKey: ['audit', 'integrity', limit],
    queryFn: () => apiClient.get<IntegrityCheckResult>(`/audit/verify-integrity?limit=${limit}`),
    enabled: false, // Only run when explicitly triggered
  });
}

// =====================================================
// Dashboard Hooks
// =====================================================

// Raw API response type from backend
export interface DashboardStatsApiResponse {
  overview: {
    servers: { total: number; online: number; offline: number };
    agents: { total: number; active: number; inactive: number };
    tasks: { total: number; running: number; pending: number };
  };
  executionStats: {
    period: string;
    total: number;
    success: number;
    failure: number;
    successRate: number;
    breakdown: Record<string, number>;
  };
  recentExecutions: Array<{
    id: string;
    taskTitle: string;
    agentName: string;
    status: string;
    durationMs: number | null;
    tokensUsed: number | null;
    startedAt: string;
    completedAt: string | null;
  }>;
}

// Transformed type for frontend components
export interface DashboardStats {
  servers: { total: number; online: number; offline: number };
  agents: { total: number; active: number; idle: number; error: number };
  tasks: { total: number; pending: number; running: number; completed: number; failed: number };
  executions: { today: number; thisWeek: number; avgDuration: number };
}

// Raw activity from backend (audit log based)
export interface DashboardActivityApiResponse {
  activities: Array<{
    id: string;
    action: string;
    resource: string;
    resourceId?: string;
    status: string;
    userEmail?: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface DashboardActivity {
  id: string;
  type: 'task_completed' | 'task_failed' | 'agent_created' | 'server_connected' | 'server_error';
  message: string;
  resourceId?: string;
  resourceType?: string;
  timestamp: string;
}

// Raw API response from backend
export interface DashboardHealthApiResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  components: {
    database: { status: 'healthy' | 'unhealthy' };
    servers: Array<{
      id: string;
      name: string;
      status: 'healthy' | 'degraded' | 'unhealthy';
      lastCheck: string | null;
      error: string | null;
    }>;
  };
}

// Transformed type for frontend components
export interface DashboardHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  database: { status: 'healthy' | 'unhealthy' };
  servers: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    details: Array<{
      id: string;
      name: string;
      status: 'healthy' | 'degraded' | 'unhealthy';
      lastCheck: string | null;
      error: string | null;
    }>;
  };
}

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: async (): Promise<DashboardStats> => {
      const response = await apiClient.get<DashboardStatsApiResponse>('/dashboard/stats');

      // Transform API response to frontend format
      const { overview, executionStats } = response;

      return {
        servers: overview.servers,
        agents: {
          total: overview.agents.total,
          active: overview.agents.active,
          idle: overview.agents.inactive,
          error: 0, // Not tracked in backend
        },
        tasks: {
          total: overview.tasks.total,
          pending: overview.tasks.pending,
          running: overview.tasks.running,
          completed: executionStats.breakdown?.COMPLETED ?? 0,
          failed: executionStats.failure,
        },
        executions: {
          today: executionStats.total, // 7-day total for now
          thisWeek: executionStats.total,
          avgDuration: 0, // Not calculated in backend
        },
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

export function useDashboardActivity(limit: number = 20) {
  return useQuery({
    queryKey: queryKeys.dashboard.activity(limit),
    queryFn: async () => {
      const response = await apiClient.get<DashboardActivityApiResponse>(`/dashboard/activity?limit=${limit}`);

      // Transform audit log actions to activity types
      const activities: DashboardActivity[] = response.activities.map((log) => {
        let type: DashboardActivity['type'] = 'task_completed';
        let message = `${log.action} on ${log.resource}`;

        // Map audit actions to activity types
        if (log.resource === 'Task') {
          if (log.action === 'CREATE') {
            type = 'task_completed';
            message = `Task created`;
          } else if (log.status === 'FAILURE') {
            type = 'task_failed';
            message = `Task failed`;
          }
        } else if (log.resource === 'Agent' && log.action === 'CREATE') {
          type = 'agent_created';
          message = `Agent created`;
        } else if (log.resource === 'Server') {
          if (log.action === 'SERVER_CONNECT') {
            type = 'server_connected';
            message = `Server connected`;
          } else if (log.status === 'FAILURE') {
            type = 'server_error';
            message = `Server error`;
          }
        }

        return {
          id: log.id,
          type,
          message: log.userEmail ? `${message} by ${log.userEmail}` : message,
          resourceId: log.resourceId,
          resourceType: log.resource,
          timestamp: log.timestamp,
        };
      });

      return { activities };
    },
    staleTime: 30 * 1000,
  });
}

export function useDashboardHealth() {
  return useQuery({
    queryKey: queryKeys.dashboard.health,
    queryFn: async (): Promise<DashboardHealth> => {
      const response = await apiClient.get<DashboardHealthApiResponse>('/dashboard/health');

      // Transform API response to frontend format
      const servers = response.components.servers;
      const healthyCnt = servers.filter((s) => s.status === 'healthy').length;
      const degradedCnt = servers.filter((s) => s.status === 'degraded').length;
      const unhealthyCnt = servers.filter((s) => s.status === 'unhealthy').length;

      return {
        status: response.status,
        timestamp: response.timestamp,
        database: response.components.database,
        servers: {
          total: servers.length,
          healthy: healthyCnt,
          degraded: degradedCnt,
          unhealthy: unhealthyCnt,
          details: servers,
        },
      };
    },
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });
}

// =====================================================
// Organization Hooks
// =====================================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  settings: Record<string, unknown>;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  email: string;
  name?: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt: string;
}

export interface OrganizationInvitation {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expiresAt: string;
  createdAt: string;
  invitedBy: string;
}

export interface OrganizationUsage {
  servers: { used: number; limit: number };
  agents: { used: number; limit: number };
  tasks: { used: number; limit: number };
  apiCalls: { used: number; limit: number };
  storage: { used: number; limit: number };
}

export interface OrganizationPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  limits: {
    servers: number;
    agents: number;
    tasks: number;
    apiCalls: number;
    storage: number;
  };
}

export function useOrganization() {
  return useQuery({
    queryKey: queryKeys.organization.current,
    queryFn: () => apiClient.get<Organization>('/organization'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Organization>) =>
      apiClient.patch<Organization>('/organization', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organization.current });
    },
  });
}

export function useOrganizationMembers() {
  return useQuery({
    queryKey: queryKeys.organization.members,
    queryFn: () => apiClient.get<{ members: OrganizationMember[] }>('/organization/members'),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: OrganizationMember['role'] }) =>
      apiClient.patch(`/organization/members/${memberId}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organization.members });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      apiClient.delete(`/organization/members/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organization.members });
    },
  });
}

export function useOrganizationInvitations() {
  return useQuery({
    queryKey: queryKeys.organization.invitations,
    queryFn: () => apiClient.get<{ invitations: OrganizationInvitation[] }>('/organization/invitations'),
    staleTime: 60 * 1000,
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; role: OrganizationInvitation['role'] }) =>
      apiClient.post<OrganizationInvitation>('/organization/invitations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organization.invitations });
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      apiClient.delete(`/organization/invitations/${invitationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organization.invitations });
    },
  });
}

export function useOrganizationUsage() {
  return useQuery({
    queryKey: queryKeys.organization.usage,
    queryFn: () => apiClient.get<OrganizationUsage>('/organization/usage'),
    staleTime: 60 * 1000,
  });
}

export function useOrganizationPlans() {
  return useQuery({
    queryKey: queryKeys.organization.plans,
    queryFn: () => apiClient.get<{ plans: OrganizationPlan[] }>('/organization/plans'),
    staleTime: 10 * 60 * 1000, // 10 minutes - plans don't change often
  });
}

// =====================================================
// API Keys Hooks
// =====================================================

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string; // First 8 chars for display
  scopes: string[];
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
  createdBy: string;
  status: 'active' | 'revoked' | 'expired';
}

export interface ApiKeyWithSecret extends ApiKey {
  key: string; // Full key, only shown once at creation
}

export interface ApiKeyUsage {
  keyId: string;
  totalCalls: number;
  callsToday: number;
  callsThisWeek: number;
  callsThisMonth: number;
  lastEndpoints: Array<{
    endpoint: string;
    method: string;
    timestamp: string;
    status: number;
  }>;
}

export function useApiKeys() {
  return useQuery({
    queryKey: queryKeys.apiKeys.list,
    queryFn: () => apiClient.get<{ keys: ApiKey[] }>('/keys'),
    staleTime: 60 * 1000,
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; scopes: string[]; expiresAt?: string }) =>
      apiClient.post<ApiKeyWithSecret>('/keys', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
    },
  });
}

export function useApiKey(keyId: string) {
  return useQuery({
    queryKey: queryKeys.apiKeys.detail(keyId),
    queryFn: () => apiClient.get<ApiKey>(`/keys/${keyId}`),
    enabled: !!keyId,
  });
}

export function useUpdateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ keyId, data }: { keyId: string; data: { name?: string; scopes?: string[] } }) =>
      apiClient.patch<ApiKey>(`/keys/${keyId}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.detail(variables.keyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) =>
      apiClient.delete(`/keys/${keyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
    },
  });
}

export function useRegenerateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) =>
      apiClient.post<ApiKeyWithSecret>(`/keys/${keyId}/regenerate`, {}),
    onSuccess: (_, keyId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.detail(keyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
    },
  });
}

export function useApiKeyUsage(keyId: string) {
  return useQuery({
    queryKey: queryKeys.apiKeys.usage(keyId),
    queryFn: () => apiClient.get<ApiKeyUsage>(`/keys/${keyId}/usage`),
    enabled: !!keyId,
    staleTime: 30 * 1000,
  });
}

// Org-level API keys (admin only)
export function useOrgApiKeys() {
  return useQuery({
    queryKey: queryKeys.apiKeys.orgAll,
    queryFn: () => apiClient.get<{ keys: ApiKey[] }>('/keys/org/all'),
    staleTime: 60 * 1000,
  });
}

export function useRevokeOrgApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) =>
      apiClient.delete(`/keys/org/${keyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.orgAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
    },
  });
}

// =====================================================
// Auth Complementary Hooks
// =====================================================

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      apiClient.post<{ message: string }>('/auth/forgot-password', { email }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      apiClient.post<{ message: string }>('/auth/reset-password', { token, password }),
  });
}

export function useSendVerification() {
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ message: string }>('/auth/send-verification', {}),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) =>
      apiClient.post<{ message: string }>('/auth/verify-email', { token }),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; email?: string }) =>
      apiClient.patch<User>('/auth/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      apiClient.post<{ message: string }>('/auth/change-password', { currentPassword, newPassword }),
  });
}
