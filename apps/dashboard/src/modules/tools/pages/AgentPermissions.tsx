import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  Shield,
  RefreshCw,
  AlertCircle,
  Save,
  Check,
  X,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  useAgent,
  useAgentToolPermissions,
  useToolsCatalog,
  useUpdateAgentToolPermissions,
} from '../../../core/api';
import { cn } from '../../../lib/utils';
import type { ToolDefinition } from '@mcp/types';

interface PermissionState {
  toolId: string;
  canUse: boolean;
  canSudo: boolean;
  rateLimit?: number;
}

export default function AgentPermissions() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [permissions, setPermissions] = useState<Map<string, PermissionState>>(new Map());

  const { data: agent, isLoading: isLoadingAgent } = useAgent(agentId || '');
  const { data: currentPermissions, isLoading: isLoadingPermissions, refetch } = useAgentToolPermissions(agentId || '');
  const { data: catalog } = useToolsCatalog();
  const updatePermissions = useUpdateAgentToolPermissions();

  const isLoading = isLoadingAgent || isLoadingPermissions;

  // Initialize permissions from API data
  useMemo(() => {
    if (currentPermissions && permissions.size === 0) {
      const initial = new Map<string, PermissionState>();
      currentPermissions.forEach((p) => {
        initial.set(p.toolId, {
          toolId: p.toolId,
          canUse: p.canUse,
          canSudo: p.canSudo,
          rateLimit: p.rateLimit,
        });
      });
      setPermissions(initial);
    }
  }, [currentPermissions, permissions.size]);

  // Get all tools with their permission status
  type ToolWithPermission = ToolDefinition & { permission: PermissionState };
  const toolsWithPermissions = useMemo((): ToolWithPermission[] => {
    return (catalog || []).map((tool: ToolDefinition) => {
      const permission = permissions.get(tool.id) || currentPermissions?.find((p) => p.toolId === tool.id);
      return {
        ...tool,
        permission: permission || {
          toolId: tool.id,
          canUse: false,
          canSudo: false,
        },
      };
    });
  }, [catalog, permissions, currentPermissions]);

  // Filter tools
  const filteredTools = toolsWithPermissions.filter((tool) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      tool.name.toLowerCase().includes(searchLower) ||
      tool.displayName.toLowerCase().includes(searchLower)
    );
  });

  const handleToggle = (toolId: string, field: 'canUse' | 'canSudo') => {
    const current = permissions.get(toolId) || {
      toolId,
      canUse: false,
      canSudo: false,
    };

    const updated = {
      ...current,
      [field]: !current[field],
    };

    // If disabling canUse, also disable canSudo
    if (field === 'canUse' && !updated.canUse) {
      updated.canSudo = false;
    }

    // If enabling canSudo, also enable canUse
    if (field === 'canSudo' && updated.canSudo) {
      updated.canUse = true;
    }

    const newPermissions = new Map(permissions);
    newPermissions.set(toolId, updated);
    setPermissions(newPermissions);
    setHasChanges(true);
  };

  const handleRateLimitChange = (toolId: string, value: number | undefined) => {
    const current = permissions.get(toolId) || {
      toolId,
      canUse: false,
      canSudo: false,
    };

    const updated = {
      ...current,
      rateLimit: value,
    };

    const newPermissions = new Map(permissions);
    newPermissions.set(toolId, updated);
    setPermissions(newPermissions);
    setHasChanges(true);
  };

  const handleSave = async () => {
    const permissionsArray = Array.from(permissions.values()).map((p) => ({
      toolId: p.toolId,
      canUse: p.canUse,
      canSudo: p.canSudo,
      rateLimit: p.rateLimit,
    }));

    await updatePermissions.mutateAsync({
      agentId: agentId!,
      permissions: permissionsArray,
    });

    setHasChanges(false);
    refetch();
  };

  const handleEnableAll = () => {
    const newPermissions = new Map<string, PermissionState>();
    catalog?.forEach((tool: ToolDefinition) => {
      newPermissions.set(tool.id, {
        toolId: tool.id,
        canUse: true,
        canSudo: false,
      });
    });
    setPermissions(newPermissions);
    setHasChanges(true);
  };

  const handleDisableAll = () => {
    const newPermissions = new Map<string, PermissionState>();
    catalog?.forEach((tool: ToolDefinition) => {
      newPermissions.set(tool.id, {
        toolId: tool.id,
        canUse: false,
        canSudo: false,
      });
    });
    setPermissions(newPermissions);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium">Agent not found</h3>
        <Button onClick={() => navigate('/agents')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Agents
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/agents/${agentId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="p-3 rounded-xl bg-muted">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tool Permissions</h1>
            <p className="text-muted-foreground">
              Configure tool access for {agent.displayName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || updatePermissions.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updatePermissions.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Agent Info */}
      <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
        <Bot className="h-8 w-8" />
        <div>
          <p className="font-medium">{agent.displayName}</p>
          <p className="text-sm text-muted-foreground capitalize">
            {agent.role.toLowerCase()} - {agent.status.toLowerCase()}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search tools..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleEnableAll}>
            Enable All
          </Button>
          <Button variant="outline" size="sm" onClick={handleDisableAll}>
            Disable All
          </Button>
        </div>
      </div>

      {/* Permissions Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Tool</th>
                <th className="px-4 py-3 text-center text-sm font-medium w-24">Can Use</th>
                <th className="px-4 py-3 text-center text-sm font-medium w-24">Can Sudo</th>
                <th className="px-4 py-3 text-center text-sm font-medium w-32">Rate Limit</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredTools.map((tool) => {
                const perm = permissions.get(tool.id) || tool.permission;
                return (
                  <tr key={tool.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-sm">{tool.displayName}</p>
                        <p className="text-xs text-muted-foreground">{tool.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(tool.id, 'canUse')}
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                          perm.canUse
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        )}
                      >
                        {perm.canUse ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggle(tool.id, 'canSudo')}
                        disabled={!perm.canUse}
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                          perm.canSudo
                            ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                            : 'bg-gray-100 text-gray-400',
                          !perm.canUse && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        {perm.canSudo ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Input
                        type="number"
                        min={0}
                        placeholder="No limit"
                        value={perm.rateLimit || ''}
                        onChange={(e) => handleRateLimitChange(
                          tool.id,
                          e.target.value ? parseInt(e.target.value) : undefined
                        )}
                        className="w-24 text-center"
                        disabled={!perm.canUse}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-100" />
          <span>Can Use: Agent can execute this tool</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-orange-100" />
          <span>Can Sudo: Agent can run with elevated privileges</span>
        </div>
      </div>
    </div>
  );
}
