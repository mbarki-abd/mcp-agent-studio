// ============================================
// @mcp/types - Shared TypeScript Types
// ============================================

// -------------------- Auth --------------------
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type Role = 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';

export interface Session {
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
}

// -------------------- Organization --------------------
export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  createdAt: Date;
}

export type Plan = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';

// -------------------- Server Configuration --------------------
export interface ServerConfiguration {
  id: string;
  userId: string;
  name: string;
  description?: string;
  url: string;
  wsUrl?: string;
  masterToken: string;
  masterAgentId?: string;
  status: ServerStatus;
  lastHealthCheck?: Date;
  lastError?: string;
  isDefault: boolean;
  autoConnect: boolean;
  serverVersion?: string;
  capabilities: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type ServerStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'UNKNOWN' | 'MAINTENANCE';

// -------------------- Agent --------------------
export interface Agent {
  id: string;
  serverId: string;
  name: string;
  displayName: string;
  description?: string;
  role: AgentRole;
  status: AgentStatus;
  unixUser?: string;
  homeDir?: string;
  token?: string;
  supervisorId?: string;
  capabilities: string[];
  createdById: string;
  validatedById?: string;
  validatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type AgentRole = 'MASTER' | 'SUPERVISOR' | 'WORKER';
export type AgentStatus = 'PENDING_VALIDATION' | 'ACTIVE' | 'INACTIVE' | 'BUSY' | 'ERROR';

// -------------------- Task --------------------
export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  projectId?: string;
  agentId?: string;
  assignmentMode: AssignmentMode;
  requiredCapabilities: string[];
  prompt: string;
  promptVariables: Record<string, string>;
  promptGeneratedById?: string;
  executionMode: ExecutionMode;
  scheduledAt?: Date;
  recurrenceFrequency?: RecurrenceFreq;
  recurrenceInterval?: number;
  cronExpression?: string;
  startDate?: Date;
  endDate?: Date;
  timezone: string;
  timeout?: number;
  maxRetries: number;
  retryDelay: number;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  lastRunAt?: Date;
  nextRunAt?: Date;
  runCount: number;
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'DRAFT' | 'PENDING' | 'SCHEDULED' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type AssignmentMode = 'MANUAL' | 'AUTO' | 'BY_CAPABILITY';
export type ExecutionMode = 'IMMEDIATE' | 'SCHEDULED' | 'RECURRING';
export type RecurrenceFreq = 'MINUTELY' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';

// -------------------- Task Execution --------------------
export interface TaskExecution {
  id: string;
  taskId: string;
  agentId: string;
  status: ExecutionStatus;
  prompt: string;
  output?: string;
  error?: string;
  exitCode?: number;
  tokensUsed?: number;
  durationMs?: number;
  startedAt: Date;
  completedAt?: Date;
}

export type ExecutionStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMEOUT';

// -------------------- Tools --------------------
export interface ToolDefinition {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  category: ToolCategory;
  installCommand: string;
  uninstallCommand?: string;
  versionCommand: string;
  versionRegex?: string;
  dependencies: string[];
  minDiskSpace?: number;
  requiresSudo: boolean;
  website?: string;
  documentation?: string;
  icon?: string;
  tags: string[];
}

export type ToolCategory =
  | 'VERSION_CONTROL'
  | 'CONTAINER'
  | 'CLOUD_CLI'
  | 'KUBERNETES'
  | 'LANGUAGE_RUNTIME'
  | 'PACKAGE_MANAGER'
  | 'DATABASE_CLIENT'
  | 'DEVOPS'
  | 'UTILITY'
  | 'SECURITY'
  | 'EDITOR';

export interface ServerTool {
  id: string;
  serverId: string;
  toolId: string;
  status: ToolStatus;
  installedVersion?: string;
  installedAt?: Date;
  installedBy?: string;
  configPath?: string;
  customConfig?: Record<string, unknown>;
  lastHealthCheck?: Date;
  healthStatus: HealthStatus;
  lastError?: string;
}

export type ToolStatus = 'NOT_INSTALLED' | 'INSTALLING' | 'INSTALLED' | 'UPDATING' | 'REMOVING' | 'FAILED' | 'DISABLED';
export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';

export interface AgentToolPermission {
  id: string;
  agentId: string;
  toolId: string;
  canUse: boolean;
  canSudo: boolean;
  rateLimit?: number;
  allowedCommands: string[];
  blockedCommands: string[];
  grantedBy?: string;
  grantedAt: Date;
  reason?: string;
}

// -------------------- Real-time Events --------------------
export interface AgentStatusEvent {
  type: 'agent:status';
  agentId: string;
  timestamp: Date;
  data: {
    status: AgentStatus;
    previousStatus?: AgentStatus;
    reason?: string;
  };
}

export interface TodoProgressEvent {
  type: 'agent:todo';
  agentId: string;
  timestamp: Date;
  data: {
    todos: Array<{
      id: string;
      content: string;
      status: 'pending' | 'in_progress' | 'completed';
      activeForm: string;
    }>;
    completed: number;
    total: number;
    currentTask?: string;
  };
}

export interface ExecutionStreamEvent {
  type: 'agent:execution';
  agentId: string;
  taskId: string;
  timestamp: Date;
  data: {
    phase: 'starting' | 'running' | 'completed' | 'failed';
    output?: string;
    toolCall?: {
      name: string;
      params: Record<string, unknown>;
    };
    fileChanged?: {
      path: string;
      action: 'create' | 'edit' | 'delete';
      lines?: { added: number; removed: number };
    };
    progress?: number;
  };
}

export type RealtimeEvent = AgentStatusEvent | TodoProgressEvent | ExecutionStreamEvent;

// -------------------- Module System --------------------
// Generic component type for framework-agnostic shared types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ComponentType<P = any> = (props: P) => unknown;

export interface ModuleDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  icon?: ComponentType;
  dependencies?: string[];
  peerDependencies?: string[];
  routes: ModuleRoute[];
  navigation?: NavigationItem[];
  permissions?: PermissionDefinition[];
  stores?: Record<string, unknown>;
  apiEndpoints?: string[];
  hooks?: {
    onInit?: (context: ModuleContext) => void;
    onDestroy?: () => void;
    onUserLogin?: (user: User) => void;
    onUserLogout?: () => void;
  };
  settings?: ModuleSettings;
  slots?: Record<string, ComponentType[]>;
}

export interface ModuleRoute {
  path: string;
  element: ComponentType;
  layout?: 'default' | 'full' | 'minimal';
  permissions?: string[];
  children?: ModuleRoute[];
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: ComponentType;
  path: string;
  permissions?: string[];
  badge?: () => number | string;
  children?: NavigationItem[];
}

export interface PermissionDefinition {
  id: string;
  name: string;
  description?: string;
}

export interface ModuleSettings {
  configurable?: boolean;
  defaultEnabled?: boolean;
}

export interface ModuleContext {
  api: unknown;
  auth: unknown;
  ability: unknown;
  websocket: unknown;
  events: unknown;
  getModule: (id: string) => ModuleDefinition | undefined;
  isModuleEnabled: (id: string) => boolean;
}

// -------------------- API Responses --------------------
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
