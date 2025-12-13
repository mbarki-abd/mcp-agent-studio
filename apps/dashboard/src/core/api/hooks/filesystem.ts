import { useQuery, useMutation, UseQueryOptions } from '@tanstack/react-query';
import { ApiError } from '../client';
import { useQueryClient } from './common';

// =====================================================
// Filesystem API Types
// =====================================================

export type FileType = 'file' | 'directory' | 'symlink';

export interface FileEntry {
  name: string;
  path: string;
  type: FileType;
  size: number;
  permissions: string;  // e.g., "rwxr-xr-x"
  owner: string;
  group: string;
  modifiedAt: string;
  accessedAt: string;
  isHidden: boolean;
  extension?: string;  // For files
  mimeType?: string;
}

export interface DirectoryListing {
  path: string;
  entries: FileEntry[];
  total: number;
  hasMore: boolean;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: FileType;
  children?: FileTreeNode[];
  size?: number;
}

export interface FileContent {
  path: string;
  content: string;
  encoding: string;  // 'utf-8', 'base64'
  size: number;
  mimeType: string;
  isBinary: boolean;
}

export interface WriteFileRequest {
  path: string;
  content: string;
  encoding?: string;
  createDirectories?: boolean;  // mkdir -p
}

export interface RenameRequest {
  sourcePath: string;
  destPath: string;
  overwrite?: boolean;
}

export interface CopyRequest {
  sourcePath: string;
  destPath: string;
  recursive?: boolean;
}

export interface SearchResult {
  path: string;
  name: string;
  type: FileType;
  matches?: { line: number; content: string }[];  // For content search
}

export interface DirectoryListingOptions {
  path?: string;
  showHidden?: boolean;
}

export interface FileTreeOptions {
  maxDepth?: number;
}

export interface SearchOptions {
  query: string;
  path?: string;
}

// =====================================================
// Remote Server API Client
// =====================================================

/**
 * Makes API calls to remote mcp-agent-server instances for filesystem operations
 */
class RemoteFilesystemClient {
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
        errorData.error || errorData.message || 'Remote filesystem request failed',
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

const remoteClient = new RemoteFilesystemClient();

// =====================================================
// Query Keys
// =====================================================

export const filesystemQueryKeys = {
  all: (serverUrl: string, agentId: string) => ['filesystem', serverUrl, agentId] as const,
  directory: (serverUrl: string, agentId: string, path: string, showHidden: boolean) =>
    ['filesystem', serverUrl, agentId, 'directory', path, showHidden] as const,
  tree: (serverUrl: string, agentId: string, maxDepth: number) =>
    ['filesystem', serverUrl, agentId, 'tree', maxDepth] as const,
  file: (serverUrl: string, agentId: string, path: string) =>
    ['filesystem', serverUrl, agentId, 'file', path] as const,
  search: (serverUrl: string, agentId: string, query: string, path: string) =>
    ['filesystem', serverUrl, agentId, 'search', query, path] as const,
};

// =====================================================
// Filesystem Query Hooks
// =====================================================

/**
 * Lists directory contents
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param agentId - The agent ID
 * @param options - Directory listing options
 * @param queryOptions - React Query options
 */
export function useDirectoryListing(
  serverUrl: string,
  token: string,
  agentId: string,
  options: DirectoryListingOptions = {},
  queryOptions?: Omit<UseQueryOptions<DirectoryListing, ApiError>, 'queryKey' | 'queryFn'>
) {
  const { path = './', showHidden = false } = options;

  return useQuery({
    queryKey: filesystemQueryKeys.directory(serverUrl, agentId, path, showHidden),
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({
        path,
        showHidden: showHidden.toString(),
      });
      return remoteClient.get<DirectoryListing>(
        serverUrl,
        token,
        `/api/agents/${agentId}/fs?${params}`,
        signal
      );
    },
    enabled: !!serverUrl && !!token && !!agentId,
    staleTime: 30 * 1000, // 30 seconds
    ...queryOptions,
  });
}

/**
 * Fetches directory tree structure
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param agentId - The agent ID
 * @param options - File tree options
 * @param queryOptions - React Query options
 */
export function useFileTree(
  serverUrl: string,
  token: string,
  agentId: string,
  options: FileTreeOptions = {},
  queryOptions?: Omit<UseQueryOptions<FileTreeNode, ApiError>, 'queryKey' | 'queryFn'>
) {
  const { maxDepth = 3 } = options;

  return useQuery({
    queryKey: filesystemQueryKeys.tree(serverUrl, agentId, maxDepth),
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({
        maxDepth: maxDepth.toString(),
      });
      return remoteClient.get<FileTreeNode>(
        serverUrl,
        token,
        `/api/agents/${agentId}/fs/tree?${params}`,
        signal
      );
    },
    enabled: !!serverUrl && !!token && !!agentId,
    staleTime: 60 * 1000, // 1 minute
    ...queryOptions,
  });
}

/**
 * Reads file content
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param agentId - The agent ID
 * @param path - The file path
 * @param queryOptions - React Query options
 */
