import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { ApiError } from '../client';
import { useQueryClient } from './common';

// =====================================================
// Credentials API Types
// =====================================================

export type CredentialType = 'api_key' | 'password' | 'ssh_key' | 'token' | 'certificate' | 'secret' | 'other';
export type CredentialVisibility = 'private' | 'internal' | 'public';

export interface Credential {
  id: string;
  name: string;
  type: CredentialType;
  visibility: CredentialVisibility;
  agentId: string;
  description?: string;
  metadata?: Record<string, unknown>;
  sharedWith?: string[];  // Agent IDs
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
}

export interface CreateCredentialRequest {
  name: string;
  type: CredentialType;
  value: string;  // Will be encrypted server-side
  visibility: CredentialVisibility;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateCredentialRequest {
  name?: string;
  type?: CredentialType;
  value?: string;  // Will be encrypted server-side
  visibility?: CredentialVisibility;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface CredentialValue {
  id: string;
  value: string;  // Decrypted value
  accessedAt: string;
}

export interface CredentialAuditEntry {
  id: string;
  action: 'created' | 'accessed' | 'updated' | 'deleted' | 'shared' | 'unshared';
  actorId: string;
  actorName: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface ShareCredentialRequest {
  targetAgentId: string;
  permissions?: string[];  // 'read', 'write'
}

export interface ShareCredentialResponse {
  success: boolean;
  message: string;
}

export interface UnshareCredentialResponse {
  success: boolean;
  message: string;
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

export const credentialsQueryKeys = {
  all: (serverUrl: string) => ['credentials', serverUrl] as const,
  list: (serverUrl: string) => ['credentials', serverUrl, 'list'] as const,
  search: (serverUrl: string, query: string) => ['credentials', serverUrl, 'search', query] as const,
  detail: (serverUrl: string, credentialId: string) => ['credentials', serverUrl, 'detail', credentialId] as const,
  value: (serverUrl: string, credentialId: string) => ['credentials', serverUrl, 'value', credentialId] as const,
  audit: (serverUrl: string, credentialId: string) => ['credentials', serverUrl, 'audit', credentialId] as const,
};

// =====================================================
// Credentials Hooks
// =====================================================

/**
 * Fetches all credentials (without values) for the authenticated agent
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param options - React Query options
 */
export function useCredentials(
  serverUrl: string,
  token: string,
  options?: Omit<UseQueryOptions<Credential[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: credentialsQueryKeys.list(serverUrl),
    queryFn: ({ signal }) =>
      remoteClient.get<Credential[]>(serverUrl, token, '/api/credentials', signal),
    enabled: !!serverUrl && !!token,
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
}

/**
 * Searches credentials by query string (without values)
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param query - Search query string
 * @param options - React Query options
 */
export function useSearchCredentials(
  serverUrl: string,
  token: string,
  query: string,
  options?: Omit<UseQueryOptions<Credential[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: credentialsQueryKeys.search(serverUrl, query),
    queryFn: ({ signal }) =>
      remoteClient.get<Credential[]>(serverUrl, token, `/api/credentials/search?q=${encodeURIComponent(query)}`, signal),
    enabled: !!serverUrl && !!token && !!query,
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
}

/**
 * Fetches a single credential's details (without value)
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param credentialId - The credential ID
 * @param options - React Query options
 */
export function useCredential(
  serverUrl: string,
  token: string,
  credentialId: string,
  options?: Omit<UseQueryOptions<Credential, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: credentialsQueryKeys.detail(serverUrl, credentialId),
    queryFn: ({ signal }) =>
      remoteClient.get<Credential>(serverUrl, token, `/api/credentials/${credentialId}`, signal),
    enabled: !!serverUrl && !!token && !!credentialId,
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
}

/**
 * Fetches the decrypted value of a credential
 *
 * WARNING: This hook retrieves the decrypted secret value. Every access is logged
 * for security audit purposes. Use this hook sparingly and only when absolutely necessary.
 * The value is never cached (staleTime: 0) for security reasons.
 *
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param credentialId - The credential ID
 * @param options - React Query options
 */
export function useCredentialValue(
  serverUrl: string,
  token: string,
  credentialId: string,
  options?: Omit<UseQueryOptions<CredentialValue, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: credentialsQueryKeys.value(serverUrl, credentialId),
    queryFn: ({ signal }) =>
      remoteClient.get<CredentialValue>(serverUrl, token, `/api/credentials/${credentialId}/value`, signal),
    enabled: !!serverUrl && !!token && !!credentialId,
    staleTime: 0, // Never cache decrypted values
    gcTime: 0, // Garbage collect immediately after unmount
    ...options,
  });
}

/**
 * Fetches the audit log for a credential
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param credentialId - The credential ID
 * @param options - React Query options
 */
export function useCredentialAudit(
  serverUrl: string,
  token: string,
  credentialId: string,
  options?: Omit<UseQueryOptions<CredentialAuditEntry[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: credentialsQueryKeys.audit(serverUrl, credentialId),
    queryFn: ({ signal }) =>
      remoteClient.get<CredentialAuditEntry[]>(serverUrl, token, `/api/credentials/${credentialId}/audit`, signal),
    enabled: !!serverUrl && !!token && !!credentialId,
    staleTime: 10 * 1000, // 10 seconds
    ...options,
  });
}

/**
 * Creates a new credential
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 */
export function useCreateCredential(
  serverUrl: string,
  token: string,
  options?: Omit<UseMutationOptions<Credential, ApiError, CreateCredentialRequest>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCredentialRequest) =>
      remoteClient.post<Credential>(serverUrl, token, '/api/credentials', data),
    onSuccess: () => {
      // Invalidate credentials list to get fresh data
      queryClient.invalidateQueries({ queryKey: credentialsQueryKeys.list(serverUrl) });
      queryClient.invalidateQueries({ queryKey: credentialsQueryKeys.all(serverUrl) });
    },
    ...options,
  });
}

