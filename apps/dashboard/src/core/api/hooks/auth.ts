import { useQuery, useMutation, UseQueryOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../client';
import type { User } from '@mcp/types';
import { queryKeys, useQueryClient } from './common';

// =====================================================
// Auth Hooks
// =====================================================

export function useCurrentUser(options?: Omit<UseQueryOptions<User, ApiError>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => apiClient.get<User>('/auth/me'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      apiClient.post<{ message: string }>('/auth/forgot-password', { email }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      apiClient.post<{ message: string }>('/auth/reset-password', { token, password }),
  });
}

export function useSendVerification() {
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ message: string }>('/auth/send-verification', {}),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) =>
      apiClient.post<{ message: string }>('/auth/verify-email', { token }),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; email?: string }) =>
      apiClient.patch<User>('/auth/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      apiClient.post<{ message: string }>('/auth/change-password', { currentPassword, newPassword }),
  });
}
