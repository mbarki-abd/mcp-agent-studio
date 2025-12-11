import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@mcp/types';
import { apiClient } from '../core/api/client';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
  setUser: (user: User) => void;
}

const API_URL = import.meta.env.VITE_API_URL || '';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
          }

          const data = await response.json();

          // Sync token with apiClient and localStorage (for AuthProvider)
          apiClient.setToken(data.token);
          localStorage.setItem('token', data.token);
          localStorage.setItem('refreshToken', data.refreshToken);

          set({
            user: data.user,
            token: data.token,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true });
        try {
          const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Registration failed');
          }

          const data = await response.json();

          // Sync token with apiClient and localStorage (for AuthProvider)
          apiClient.setToken(data.token);
          localStorage.setItem('token', data.token);
          localStorage.setItem('refreshToken', data.refreshToken);

          set({
            user: data.user,
            token: data.token,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        const { token } = get();
        if (token) {
          fetch(`${API_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }).catch(() => {});
        }
        // Clear token from apiClient and localStorage
        apiClient.setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');

        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      checkAuth: () => {
        const { token, user } = get();
        if (token && user) {
          // Sync token with apiClient and localStorage on app init
          apiClient.setToken(token);
          localStorage.setItem('token', token);
          set({ isAuthenticated: true });
        }
      },

      setUser: (user: User) => {
        set({ user });
      },
    }),
    {
      name: 'mcp-auth',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);
