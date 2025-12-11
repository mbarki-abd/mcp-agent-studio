import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  Users,
  Server,
  Clock,
  Play,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Settings,
  Activity,
  MessageSquare,
  Package,
  BarChart3,
  ListTodo,
  Target,
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
  useToolDefinitions,
  useAgentToolPermissions,
} from '../../../core/api';
import { useAgentSubscription, useAgentStatus } from '../../../core/websocket';
import { Can } from '../../../core/auth';
import { cn } from '../../../lib/utils';
import type { AgentRole, AgentStatusEvent, Task } from '@mcp/types';
import { useChatStore } from '../../chat/stores/chat.store';

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

type TabType = 'overview' | 'tasks' | 'tools' | 'chat' | 'activity';

export default function AgentDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const { data: agent, isLoading, error, refetch } = useAgent(id || '');
  const deleteAgent = useDeleteAgent();
  const validateAgent = useValidateAgent();

  // Get server info
  const { data: server } = useServer(agent?.serverId || '', {
    enabled: !!agent?.serverId,
  });

  // Get supervisor info
  const { data: supervisorData } = useAgent(agent?.supervisorId || '', {
    enabled: !!agent?.supervisorId,
  });

  // Get subordinates
  const { data: subordinatesData } = useAgents({
    serverId: agent?.serverId,
  });
  const subordinates = subordinatesData?.items?.filter(
    (a) => a.supervisorId === id
  ) || [];

  // Get ALL tasks for this agent
  const { data: tasksData } = useTasks({
    agentId: id,
    pageSize: 100,
  });
  const tasks = tasksData?.items || [];

  // Get tool permissions for this agent
  const { data: toolPermissionsData } = useAgentToolPermissions(id || '');
  const toolPermissions = toolPermissionsData || [];

  // Get all tool definitions for reference
  const { data: toolDefinitions } = useToolDefinitions();

  // Get chat session
  const { getSessionByAgent } = useChatStore();
  const chatSession = id ? getSessionByAgent(id) : null;
  const chatMessages = chatSession?.messages || [];

  // Real-time subscription
  useAgentSubscription(id || '');

  const handleStatusUpdate = useCallback(
    (event: AgentStatusEvent) => {
      if (event.agentId === id) {
        refetch();
      }
    },
    [id, refetch]
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

  // Calculate stats
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  const failedTasks = tasks.filter((t) => t.status === 'FAILED').length;
  const runningTasks = tasks.filter((t) => t.status === 'RUNNING').length;
  const pendingTasks = tasks.filter((t) => ['PENDING', 'SCHEDULED'].includes(t.status)).length;
  const successRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
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

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
    { id: 'tasks' as const, label: 'Tasks', icon: ListTodo, count: tasks.length },
    { id: 'tools' as const, label: 'Tools', icon: Package, count: toolPermissions.length },
    { id: 'chat' as const, label: 'Chat', icon: MessageSquare, count: chatMessages.length },
    { id: 'activity' as const, label: 'Activity', icon: Activity },
  ];

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
            <p className="text-muted-foreground">{agent.name} &bull; {agent.role.toLowerCase()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/chat/${id}`)}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat
          </Button>
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
                  <DropdownMenuItem onClick={() => navigate(`/tasks/new?agentId=${id}`)}>
                    <Play className="h-4 w-4 mr-2" />
                    Create Task
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Tasks</span>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{tasks.length}</p>
          <p className="text-xs text-muted-foreground">
            {runningTasks} running, {pendingTasks} pending
          </p>
        </div>

        <div className="border rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Success Rate</span>
            <Target className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-green-600">{successRate}%</p>
          <p className="text-xs text-muted-foreground">
            {completedTasks} completed, {failedTasks} failed
          </p>
        </div>

        <div className="border rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tools Access</span>
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{toolPermissions.length}</p>
          <p className="text-xs text-muted-foreground">
            of {toolDefinitions?.tools?.length || 0} available
          </p>
        </div>

        <div className="border rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Subordinates</span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{subordinates.length}</p>
          <p className="text-xs text-muted-foreground">
            {subordinates.filter(s => s.status === 'ACTIVE').length} active
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-muted">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <OverviewTab
            agent={agent}
            server={server}
            supervisorData={supervisorData}
            subordinates={subordinates}
            tasks={tasks}
          />
        )}
        {activeTab === 'tasks' && (
          <TasksTab tasks={tasks} agentId={id!} />
        )}
        {activeTab === 'tools' && (
          <ToolsTab
            permissions={toolPermissions}
            allTools={toolDefinitions?.tools || []}
            agentId={id!}
          />
        )}
        {activeTab === 'chat' && (
          <ChatTab messages={chatMessages} agentId={id!} agentName={agent.displayName} />
        )}
        {activeTab === 'activity' && (
          <ActivityTab agentId={id!} />
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ agent, server, supervisorData, subordinates, tasks }: {
  agent: any;
  server: any;
  supervisorData: any;
  subordinates: any[];
  tasks: Task[];
}) {
  const recentTasks = tasks.slice(0, 5);

  return (
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
              <p className="font-medium font-mono text-sm">{agent.unixUser || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Max Concurrent Tasks</p>
              <p className="font-medium">{agent.maxConcurrentTasks || 5}</p>
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

          {/* System Prompt */}
          {agent.systemPrompt && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">System Prompt</p>
              <div className="p-3 rounded-lg bg-muted text-sm font-mono whitespace-pre-wrap">
                {agent.systemPrompt}
              </div>
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div className="border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Recent Tasks</h2>
            <Link to={`/tasks?agentId=${agent.id}`}>
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
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
                  <TaskStatusBadge status={task.status} />
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
              to={`/servers`}
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
        {agent.supervisorId && supervisorData && (
          <div className="border rounded-lg p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Supervisor
            </h3>
            <Link
              to={`/agents/${supervisorData.id}`}
              className="block p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <p className="font-medium text-sm">{supervisorData.displayName}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {supervisorData.role.toLowerCase()}
              </p>
            </Link>
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
                    <Bot className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm flex-1 truncate">{sub.displayName}</span>
                    <AgentStatusBadge status={sub.status} size="sm" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timestamps */}
        <div className="border rounded-lg p-6 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timeline
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(agent.createdAt).toLocaleDateString()}</span>
            </div>
            {agent.validatedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Validated</span>
                <span>{new Date(agent.validatedAt).toLocaleDateString()}</span>
              </div>
            )}
            {agent.lastActiveAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Active</span>
                <span>{new Date(agent.lastActiveAt).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Tasks Tab Component
function TasksTab({ tasks, agentId }: { tasks: Task[]; agentId: string }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>('all');

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  const statusCounts = {
    all: tasks.length,
    PENDING: tasks.filter((t) => t.status === 'PENDING').length,
    RUNNING: tasks.filter((t) => t.status === 'RUNNING').length,
    COMPLETED: tasks.filter((t) => t.status === 'COMPLETED').length,
    FAILED: tasks.filter((t) => t.status === 'FAILED').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                filter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              {status === 'all' ? 'All' : status.toLowerCase()} ({count})
            </button>
          ))}
        </div>
        <Button onClick={() => navigate(`/tasks/new?agentId=${agentId}`)}>
          <Play className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No tasks found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <Link
              key={task.id}
              to={`/tasks/${task.id}`}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-muted">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{task.title}</p>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {task.description || 'No description'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right text-sm">
                  <p className="text-muted-foreground">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {task.priority.toLowerCase()} priority
                  </p>
                </div>
                <TaskStatusBadge status={task.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Tools Tab Component
function ToolsTab({ permissions, allTools, agentId }: {
  permissions: any[];
  allTools: any[];
  agentId: string;
}) {
  const navigate = useNavigate();
  const permittedToolIds = new Set(permissions.map((p) => p.tool.id));

  // Group tools by category
  const toolsByCategory = allTools.reduce((acc: Record<string, any[]>, tool) => {
    const cat = tool.category || 'UTILITY';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({
      ...tool,
      hasPermission: permittedToolIds.has(tool.id),
      permission: permissions.find((p) => p.tool.id === tool.id),
    });
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {permissions.length} tools accessible out of {allTools.length} available
        </p>
        <Button variant="outline" onClick={() => navigate(`/tools/agent/${agentId}/permissions`)}>
          <Settings className="h-4 w-4 mr-2" />
          Manage Permissions
        </Button>
      </div>

      {Object.entries(toolsByCategory).map(([category, tools]) => (
        <div key={category} className="space-y-3">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            {category.replace(/_/g, ' ')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tools.map((tool) => (
              <div
                key={tool.id}
                className={cn(
                  'p-4 border rounded-lg',
                  tool.hasPermission
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                    : 'bg-muted/50 opacity-60'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span className="font-medium text-sm">{tool.displayName}</span>
                  </div>
                  {tool.hasPermission && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {tool.description}
                </p>
                {tool.permission && (
                  <div className="flex gap-2 mt-2">
                    {tool.permission.canUse && (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        use
                      </span>
                    )}
                    {tool.permission.canSudo && (
                      <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                        sudo
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Chat Tab Component
function ChatTab({ messages, agentId, agentName }: {
  messages: any[];
  agentId: string;
  agentName: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {messages.length} messages in conversation history
        </p>
        <Button onClick={() => navigate(`/chat/${agentId}`)}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Open Chat
        </Button>
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No conversation history</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(`/chat/${agentId}`)}>
            Start a conversation with {agentName}
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg divide-y max-h-[500px] overflow-y-auto">
          {messages.slice(-20).map((msg) => (
            <div key={msg.id} className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  'text-xs font-medium px-2 py-0.5 rounded',
                  msg.role === 'user'
                    ? 'bg-blue-100 text-blue-700'
                    : msg.role === 'assistant'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-700'
                )}>
                  {msg.role}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(msg.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Activity Tab Component
function ActivityTab({ agentId: _agentId }: { agentId: string }) {
  // This would normally fetch from an activity/audit log API
  const activities = [
    { id: 1, type: 'task_completed', message: 'Completed task "Review PR #142"', timestamp: new Date() },
    { id: 2, type: 'status_change', message: 'Status changed to ACTIVE', timestamp: new Date(Date.now() - 3600000) },
    { id: 3, type: 'task_started', message: 'Started task "Write unit tests"', timestamp: new Date(Date.now() - 7200000) },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Recent activity for this agent
      </p>

      <div className="border rounded-lg divide-y">
        {activities.map((activity) => (
          <div key={activity.id} className="p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Activity className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm">{activity.message}</p>
              <p className="text-xs text-muted-foreground">
                {activity.timestamp.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper component
function TaskStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'text-xs px-2 py-1 rounded-full',
        status === 'COMPLETED' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        status === 'RUNNING' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        status === 'FAILED' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        status === 'PENDING' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        !['COMPLETED', 'RUNNING', 'FAILED', 'PENDING'].includes(status) &&
          'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
      )}
    >
      {status.toLowerCase()}
    </span>
  );
}
