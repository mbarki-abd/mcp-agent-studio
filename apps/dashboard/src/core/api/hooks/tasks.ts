import { useQuery, useMutation, UseQueryOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../client';
import type { Task, TaskExecution, PaginatedResponse } from '@mcp/types';
import { queryKeys, useQueryClient } from './common';

// =====================================================
// Task Hooks
// =====================================================

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
