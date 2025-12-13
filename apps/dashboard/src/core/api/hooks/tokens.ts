import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { ApiError } from '../client';
import { useQueryClient } from './common';

// =====================================================
// Tokens API Types
// =====================================================

export interface Token {
  id: string;
  name: string;
  agentId: string;
  permissions: string[];
  prefix: string; // e.g., "agent-", "master-"
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
  isRevoked: boolean;
}

export interface CreateTokenRequest {
  name: string;
  agentId: string;
  permissions: string[];
  expiresIn?: string; // e.g., "7d", "30d", "never"
}

export interface CreateTokenResponse {
  token: Token;
  rawToken: string; // Full token value - SHOW ONCE!
}

export interface RevokeTokenResponse {
  success: boolean;
  message: string;
}

export interface DeleteTokenResponse {
  success: boolean;
  message: string;
}

// =====================================================
// Remote Server API Client
// =====================================================

/**
 * Makes API calls to remote mcp-agent-server instances for token management
 */
class RemoteTokenClient {
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

  delete<T>(serverUrl: string, token: string, endpoint: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>(serverUrl, token, endpoint, { method: 'DELETE', signal });
  }
}

const remoteClient = new RemoteTokenClient();

// =====================================================
// Query Keys
// =====================================================

export const tokensQueryKeys = {
  all: (serverUrl: string) => ['tokens', serverUrl] as const,
  list: (serverUrl: string) => ['tokens', serverUrl, 'list'] as const,
  detail: (serverUrl: string, tokenId: string) => ['tokens', serverUrl, 'detail', tokenId] as const,
};

// =====================================================
// Token Hooks
// =====================================================

/**
 * Fetches all tokens from the remote server
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param options - React Query options
 */
export function useTokens(
  serverUrl: string,
  token: string,
  options?: Omit<UseQueryOptions<Token[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: tokensQueryKeys.list(serverUrl),
    queryFn: ({ signal }) =>
      remoteClient.get<Token[]>(serverUrl, token, '/api/tokens', signal),
    enabled: !!serverUrl && !!token,
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

/**
 * Fetches a single token by ID
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param tokenId - The token ID to fetch
 * @param options - React Query options
 */
export function useToken(
  serverUrl: string,
  token: string,
  tokenId: string,
  options?: Omit<UseQueryOptions<Token, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: tokensQueryKeys.detail(serverUrl, tokenId),
    queryFn: ({ signal }) =>
      remoteClient.get<Token>(serverUrl, token, `/api/tokens/${tokenId}`, signal),
    enabled: !!serverUrl && !!token && !!tokenId,
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

/**
 * Creates a new token
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param options - React Query mutation options
 */
export function useCreateToken(
  serverUrl: string,
  token: string,
  options?: Omit<
    UseMutationOptions<CreateTokenResponse, ApiError, CreateTokenRequest>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateTokenRequest) =>
      remoteClient.post<CreateTokenResponse>(
        serverUrl,
        token,
        '/api/tokens',
        request
      ),
    onSuccess: () => {
      // Invalidate tokens list to show new token
      queryClient.invalidateQueries({ queryKey: tokensQueryKeys.list(serverUrl) });
    },
    ...options,
  });
}

/**
 * Deletes a token permanently
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param options - React Query mutation options
 */
export function useDeleteToken(
  serverUrl: string,
  token: string,
  options?: Omit<
    UseMutationOptions<DeleteTokenResponse, ApiError, string>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tokenId: string) =>
      remoteClient.delete<DeleteTokenResponse>(
        serverUrl,
        token,
        `/api/tokens/${tokenId}`
      ),
    onSuccess: (_data, tokenId) => {
      // Invalidate tokens list and the specific token detail
      queryClient.invalidateQueries({ queryKey: tokensQueryKeys.list(serverUrl) });
      queryClient.invalidateQueries({ queryKey: tokensQueryKeys.detail(serverUrl, tokenId) });
    },
    ...options,
  });
}

/**
 * Revokes a token (marks it as revoked without deleting)
 * @param serverUrl - The remote server URL
 * @param token - The authentication token
 * @param options - React Query mutation options
 */
export function useRevokeToken(
  serverUrl: string,
  token: string,
  options?: Omit<
    UseMutationOptions<RevokeTokenResponse, ApiError, string>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tokenId: string) =>
      remoteClient.post<RevokeTokenResponse>(
        serverUrl,
        token,
        `/api/tokens/${tokenId}/revoke`,
        {}
      ),
    onSuccess: (_data, tokenId) => {
      // Invalidate tokens list and the specific token detail to reflect revoked status
      queryClient.invalidateQueries({ queryKey: tokensQueryKeys.list(serverUrl) });
      queryClient.invalidateQueries({ queryKey: tokensQueryKeys.detail(serverUrl, tokenId) });
    },
    ...options,
  });
}
