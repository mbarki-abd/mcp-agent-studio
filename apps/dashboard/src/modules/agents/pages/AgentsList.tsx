import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Bot, RefreshCw, AlertCircle, Filter, LayoutGrid, GitBranch } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { AgentCard } from '../components/AgentCard';
import { AgentHierarchyTree } from '../components/AgentHierarchyTree';
import { useAgents, useDeleteAgent, useValidateAgent } from '../../../core/api';
import { useAgentsStore } from '../stores/agents.store';
import { useAgentStatus, useAgentsSubscription } from '../../../core/websocket';
import { Can } from '../../../core/auth';
import { cn } from '../../../lib/utils';
import type { AgentStatus, AgentStatusEvent } from '@mcp/types';

type ViewMode = 'grid' | 'hierarchy';

const statusFilters: Array<{ value: AgentStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'BUSY', label: 'Busy' },
  { value: 'PENDING_VALIDATION', label: 'Pending' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ERROR', label: 'Error' },
];

export default function AgentsList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AgentStatus | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const { data, isLoading, error, refetch } = useAgents({
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
  });
  const deleteAgent = useDeleteAgent();
  const validateAgent = useValidateAgent();

  const { selectedAgentId, setSelectedAgent, updateAgentStatus } = useAgentsStore();

  const agents = data?.items || [];

  // Subscribe to status updates for all agents
  const agentIds = agents.map((a) => a.id);
  useAgentsSubscription(agentIds);

  // Handle real-time status updates
  const handleStatusUpdate = useCallback(
    (event: AgentStatusEvent) => {
      updateAgentStatus(event.agentId, event.data.status);
    },
    [updateAgentStatus]
  );

  useAgentStatus(handleStatusUpdate);

  const filteredAgents = useMemo(
    () =>
      agents.filter(
        (a) =>
          a.displayName.toLowerCase().includes(search.toLowerCase()) ||
          a.name.toLowerCase().includes(search.toLowerCase())
      ),
    [agents, search]
  );

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this agent?')) {
      await deleteAgent.mutateAsync(id);
    }
  };

  const handleValidate = async (id: string) => {
    await validateAgent.mutateAsync(id);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium">Failed to load agents</h3>
        <p className="text-muted-foreground mt-1">{error.message}</p>
        <Button onClick={() => refetch()} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-muted-foreground">
            Manage your AI agents and their hierarchy
          </p>
        </div>
        <Can I="create" a="Agent">
          <Button onClick={() => navigate('/agents/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Agent
          </Button>
        </Can>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              {statusFilters.find((f) => f.value === statusFilter)?.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {statusFilters.map((filter) => (
              <DropdownMenuItem
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>

        {/* View Mode Toggle */}
        <div className="flex items-center rounded-lg border bg-muted p-1">
          <button
            type="button"
            className={cn(
              'flex items-center gap-1 px-3 py-1 text-sm rounded-md transition-colors',
              viewMode === 'grid'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
            Grid
          </button>
          <button
            type="button"
            className={cn(
              'flex items-center gap-1 px-3 py-1 text-sm rounded-md transition-colors',
              viewMode === 'hierarchy'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setViewMode('hierarchy')}
          >
            <GitBranch className="h-4 w-4" />
            Hierarchy
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'hierarchy' ? (
        <AgentHierarchyTree
          selectedAgentId={selectedAgentId}
          onSelectAgent={setSelectedAgent}
        />
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-52 rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed rounded-lg">
          <Bot className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No agents found</h3>
          <p className="text-muted-foreground mt-1">
            {search || statusFilter !== 'ALL'
              ? 'Try adjusting your filters'
              : 'Create your first agent to get started'}
          </p>
          {!search && statusFilter === 'ALL' && (
            <Can I="create" a="Agent">
              <Button onClick={() => navigate('/agents/new')} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Agent
              </Button>
            </Can>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isSelected={selectedAgentId === agent.id}
              onSelect={() => setSelectedAgent(agent.id)}
              onEdit={() => navigate(`/agents/${agent.id}/edit`)}
              onDelete={() => handleDelete(agent.id)}
              onValidate={() => handleValidate(agent.id)}
              onExecute={() => navigate(`/agents/${agent.id}/execute`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
