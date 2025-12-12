import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Server,
  Activity,
  Bot,
  Package,
  Clock,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Zap,
  Calendar,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { ServerStatusBadge } from '../components/ServerStatusBadge';
import {
  useServer,
  useServerHealth,
  useServerStats,
} from '../../../core/api';
import { cn } from '../../../lib/utils';

const HEALTH_COLORS = {
  healthy: 'bg-green-500',
  degraded: 'bg-yellow-500',
  unhealthy: 'bg-red-500',
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-green-500',
  FAILED: 'bg-red-500',
  RUNNING: 'bg-blue-500',
  QUEUED: 'bg-yellow-500',
  PENDING: 'bg-gray-500',
  CANCELLED: 'bg-gray-500',
  TIMEOUT: 'bg-orange-500',
};

export default function ServerHealth() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: server, isLoading: serverLoading } = useServer(id || '');
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useServerHealth(id || '');
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useServerStats(id || '');

  const isLoading = serverLoading || healthLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!server) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <XCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium">Server not found</h3>
        <Button onClick={() => navigate('/servers')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Servers
        </Button>
      </div>
    );
  }

  const handleRefresh = () => {
    refetchHealth();
    refetchStats();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/servers`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Server className="h-8 w-8 text-primary" />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{server.name} - Health & Stats</h1>
              <ServerStatusBadge status={server.status} />
            </div>
            <p className="text-muted-foreground text-sm truncate max-w-md">{server.url}</p>
          </div>
        </div>

        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Health Status Overview */}
      {health && (
        <div className="border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'h-4 w-4 rounded-full',
                HEALTH_COLORS[health.status]
              )} />
              <h2 className="text-lg font-semibold capitalize">
                System {health.status}
              </h2>
            </div>
            {health.serverVersion && (
              <span className="text-sm text-muted-foreground">
                Version: {health.serverVersion}
              </span>
            )}
          </div>

          {health.lastError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{health.lastError}</p>
            </div>
          )}

          {health.uptime && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Last health check: {new Date(health.uptime.lastCheck).toLocaleString()}
                {' '}({health.uptime.checkAge}s ago)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Component Health Cards */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Agents Health */}
          <div className="border rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold">Agents Health</h3>
              </div>
              <span className={cn(
                'text-2xl font-bold',
                health.components.agents.healthScore >= 80 ? 'text-green-600' :
                health.components.agents.healthScore >= 50 ? 'text-yellow-600' : 'text-red-600'
              )}>
                {health.components.agents.healthScore}%
              </span>
            </div>

            <div className="space-y-3">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all',
                    health.components.agents.healthScore >= 80 ? 'bg-green-500' :
                    health.components.agents.healthScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  )}
                  style={{ width: `${health.components.agents.healthScore}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">{health.components.agents.total}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                  <span className="text-green-700 dark:text-green-400">Active</span>
                  <span className="font-medium text-green-700 dark:text-green-400">{health.components.agents.active}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <span className="text-blue-700 dark:text-blue-400">Busy</span>
                  <span className="font-medium text-blue-700 dark:text-blue-400">{health.components.agents.busy}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                  <span className="text-red-700 dark:text-red-400">Error</span>
                  <span className="font-medium text-red-700 dark:text-red-400">{health.components.agents.error}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tools Health */}
          <div className="border rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-500" />
                <h3 className="font-semibold">Tools Health</h3>
              </div>
              <span className={cn(
                'text-2xl font-bold',
                health.components.tools.healthScore >= 80 ? 'text-green-600' :
                health.components.tools.healthScore >= 50 ? 'text-yellow-600' : 'text-red-600'
              )}>
                {health.components.tools.healthScore}%
              </span>
            </div>

            <div className="space-y-3">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all',
                    health.components.tools.healthScore >= 80 ? 'bg-green-500' :
                    health.components.tools.healthScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  )}
                  style={{ width: `${health.components.tools.healthScore}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">{health.components.tools.total}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                  <span className="text-green-700 dark:text-green-400">Healthy</span>
                  <span className="font-medium text-green-700 dark:text-green-400">{health.components.tools.healthy}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                  <span className="text-red-700 dark:text-red-400">Unhealthy</span>
                  <span className="font-medium text-red-700 dark:text-red-400">{health.components.tools.unhealthy}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Section */}
      {stats && (
        <>
          {/* Period Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Statistics from {new Date(stats.period.from).toLocaleDateString()} to{' '}
              {new Date(stats.period.to).toLocaleDateString()}
            </span>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border rounded-lg p-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Executions</span>
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold">{stats.executions.total}</p>
            </div>

            <div className="border rounded-lg p-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Success Rate</span>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold">{stats.executions.successRate}%</p>
              <p className="text-xs text-muted-foreground">
                {stats.executions.success} succeeded
              </p>
            </div>

            <div className="border rounded-lg p-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg Duration</span>
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <p className="text-3xl font-bold">
                {stats.executions.avgDurationMs > 0
                  ? `${(stats.executions.avgDurationMs / 1000).toFixed(1)}s`
                  : '-'}
              </p>
            </div>

            <div className="border rounded-lg p-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg Tokens</span>
                <Zap className="h-5 w-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold">
                {stats.executions.avgTokensUsed > 0
                  ? stats.executions.avgTokensUsed.toLocaleString()
                  : '-'}
              </p>
            </div>
          </div>

          {/* Breakdown Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Execution Breakdown */}
            {Object.keys(stats.executions.breakdown).length > 0 && (
              <div className="border rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">Execution Status</h3>
                </div>

                <div className="space-y-3">
                  {Object.entries(stats.executions.breakdown).map(([status, count]) => {
                    const percentage = stats.executions.total > 0
                      ? Math.round((count / stats.executions.total) * 100)
                      : 0;
                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            {status === 'COMPLETED' && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {status === 'FAILED' && <XCircle className="h-4 w-4 text-red-500" />}
                            {!['COMPLETED', 'FAILED'].includes(status) && (
                              <div className={cn('h-3 w-3 rounded-full', STATUS_COLORS[status] || 'bg-gray-400')} />
                            )}
                            <span className="capitalize">{status.toLowerCase()}</span>
                          </span>
                          <span className="text-muted-foreground">{count} ({percentage}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn('h-full transition-all', STATUS_COLORS[status] || 'bg-gray-400')}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Task Breakdown */}
            {Object.keys(stats.tasks.breakdown).length > 0 && (
              <div className="border rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">Task Status ({stats.tasks.total} total)</h3>
                </div>

                <div className="space-y-3">
                  {Object.entries(stats.tasks.breakdown).map(([status, count]) => {
                    const percentage = stats.tasks.total > 0
                      ? Math.round((count / stats.tasks.total) * 100)
                      : 0;
                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <div className={cn('h-3 w-3 rounded-full', STATUS_COLORS[status] || 'bg-gray-400')} />
                            <span className="capitalize">{status.toLowerCase()}</span>
                          </span>
                          <span className="text-muted-foreground">{count} ({percentage}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn('h-full transition-all', STATUS_COLORS[status] || 'bg-gray-400')}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Agent Breakdown */}
            {Object.keys(stats.agents.breakdown).length > 0 && (
              <div className="border rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">Agent Status ({stats.agents.total} total)</h3>
                </div>

                <div className="space-y-3">
                  {Object.entries(stats.agents.breakdown).map(([status, count]) => {
                    const percentage = stats.agents.total > 0
                      ? Math.round((count / stats.agents.total) * 100)
                      : 0;
                    const colors: Record<string, string> = {
                      ACTIVE: 'bg-green-500',
                      BUSY: 'bg-blue-500',
                      IDLE: 'bg-gray-400',
                      ERROR: 'bg-red-500',
                      PENDING_VALIDATION: 'bg-yellow-500',
                    };
                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <div className={cn('h-3 w-3 rounded-full', colors[status] || 'bg-gray-400')} />
                            <span className="capitalize">{status.toLowerCase().replace(/_/g, ' ')}</span>
                          </span>
                          <span className="text-muted-foreground">{count} ({percentage}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn('h-full transition-all', colors[status] || 'bg-gray-400')}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty State */}
      {!health && !stats && (
        <div className="text-center py-12 text-muted-foreground">
          <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No health or statistics data available</p>
        </div>
      )}
    </div>
  );
}
