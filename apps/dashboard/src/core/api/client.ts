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
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, signal } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (this.token) {
      requestHeaders['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });

    // Handle 401 - Unauthorized
    if (response.status === 401) {
      // Don't try to refresh for auth endpoints (prevents cascade of 401s)
      if (endpoint === '/auth/me' || endpoint === '/auth/refresh') {
        throw new AuthError('Not authenticated');
      }
      // Try to refresh token
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Retry request with new token
        requestHeaders['Authorization'] = `Bearer ${this.token}`;
        const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal,
        });
        return this.parseResponse<T>(retryResponse);
      }
      // Token refresh failed, throw auth error
      throw new AuthError('Session expired. Please login again.');
    }

    return this.parseResponse<T>(response);
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error || data.message || 'An error occurred',
        response.status,
        data
      );
    }

    return data as T;
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      this.token = data.token;
      localStorage.setItem('token', data.token);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      return true;
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

// Initialize token from localStorage
const storedToken = localStorage.getItem('token');
if (storedToken) {
  apiClient.setToken(storedToken);
}
