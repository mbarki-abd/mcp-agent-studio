import { useQuery } from '@tanstack/react-query';

// =====================================================
// Health Monitoring Hooks (Remote Server)
// =====================================================
// These hooks call health endpoints on REMOTE mcp-agent-server instances
// They use fetch directly with serverUrl parameter instead of apiClient

/**
 * Full health check response from mcp-agent-server
 */
export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  environment: string;
  uptime: number;
  timestamp: string;
  checks: {
    database: { status: 'up' | 'down'; latencyMs: number };
    claudeCli: { status: 'up' | 'down'; latencyMs: number };
    filesystem: { status: 'up' | 'down'; latencyMs: number };
    memory: { status: 'up' | 'down' };
  };
  metrics: {
    memory: { heapUsed: number; heapTotal: number };
    circuitBreakers: Array<{ name: string; state: string }>;
    rateLimiting: { blockedIPsCount: number };
  };
}

/**
 * Simple probe response (liveness, readiness, startup)
 */
export interface ProbeResponse {
  status: 'ok' | 'error';
  timestamp?: string;
}

/**
 * Prometheus metrics response (plain text format)
 */
export type PrometheusMetrics = string;

/**
 * Fetch wrapper for remote server health endpoints
 * Handles network errors gracefully
 */
async function fetchServerEndpoint<T>(
  serverUrl: string,
  endpoint: string,
  signal?: AbortSignal
): Promise<T> {
  try {
    const url = `${serverUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Handle text/plain responses (metrics)
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/plain')) {
      const text = await response.text();
      return text as T;
    }

    // Handle JSON responses
    return await response.json() as T;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw error; // Re-throw abort errors
      }
      // Network errors, timeouts, etc.
      throw new Error(`Failed to fetch ${endpoint}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Hook for full health check of remote server
 *
 * @param serverUrl - Base URL of the remote mcp-agent-server (e.g., 'http://localhost:3001')
 * @param options - Query options
 * @returns Health check data with all subsystem statuses
 *
 * @example
 * const { data, isLoading, error } = useServerHealthCheck('http://localhost:3001');
 */
export function useServerHealthCheck(
  serverUrl: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) {
  return useQuery({
    queryKey: ['remote-health', serverUrl, 'full'] as const,
    queryFn: ({ signal }) => fetchServerEndpoint<HealthCheck>(serverUrl, '/health', signal),
    enabled: !!serverUrl && (options?.enabled ?? true),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: options?.refetchInterval ?? 60 * 1000, // Auto refresh every minute
    retry: 2, // Retry twice on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  });
}

/**
 * Hook for liveness probe of remote server
 * Checks if the server process is alive and responsive
 *
 * @param serverUrl - Base URL of the remote mcp-agent-server
 * @param options - Query options
 * @returns Simple liveness status
 *
 * @example
 * const { data } = useServerLiveness('http://localhost:3001', { refetchInterval: 10000 });
 */
export function useServerLiveness(
  serverUrl: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) {
  return useQuery({
    queryKey: ['remote-health', serverUrl, 'liveness'] as const,
    queryFn: ({ signal }) => fetchServerEndpoint<ProbeResponse>(serverUrl, '/healthz', signal),
    enabled: !!serverUrl && (options?.enabled ?? true),
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: options?.refetchInterval ?? 30 * 1000, // Auto refresh every 30 seconds
    retry: 1, // Retry once on failure (liveness should be fast)
    retryDelay: 500, // Quick retry
  });
}

/**
 * Hook for readiness probe of remote server
 * Checks if the server is ready to accept traffic (dependencies healthy)
 *
 * @param serverUrl - Base URL of the remote mcp-agent-server
 * @param options - Query options
 * @returns Readiness status
 *
 * @example
 * const { data } = useServerReadiness('http://localhost:3001');
 */
export function useServerReadiness(
  serverUrl: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) {
  return useQuery({
    queryKey: ['remote-health', serverUrl, 'readiness'] as const,
    queryFn: ({ signal }) => fetchServerEndpoint<ProbeResponse>(serverUrl, '/ready', signal),
    enabled: !!serverUrl && (options?.enabled ?? true),
    staleTime: 20 * 1000, // 20 seconds
    refetchInterval: options?.refetchInterval ?? 45 * 1000, // Auto refresh every 45 seconds
    retry: 2, // Retry twice on failure
    retryDelay: 1000, // 1 second delay
  });
}

/**
 * Hook for startup probe of remote server
 * Checks if the server has completed startup initialization
 *
 * @param serverUrl - Base URL of the remote mcp-agent-server
 * @param options - Query options
 * @returns Startup status
 *
 * @example
 * const { data } = useServerStartup('http://localhost:3001');
 */
export function useServerStartup(
  serverUrl: string,
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: ['remote-health', serverUrl, 'startup'] as const,
    queryFn: ({ signal }) => fetchServerEndpoint<ProbeResponse>(serverUrl, '/startup', signal),
    enabled: !!serverUrl && (options?.enabled ?? true),
    staleTime: 60 * 1000, // 1 minute (startup state changes infrequently)
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * Hook for Prometheus metrics from remote server
 * Returns metrics in Prometheus text exposition format
 *
 * @param serverUrl - Base URL of the remote mcp-agent-server
 * @param options - Query options
 * @returns Prometheus metrics as plain text
 *
 * @example
 * const { data: metricsText } = useServerMetrics('http://localhost:3001');
 */
export function useServerMetrics(
  serverUrl: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) {
  return useQuery({
    queryKey: ['remote-health', serverUrl, 'metrics'] as const,
    queryFn: ({ signal }) => fetchServerEndpoint<PrometheusMetrics>(serverUrl, '/metrics', signal),
    enabled: !!serverUrl && (options?.enabled ?? true),
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: options?.refetchInterval ?? 30 * 1000, // Auto refresh every 30 seconds
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * Combined health status hook
 * Aggregates liveness, readiness, and startup probes
 *
 * @param serverUrl - Base URL of the remote mcp-agent-server
 * @param options - Query options
 * @returns Combined health status
 *
 * @example
 * const health = useCombinedServerHealth('http://localhost:3001');
 * if (health.isHealthy) { // All probes passed }
 */
export function useCombinedServerHealth(
  serverUrl: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) {
  const liveness = useServerLiveness(serverUrl, options);
  const readiness = useServerReadiness(serverUrl, options);
  const startup = useServerStartup(serverUrl, options);

  return {
    liveness,
    readiness,
    startup,
    isHealthy:
      liveness.data?.status === 'ok' &&
      readiness.data?.status === 'ok' &&
      startup.data?.status === 'ok',
    isLoading: liveness.isLoading || readiness.isLoading || startup.isLoading,
    hasError: liveness.isError || readiness.isError || startup.isError,
    errors: {
      liveness: liveness.error,
      readiness: readiness.error,
      startup: startup.error,
    },
  };
}
