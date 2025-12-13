import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../client';
import { queryKeys, queryKeysBilling, queryKeysAnalytics, useQueryClient } from './common';

// =====================================================
// Chat Types & Hooks
// =====================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentId?: string;
  toolCalls?: Array<{
    name: string;
    params: Record<string, unknown>;
    result?: string;
  }>;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  agentId: string;
  createdAt: string;
  updatedAt: string;
}

export function useChatSessions(agentId?: string) {
  return useQuery({
    queryKey: agentId ? ['chat', 'sessions', agentId] : queryKeys.chat.sessions,
    queryFn: async () => {
      const query = agentId ? `?agentId=${agentId}` : '';
      const response = await apiClient.get<{ sessions: ChatSession[] }>(`/chat/sessions${query}`);
      return response.sessions;
    },
  });
}

export function useCreateChatSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (agentId: string) =>
      apiClient.post<ChatSession>('/chat/sessions', { agentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.sessions });
    },
  });
}

export function useChatMessages(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['chat', 'messages', sessionId],
    queryFn: async () => {
      const response = await apiClient.get<{ messages: ChatMessage[] }>(`/chat/sessions/${sessionId}/messages`);
      return response.messages;
    },
    enabled: !!sessionId,
  });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, content }: { sessionId: string; content: string }) =>
      apiClient.post<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(
        `/chat/sessions/${sessionId}/messages`,
        { content }
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', variables.sessionId] });
    },
  });
}

export function useSendChatMessageStreaming() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, content }: { sessionId: string; content: string }) =>
      apiClient.post<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(
        `/chat/sessions/${sessionId}/stream`,
        { content }
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', variables.sessionId] });
    },
  });
}

export function useClearChatSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiClient.delete(`/chat/sessions/${sessionId}`),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', sessionId] });
    },
  });
}

// =====================================================
// Audit Types & Hooks
// =====================================================

export type AuditAction =
  | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'PASSWORD_CHANGE' | 'TOKEN_REFRESH'
  | 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
  | 'SERVER_CONNECT' | 'SERVER_DISCONNECT' | 'HEALTH_CHECK'
  | 'AGENT_VALIDATE';
export type AuditStatus = 'SUCCESS' | 'FAILURE' | 'PARTIAL';

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
  status: AuditStatus;
  errorMessage?: string;
  duration?: number;
  timestamp: string;
}

export interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditStats {
  totalLogs: number;
  byAction: Record<string, number>;
  byStatus: Record<string, number>;
  byResource: Record<string, number>;
  avgDuration?: number;
}

export interface AuditQueryParams {
  userId?: string;
  action?: AuditAction;
  resource?: string;
  resourceId?: string;
  status?: AuditStatus;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AuditExportParams {
  startDate?: string;
  endDate?: string;
  format?: 'json' | 'csv';
}

export interface AuditExportResult {
  logs: AuditLogEntry[];
  count: number;
  exportedAt: string;
}

export interface IntegrityCheckResult {
  valid: boolean;
  total: number;
  checked: number;
  invalid: number;
  errors: Array<{ id: string; error: string }>;
}

export function useAuditLogs(params?: AuditQueryParams) {
  return useQuery({
    queryKey: queryKeys.audit.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.userId) searchParams.set('userId', params.userId);
      if (params?.action) searchParams.set('action', params.action);
      if (params?.resource) searchParams.set('resource', params.resource);
      if (params?.resourceId) searchParams.set('resourceId', params.resourceId);
      if (params?.status) searchParams.set('status', params.status);
      if (params?.startDate) searchParams.set('startDate', params.startDate);
      if (params?.endDate) searchParams.set('endDate', params.endDate);
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.offset) searchParams.set('offset', String(params.offset));
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return apiClient.get<AuditLogsResponse>(`/audit${query}`);
    },
    staleTime: 30 * 1000, // 30 seconds - audit logs can change frequently
  });
}

