// =====================================================
// MCP Agent Studio - Hooks Barrel Export
// =====================================================
// This file re-exports all hooks from their respective domain files
// for convenient imports throughout the application.

// Common exports (query keys, utils)
export { queryKeys, queryKeysBilling, queryKeysAnalytics, useQueryClient } from './common';

// Auth hooks
export {
  useCurrentUser,
  useForgotPassword,
  useResetPassword,
  useSendVerification,
  useVerifyEmail,
  useUpdateProfile,
  useChangePassword,
} from './auth';

// Server hooks
export {
  useServers,
  useServer,
  useCreateServer,
  useUpdateServer,
  useDeleteServer,
  useTestServerConnection,
  useValidateServerConnection,
  useServerHealth,
  useServerStats,
  useUninstallTool,
} from './servers';
export type { ServerValidationResult, ServerHealthApiResponse, ServerStatsApiResponse } from './servers';

// Agent hooks
export {
  useAgents,
  useAgent,
  useCreateAgent,
  useUpdateAgent,
  useDeleteAgent,
  useParseAgentPrompt,
  useCreateAgentFromPrompt,
  useValidateAgent,
  useAgentStats,
  useAgentExecutions,
  useAgentHierarchy,
} from './agents';
export type {
  ParsedAgentConfig,
  AgentStatsApiResponse,
  AgentExecutionsApiResponse,
  AgentHierarchyNode,
} from './agents';

// Task hooks
export {
  useTasks,
  useTask,
  useTaskExecutions,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useRunTask,
  useCancelTask,
  useBulkCancelTasks,
  useBulkDeleteTasks,
  useBulkUpdateTaskStatus,
  useBulkExecuteTasks,
  useBulkRetryTasks,
  useTaskDependencies,
  useAddTaskDependencies,
  useRemoveTaskDependencies,
} from './tasks';
export type { BulkOperationResult, TaskDependency, TaskDependenciesResponse } from './tasks';

// Tool hooks
export {
  useToolsCatalog,
  useToolDefinitions,
  useServerTools,
  useInstallTool,
  useToolHealthCheck,
  useAgentToolPermissions,
  useUpdateAgentToolPermissions,
} from './tools';
export type { ToolHealthCheckResult, AgentToolPermission } from './tools';

// Organization & API Keys hooks
export * from './organization';

// Chat hooks
export {
  useChatSessions,
  useCreateChatSession,
  useChatMessages,
  useSendChatMessage,
  useSendChatMessageStreaming,
  useClearChatSession,
} from './misc';
export type { ChatMessage, ChatSession } from './misc';

// Audit hooks
export {
  useAuditLogs,
  useAuditStats,
  useFailedLogins,
  useAdminActions,
  useUserActivity,
  useResourceHistory,
  useCleanupAuditLogs,
  useAuditExport,
  useVerifyAuditIntegrity,
} from './misc';
export type {
  AuditAction,
  AuditStatus,
  AuditLogEntry,
  AuditLogsResponse,
  AuditStats,
  AuditQueryParams,
  AuditExportParams,
  AuditExportResult,
  IntegrityCheckResult,
} from './misc';

// Dashboard hooks
export {
  useDashboardStats,
  useDashboardActivity,
  useDashboardHealth,
} from './misc';
export type {
  DashboardStats,
  DashboardActivity,
  DashboardHealth,
  DashboardStatsApiResponse,
  DashboardActivityApiResponse,
  DashboardHealthApiResponse,
} from './misc';

// Billing hooks
export {
  useBillingInfo,
  useBillingPlans,
  useBillingUsage,
  useQuotaCheck,
  usePreviewPlanChange,
  useChangePlan,
} from './misc';
export type {
  Plan,
  PlanConfig,
  BillingInfo,
  UsageReport,
  QuotaCheck,
  PlanChangePreview,
} from './misc';

// Analytics hooks
export {
  useAnalyticsOverview,
  useTaskAnalytics,
  useAgentAnalytics,
  useServerAnalytics,
  useExecutionAnalytics,
  useExportAnalytics,
} from './misc';
export type {
  TimeSeriesPoint,
  TaskAnalytics,
  AgentAnalytics,
  ServerAnalytics,
  ExecutionAnalytics,
  AnalyticsOverview,
} from './misc';