/**
 * Updates an existing credential
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 */
export function useUpdateCredential(
  serverUrl: string,
  token: string,
  options?: Omit<UseMutationOptions<Credential, ApiError, { id: string; data: UpdateCredentialRequest }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCredentialRequest }) =>
      remoteClient.put<Credential>(serverUrl, token, `/api/credentials/${id}`, data),
    onSuccess: (_, variables) => {
      // Invalidate specific credential and list
      queryClient.invalidateQueries({ queryKey: credentialsQueryKeys.detail(serverUrl, variables.id) });
      queryClient.invalidateQueries({ queryKey: credentialsQueryKeys.list(serverUrl) });
      queryClient.invalidateQueries({ queryKey: credentialsQueryKeys.all(serverUrl) });
      queryClient.invalidateQueries({ queryKey: credentialsQueryKeys.audit(serverUrl, variables.id) });
    },
    ...options,
  });
}

/**
 * Deletes a credential
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 */
export function useDeleteCredential(
  serverUrl: string,
  token: string,
  options?: Omit<UseMutationOptions<{ success: boolean; message: string }, ApiError, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentialId: string) =>
      remoteClient.delete<{ success: boolean; message: string }>(serverUrl, token, `/api/credentials/${credentialId}`),
    onSuccess: (_, credentialId) => {
      // Invalidate all credential queries
      queryClient.invalidateQueries({ queryKey: credentialsQueryKeys.detail(serverUrl, credentialId) });
      queryClient.invalidateQueries({ queryKey: credentialsQueryKeys.list(serverUrl) });
      queryClient.invalidateQueries({ queryKey: credentialsQueryKeys.all(serverUrl) });
      // Remove value from cache if it exists
      queryClient.removeQueries({ queryKey: credentialsQueryKeys.value(serverUrl, credentialId) });
      queryClient.removeQueries({ queryKey: credentialsQueryKeys.audit(serverUrl, credentialId) });
    },
    ...options,
  });
}

/**
 * Shares a credential with another agent
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 */
export function useShareCredential(
  serverUrl: string,
  token: string,
  options?: Omit<UseMutationOptions<ShareCredentialResponse, ApiError, { id: string; data: ShareCredentialRequest }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ShareCredentialRequest }) =>
      remoteClient.post<ShareCredentialResponse>(serverUrl, token, `/api/credentials/${id}/share`, data),
    onSuccess: (_, variables) => {
      // Invalidate credential details to reflect updated sharedWith array
      queryClient.invalidateQueries({ queryKey: credentialsQueryKeys.detail(serverUrl, variables.id) });
      queryClient.invalidateQueries({ queryKey: credentialsQueryKeys.list(serverUrl) });
      queryClient.invalidateQueries({ queryKey: credentialsQueryKeys.audit(serverUrl, variables.id) });
    },
    ...options,
  });
}

/**
 * Revokes sharing of a credential with another agent
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 */
export function useUnshareCredential(
  serverUrl: string,
  token: string,
  options?: Omit<UseMutationOptions<UnshareCredentialResponse, ApiError, { id: string; targetAgentId: string }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, targetAgentId }: { id: string; targetAgentId: string }) =>
      remoteClient.delete<UnshareCredentialResponse>(serverUrl, token, `/api/credentials/${id}/share?targetAgentId=${encodeURIComponent(targetAgentId)}`),
    onSuccess: (_, variables) => {
      // Invalidate credential details to reflect updated sharedWith array
      queryClient.invalidateQueries({ queryKey: credentialsQueryKeys.detail(serverUrl, variables.id) });
      queryClient.invalidateQueries({ queryKey: credentialsQueryKeys.list(serverUrl) });
      queryClient.invalidateQueries({ queryKey: credentialsQueryKeys.audit(serverUrl, variables.id) });
    },
    ...options,
  });
}
