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

// Health monitoring hooks (remote server probes)
export {
  useServerHealthCheck,
  useServerLiveness,
  useServerReadiness,
  useServerStartup,
  useServerMetrics,
  useCombinedServerHealth,
} from './health';
export type { HealthCheck, ProbeResponse, PrometheusMetrics } from './health';

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

// Presence hooks
export {
  usePresenceServer,
  usePresenceAgents,
  usePresenceStats,
  usePresenceStatus,
  useMasterConnectionState,
  useReconnectToMaster,
  presenceQueryKeys,
} from './presence';
export type {
  ServerPresence,
  AgentPresence,
  PresenceStats,
  MasterConnectionState,
  PresenceStatus,
} from './presence';

// Token hooks
export {
  useTokens,
  useToken,
  useCreateToken,
  useDeleteToken,
  useRevokeToken,
  tokensQueryKeys,
} from './tokens';
export type {
  Token,
  CreateTokenRequest,
  CreateTokenResponse,
  RevokeTokenResponse,
  DeleteTokenResponse,
} from './tokens';

// Workspaces hooks
export {
  useWorkspaces,
  useWorkspace,
  useWorkspaceStats,
  useCreateWorkspace,
  useUpdateWorkspace,
  useDeleteWorkspace,
  workspacesQueryKeys,
} from './workspaces';
export type {
  WorkspaceType,
  Workspace,
  WorkspaceSettings,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  WorkspaceStats,
} from './workspaces';

// Projects hooks
export {
  useProjects,
  useProject,
  useWorkspaceProjects,
  useSearchProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  projectsQueryKeys,
} from './projects';
export type {
  Project,
  ProjectType,
  ProjectStatus,
  ProjectStats,
  ProjectSettings,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectFilters,
} from './projects';

// Filesystem hooks
export {
  useDirectoryListing,
  useFileTree,
  useFileContent,
  useSearchFiles,
  useWriteFile,
  useCreateDirectory,
  useDeletePath,
  useRenamePath,
  useCopyPath,
  filesystemQueryKeys,
} from './filesystem';
export type {
  FileType,
  FileEntry,
  DirectoryListing,
  FileTreeNode,
  FileContent,
  WriteFileRequest,
  RenameRequest,
  CopyRequest,
  SearchResult,
  DirectoryListingOptions,
  FileTreeOptions,
  SearchOptions,
} from './filesystem';

// Credentials hooks
export {
  useCredentials,
  useSearchCredentials,
  useCredential,
  useCredentialValue,
  useCredentialAudit,
  useCreateCredential,
  useUpdateCredential,
  useDeleteCredential,
  useShareCredential,
  useUnshareCredential,
  credentialsQueryKeys,
} from './credentials';
export type {
  CredentialType,
  CredentialVisibility,
  Credential,
  CreateCredentialRequest,
  UpdateCredentialRequest,
  CredentialValue,
  CredentialAuditEntry,
  ShareCredentialRequest,
  ShareCredentialResponse,
  UnshareCredentialResponse,
} from './credentials';

// Terminal hooks
export {
  useTerminalSessions,
  useCreateTerminalSession,
  useExecuteCommand,
  useStartShell,
  useSendTerminalInput,
  useKillProcess,
  useCloseTerminal,
  useTerminalBuffer,
  useTerminalWebSocket,
} from './terminal';
export type {
  TerminalSession,
  CreateTerminalResponse,
  ExecuteCommandRequest,
  TerminalOutput,
  TerminalBuffer,
  TerminalInputMessage,
  TerminalExecuteMessage,
  TerminalKillMessage,
  TerminalResizeMessage,
  TerminalClientMessage,
} from './terminal';

// Messages hooks (Claude Messages API)
export {
  useSendMessage,
  useSendMessageStreaming,
  useAvailableModels,
} from './messages';
export type {
  MessageRole,
  ContentBlockType,
  TextContent,
  ToolUseContent,
  ToolResultContent,
  ContentBlock,
  Message,
  ToolDefinition,
  SendMessageRequest,
  MessageResponse,
  StreamEvent,
  ModelInfo,
} from './messages';
