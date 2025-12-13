import { useQueryClient } from '@tanstack/react-query';

// Query keys
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  servers: {
    all: ['servers'] as const,
    list: (params?: object) => ['servers', 'list', params] as const,
    detail: (id: string) => ['servers', 'detail', id] as const,
  },
  agents: {
    all: ['agents'] as const,
    list: (params?: object) => ['agents', 'list', params] as const,
    detail: (id: string) => ['agents', 'detail', id] as const,
    byServer: (serverId: string) => ['agents', 'server', serverId] as const,
    hierarchy: (serverId?: string) => ['agents', 'hierarchy', serverId] as const,
    stats: (agentId: string) => ['agents', agentId, 'stats'] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    list: (params?: object) => ['tasks', 'list', params] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
    executions: (taskId: string) => ['tasks', taskId, 'executions'] as const,
    dependencies: (taskId: string) => ['tasks', taskId, 'dependencies'] as const,
  },
  chat: {
    sessions: ['chat', 'sessions'] as const,
    messages: (sessionId: string) => ['chat', 'messages', sessionId] as const,
  },
  tools: {
    catalog: ['tools', 'catalog'] as const,
    server: (serverId: string) => ['tools', 'server', serverId] as const,
    agentPermissions: (agentId: string) => ['tools', 'agent', agentId, 'permissions'] as const,
  },
  audit: {
    all: ['audit'] as const,
    list: (params?: object) => ['audit', 'list', params] as const,
    stats: (hours?: number) => ['audit', 'stats', hours] as const,
    failedLogins: (hours?: number) => ['audit', 'failed-logins', hours] as const,
    adminActions: (hours?: number) => ['audit', 'admin-actions', hours] as const,
    user: (userId: string) => ['audit', 'user', userId] as const,
    resource: (resource: string, resourceId: string) => ['audit', 'resource', resource, resourceId] as const,
  },
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
    activity: (limit?: number) => ['dashboard', 'activity', limit] as const,
    health: ['dashboard', 'health'] as const,
  },
  organization: {
    current: ['organization'] as const,
    members: ['organization', 'members'] as const,
    invitations: ['organization', 'invitations'] as const,
    usage: ['organization', 'usage'] as const,
    plans: ['organization', 'plans'] as const,
  },
  apiKeys: {
    all: ['apiKeys'] as const,
    list: ['apiKeys', 'list'] as const,
    detail: (keyId: string) => ['apiKeys', 'detail', keyId] as const,
    usage: (keyId: string) => ['apiKeys', keyId, 'usage'] as const,
    orgAll: ['apiKeys', 'org'] as const,
  },
  terminals: {
    all: ['terminals'] as const,
    session: (sessionId: string) => ['terminals', 'session', sessionId] as const,
    buffer: (sessionId: string) => ['terminals', sessionId, 'buffer'] as const,
  },
};

export const queryKeysBilling = {
  info: ['billing', 'info'] as const,
  plans: ['billing', 'plans'] as const,
  usage: ['billing', 'usage'] as const,
  quota: (resource: string) => ['billing', 'quota', resource] as const,
};

export const queryKeysAnalytics = {
  overview: (days?: number) => ['analytics', 'overview', days] as const,
  tasks: (days?: number) => ['analytics', 'tasks', days] as const,
  agents: (days?: number) => ['analytics', 'agents', days] as const,
  servers: ['analytics', 'servers'] as const,
  executions: (days?: number) => ['analytics', 'executions', days] as const,
};

// Re-export useQueryClient for convenience
export { useQueryClient };
