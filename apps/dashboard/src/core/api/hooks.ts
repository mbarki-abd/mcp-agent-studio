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
