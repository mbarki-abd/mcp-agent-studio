import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  Users,
  Server,
  Clock,
  Shield,
  Play,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Settings,
  Activity,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { AgentStatusBadge } from '../components/AgentStatusBadge';
import {
  useAgent,
  useAgents,
  useDeleteAgent,
  useValidateAgent,
  useServer,
  useTasks,
} from '../../../core/api';
import { useAgentSubscription, useAgentStatus } from '../../../core/websocket';
import { Can } from '../../../core/auth';
import { cn } from '../../../lib/utils';
import type { AgentRole, AgentStatusEvent, Agent, ServerConfiguration } from '@mcp/types';
import { useCallback } from 'react';
import { useAgentsStore } from '../stores/agents.store';

const roleIcons: Record<AgentRole, typeof Bot> = {
  MASTER: Users,
  SUPERVISOR: Users,
  WORKER: Bot,
};

const roleColors: Record<AgentRole, string> = {
  MASTER: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  SUPERVISOR: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  WORKER: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: agent, isLoading, error, refetch } = useAgent(id || '');
  const deleteAgent = useDeleteAgent();
  const validateAgent = useValidateAgent();
  const { updateAgentStatus } = useAgentsStore();

  // Get server info
  const { data: server } = useServer(agent?.serverId || '', {
    enabled: !!agent?.serverId,
  }) as { data: ServerConfiguration | undefined };

  // Get supervisor info if exists
  const { data: supervisorData } = useAgent(agent?.supervisorId || '', {
    enabled: !!agent?.supervisorId,
  });

  // Get subordinates (agents where this agent is supervisor)
  const { data: subordinatesData } = useAgents({
    serverId: agent?.serverId,
  });
  const subordinates = subordinatesData?.items?.filter(
    (a: Agent) => a.supervisorId === id
  ) || [];

  // Get recent tasks for this agent
  const { data: tasksData } = useTasks({
    agentId: id,
    pageSize: 5,
  });
  const recentTasks = tasksData?.items || [];

  // Real-time status subscription
  useAgentSubscription(id || '');

  const handleStatusUpdate = useCallback(
    (event: AgentStatusEvent) => {
      if (event.agentId === id) {
        updateAgentStatus(event.agentId, event.data.status);
        refetch();
      }
    },
    [id, updateAgentStatus, refetch]
  );

  useAgentStatus(handleStatusUpdate);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this agent?')) {
      await deleteAgent.mutateAsync(id!);
      navigate('/agents');
    }
  };

  const handleValidate = async () => {
    await validateAgent.mutateAsync(id!);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-muted animate-pulse rounded-lg" />
            <div className="h-48 bg-muted animate-pulse rounded-lg" />
          </div>
          <div className="h-96 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium">Agent not found</h3>
        <p className="text-muted-foreground mt-1">
          {error?.message || 'The agent you are looking for does not exist'}
        </p>
        <Button onClick={() => navigate('/agents')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Agents
        </Button>
      </div>
    );
  }

  const RoleIcon = roleIcons[agent.role] || Bot;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/agents')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className={cn('p-3 rounded-xl', roleColors[agent.role])}>
            <RoleIcon className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{agent.displayName}</h1>
              <AgentStatusBadge status={agent.status} />
            </div>
            <p className="text-muted-foreground">{agent.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Can I="update" a="Agent">
                <DropdownMenuItem onClick={() => navigate(`/agents/${id}/edit`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              </Can>
              {agent.status === 'PENDING_VALIDATION' && (
                <Can I="update" a="Agent">
                  <DropdownMenuItem onClick={handleValidate}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Validate
                  </DropdownMenuItem>
                </Can>
              )}
              {agent.status === 'ACTIVE' && (
                <Can I="execute" a="Agent">
                  <DropdownMenuItem onClick={() => navigate(`/agents/${id}/execute`)}>
                    <Play className="h-4 w-4 mr-2" />
                    Execute Task
                  </DropdownMenuItem>
                </Can>
              )}
              <DropdownMenuSeparator />
              <Can I="delete" a="Agent">
                <DropdownMenuItem className="text-red-600" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </Can>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info Card */}
          <div className="border rounded-lg p-6 space-y-6">
            <h2 className="font-semibold text-lg">Agent Information</h2>

            {agent.description && (
              <p className="text-muted-foreground">{agent.description}</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="font-medium capitalize">{agent.role.toLowerCase()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <AgentStatusBadge status={agent.status} />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Unix User</p>
                <p className="font-medium font-mono text-sm">
                  {agent.unixUser || '-'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Home Directory</p>
                <p className="font-medium font-mono text-sm truncate">
                  {agent.homeDir || '-'}
                </p>
              </div>
            </div>

            {/* Capabilities */}
            {Array.isArray(agent.capabilities) && agent.capabilities.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Capabilities</p>
                <div className="flex flex-wrap gap-2">
                  {(agent.capabilities as string[]).map((cap) => (
                    <span
                      key={cap}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="pt-4 border-t grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Created {new Date(agent.createdAt).toLocaleDateString()}</span>
              </div>
              {agent.validatedAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>
                    Validated {new Date(agent.validatedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Recent Tasks */}
          <div className="border rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Recent Tasks</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/tasks?agentId=${id}`)}
              >
                View All
              </Button>
            </div>

            {recentTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm">No tasks assigned yet</p>
            ) : (
              <div className="space-y-2">
                {recentTasks.map((task) => (
                  <Link
                    key={task.id}
                    to={`/tasks/${task.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(task.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'text-xs px-2 py-1 rounded-full',
                        task.status === 'COMPLETED' &&
                          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                        task.status === 'RUNNING' &&
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                        task.status === 'FAILED' &&
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                        !['COMPLETED', 'RUNNING', 'FAILED'].includes(task.status) &&
                          'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                      )}
                    >
                      {task.status.toLowerCase()}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Server Info */}
          <div className="border rounded-lg p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Server className="h-4 w-4" />
              Server
            </h3>
            {server ? (
              <Link
                to={`/servers/${server.id}`}
                className="block p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                <p className="font-medium">{server.name}</p>
                <p className="text-xs text-muted-foreground truncate">{server.url}</p>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">No server assigned</p>
            )}
          </div>

          {/* Supervisor */}
          {agent.supervisorId && (
            <div className="border rounded-lg p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Supervisor
              </h3>
              {supervisorData ? (
                <Link
                  to={`/agents/${supervisorData.id}`}
                  className="block p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'p-1.5 rounded',
                        roleColors[supervisorData.role]
                      )}
                    >
                      {supervisorData.role === 'MASTER' ? (
                        <Users className="h-3 w-3" />
                      ) : (
                        <Bot className="h-3 w-3" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {supervisorData.displayName}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {supervisorData.role.toLowerCase()}
                      </p>
                    </div>
                  </div>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">Loading...</p>
              )}
            </div>
          )}

          {/* Subordinates */}
          {(agent.role === 'MASTER' || agent.role === 'SUPERVISOR') && (
            <div className="border rounded-lg p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Subordinates ({subordinates.length})
              </h3>
              {subordinates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subordinates</p>
              ) : (
                <div className="space-y-2">
                  {subordinates.slice(0, 5).map((sub) => (
                    <Link
                      key={sub.id}
                      to={`/agents/${sub.id}`}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted transition-colors"
                    >
                      <div
                        className={cn('p-1.5 rounded', roleColors[sub.role])}
                      >
                        <Bot className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {sub.displayName}
                        </p>
                      </div>
                      <AgentStatusBadge status={sub.status} size="sm" />
                    </Link>
                  ))}
                  {subordinates.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`/agents?supervisorId=${id}`)}
                    >
                      View all {subordinates.length} subordinates
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
