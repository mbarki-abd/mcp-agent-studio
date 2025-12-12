import { Bot, Server, ListTodo, Activity, Clock, CheckCircle, XCircle, Loader2, Database, AlertTriangle, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboardStats, useDashboardActivity, useDashboardHealth, type DashboardActivity, type DashboardHealth } from '../core/api/hooks';

export function DashboardHome() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activityData, isLoading: activityLoading } = useDashboardActivity(10);
  const { data: health, isLoading: healthLoading } = useDashboardHealth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to MCP Agent Studio
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard
          title="Servers"
          value={statsLoading ? '-' : String(stats?.servers?.total ?? 0)}
          description={statsLoading ? 'Loading...' : `${stats?.servers?.online ?? 0} online`}
          icon={Server}
          loading={statsLoading}
        />
        <StatCard
          title="Agents"
          value={statsLoading ? '-' : String(stats?.agents?.total ?? 0)}
          description={statsLoading ? 'Loading...' : `${stats?.agents?.active ?? 0} active`}
          icon={Bot}
          loading={statsLoading}
        />
        <StatCard
          title="Tasks"
          value={statsLoading ? '-' : String(stats?.tasks?.total ?? 0)}
          description={statsLoading ? 'Loading...' : `${stats?.tasks?.running ?? 0} running`}
          icon={ListTodo}
          loading={statsLoading}
        />
        <StatCard
          title="Executions"
          value={statsLoading ? '-' : String(stats?.executions?.today ?? 0)}
          description={statsLoading ? 'Loading...' : 'Today'}
          icon={Activity}
          loading={statsLoading}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/servers')}
              className="w-full text-left px-4 py-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              Add Server Configuration
            </button>
            <button
              onClick={() => navigate('/agents')}
              className="w-full text-left px-4 py-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              Create New Agent
            </button>
            <button
              onClick={() => navigate('/tasks')}
              className="w-full text-left px-4 py-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              Create New Task
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          {activityLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : activityData?.activities && activityData.activities.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {activityData.activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No recent activity
            </div>
          )}
        </div>
      </div>

      {/* System Health */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">System Health</h2>
        {healthLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : health ? (
          <div className="space-y-4">
            {/* Overall Status */}
            <div className="flex items-center gap-3">
              <HealthStatusBadge status={health.status} />
              <span className="text-sm text-muted-foreground">
                Last check: {new Date(health.timestamp).toLocaleTimeString()}
              </span>
            </div>

            {/* Components Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Database */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className={`p-2 rounded-lg ${
                  health.database.status === 'healthy' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <Database className={`w-4 h-4 ${
                    health.database.status === 'healthy' ? 'text-green-600' : 'text-red-600'
                  }`} />
                </div>
                <div>
                  <p className="font-medium text-sm">Database</p>
                  <p className={`text-xs ${
                    health.database.status === 'healthy' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {health.database.status === 'healthy' ? 'Connected' : 'Disconnected'}
                  </p>
                </div>
              </div>

              {/* Servers */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className={`p-2 rounded-lg ${
                  health.servers.unhealthy === 0 ? 'bg-green-100' :
                  health.servers.healthy > 0 ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  <Server className={`w-4 h-4 ${
                    health.servers.unhealthy === 0 ? 'text-green-600' :
                    health.servers.healthy > 0 ? 'text-yellow-600' : 'text-red-600'
                  }`} />
                </div>
                <div>
                  <p className="font-medium text-sm">Servers</p>
                  <p className="text-xs text-muted-foreground">
                    {health.servers.healthy}/{health.servers.total} healthy
                  </p>
                </div>
              </div>
            </div>

            {/* Server Details (if any have issues) */}
            {(health.servers.unhealthy > 0 || health.servers.degraded > 0) && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  Servers with issues
                </p>
                <div className="space-y-2">
                  {health.servers.details
                    .filter((s) => s.status !== 'healthy')
                    .map((server) => (
                      <div
                        key={server.id}
                        className="flex items-center justify-between text-sm p-2 rounded bg-muted"
                      >
                        <span>{server.name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          server.status === 'degraded'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {server.status}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            Unable to load health status
          </div>
        )}
      </div>

      {/* Extra Stats Row */}
      {stats && (
        <div className="grid grid-cols-4 gap-6">
          <MiniStatCard
            title="Pending Tasks"
            value={stats.tasks?.pending ?? 0}
            icon={Clock}
          />
          <MiniStatCard
            title="Completed Tasks"
            value={stats.tasks?.completed ?? 0}
            icon={CheckCircle}
            variant="success"
          />
          <MiniStatCard
            title="Failed Tasks"
            value={stats.tasks?.failed ?? 0}
            icon={XCircle}
            variant="error"
          />
          <MiniStatCard
            title="Weekly Executions"
            value={stats.executions?.thisWeek ?? 0}
            icon={Activity}
          />
        </div>
      )}
    </div>
  );
}

export default DashboardHome;

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  loading = false,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-1">
            {loading ? (
              <span className="inline-block w-8 h-8 bg-muted animate-pulse rounded" />
            ) : (
              value
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </div>
  );
}

function MiniStatCard({
  title,
  value,
  icon: Icon,
  variant = 'default',
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'success' | 'error';
}) {
  const variantStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-green-500/10 text-green-500',
    error: 'bg-red-500/10 text-red-500',
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${variantStyles[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: DashboardActivity }) {
  const iconMap: Record<DashboardActivity['type'], React.ComponentType<{ className?: string }>> = {
    task_completed: CheckCircle,
    task_failed: XCircle,
    agent_created: Bot,
    server_connected: Server,
    server_error: Server,
  };

  const colorMap: Record<DashboardActivity['type'], string> = {
    task_completed: 'text-green-500',
    task_failed: 'text-red-500',
    agent_created: 'text-blue-500',
    server_connected: 'text-green-500',
    server_error: 'text-red-500',
  };

  const Icon = iconMap[activity.type] || Activity;
  const color = colorMap[activity.type] || 'text-muted-foreground';

  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className={`w-4 h-4 mt-0.5 ${color}`} />
      <div className="flex-1 min-w-0">
        <p className="truncate">{activity.message}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(activity.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function HealthStatusBadge({ status }: { status: DashboardHealth['status'] }) {
  const config = {
    healthy: {
      label: 'All Systems Operational',
      bg: 'bg-green-100',
      text: 'text-green-700',
      icon: Heart,
    },
    degraded: {
      label: 'Degraded Performance',
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      icon: AlertTriangle,
    },
    unhealthy: {
      label: 'System Issues Detected',
      bg: 'bg-red-100',
      text: 'text-red-700',
      icon: XCircle,
    },
  };

  const { label, bg, text, icon: Icon } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${bg} ${text}`}>
      <Icon className="w-4 h-4" />
      {label}
    </span>
  );
}
