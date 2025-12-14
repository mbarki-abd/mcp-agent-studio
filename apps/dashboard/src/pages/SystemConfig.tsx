/**
 * System Configuration Page
 * Admin-only page for viewing and managing system settings
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Activity,
  Server,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Cpu,
  Users,
  Layers,
  BarChart3,
  Loader2,
  MemoryStick,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { apiClient } from '../core/api';
import { useToast } from '../lib/use-toast';

interface SystemInfo {
  server: {
    nodeVersion: string;
    platform: string;
    arch: string;
    uptime: number;
    uptimeFormatted: string;
    pid: number;
  };
  memory: {
    heapUsed: string;
    heapTotal: string;
    rss: string;
    external: string;
  };
  system: {
    totalMemory: string;
    freeMemory: string;
    cpus: number;
    loadAverage: number[];
    hostname: string;
  };
  environment: {
    nodeEnv: string;
    port: string;
  };
}

interface RateLimitConfig {
  max: number;
  windowMs: number;
  message: string;
}

interface RateLimits {
  config: {
    auth: RateLimitConfig;
    standard: RateLimitConfig;
    write: RateLimitConfig;
    expensive: RateLimitConfig;
    realtime: RateLimitConfig;
    isDevelopment: boolean;
  };
  stats: {
    activeEntries: number;
    entriesByType: Record<string, number>;
  };
  envVars: Record<string, string>;
}

interface SystemStats {
  totals: {
    users: number;
    organizations: number;
    servers: number;
    agents: number;
    tasks: number;
  };
  activity: {
    tasksToday: number;
    tasksThisWeek: number;
    auditLogsToday: number;
  };
  timestamp: string;
}

interface HealthStatus {
  status: string;
  checks: Record<string, { status: string; latency?: number; error?: string }>;
  timestamp: string;
}

type TabType = 'overview' | 'rate-limits' | 'health' | 'resources';

export default function SystemConfig() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch system info
  const { data: systemInfo, isLoading: loadingInfo } = useQuery<SystemInfo>({
    queryKey: ['system-info'],
    queryFn: () => apiClient.get('/system/info'),
    refetchInterval: 30000,
  });

  // Fetch rate limits
  const { data: rateLimits, isLoading: loadingRateLimits } = useQuery<RateLimits>({
    queryKey: ['system-rate-limits'],
    queryFn: () => apiClient.get('/system/rate-limits'),
    refetchInterval: 10000,
  });

  // Fetch system stats
  const { data: systemStats, isLoading: loadingStats } = useQuery<SystemStats>({
    queryKey: ['system-stats'],
    queryFn: () => apiClient.get('/system/stats'),
    refetchInterval: 60000,
  });

  // Fetch health status
  const { data: healthStatus, isLoading: loadingHealth } = useQuery<HealthStatus>({
    queryKey: ['system-health'],
    queryFn: () => apiClient.get('/system/health-detailed'),
    refetchInterval: 15000,
  });

  // Reset rate limits mutation
  const resetRateLimits = useMutation({
    mutationFn: () => apiClient.post<{ success: boolean; message: string }>('/system/rate-limits/reset'),
    onSuccess: (data) => {
      toast({
        title: 'Rate limits reset',
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['system-rate-limits'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to reset rate limits.',
        variant: 'destructive',
      });
    },
  });

  const formatMs = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
    return `${(ms / 60000).toFixed(0)}m`;
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Activity },
    { id: 'rate-limits' as const, label: 'Rate Limits', icon: Shield },
    { id: 'health' as const, label: 'Health', icon: Server },
    { id: 'resources' as const, label: 'Resources', icon: Cpu },
  ];

  const isLoading = loadingInfo || loadingRateLimits || loadingStats || loadingHealth;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8" />
            System Configuration
          </h1>
          <p className="text-muted-foreground">
            Monitor and manage system settings, rate limits, and health status
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
          healthStatus?.status === 'healthy'
            ? 'bg-green-500/20 text-green-500'
            : 'bg-red-500/20 text-red-500'
        }`}>
          {healthStatus?.status === 'healthy' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          System {healthStatus?.status || 'loading...'}
        </span>
      </div>

      <div className="flex gap-8">
        {/* Tab Navigation */}
        <div className="w-48 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          {isLoading && (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && !isLoading && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="bg-card rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Users</span>
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">{systemStats?.totals.users || 0}</p>
                </div>
                <div className="bg-card rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Organizations</span>
                    <Layers className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">{systemStats?.totals.organizations || 0}</p>
                </div>
                <div className="bg-card rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Servers</span>
                    <Server className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">{systemStats?.totals.servers || 0}</p>
                </div>
                <div className="bg-card rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Agents</span>
                    <Activity className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">{systemStats?.totals.agents || 0}</p>
                </div>
                <div className="bg-card rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Tasks</span>
                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">{systemStats?.totals.tasks || 0}</p>
                </div>
              </div>

              {/* Activity Summary */}
              <div className="bg-card rounded-lg border p-4">
                <h3 className="font-semibold mb-4">Recent Activity</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Tasks Today</p>
                    <p className="text-2xl font-bold">{systemStats?.activity.tasksToday || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tasks This Week</p>
                    <p className="text-2xl font-bold">{systemStats?.activity.tasksThisWeek || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Audit Logs Today</p>
                    <p className="text-2xl font-bold">{systemStats?.activity.auditLogsToday || 0}</p>
                  </div>
                </div>
              </div>

              {/* Server Info */}
              <div className="bg-card rounded-lg border p-4">
                <h3 className="font-semibold mb-4">Server Information</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Node Version</p>
                    <p className="font-mono">{systemInfo?.server.nodeVersion || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Platform</p>
                    <p className="font-mono">{systemInfo?.server.platform || '-'} ({systemInfo?.server.arch})</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Uptime</p>
                    <p className="font-mono">{systemInfo?.server.uptimeFormatted || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Environment</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      systemInfo?.environment.nodeEnv === 'production'
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-yellow-500/20 text-yellow-500'
                    }`}>
                      {systemInfo?.environment.nodeEnv || '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rate Limits Tab */}
          {activeTab === 'rate-limits' && !isLoading && (
            <div className="space-y-6">
              {/* Header with Reset Button */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Rate Limit Configuration</h3>
                  <p className="text-sm text-muted-foreground">
                    {rateLimits?.config.isDevelopment ? 'Development mode (relaxed limits)' : 'Production mode'}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => resetRateLimits.mutate()}
                  disabled={resetRateLimits.isPending}
                >
                  {resetRateLimits.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Reset All Counters
                </Button>
              </div>

              {/* Info Alert */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-500">Configuration via Environment Variables</p>
                  <p className="text-sm text-muted-foreground">
                    Rate limits are configured via environment variables. To change limits, update the server environment
                    and restart. Example: RATE_LIMIT_AUTH_MAX=100
                  </p>
                </div>
              </div>

              {/* Rate Limit Table */}
              <div className="bg-card rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">Endpoint Type</th>
                      <th className="text-left p-3 font-medium">Max Requests</th>
                      <th className="text-left p-3 font-medium">Time Window</th>
                      <th className="text-left p-3 font-medium">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rateLimits?.config && Object.entries(rateLimits.config)
                      .filter(([key]) => key !== 'isDevelopment')
                      .map(([key, value]) => {
                        const config = value as RateLimitConfig;
                        return (
                          <tr key={key} className="border-t">
                            <td className="p-3 font-medium capitalize">{key}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-muted text-sm">{config.max}</span>
                            </td>
                            <td className="p-3">{formatMs(config.windowMs)}</td>
                            <td className="p-3 text-muted-foreground">{config.message}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Active Entries */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-card rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground mb-1">Total Active Entries</p>
                  <p className="text-2xl font-bold">{rateLimits?.stats.activeEntries || 0}</p>
                </div>
                <div className="bg-card rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground mb-2">Entries by Type</p>
                  {rateLimits?.stats.entriesByType && Object.entries(rateLimits.stats.entriesByType).length > 0 ? (
                    <div className="space-y-1">
                      {Object.entries(rateLimits.stats.entriesByType).map(([type, count]) => (
                        <div key={type} className="flex justify-between">
                          <span className="text-sm capitalize">{type}</span>
                          <span className="px-2 py-0.5 rounded bg-muted text-sm">{count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No active entries</p>
                  )}
                </div>
              </div>

              {/* Environment Variables */}
              <div className="bg-card rounded-lg border p-4">
                <h4 className="font-medium mb-2">Environment Variables</h4>
                <div className="bg-muted rounded-md p-4 font-mono text-sm">
                  {rateLimits?.envVars && Object.entries(rateLimits.envVars).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-blue-400">{key}</span>=<span className="text-green-400">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Health Tab */}
          {activeTab === 'health' && !isLoading && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {healthStatus?.checks && Object.entries(healthStatus.checks).map(([name, check]) => (
                  <div key={name} className="bg-card rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium capitalize">{name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 ${
                        check.status === 'healthy' ? 'bg-green-500/20 text-green-500' :
                        check.status === 'unhealthy' ? 'bg-red-500/20 text-red-500' :
                        check.status === 'configured' ? 'bg-blue-500/20 text-blue-500' :
                        'bg-gray-500/20 text-gray-500'
                      }`}>
                        {check.status === 'healthy' && <CheckCircle className="w-3 h-3" />}
                        {check.status === 'unhealthy' && <XCircle className="w-3 h-3" />}
                        {check.status}
                      </span>
                    </div>
                    {check.latency !== undefined && (
                      <p className="text-sm text-muted-foreground">Latency: {check.latency}ms</p>
                    )}
                    {check.error && (
                      <p className="text-sm text-red-500">{check.error}</p>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Last checked: {healthStatus?.timestamp ? new Date(healthStatus.timestamp).toLocaleString() : '-'}
              </p>
            </div>
          )}

          {/* Resources Tab */}
          {activeTab === 'resources' && !isLoading && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Memory Usage */}
              <div className="bg-card rounded-lg border p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <MemoryStick className="w-4 h-4" />
                  Memory Usage
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Heap Used</span>
                    <span className="font-mono">{systemInfo?.memory.heapUsed || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Heap Total</span>
                    <span className="font-mono">{systemInfo?.memory.heapTotal || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">RSS</span>
                    <span className="font-mono">{systemInfo?.memory.rss || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">External</span>
                    <span className="font-mono">{systemInfo?.memory.external || '-'}</span>
                  </div>
                </div>
              </div>

              {/* System Resources */}
              <div className="bg-card rounded-lg border p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  System Resources
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Memory</span>
                    <span className="font-mono">{systemInfo?.system.totalMemory || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Free Memory</span>
                    <span className="font-mono">{systemInfo?.system.freeMemory || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">CPU Cores</span>
                    <span className="font-mono">{systemInfo?.system.cpus || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Hostname</span>
                    <span className="font-mono">{systemInfo?.system.hostname || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Load Average</span>
                    <span className="font-mono">
                      {systemInfo?.system.loadAverage?.map(l => l.toFixed(2)).join(', ') || '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { SystemConfig as SystemConfigPage };