export function useFileContent(
  serverUrl: string,
  token: string,
  agentId: string,
  path: string,
  queryOptions?: Omit<UseQueryOptions<FileContent, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: filesystemQueryKeys.file(serverUrl, agentId, path),
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ path });
      return remoteClient.get<FileContent>(
        serverUrl,
        token,
        `/api/agents/${agentId}/fs/file?${params}`,
        signal
      );
    },
    enabled: !!serverUrl && !!token && !!agentId && !!path,
    staleTime: 10 * 1000, // 10 seconds
    ...queryOptions,
  });
}

/**
 * Searches for files
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param agentId - The agent ID
 * @param options - Search options
 * @param queryOptions - React Query options
 */
export function useSearchFiles(
  serverUrl: string,
  token: string,
  agentId: string,
  options: SearchOptions,
  queryOptions?: Omit<UseQueryOptions<SearchResult[], ApiError>, 'queryKey' | 'queryFn'>
) {
  const { query, path = './' } = options;

  return useQuery({
    queryKey: filesystemQueryKeys.search(serverUrl, agentId, query, path),
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ q: query, path });
      return remoteClient.get<SearchResult[]>(
        serverUrl,
        token,
        `/api/agents/${agentId}/fs/search?${params}`,
        signal
      );
    },
    enabled: !!serverUrl && !!token && !!agentId && !!query,
    staleTime: 30 * 1000, // 30 seconds
    ...queryOptions,
  });
}

// =====================================================
// Filesystem Mutation Hooks
// =====================================================

/**
 * Writes content to a file
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param agentId - The agent ID
 */
export function useWriteFile(serverUrl: string, token: string, agentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: WriteFileRequest) =>
      remoteClient.put<{ success: boolean; path: string }>(
        serverUrl,
        token,
        `/api/agents/${agentId}/fs/file`,
        request
      ),
    onSuccess: (data) => {
      // Invalidate directory listing for the parent directory
      const parentPath = data.path.split('/').slice(0, -1).join('/') || './';
      queryClient.invalidateQueries({
        queryKey: ['filesystem', serverUrl, agentId, 'directory', parentPath]
      });
      // Invalidate tree
      queryClient.invalidateQueries({
        queryKey: ['filesystem', serverUrl, agentId, 'tree']
      });
      // Invalidate the specific file
      queryClient.invalidateQueries({
        queryKey: filesystemQueryKeys.file(serverUrl, agentId, data.path)
      });
    },
  });
}

/**
 * Creates a new directory
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param agentId - The agent ID
 */
export function useCreateDirectory(serverUrl: string, token: string, agentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ path, recursive = false }: { path: string; recursive?: boolean }) =>
      remoteClient.post<{ success: boolean; path: string }>(
        serverUrl,
        token,
        `/api/agents/${agentId}/fs/mkdir`,
        { path, recursive }
      ),
    onSuccess: (data) => {
      // Invalidate directory listing for the parent directory
      const parentPath = data.path.split('/').slice(0, -1).join('/') || './';
      queryClient.invalidateQueries({
        queryKey: ['filesystem', serverUrl, agentId, 'directory', parentPath]
      });
      // Invalidate tree
      queryClient.invalidateQueries({
        queryKey: ['filesystem', serverUrl, agentId, 'tree']
      });
    },
  });
}

/**
 * Deletes a file or directory
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param agentId - The agent ID
 */
export function useDeletePath(serverUrl: string, token: string, agentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ path, recursive = false }: { path: string; recursive?: boolean }) => {
      const params = new URLSearchParams({ path });
      if (recursive) {
        params.append('recursive', 'true');
      }
      return remoteClient.delete<{ success: boolean }>(
        serverUrl,
        token,
        `/api/agents/${agentId}/fs?${params}`
      );
    },
    onSuccess: () => {
      // Invalidate all filesystem queries for this agent
      queryClient.invalidateQueries({
        queryKey: filesystemQueryKeys.all(serverUrl, agentId)
      });
    },
  });
}

/**
 * Renames or moves a file/directory
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param agentId - The agent ID
 */
export function useRenamePath(serverUrl: string, token: string, agentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RenameRequest) =>
      remoteClient.post<{ success: boolean }>(
        serverUrl,
        token,
        `/api/agents/${agentId}/fs/rename`,
        request
      ),
    onSuccess: () => {
      // Invalidate all filesystem queries for this agent
      queryClient.invalidateQueries({
        queryKey: filesystemQueryKeys.all(serverUrl, agentId)
      });
    },
  });
}

/**
 * Copies a file or directory
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param agentId - The agent ID
 */
export function useCopyPath(serverUrl: string, token: string, agentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CopyRequest) =>
      remoteClient.post<{ success: boolean }>(
        serverUrl,
        token,
        `/api/agents/${agentId}/fs/copy`,
        request
      ),
    onSuccess: (_, variables) => {
      // Invalidate directory listing for the destination directory
      const destParentPath = variables.destPath.split('/').slice(0, -1).join('/') || './';
      queryClient.invalidateQueries({
        queryKey: ['filesystem', serverUrl, agentId, 'directory', destParentPath]
      });
      // Invalidate tree
      queryClient.invalidateQueries({
        queryKey: ['filesystem', serverUrl, agentId, 'tree']
      });
    },
  });
}
