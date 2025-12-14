/**
 * API Client
 *
 * Handles all HTTP requests to the backend API.
 * Uses httpOnly cookies for authentication (more secure than localStorage).
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: RequestMethod;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, signal } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal,
      credentials: 'include', // Send cookies with every request
    });

    // Handle 401 - Unauthorized
    if (response.status === 401) {
      // Don't try to refresh for auth endpoints (prevents cascade of 401s)
      if (endpoint === '/auth/me' || endpoint === '/auth/refresh') {
        throw new AuthError('Not authenticated');
      }
      // Try to refresh token (uses httpOnly cookie automatically)
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Retry request (new cookies are set automatically)
        const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal,
          credentials: 'include',
        });
        return this.parseResponse<T>(retryResponse);
      }
      // Token refresh failed, throw auth error
      throw new AuthError('Session expired. Please login again.');
    }

    return this.parseResponse<T>(response);
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    let data: Record<string, unknown>;

    try {
      data = await response.json();
    } catch {
      // Response is not valid JSON
      if (!response.ok) {
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          null
        );
      }
      throw new ApiError('Invalid JSON response from server', response.status, null);
    }

    if (!response.ok) {
      // Extract error message, handling various server response formats
      let errorMessage = 'An error occurred';
      if (typeof data.error === 'string') {
        errorMessage = data.error;
      } else if (typeof data.message === 'string') {
        errorMessage = data.message;
      } else if (data.error && typeof data.error === 'object' && 'message' in data.error) {
        errorMessage = String((data.error as { message: unknown }).message);
      }

      throw new ApiError(errorMessage, response.status, data);
    }

    return data as T;
  }

  private async refreshToken(): Promise<boolean> {
    try {
      // Refresh token is sent via httpOnly cookie automatically
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  // HTTP methods
  get<T>(endpoint: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', signal });
  }

  post<T>(endpoint: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, signal });
  }

  put<T>(endpoint: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, signal });
  }

  patch<T>(endpoint: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body, signal });
  }

  delete<T>(endpoint: string, options?: { data?: unknown; signal?: AbortSignal }): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', body: options?.data, signal: options?.signal });
  }
}

// Error classes
export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// Singleton instance
export const apiClient = new ApiClient(API_URL);
