import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  Zap,
  BarChart3,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { AgentStatusBadge } from '../components/AgentStatusBadge';
import {
  useAgent,
  useAgentStats,
  useAgentExecutions,
} from '../../../core/api';
import { cn } from '../../../lib/utils';
import { useState } from 'react';

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-green-500',
  FAILED: 'bg-red-500',
  RUNNING: 'bg-blue-500',
  QUEUED: 'bg-yellow-500',
  CANCELLED: 'bg-gray-500',
  TIMEOUT: 'bg-orange-500',
};

export default function AgentStats() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const { data: agent, isLoading: agentLoading } = useAgent(id || '');
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useAgentStats(id || '');
  const { data: executionsData, isLoading: execLoading, refetch: refetchExec } = useAgentExecutions(id || '', {
    page,
    pageSize: 10,
    status: statusFilter,
  });

  const isLoading = agentLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <XCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium">Agent not found</h3>
        <Button onClick={() => navigate('/agents')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Agents
        </Button>
      </div>
    );
  }

  const handleRefresh = () => {
    refetchStats();
    refetchExec();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/agents/${id}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Bot className="h-8 w-8 text-primary" />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{agent.displayName} - Statistics</h1>
              <AgentStatusBadge status={agent.status} />
            </div>
            <p className="text-muted-foreground">{agent.name}</p>
          </div>
        </div>

        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Period Info */}
      {stats && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            Statistics from {new Date(stats.period.from).toLocaleDateString()} to{' '}
            {new Date(stats.period.to).toLocaleDateString()}
          </span>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border rounded-lg p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Executions</span>
              <Activity className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold">{stats.summary.totalExecutions}</p>
          </div>

          <div className="border rounded-lg p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Success Rate</span>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold">
              {stats.summary.successRate}%
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.summary.successCount} succeeded, {stats.summary.failureCount} failed
            </p>
          </div>

          <div className="border rounded-lg p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg Duration</span>
              <Clock className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold">
              {stats.summary.avgDurationMs > 0
                ? `${(stats.summary.avgDurationMs / 1000).toFixed(1)}s`
                : '-'}
            </p>
          </div>

          <div className="border rounded-lg p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tokens Used</span>
              <Zap className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold">
              {stats.summary.totalTokensUsed.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              Avg: {stats.summary.avgTokensUsed.toLocaleString()} per execution
            </p>
          </div>
        </div>
      )}

      {/* Status Breakdown */}
      {stats && Object.keys(stats.breakdown).length > 0 && (
        <div className="border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Status Breakdown</h2>
          </div>

          <div className="space-y-3">
            {Object.entries(stats.breakdown).map(([status, count]) => {
              const percentage = stats.summary.totalExecutions > 0
                ? Math.round((count / stats.summary.totalExecutions) * 100)
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

      {/* Execution History */}
      <div className="border rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Execution History</h2>
          </div>

          <select
            className="border rounded-md px-3 py-1.5 text-sm bg-background"
            value={statusFilter || ''}
            onChange={(e) => {
              setStatusFilter(e.target.value || undefined);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="RUNNING">Running</option>
            <option value="QUEUED">Queued</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="TIMEOUT">Timeout</option>
          </select>
        </div>

        {execLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : !executionsData?.executions?.length ? (
          <p className="text-muted-foreground text-center py-8">No executions found</p>
        ) : (
          <>
            <div className="space-y-2">
              {executionsData.executions.map((exec) => (
                <div
                  key={exec.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/tasks/${exec.taskId}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'h-3 w-3 rounded-full',
                      STATUS_COLORS[exec.status] || 'bg-gray-400'
                    )} />
                    <div>
                      <p className="font-medium">{exec.taskTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(exec.startedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    {exec.durationMs !== null && (
                      <div className="text-muted-foreground">
                        <Clock className="h-4 w-4 inline mr-1" />
                        {(exec.durationMs / 1000).toFixed(1)}s
                      </div>
                    )}
                    {exec.tokensUsed !== null && (
                      <div className="text-muted-foreground">
                        <Zap className="h-4 w-4 inline mr-1" />
                        {exec.tokensUsed.toLocaleString()}
                      </div>
                    )}
                    <span className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium',
                      exec.status === 'COMPLETED' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                      exec.status === 'FAILED' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                      exec.status === 'RUNNING' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                      !['COMPLETED', 'FAILED', 'RUNNING'].includes(exec.status) && 'bg-gray-100 text-gray-700 dark:bg-gray-800'
                    )}>
                      {exec.status.toLowerCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {executionsData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {executionsData.pagination.page} of {executionsData.pagination.totalPages}
                  {' '}({executionsData.pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= executionsData.pagination.totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
