/**
 * Authentication Provider
 *
 * Manages user authentication state using httpOnly cookies.
 * Cookies are automatically handled by the browser - no localStorage needed.
 */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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

  // Load user on mount - cookies are sent automatically
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = useCallback(async () => {
    try {
      // Try to fetch user - cookies are sent automatically via credentials: 'include'
      const user = await apiClient.get<User>('/auth/me');
      const ability = defineAbilitiesFor(user.role as Role);
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        ability,
      });
    } catch {
      // No valid session (cookies missing or expired)
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
    }

    // Login - server sets httpOnly cookies automatically
    const response = await apiClient.post<LoginResponse>('/auth/login', { email, password });

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
    }

    // Register - server sets httpOnly cookies automatically
    const response = await apiClient.post<RegisterResponse>('/auth/register', {
      email,
      password,
      name,
      organizationName,
    });

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
      // Logout - server clears httpOnly cookies
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore errors during logout
    }

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

// Custom Can component props
interface CanProps {
  I: string;
  a: string;
  children: ReactNode;
  passThrough?: boolean;
  not?: boolean;
}

// Custom Can component that uses useAbility hook
// This avoids the React 18 warning about rendering Context directly
export function Can({ I: action, a: subject, children, passThrough = false, not = false }: CanProps) {
  const ability = useAbility();
  const can = ability.can(action as never, subject as never);
  const allowed = not ? !can : can;

  if (allowed || passThrough) {
    return <>{children}</>;
  }

  return null;
}
