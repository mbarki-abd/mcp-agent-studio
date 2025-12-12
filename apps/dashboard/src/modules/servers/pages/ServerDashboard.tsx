import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Server,
  Users,
  ListTodo,
  Wrench,
  Activity,
  Settings,
  RefreshCw,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/client';
import { ServerStatusBadge } from '../components/ServerStatusBadge';
import { AgentStatusBadge } from '../../agents/components/AgentStatusBadge';
import { TaskStatusBadge } from '../../tasks/components/TaskStatusBadge';
import type { AgentStatus, TaskStatus, ServerStatus } from '@mcp/types';

type TabType = 'overview' | 'agents' | 'tasks' | 'tools' | 'settings';

// Types for API responses
interface ServerData {
  id: string;
  name: string;
  description?: string;
  url: string;
  wsUrl?: string;
  status: ServerStatus;
  isDefault: boolean;
  autoConnect: boolean;
  priority: number;
  lastHealthCheck?: string;
  lastError?: string;
  serverVersion?: string;
  capabilities?: string[];
  createdAt: string;
  updatedAt: string;
}

interface AgentData {
  id: string;
  name: string;
  displayName: string;
  status: AgentStatus;
  role: string;
  createdAt: string;
}

interface TaskData {
  id: string;
  title: string;
  status: TaskStatus;
  priority: string;
  createdAt: string;
  agent?: { name: string };
}

interface ServerToolData {
  id: string;
  status: string;
  installedVersion?: string;
  tool: {
    id: string;
    name: string;
    displayName: string;
    category: string;
  };
}

