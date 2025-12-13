import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { ApiError } from '../client';
import { useQueryClient } from './common';

// =====================================================
// Workspaces API Types
// =====================================================

export type WorkspaceType = 'personal' | 'team' | 'shared';

export interface WorkspaceSettings {
  defaultBranch?: string;
  autoSync?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  ownerId: string;  // Agent ID
  ownerName: string;
  description?: string;
  path: string;  // Filesystem path
  projectsCount: number;
  membersCount: number;
  settings?: WorkspaceSettings;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;  // Soft delete timestamp
}

export interface CreateWorkspaceRequest {
  name: string;
  type: WorkspaceType;
  description?: string;
  settings?: WorkspaceSettings;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  settings?: WorkspaceSettings;
}

export interface WorkspaceStats {
  totalProjects: number;
  activeProjects: number;
  totalFiles: number;
  totalSize: number;  // bytes
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

  put<T>(serverUrl: string, token: string, endpoint: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>(serverUrl, token, endpoint, { method: 'PUT', body, signal });
  }

  delete<T>(serverUrl: string, token: string, endpoint: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>(serverUrl, token, endpoint, { method: 'DELETE', signal });
  }
}

const remoteClient = new RemoteServerClient();

// =====================================================
// Query Keys
// =====================================================

export const workspacesQueryKeys = {
  all: (serverUrl: string) => ['workspaces', serverUrl] as const,
  lists: (serverUrl: string) => ['workspaces', serverUrl, 'list'] as const,
  list: (serverUrl: string, filters?: string) => ['workspaces', serverUrl, 'list', filters] as const,
  details: (serverUrl: string) => ['workspaces', serverUrl, 'detail'] as const,
  detail: (serverUrl: string, workspaceId: string) => ['workspaces', serverUrl, 'detail', workspaceId] as const,
  stats: (serverUrl: string, workspaceId: string) => ['workspaces', serverUrl, 'stats', workspaceId] as const,
};

// =====================================================
// Workspaces Hooks
// =====================================================

/**
 * Fetches all workspaces
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param options - React Query options
 */
export function useWorkspaces(
  serverUrl: string,
  token: string,
  options?: Omit<UseQueryOptions<Workspace[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: workspacesQueryKeys.lists(serverUrl),
    queryFn: ({ signal }) =>
      remoteClient.get<Workspace[]>(serverUrl, token, '/api/workspaces', signal),
    enabled: !!serverUrl && !!token,
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
}

/**
 * Fetches a specific workspace by ID
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param workspaceId - The workspace ID
 * @param options - React Query options
 */
export function useWorkspace(
  serverUrl: string,
  token: string,
  workspaceId: string,
  options?: Omit<UseQueryOptions<Workspace, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: workspacesQueryKeys.detail(serverUrl, workspaceId),
    queryFn: ({ signal }) =>
      remoteClient.get<Workspace>(serverUrl, token, `/api/workspaces/${workspaceId}`, signal),
    enabled: !!serverUrl && !!token && !!workspaceId,
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
}

/**
 * Fetches workspace statistics
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param workspaceId - The workspace ID
 * @param options - React Query options
 */
export function useWorkspaceStats(
  serverUrl: string,
  token: string,
  workspaceId: string,
  options?: Omit<UseQueryOptions<WorkspaceStats, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: workspacesQueryKeys.stats(serverUrl, workspaceId),
    queryFn: ({ signal }) =>
      remoteClient.get<WorkspaceStats>(serverUrl, token, `/api/workspaces/${workspaceId}/stats`, signal),
    enabled: !!serverUrl && !!token && !!workspaceId,
    staleTime: 60 * 1000, // 60 seconds
    ...options,
  });
}

/**
 * Creates a new workspace
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 */
export function useCreateWorkspace(
  serverUrl: string,
  token: string,
  options?: Omit<UseMutationOptions<Workspace, ApiError, CreateWorkspaceRequest>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkspaceRequest) =>
      remoteClient.post<Workspace>(serverUrl, token, '/api/workspaces', data),
    onSuccess: () => {
      // Invalidate workspaces list to refetch with new workspace
      queryClient.invalidateQueries({ queryKey: workspacesQueryKeys.lists(serverUrl) });
    },
    ...options,
  });
}

/**
 * Updates an existing workspace
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 */
export function useUpdateWorkspace(
  serverUrl: string,
  token: string,
  options?: Omit<UseMutationOptions<Workspace, ApiError, { workspaceId: string; data: UpdateWorkspaceRequest }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: UpdateWorkspaceRequest }) =>
      remoteClient.put<Workspace>(serverUrl, token, `/api/workspaces/${workspaceId}`, data),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate the specific workspace and the list
      queryClient.invalidateQueries({ queryKey: workspacesQueryKeys.detail(serverUrl, workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspacesQueryKeys.lists(serverUrl) });
    },
    ...options,
  });
}

/**
 * Deletes a workspace (soft delete by default, supports hard delete)
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 */
export function useDeleteWorkspace(
  serverUrl: string,
  token: string,
  options?: Omit<UseMutationOptions<{ success: boolean; message: string }, ApiError, { workspaceId: string; hard?: boolean }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, hard = false }: { workspaceId: string; hard?: boolean }) => {
      const endpoint = hard
        ? `/api/workspaces/${workspaceId}?hard=true`
        : `/api/workspaces/${workspaceId}`;
      return remoteClient.delete<{ success: boolean; message: string }>(serverUrl, token, endpoint);
    },
    onSuccess: (_, { workspaceId }) => {
      // Remove from cache and invalidate list
      queryClient.removeQueries({ queryKey: workspacesQueryKeys.detail(serverUrl, workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspacesQueryKeys.lists(serverUrl) });
    },
    ...options,
  });
}
