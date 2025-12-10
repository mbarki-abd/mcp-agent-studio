import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createContextualCan } from '@casl/react';
import { apiClient, queryKeys } from '../api';
import { defineAbilitiesFor, createDefaultAbility, type AppAbility } from './ability';
import type { User, Role } from '@mcp/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  ability: AppAbility;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, organizationName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// CASL Can component
export const Can = createContextualCan<AppAbility>(AuthContext as never);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    ability: createDefaultAbility(),
  });

  // Load user on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      apiClient.setToken(token);
      loadUser();
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const user = await apiClient.get<User>('/auth/me');
      const ability = defineAbilitiesFor(user.role as Role);
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        ability,
      });
    } catch (error) {
      // Token is invalid, clear it
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      apiClient.setToken(null);
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        ability: createDefaultAbility(),
      });
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    interface LoginResponse {
      user: User;
      token: string;
      refreshToken: string;
    }

    const response = await apiClient.post<LoginResponse>('/auth/login', { email, password });

    // Store tokens
    localStorage.setItem('token', response.token);
    localStorage.setItem('refreshToken', response.refreshToken);
    apiClient.setToken(response.token);

    // Update state
    const ability = defineAbilitiesFor(response.user.role as Role);
    setState({
      user: response.user,
      isAuthenticated: true,
      isLoading: false,
      ability,
    });
  }, []);

  const register = useCallback(async (
    email: string,
    password: string,
    name: string,
    organizationName?: string
  ) => {
    interface RegisterResponse {
      user: User;
      token: string;
      refreshToken: string;
    }

    const response = await apiClient.post<RegisterResponse>('/auth/register', {
      email,
      password,
      name,
      organizationName,
    });

    // Store tokens
    localStorage.setItem('token', response.token);
    localStorage.setItem('refreshToken', response.refreshToken);
    apiClient.setToken(response.token);

    // Update state
    const ability = defineAbilitiesFor(response.user.role as Role);
    setState({
      user: response.user,
      isAuthenticated: true,
      isLoading: false,
      ability,
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore errors during logout
    }

    // Clear storage
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    apiClient.setToken(null);

    // Clear all queries
    queryClient.clear();

    // Update state
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      ability: createDefaultAbility(),
    });
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    await loadUser();
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
  }, [loadUser, queryClient]);

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook to get just the ability
export function useAbility() {
  const { ability } = useAuth();
  return ability;
}
