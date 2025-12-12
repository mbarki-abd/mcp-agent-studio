import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  Cpu,
  Server,
  Zap,
  Download,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useAnalyticsOverview, useExportAnalytics } from '../../../core/api/hooks';
import { MetricCard } from '../components/MetricCard';
import { TrendChart } from '../components/TrendChart';
import { DistributionChart } from '../components/DistributionChart';
import { TopAgentsTable } from '../components/TopAgentsTable';

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState(30);
  const { data: analytics, isLoading, refetch, isRefetching } = useAnalyticsOverview(period);
  const exportMutation = useExportAnalytics();

  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync({ days: period, format: 'json' });
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${period}d-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-10 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-80 bg-muted rounded animate-pulse" />
          <div className="h-80 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const { tasks, agents, servers, executions } = analytics || {
    tasks: { totalTasks: 0, completedTasks: 0, failedTasks: 0, successRate: 0, taskTrend: [], tasksByStatus: {}, tasksByPriority: {} },
    agents: { totalAgents: 0, activeAgents: 0, topPerformingAgents: [], agentActivityTrend: [], agentsByStatus: {} },
    servers: { totalServers: 0, onlineServers: 0, toolsInstalled: 0 },
    executions: { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0, timeoutExecutions: 0, averageDurationMs: 0, peakHours: [], executionsByDay: [] },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights for the last {period} days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="px-3 py-2 border rounded-md bg-background text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={exportMutation.isPending}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Tasks"
          value={tasks.totalTasks}
          icon={BarChart3}
          description={`${tasks.completedTasks} completed`}
          trend={tasks.successRate > 80 ? 'up' : tasks.successRate > 50 ? 'neutral' : 'down'}
        />
        <MetricCard
          title="Success Rate"
          value={`${tasks.successRate}%`}
          icon={CheckCircle2}
          description={`${tasks.failedTasks} failed tasks`}
          trend={tasks.successRate > 80 ? 'up' : 'down'}
          valueColor={tasks.successRate > 80 ? 'text-green-600' : tasks.successRate > 50 ? 'text-yellow-600' : 'text-red-600'}
        />
        <MetricCard
          title="Active Agents"
          value={agents.activeAgents}
          icon={Cpu}
          description={`${agents.totalAgents} total agents`}
          trend="neutral"
        />
        <MetricCard
          title="Avg Duration"
          value={`${Math.round(executions.averageDurationMs / 1000)}s`}
          icon={Clock}
          description={`${executions.totalExecutions} executions`}
          trend="neutral"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5" />
            <h3 className="font-semibold">Task Trend</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Daily task count over time</p>
          <TrendChart data={tasks.taskTrend || []} />
        </div>

        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5" />
            <h3 className="font-semibold">Execution Activity</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Daily execution count</p>
          <TrendChart data={executions.executionsByDay || []} color="hsl(var(--chart-2))" />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="font-semibold mb-4">Tasks by Status</h3>
          <DistributionChart
            data={Object.entries(tasks.tasksByStatus || {}).map(([name, value]) => ({
              name,
              value: value as number,
            }))}
          />
        </div>

        <div className="border rounded-lg p-6 bg-card">
          <h3 className="font-semibold mb-4">Tasks by Priority</h3>
          <DistributionChart
            data={Object.entries(tasks.tasksByPriority || {}).map(([name, value]) => ({
              name,
              value: value as number,
            }))}
          />
        </div>

        <div className="border rounded-lg p-6 bg-card">
          <h3 className="font-semibold mb-4">Agents by Status</h3>
          <DistributionChart
            data={Object.entries(agents.agentsByStatus || {}).map(([name, value]) => ({
              name,
              value: value as number,
            }))}
          />
        </div>
      </div>

      {/* Server and Agent Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center gap-2 mb-4">
            <Server className="h-5 w-5" />
            <h3 className="font-semibold">Server Overview</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Servers</span>
              <span className="font-medium">{servers.totalServers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Online</span>
              <span className="font-medium text-green-600">{servers.onlineServers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Offline</span>
              <span className="font-medium text-red-600">
                {servers.totalServers - servers.onlineServers}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tools Installed</span>
              <span className="font-medium">{servers.toolsInstalled}</span>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="h-5 w-5" />
            <h3 className="font-semibold">Top Performing Agents</h3>
          </div>
          <TopAgentsTable agents={agents.topPerformingAgents || []} />
        </div>
      </div>

      {/* Execution Details */}
      <div className="border rounded-lg p-6 bg-card">
        <h3 className="font-semibold mb-2">Execution Summary</h3>
        <p className="text-sm text-muted-foreground mb-4">Overall execution statistics</p>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-3xl font-bold text-green-600">
              {executions.successfulExecutions}
            </div>
            <div className="text-sm text-muted-foreground">Successful</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-3xl font-bold text-red-600">
              {executions.failedExecutions}
            </div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-3xl font-bold text-yellow-600">
              {executions.timeoutExecutions}
            </div>
            <div className="text-sm text-muted-foreground">Timeout</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-3xl font-bold">
              {executions.peakHours?.join(', ') || '-'}
            </div>
            <div className="text-sm text-muted-foreground">Peak Hours (UTC)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
