export { apiClient, ApiError, AuthError } from './client';

// Re-export everything from hooks
export {
  // Common
  queryKeys,
  queryKeysBilling,
  queryKeysAnalytics,
  useQueryClient,

  // Auth
  useCurrentUser,
  useForgotPassword,
  useResetPassword,
  useSendVerification,
  useVerifyEmail,
  useUpdateProfile,
  useChangePassword,

  // Servers
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

  // Agents
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

  // Tasks
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

  // Tools
  useToolsCatalog,
  useToolDefinitions,
  useServerTools,
  useInstallTool,
  useToolHealthCheck,
  useAgentToolPermissions,
  useUpdateAgentToolPermissions,

  // Chat
  useChatSessions,
  useCreateChatSession,
  useChatMessages,
  useSendChatMessage,
  useSendChatMessageStreaming,
  useClearChatSession,

  // Audit
  useAuditLogs,
  useAuditStats,
  useFailedLogins,
  useAdminActions,
  useUserActivity,
  useResourceHistory,
  useCleanupAuditLogs,
  useAuditExport,
  useVerifyAuditIntegrity,

  // Dashboard
  useDashboardStats,
  useDashboardActivity,
  useDashboardHealth,

  // Billing
  useBillingInfo,
  useBillingPlans,
  useBillingUsage,
  useQuotaCheck,
  usePreviewPlanChange,
  useChangePlan,

  // Analytics
  useAnalyticsOverview,
  useTaskAnalytics,
  useAgentAnalytics,
  useServerAnalytics,
  useExecutionAnalytics,
  useExportAnalytics,
} from './hooks';

// Re-export types
export type {
  // Servers
  ServerValidationResult,
  ServerHealthApiResponse,
  ServerStatsApiResponse,

  // Agents
  ParsedAgentConfig,
  AgentStatsApiResponse,
  AgentExecutionsApiResponse,
  AgentHierarchyNode,

  // Tasks
  BulkOperationResult,
  TaskDependency,
  TaskDependenciesResponse,

  // Tools
  ToolHealthCheckResult,
  AgentToolPermission,

  // Chat
  ChatMessage,
  ChatSession,

  // Audit
  AuditAction,
  AuditStatus,
  AuditLogEntry,
  AuditLogsResponse,
  AuditStats,
  AuditQueryParams,
  AuditExportParams,
  AuditExportResult,
  IntegrityCheckResult,

  // Dashboard
  DashboardStats,
  DashboardActivity,
  DashboardHealth,
  DashboardStatsApiResponse,
  DashboardActivityApiResponse,
  DashboardHealthApiResponse,

  // Billing
  Plan,
  PlanConfig,
  BillingInfo,
  UsageReport,
  QuotaCheck,
  PlanChangePreview,

  // Analytics
  TimeSeriesPoint,
  TaskAnalytics,
  AgentAnalytics,
  ServerAnalytics,
  ExecutionAnalytics,
  AnalyticsOverview,
} from './hooks';

// Organization & API Keys hooks (using export *)
export * from './hooks/organization';