export function useAuditStats(hours: number = 24) {
  return useQuery({
    queryKey: queryKeys.audit.stats(hours),
    queryFn: () => apiClient.get<AuditStats>(`/audit/stats?hours=${hours}`),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useFailedLogins(hours: number = 24, limit: number = 100) {
  return useQuery({
    queryKey: queryKeys.audit.failedLogins(hours),
    queryFn: () => apiClient.get<AuditLogEntry[]>(`/audit/failed-logins?hours=${hours}&limit=${limit}`),
    staleTime: 30 * 1000,
  });
}

export function useAdminActions(hours: number = 24) {
  return useQuery({
    queryKey: queryKeys.audit.adminActions(hours),
    queryFn: () => apiClient.get<AuditLogEntry[]>(`/audit/admin-actions?hours=${hours}`),
    staleTime: 30 * 1000,
  });
}

export function useUserActivity(userId: string, limit: number = 50) {
  return useQuery({
    queryKey: queryKeys.audit.user(userId),
    queryFn: () => apiClient.get<AuditLogEntry[]>(`/audit/user/${userId}?limit=${limit}`),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useResourceHistory(resource: string, resourceId: string, limit: number = 20) {
  return useQuery({
    queryKey: queryKeys.audit.resource(resource, resourceId),
    queryFn: () => apiClient.get<AuditLogEntry[]>(`/audit/resource/${resource}/${resourceId}?limit=${limit}`),
    enabled: !!resource && !!resourceId,
    staleTime: 30 * 1000,
  });
}

export function useCleanupAuditLogs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (daysToKeep: number) =>
      apiClient.delete<{ deleted: number; remaining: number }>('/audit/cleanup', {
        data: { confirm: true, daysToKeep },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.audit.all });
    },
  });
}

export function useAuditExport() {
  return useMutation({
    mutationFn: async ({ startDate, endDate, format = 'json' }: AuditExportParams) => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('format', format);

      if (format === 'csv') {
        const response = await apiClient.get<string>(`/audit/export?${params.toString()}`);
        return { csv: response, format: 'csv' as const };
      }
      return apiClient.get<AuditExportResult>(`/audit/export?${params.toString()}`);
    },
  });
}

export function useVerifyAuditIntegrity(limit: number = 100) {
  return useQuery({
    queryKey: ['audit', 'integrity', limit],
    queryFn: () => apiClient.get<IntegrityCheckResult>(`/audit/verify-integrity?limit=${limit}`),
    enabled: false, // Only run when explicitly triggered
  });
}

// =====================================================
// Dashboard Types & Hooks
// =====================================================

export interface DashboardStatsApiResponse {
  overview: {
    servers: { total: number; online: number; offline: number };
    agents: { total: number; active: number; inactive: number };
    tasks: { total: number; running: number; pending: number };
  };
  executionStats: {
    period: string;
    total: number;
    success: number;
    failure: number;
    successRate: number;
    breakdown: Record<string, number>;
  };
  recentExecutions: Array<{
    id: string;
    taskTitle: string;
    agentName: string;
    status: string;
    durationMs: number | null;
    tokensUsed: number | null;
    startedAt: string;
    completedAt: string | null;
  }>;
}

export interface DashboardStats {
  servers: { total: number; online: number; offline: number };
  agents: { total: number; active: number; idle: number; error: number };
  tasks: { total: number; pending: number; running: number; completed: number; failed: number };
  executions: { today: number; thisWeek: number; avgDuration: number };
}

export interface DashboardActivityApiResponse {
  activities: Array<{
    id: string;
    action: string;
    resource: string;
    resourceId?: string;
    status: string;
    userEmail?: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface DashboardActivity {
  id: string;
  type: 'task_completed' | 'task_failed' | 'agent_created' | 'server_connected' | 'server_error';
  message: string;
  resourceId?: string;
  resourceType?: string;
  timestamp: string;
}

export interface DashboardHealthApiResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  components: {
    database: { status: 'healthy' | 'unhealthy' };
    servers: Array<{
      id: string;
      name: string;
      status: 'healthy' | 'degraded' | 'unhealthy';
      lastCheck: string | null;
      error: string | null;
    }>;
  };
}

export interface DashboardHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  database: { status: 'healthy' | 'unhealthy' };
  servers: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    details: Array<{
      id: string;
      name: string;
      status: 'healthy' | 'degraded' | 'unhealthy';
      lastCheck: string | null;
      error: string | null;
    }>;
  };
}

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: async (): Promise<DashboardStats> => {
      const response = await apiClient.get<DashboardStatsApiResponse>('/dashboard/stats');

      // Transform API response to frontend format
      const { overview, executionStats } = response;

      return {
        servers: overview.servers,
        agents: {
          total: overview.agents.total,
          active: overview.agents.active,
          idle: overview.agents.inactive,
          error: 0, // Not tracked in backend
        },
        tasks: {
          total: overview.tasks.total,
          pending: overview.tasks.pending,
          running: overview.tasks.running,
          completed: executionStats.breakdown?.COMPLETED ?? 0,
          failed: executionStats.failure,
        },
        executions: {
          today: executionStats.total, // 7-day total for now
          thisWeek: executionStats.total,
          avgDuration: 0, // Not calculated in backend
        },
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

export function useDashboardActivity(limit: number = 20) {
  return useQuery({
    queryKey: queryKeys.dashboard.activity(limit),
    queryFn: async () => {
      const response = await apiClient.get<DashboardActivityApiResponse>(`/dashboard/activity?limit=${limit}`);

      // Transform audit log actions to activity types
      const activities: DashboardActivity[] = response.activities.map((log) => {
        let type: DashboardActivity['type'] = 'task_completed';
        let message = `${log.action} on ${log.resource}`;

        // Map audit actions to activity types
        if (log.resource === 'Task') {
          if (log.action === 'CREATE') {
            type = 'task_completed';
            message = `Task created`;
          } else if (log.status === 'FAILURE') {
            type = 'task_failed';
            message = `Task failed`;
          }
        } else if (log.resource === 'Agent' && log.action === 'CREATE') {
          type = 'agent_created';
          message = `Agent created`;
        } else if (log.resource === 'Server') {
          if (log.action === 'SERVER_CONNECT') {
            type = 'server_connected';
            message = `Server connected`;
          } else if (log.status === 'FAILURE') {
            type = 'server_error';
            message = `Server error`;
          }
        }

        return {
          id: log.id,
          type,
          message: log.userEmail ? `${message} by ${log.userEmail}` : message,
          resourceId: log.resourceId,
          resourceType: log.resource,
          timestamp: log.timestamp,
        };
      });

      return { activities };
    },
    staleTime: 30 * 1000,
  });
}

export function useDashboardHealth() {
  return useQuery({
    queryKey: queryKeys.dashboard.health,
    queryFn: async (): Promise<DashboardHealth> => {
      const response = await apiClient.get<DashboardHealthApiResponse>('/dashboard/health');

      // Transform API response to frontend format
      const servers = response.components.servers;
      const healthyCnt = servers.filter((s) => s.status === 'healthy').length;
      const degradedCnt = servers.filter((s) => s.status === 'degraded').length;
      const unhealthyCnt = servers.filter((s) => s.status === 'unhealthy').length;

      return {
        status: response.status,
        timestamp: response.timestamp,
        database: response.components.database,
        servers: {
          total: servers.length,
          healthy: healthyCnt,
          degraded: degradedCnt,
          unhealthy: unhealthyCnt,
          details: servers,
        },
      };
    },
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });
}

// =====================================================
// Billing Types & Hooks
// =====================================================

export type Plan = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';

export interface PlanConfig {
  id: Plan;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  limits: {
    maxUsers: number;
    maxServers: number;
    maxAgents: number;
    maxTasksPerMonth: number;
  };
  features: string[];
}

export interface BillingInfo {
  organizationId: string;
  plan: Plan;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  billingCycle: 'monthly' | 'yearly';
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  planDetails: {
    name: string;
    priceMonthly: number;
    priceYearly: number;
    features: string[];
    limits: PlanConfig['limits'];
  };
}

export interface UsageReport {
  organizationId: string;
  period: { start: string; end: string };
  usage: {
    users: { current: number; limit: number; percentage: number };
    servers: { current: number; limit: number; percentage: number };
    agents: { current: number; limit: number; percentage: number };
    tasks: { current: number; limit: number; percentage: number };
  };
  overage: boolean;
  overageDetails: string[];
}

export interface QuotaCheck {
  allowed: boolean;
  current: number;
  limit: number;
  message?: string;
}

export interface PlanChangePreview {
  currentPlan: Plan;
  newPlan: Plan;
  proratedAmount: number;
  newMonthlyAmount: number;
  effectiveDate: string;
}

export function useBillingInfo() {
  return useQuery({
    queryKey: queryKeysBilling.info,
    queryFn: () => apiClient.get<BillingInfo>('/billing'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useBillingPlans() {
  return useQuery({
    queryKey: queryKeysBilling.plans,
    queryFn: () => apiClient.get<{ currentPlan: Plan; plans: PlanConfig[] }>('/billing/plans'),
    staleTime: 10 * 60 * 1000, // 10 minutes - plans don't change often
  });
}

export function useBillingUsage() {
  return useQuery({
    queryKey: queryKeysBilling.usage,
    queryFn: () => apiClient.get<UsageReport>('/billing/usage'),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useQuotaCheck(resource: 'users' | 'servers' | 'agents' | 'tasks') {
  return useQuery({
    queryKey: queryKeysBilling.quota(resource),
    queryFn: () => apiClient.get<QuotaCheck>(`/billing/quota/${resource}`),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function usePreviewPlanChange() {
  return useMutation({
    mutationFn: (plan: Plan) =>
      apiClient.post<PlanChangePreview>('/billing/preview', { plan }),
  });
}

export function useChangePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plan: Plan) =>
      apiClient.post<{ success: boolean; message: string }>('/billing/change-plan', { plan }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeysBilling.info });
      queryClient.invalidateQueries({ queryKey: queryKeysBilling.usage });
    },
  });
}

// =====================================================
// Analytics Types & Hooks
// =====================================================

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface TaskAnalytics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  cancelledTasks: number;
  successRate: number;
  averageDuration: number;
  totalTokensUsed: number;
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  taskTrend: TimeSeriesPoint[];
  period?: { start: string; end: string; days: number };
}

export interface AgentAnalytics {
  totalAgents: number;
  activeAgents: number;
  agentsByRole: Record<string, number>;
  agentsByStatus: Record<string, number>;
  topPerformingAgents: Array<{
    id: string;
    name: string;
    displayName: string;
    completedTasks: number;
    successRate: number;
    avgDuration: number;
  }>;
  agentActivityTrend: TimeSeriesPoint[];
  period?: { start: string; end: string; days: number };
}

export interface ServerAnalytics {
  totalServers: number;
  onlineServers: number;
  serversByStatus: Record<string, number>;
  serverUptime: Array<{
    id: string;
    name: string;
    uptimePercentage: number;
    lastCheck: string | null;
  }>;
  toolsInstalled: number;
  toolsByCategory: Record<string, number>;
}

export interface ExecutionAnalytics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  timeoutExecutions: number;
  averageDurationMs: number;
  totalTokensConsumed: number;
  executionsByDay: TimeSeriesPoint[];
  executionsByHour: Array<{ hour: number; count: number }>;
  peakHours: number[];
  period?: { start: string; end: string; days: number };
}

export interface AnalyticsOverview {
  tasks: TaskAnalytics;
  agents: AgentAnalytics;
  servers: ServerAnalytics;
  executions: ExecutionAnalytics;
  period: { start: string; end: string };
}

export function useAnalyticsOverview(days: number = 30) {
  return useQuery({
    queryKey: queryKeysAnalytics.overview(days),
    queryFn: () => apiClient.get<AnalyticsOverview>(`/analytics/overview?days=${days}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useTaskAnalytics(days: number = 30) {
  return useQuery({
    queryKey: queryKeysAnalytics.tasks(days),
    queryFn: () => apiClient.get<TaskAnalytics>(`/analytics/tasks?days=${days}`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAgentAnalytics(days: number = 30) {
  return useQuery({
    queryKey: queryKeysAnalytics.agents(days),
    queryFn: () => apiClient.get<AgentAnalytics>(`/analytics/agents?days=${days}`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useServerAnalytics() {
  return useQuery({
    queryKey: queryKeysAnalytics.servers,
    queryFn: () => apiClient.get<ServerAnalytics>('/analytics/servers'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useExecutionAnalytics(days: number = 30) {
  return useQuery({
    queryKey: queryKeysAnalytics.executions(days),
    queryFn: () => apiClient.get<ExecutionAnalytics>(`/analytics/executions?days=${days}`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useExportAnalytics() {
  return useMutation({
    mutationFn: ({ days, format }: { days?: number; format?: 'json' }) => {
      const params = new URLSearchParams();
      if (days) params.append('days', String(days));
      if (format) params.append('format', format);
      return apiClient.get<{
        exportedAt: string;
        organizationId: string;
        period: { start: string; end: string };
        data: AnalyticsOverview;
      }>(`/analytics/export?${params.toString()}`);
    },
  });
}