export default function ServerDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch server details
  const { data: server, isLoading: serverLoading, error: serverError } = useQuery({
    queryKey: ['server', id],
    queryFn: async () => {
      const response = await apiClient.get<{ data: ServerData }>(`/servers/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  // Fetch server agents
  const { data: agentsData, isLoading: agentsLoading } = useQuery({
    queryKey: ['server-agents', id],
    queryFn: async () => {
      const response = await apiClient.get<{ data: AgentData[] }>(`/agents?serverId=${id}&limit=100`);
      return response;
    },
    enabled: !!id,
  });

  // Fetch server tasks
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['server-tasks', id],
    queryFn: async () => {
      const response = await apiClient.get<{ data: TaskData[] }>(`/tasks?serverId=${id}&limit=100`);
      return response;
    },
    enabled: !!id,
  });

  // Fetch server tools
  const { data: toolsData, isLoading: toolsLoading } = useQuery({
    queryKey: ['server-tools', id],
    queryFn: async () => {
      const response = await apiClient.get<ServerToolData[]>(`/tools/server/${id}`);
      return response;
    },
    enabled: !!id,
  });

  // Health check mutation
  const healthCheckMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<unknown>(`/servers/${id}/health-check`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server', id] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/servers/${id}`);
    },
    onSuccess: () => {
      navigate('/servers');
    },
  });

  const agents = agentsData?.data || [];
  const tasks = tasksData?.data || [];
  const tools = toolsData || [];

  // Stats calculations
  const stats = {
    totalAgents: agents.length,
    activeAgents: agents.filter((a) => a.status === 'ACTIVE').length,
    busyAgents: agents.filter((a) => a.status === 'BUSY').length,
    totalTasks: tasks.length,
    runningTasks: tasks.filter((t) => t.status === 'RUNNING').length,
    completedTasks: tasks.filter((t) => t.status === 'COMPLETED').length,
    failedTasks: tasks.filter((t) => t.status === 'FAILED').length,
    installedTools: tools.filter((t) => t.status === 'INSTALLED').length,
    totalTools: tools.length,
  };

  if (serverLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (serverError || !server) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Server not found</h3>
          <p className="text-red-600 text-sm mt-1">
            The server you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Link to="/servers" className="text-red-700 hover:text-red-800 text-sm mt-2 inline-block">
            Back to Servers
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: Activity },
    { id: 'agents' as TabType, label: 'Agents', icon: Users, count: stats.totalAgents },
    { id: 'tasks' as TabType, label: 'Tasks', icon: ListTodo, count: stats.totalTasks },
    { id: 'tools' as TabType, label: 'Tools', icon: Wrench, count: stats.installedTools },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/servers')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Server className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{server.name}</h1>
              <p className="text-gray-500 text-sm">{server.url}</p>
            </div>
          </div>
          <ServerStatusBadge status={server.status} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => healthCheckMutation.mutate()}
            disabled={healthCheckMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${healthCheckMutation.isPending ? 'animate-spin' : ''}`} />
            Health Check
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab server={server} stats={stats} agents={agents} tasks={tasks} />
      )}
      {activeTab === 'agents' && (
        <AgentsTab serverId={id!} agents={agents} loading={agentsLoading} />
      )}
      {activeTab === 'tasks' && (
        <TasksTab serverId={id!} tasks={tasks} loading={tasksLoading} />
      )}
      {activeTab === 'tools' && (
        <ToolsTab serverId={id!} tools={tools} loading={toolsLoading} />
      )}
      {activeTab === 'settings' && (
        <SettingsTab server={server} />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900">Delete Server</h3>
            <p className="text-gray-600 mt-2">
              Are you sure you want to delete "{server.name}"? This action cannot be undone.
              All associated agents and tasks will also be deleted.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ server, stats, agents, tasks }: {
  server: ServerData;
  stats: {
    totalAgents: number;
    activeAgents: number;
    busyAgents: number;
    totalTasks: number;
    runningTasks: number;
    completedTasks: number;
    failedTasks: number;
    installedTools: number;
    totalTools: number;
  };
  agents: AgentData[];
  tasks: TaskData[];
}) {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Agents"
          value={stats.totalAgents}
          subtitle={`${stats.activeAgents} active, ${stats.busyAgents} busy`}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Tasks"
          value={stats.totalTasks}
          subtitle={`${stats.runningTasks} running, ${stats.completedTasks} completed`}
          icon={ListTodo}
          color="green"
        />
        <StatCard
          title="Tools Installed"
          value={stats.installedTools}
          subtitle={`of ${stats.totalTools} available`}
          icon={Wrench}
          color="purple"
        />
        <StatCard
          title="Health"
          value={server.status}
          subtitle={server.lastHealthCheck ? `Last check: ${new Date(server.lastHealthCheck).toLocaleString()}` : 'Never checked'}
          icon={Activity}
          color={server.status === 'ONLINE' ? 'green' : server.status === 'OFFLINE' ? 'red' : 'yellow'}
        />
      </div>

      {/* Server Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Server Information</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">Version</dt>
              <dd className="text-gray-900 font-medium">{server.serverVersion || 'Unknown'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Created</dt>
              <dd className="text-gray-900">{new Date(server.createdAt).toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Last Updated</dt>
              <dd className="text-gray-900">{new Date(server.updatedAt).toLocaleDateString()}</dd>
            </div>
            {server.capabilities && server.capabilities.length > 0 && (
              <div>
                <dt className="text-gray-500 mb-2">Capabilities</dt>
                <dd className="flex flex-wrap gap-2">
                  {server.capabilities.map((cap: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                      {cap}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {server.lastError && (
          <div className="bg-red-50 rounded-xl border border-red-200 p-6">
            <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Last Error
            </h3>
            <p className="text-red-700 text-sm">{server.lastError}</p>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Agents */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Agents</h3>
            <Link to={`/servers/${server.id}?tab=agents`} className="text-blue-600 text-sm hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {agents.slice(0, 5).map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{agent.name}</p>
                    <p className="text-xs text-gray-500">{agent.role}</p>
                  </div>
                </div>
                <AgentStatusBadge status={agent.status} />
              </div>
            ))}
            {agents.length === 0 && (
              <p className="text-gray-500 text-center py-4">No agents yet</p>
            )}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Tasks</h3>
            <Link to={`/servers/${server.id}?tab=tasks`} className="text-blue-600 text-sm hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {tasks.slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <ListTodo className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 truncate max-w-[200px]">{task.title}</p>
                    <p className="text-xs text-gray-500">{task.priority}</p>
                  </div>
                </div>
                <TaskStatusBadge status={task.status} />
              </div>
            ))}
            {tasks.length === 0 && (
              <p className="text-gray-500 text-center py-4">No tasks yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Stats Card Component
function StatCard({ title, value, subtitle, icon: Icon, color }: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'purple' | 'red' | 'yellow';
}) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
    yellow: 'bg-yellow-100 text-yellow-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-gray-400 text-xs mt-1">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-xl ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

// Agents Tab Component
function AgentsTab({ serverId, agents, loading }: {
  serverId: string;
  agents: AgentData[];
  loading: boolean;
}) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Server Agents ({agents.length})</h3>
        <Link
          to={`/agents/new?serverId=${serverId}`}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Users className="w-4 h-4" />
          Create Agent
        </Link>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No agents on this server yet</p>
          <Link
            to={`/agents/new?serverId=${serverId}`}
            className="text-blue-600 hover:underline text-sm mt-2 inline-block"
          >
            Create your first agent
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Agent</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Role</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Created</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{agent.displayName || agent.name}</p>
                        <p className="text-xs text-gray-500">{agent.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-600">{agent.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <AgentStatusBadge status={agent.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-sm">
                    {new Date(agent.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => navigate(`/agents/${agent.id}`)}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Tasks Tab Component
function TasksTab({ serverId, tasks, loading }: {
  serverId: string;
  tasks: TaskData[];
  loading: boolean;
}) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-700';
      case 'HIGH': return 'bg-orange-100 text-orange-700';
      case 'MEDIUM': return 'bg-blue-100 text-blue-700';
      case 'LOW': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Server Tasks ({tasks.length})</h3>
        <Link
          to={`/tasks/new?serverId=${serverId}`}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ListTodo className="w-4 h-4" />
          Create Task
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <ListTodo className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No tasks on this server yet</p>
          <Link
            to={`/tasks/new?serverId=${serverId}`}
            className="text-blue-600 hover:underline text-sm mt-2 inline-block"
          >
            Create your first task
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Task</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Priority</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Agent</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Created</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 truncate max-w-[250px]">{task.title}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <TaskStatusBadge status={task.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-sm">
                    {task.agent?.name || 'Unassigned'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-sm">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Tools Tab Component
function ToolsTab({ serverId, tools, loading }: {
  serverId: string;
  tools: ServerToolData[];
  loading: boolean;
}) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'INSTALLED': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'INSTALLING': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'FAILED': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const installedTools = tools.filter(t => t.status === 'INSTALLED');
  const otherTools = tools.filter(t => t.status !== 'INSTALLED');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Server Tools</h3>
        <button
          onClick={() => navigate(`/tools?serverId=${serverId}`)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Wrench className="w-4 h-4" />
          Manage Tools
        </button>
      </div>

      {/* Installed Tools */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Installed ({installedTools.length})</h4>
        {installedTools.length === 0 ? (
          <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-xl">No tools installed</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {installedTools.map((serverTool) => (
              <div key={serverTool.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Wrench className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{serverTool.tool.displayName}</p>
                      <p className="text-xs text-gray-500">{serverTool.tool.category}</p>
                    </div>
                  </div>
                  {getStatusIcon(serverTool.status)}
                </div>
                {serverTool.installedVersion && (
                  <p className="text-xs text-gray-400 mt-2">v{serverTool.installedVersion}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Other Tools */}
      {otherTools.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Other ({otherTools.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherTools.map((serverTool) => (
              <div key={serverTool.id} className="bg-white rounded-xl border border-gray-200 p-4 opacity-60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Wrench className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{serverTool.tool.displayName}</p>
                      <p className="text-xs text-gray-500">{serverTool.status}</p>
                    </div>
                  </div>
                  {getStatusIcon(serverTool.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Settings Tab Component
function SettingsTab({ server }: {
  server: ServerData;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: server.name,
    description: server.description || '',
    url: server.url,
    wsUrl: server.wsUrl || '',
    isDefault: server.isDefault,
    autoConnect: server.autoConnect,
    priority: server.priority,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiClient.put<unknown>(`/servers/${server.id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server', server.id] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Server Configuration</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WebSocket URL (optional)</label>
            <input
              type="url"
              value={formData.wsUrl}
              onChange={(e) => setFormData({ ...formData, wsUrl: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <input
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Set as default server</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.autoConnect}
                onChange={(e) => setFormData({ ...formData, autoConnect: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Auto-connect on startup</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {updateMutation.isSuccess && (
          <p className="text-green-600 text-sm">Settings saved successfully!</p>
        )}
        {updateMutation.isError && (
          <p className="text-red-600 text-sm">Failed to save settings. Please try again.</p>
        )}
      </form>
    </div>
  );
}
