import { useEffect, useCallback } from 'react';
import { Activity, LayoutGrid, List, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { AgentMonitorCard } from '../components/AgentMonitorCard';
import { TodoProgress } from '../components/TodoProgress';
import { ActivityChart } from '../components/ActivityChart';
import { ExecutionMetricsChart } from '../components/ExecutionMetricsChart';
import { useAgents } from '../../../core/api';
import {
  useWebSocket,
  useAgentStatus,
  useTodoProgress,
} from '../../../core/websocket';
import { useMonitoringStore } from '../stores/monitoring.store';
import type { AgentStatusEvent, TodoProgressEvent } from '@mcp/types';

export default function ControlCenter() {
  const { data: agentsData, isLoading, refetch } = useAgents({ pageSize: 100 });
  const { isConnected, subscribe, unsubscribe } = useWebSocket();

  const {
    agents,
    selectedAgentId,
    viewMode,
    showOffline,
    setAgentData,
    updateAgentStatus,
    updateTodoProgress,
    setSelectedAgent,
    setViewMode,
    setShowOffline,
  } = useMonitoringStore();

  // Initialize agents from API data
  useEffect(() => {
    if (agentsData?.items) {
      agentsData.items.forEach((agent) => {
        setAgentData(agent.id, {
          name: agent.name,
          displayName: agent.displayName,
          status: agent.status,
        });
      });
    }
  }, [agentsData, setAgentData]);

  // Subscribe to all agents
  useEffect(() => {
    const agentIds = Array.from(agents.keys());
    agentIds.forEach((id) => subscribe('agent', id));

    return () => {
      agentIds.forEach((id) => unsubscribe('agent', id));
    };
  }, [agents, subscribe, unsubscribe]);

  // Handle real-time status updates
  const handleStatusUpdate = useCallback(
    (event: AgentStatusEvent) => {
      updateAgentStatus(event.agentId, event.data.status);
    },
    [updateAgentStatus]
  );

  // Handle todo progress updates
  const handleTodoUpdate = useCallback(
    (event: TodoProgressEvent) => {
      updateTodoProgress(event.agentId, {
        completed: event.data.completed,
        total: event.data.total,
        currentItem: event.data.currentTask,
      });
    },
    [updateTodoProgress]
  );

  useAgentStatus(handleStatusUpdate);
  useTodoProgress(handleTodoUpdate);

  // Filter agents
  const filteredAgents = Array.from(agents.values()).filter((agent) => {
    if (!showOffline && agent.status === 'INACTIVE') return false;
    return true;
  });

  // Stats
  const stats = {
    total: filteredAgents.length,
    active: filteredAgents.filter((a) => a.status === 'ACTIVE').length,
    busy: filteredAgents.filter((a) => a.status === 'BUSY').length,
    error: filteredAgents.filter((a) => a.status === 'ERROR').length,
  };

  const selectedAgent = selectedAgentId ? agents.get(selectedAgentId) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Control Center</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Real-time agent monitoring
            <span
              className={`inline-flex items-center gap-1 text-xs ${
                isConnected ? 'text-green-600' : 'text-red-600'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowOffline(!showOffline)}
            title={showOffline ? 'Hide offline' : 'Show offline'}
          >
            {showOffline ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? (
              <List className="h-4 w-4" />
            ) : (
              <LayoutGrid className="h-4 w-4" />
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Agents" value={stats.total} icon={Activity} />
        <StatCard label="Active" value={stats.active} icon={Activity} color="green" />
        <StatCard label="Busy" value={stats.busy} icon={Activity} color="blue" />
        <StatCard label="Errors" value={stats.error} icon={Activity} color="red" />
      </div>

      {/* Real-time Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg border bg-card p-4">
          <ActivityChart
            agentIds={Array.from(agents.keys())}
            maxDataPoints={30}
          />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <ExecutionMetricsChart
            maxDataPoints={60}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex gap-6">
        {/* Agent grid */}
        <div className="flex-1">
          {filteredAgents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed rounded-lg">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No agents to monitor</h3>
              <p className="text-muted-foreground mt-1">
                Agents will appear here once they are active
              </p>
            </div>
          ) : (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                  : 'space-y-2'
              }
            >
              {filteredAgents.map((agent) => (
                <AgentMonitorCard
                  key={agent.id}
                  {...agent}
                  isSelected={selectedAgentId === agent.id}
                  onClick={() =>
                    setSelectedAgent(selectedAgentId === agent.id ? null : agent.id)
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedAgent && (
          <div className="w-80 border rounded-lg p-4 bg-card">
            <h3 className="font-semibold mb-4">{selectedAgent.displayName}</h3>

            <div className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground">Status</span>
                <p className="font-medium">{selectedAgent.status}</p>
              </div>

              {selectedAgent.currentTask && (
                <div>
                  <span className="text-sm text-muted-foreground">Current Task</span>
                  <p className="font-medium">{selectedAgent.currentTask}</p>
                </div>
              )}

              {selectedAgent.todoProgress && (
                <TodoProgress
                  todos={[
                    {
                      id: '1',
                      content: selectedAgent.todoProgress.currentItem || 'Working...',
                      status: 'in_progress',
                      activeForm: selectedAgent.todoProgress.currentItem || 'Working...',
                    },
                  ]}
                />
              )}

              <div>
                <span className="text-sm text-muted-foreground">Last Update</span>
                <p className="font-medium">
                  {selectedAgent.lastUpdate.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: typeof Activity;
  color?: 'green' | 'blue' | 'red';
}) {
  const colorClasses = {
    green: 'text-green-600 bg-green-100',
    blue: 'text-blue-600 bg-blue-100',
    red: 'text-red-600 bg-red-100',
  };

  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div
          className={`p-2 rounded-lg ${
            color ? colorClasses[color] : 'text-muted-foreground bg-muted'
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
