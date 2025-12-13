import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../client';
import { queryKeys, useQueryClient } from './common';

// =====================================================
// Organization Hooks
// =====================================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  settings: Record<string, unknown>;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  email: string;
  name?: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt: string;
}

export interface OrganizationInvitation {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expiresAt: string;
  createdAt: string;
  invitedBy: string;
}

export interface OrganizationUsage {
  servers: { used: number; limit: number };
  agents: { used: number; limit: number };
  tasks: { used: number; limit: number };
  apiCalls: { used: number; limit: number };
  storage: { used: number; limit: number };
}

export interface OrganizationPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  limits: {
    servers: number;
    agents: number;
    tasks: number;
    apiCalls: number;
    storage: number;
  };
}

export function useOrganization() {
  return useQuery({
    queryKey: queryKeys.organization.current,
    queryFn: () => apiClient.get<Organization>('/organization'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Organization>) =>
      apiClient.patch<Organization>('/organization', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organization.current });
    },
  });
}

export function useOrganizationMembers() {
  return useQuery({
    queryKey: queryKeys.organization.members,
    queryFn: () => apiClient.get<{ members: OrganizationMember[] }>('/organization/members'),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: OrganizationMember['role'] }) =>
      apiClient.patch(`/organization/members/${memberId}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organization.members });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      apiClient.delete(`/organization/members/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organization.members });
    },
  });
}

export function useOrganizationInvitations() {
  return useQuery({
    queryKey: queryKeys.organization.invitations,
    queryFn: () => apiClient.get<{ invitations: OrganizationInvitation[] }>('/organization/invitations'),
    staleTime: 60 * 1000,
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; role: OrganizationInvitation['role'] }) =>
      apiClient.post<OrganizationInvitation>('/organization/invitations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organization.invitations });
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      apiClient.delete(`/organization/invitations/${invitationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organization.invitations });
    },
  });
}

export function useOrganizationUsage() {
  return useQuery({
    queryKey: queryKeys.organization.usage,
    queryFn: () => apiClient.get<OrganizationUsage>('/organization/usage'),
    staleTime: 60 * 1000,
  });
}

export function useOrganizationPlans() {
  return useQuery({
    queryKey: queryKeys.organization.plans,
    queryFn: () => apiClient.get<{ plans: OrganizationPlan[] }>('/organization/plans'),
    staleTime: 10 * 60 * 1000, // 10 minutes - plans don't change often
  });
}

// =====================================================
// API Keys Hooks
// =====================================================

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string; // First 8 chars for display
  scopes: string[];
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
  createdBy: string;
  status: 'active' | 'revoked' | 'expired';
}

export interface ApiKeyWithSecret extends ApiKey {
  key: string; // Full key, only shown once at creation
}

export interface ApiKeyUsage {
  keyId: string;
  totalCalls: number;
  callsToday: number;
  callsThisWeek: number;
  callsThisMonth: number;
  lastEndpoints: Array<{
    endpoint: string;
    method: string;
    timestamp: string;
    status: number;
  }>;
}

export function useApiKeys() {
  return useQuery({
    queryKey: queryKeys.apiKeys.list,
    queryFn: () => apiClient.get<{ keys: ApiKey[] }>('/keys'),
    staleTime: 60 * 1000,
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; scopes: string[]; expiresAt?: string }) =>
      apiClient.post<ApiKeyWithSecret>('/keys', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
    },
  });
}

export function useApiKey(keyId: string) {
  return useQuery({
    queryKey: queryKeys.apiKeys.detail(keyId),
    queryFn: () => apiClient.get<ApiKey>(`/keys/${keyId}`),
    enabled: !!keyId,
  });
}

export function useUpdateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ keyId, data }: { keyId: string; data: { name?: string; scopes?: string[] } }) =>
      apiClient.patch<ApiKey>(`/keys/${keyId}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.detail(variables.keyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) =>
      apiClient.delete(`/keys/${keyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
    },
  });
}

export function useRegenerateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) =>
      apiClient.post<ApiKeyWithSecret>(`/keys/${keyId}/regenerate`, {}),
    onSuccess: (_, keyId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.detail(keyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
    },
  });
}

export function useApiKeyUsage(keyId: string) {
  return useQuery({
    queryKey: queryKeys.apiKeys.usage(keyId),
    queryFn: () => apiClient.get<ApiKeyUsage>(`/keys/${keyId}/usage`),
    enabled: !!keyId,
    staleTime: 30 * 1000,
  });
}

export function useOrgApiKeys() {
  return useQuery({
    queryKey: queryKeys.apiKeys.orgAll,
    queryFn: () => apiClient.get<{ keys: ApiKey[] }>('/keys/org/all'),
    staleTime: 60 * 1000,
  });
}

export function useRevokeOrgApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) =>
      apiClient.delete(`/keys/org/${keyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.orgAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
    },
  });
}
