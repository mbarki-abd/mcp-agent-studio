import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { ApiError } from '../client';
import { useQueryClient } from './common';

// =====================================================
// Projects API Types
// =====================================================

export type ProjectType = 'generic' | 'nodejs' | 'python' | 'web' | 'api' | 'fullstack' | 'library' | 'script' | 'data' | 'docs' | 'custom';
export type ProjectStatus = 'active' | 'inactive' | 'archived';

export interface ProjectStats {
  filesCount: number;
  totalSize: number;
  lastCommit?: string;
  lastActivity?: string;
}

export interface ProjectSettings {
  autoSync?: boolean;
  buildCommand?: string;
  testCommand?: string;
}

export interface Project {
  id: string;
  name: string;
  workspaceId: string;
  workspaceName: string;
  type: ProjectType;
  status: ProjectStatus;
  description?: string;
  path: string;
  gitUrl?: string;
  defaultBranch?: string;
  language?: string;
  framework?: string;
  stats?: ProjectStats;
  settings?: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  workspaceId: string;
  type: ProjectType;
  description?: string;
  gitUrl?: string;
  initGit?: boolean;
  template?: string;
  settings?: ProjectSettings;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  settings?: ProjectSettings;
}

export interface ProjectFilters {
  workspaceId?: string;
  type?: ProjectType;
  status?: ProjectStatus;
  language?: string;
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

export const projectsQueryKeys = {
  all: (serverUrl: string) => ['projects', serverUrl] as const,
  lists: (serverUrl: string) => ['projects', serverUrl, 'list'] as const,
  list: (serverUrl: string, filters?: ProjectFilters) => ['projects', serverUrl, 'list', filters] as const,
  detail: (serverUrl: string, projectId: string) => ['projects', serverUrl, 'detail', projectId] as const,
  workspace: (serverUrl: string, workspaceId: string) => ['projects', serverUrl, 'workspace', workspaceId] as const,
  search: (serverUrl: string, query: string) => ['projects', serverUrl, 'search', query] as const,
};

// =====================================================
// Projects Query Hooks
// =====================================================

/**
 * Fetches all projects with optional filters
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param filters - Optional filters for projects
 * @param options - React Query options
 */
export function useProjects(
  serverUrl: string,
  token: string,
  filters?: ProjectFilters,
  options?: Omit<UseQueryOptions<Project[], ApiError>, 'queryKey' | 'queryFn'>
) {
  const queryParams = new URLSearchParams();
  if (filters?.workspaceId) queryParams.append('workspaceId', filters.workspaceId);
  if (filters?.type) queryParams.append('type', filters.type);
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.language) queryParams.append('language', filters.language);

  const endpoint = `/api/projects${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  return useQuery({
    queryKey: projectsQueryKeys.list(serverUrl, filters),
    queryFn: ({ signal }) =>
      remoteClient.get<Project[]>(serverUrl, token, endpoint, signal),
    enabled: !!serverUrl && !!token,
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
}

/**
 * Fetches a single project by ID
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param projectId - The project ID
 * @param options - React Query options
 */
export function useProject(
  serverUrl: string,
  token: string,
  projectId: string,
  options?: Omit<UseQueryOptions<Project, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: projectsQueryKeys.detail(serverUrl, projectId),
    queryFn: ({ signal }) =>
      remoteClient.get<Project>(serverUrl, token, `/api/projects/${projectId}`, signal),
    enabled: !!serverUrl && !!token && !!projectId,
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
}

/**
 * Fetches all projects in a workspace
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param workspaceId - The workspace ID
 * @param options - React Query options
 */
export function useWorkspaceProjects(
  serverUrl: string,
  token: string,
  workspaceId: string,
  options?: Omit<UseQueryOptions<Project[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: projectsQueryKeys.workspace(serverUrl, workspaceId),
    queryFn: ({ signal }) =>
      remoteClient.get<Project[]>(serverUrl, token, `/api/workspaces/${workspaceId}/projects`, signal),
    enabled: !!serverUrl && !!token && !!workspaceId,
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
}

/**
 * Searches projects by query string
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param query - The search query
 * @param options - React Query options
 */
export function useSearchProjects(
  serverUrl: string,
  token: string,
  query: string,
  options?: Omit<UseQueryOptions<Project[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: projectsQueryKeys.search(serverUrl, query),
    queryFn: ({ signal }) =>
      remoteClient.get<Project[]>(serverUrl, token, `/api/projects/search?q=${encodeURIComponent(query)}`, signal),
    enabled: !!serverUrl && !!token && !!query && query.length > 0,
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
}

// =====================================================
// Projects Mutation Hooks
// =====================================================

/**
 * Creates a new project
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param options - React Query mutation options
 */
export function useCreateProject(
  serverUrl: string,
  token: string,
  options?: Omit<UseMutationOptions<Project, ApiError, CreateProjectRequest>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectRequest) =>
      remoteClient.post<Project>(serverUrl, token, '/api/projects', data),
    onSuccess: (newProject) => {
      // Invalidate all project lists for this server
      queryClient.invalidateQueries({ queryKey: projectsQueryKeys.lists(serverUrl) });
      // Invalidate workspace projects list
      queryClient.invalidateQueries({ queryKey: projectsQueryKeys.workspace(serverUrl, newProject.workspaceId) });
    },
    ...options,
  });
}

/**
 * Updates an existing project
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param options - React Query mutation options
 */
export function useUpdateProject(
  serverUrl: string,
  token: string,
  options?: Omit<UseMutationOptions<Project, ApiError, { projectId: string; data: UpdateProjectRequest }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: UpdateProjectRequest }) =>
      remoteClient.put<Project>(serverUrl, token, `/api/projects/${projectId}`, data),
    onSuccess: (updatedProject, { projectId }) => {
      // Invalidate all project lists for this server
      queryClient.invalidateQueries({ queryKey: projectsQueryKeys.lists(serverUrl) });
      // Invalidate the specific project
      queryClient.invalidateQueries({ queryKey: projectsQueryKeys.detail(serverUrl, projectId) });
      // Invalidate workspace projects list
      queryClient.invalidateQueries({ queryKey: projectsQueryKeys.workspace(serverUrl, updatedProject.workspaceId) });
    },
    ...options,
  });
}

/**
 * Deletes a project
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param options - React Query mutation options
 */
export function useDeleteProject(
  serverUrl: string,
  token: string,
  options?: Omit<UseMutationOptions<{ success: boolean; message: string }, ApiError, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) =>
      remoteClient.delete<{ success: boolean; message: string }>(serverUrl, token, `/api/projects/${projectId}`),
    onSuccess: () => {
      // Invalidate all project queries for this server
      queryClient.invalidateQueries({ queryKey: projectsQueryKeys.all(serverUrl) });
    },
    ...options,
  });
}
