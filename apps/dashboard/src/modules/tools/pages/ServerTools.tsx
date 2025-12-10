import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Server,
  Package,
  RefreshCw,
  AlertCircle,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { ToolCard } from '../components/ToolCard';
import {
  useServer,
  useServerTools,
  useToolsCatalog,
  useInstallTool,
} from '../../../core/api';
import { cn } from '../../../lib/utils';
import type { ToolStatus, HealthStatus } from '@mcp/types';

const statusConfig: Record<ToolStatus, { label: string; icon: typeof CheckCircle; className: string }> = {
  NOT_INSTALLED: { label: 'Not Installed', icon: XCircle, className: 'text-gray-500' },
  INSTALLING: { label: 'Installing', icon: Clock, className: 'text-blue-500 animate-pulse' },
  INSTALLED: { label: 'Installed', icon: CheckCircle, className: 'text-green-500' },
  UPDATING: { label: 'Updating', icon: Clock, className: 'text-blue-500 animate-pulse' },
  REMOVING: { label: 'Removing', icon: Clock, className: 'text-orange-500 animate-pulse' },
  FAILED: { label: 'Failed', icon: AlertTriangle, className: 'text-red-500' },
  DISABLED: { label: 'Disabled', icon: XCircle, className: 'text-yellow-500' },
};

const healthConfig: Record<HealthStatus, { label: string; className: string }> = {
  HEALTHY: { label: 'Healthy', className: 'bg-green-100 text-green-700' },
  DEGRADED: { label: 'Degraded', className: 'bg-yellow-100 text-yellow-700' },
  UNHEALTHY: { label: 'Unhealthy', className: 'bg-red-100 text-red-700' },
  UNKNOWN: { label: 'Unknown', className: 'bg-gray-100 text-gray-700' },
};

export default function ServerTools() {
  const { serverId } = useParams<{ serverId: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showInstallModal, setShowInstallModal] = useState(false);

  const { data: server, isLoading: isLoadingServer } = useServer(serverId || '');
  const { data: serverTools, isLoading: isLoadingTools, refetch } = useServerTools(serverId || '');
  const { data: catalog } = useToolsCatalog();
  const installTool = useInstallTool();

  const isLoading = isLoadingServer || isLoadingTools;

  // Create a map of installed tools
  const installedToolIds = new Set(serverTools?.map((st) => st.toolId) || []);

  // Get tool definitions for installed tools
  const installedToolsWithDefinition = serverTools?.map((st) => {
    const definition = catalog?.find((t) => t.id === st.toolId);
    return {
      ...st,
      definition,
    };
  }) || [];

  // Filter tools
  const filteredTools = installedToolsWithDefinition.filter((tool) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      tool.definition?.name.toLowerCase().includes(searchLower) ||
      tool.definition?.displayName.toLowerCase().includes(searchLower)
    );
  });

  // Available tools (not installed)
  const availableTools = catalog?.filter((t) => !installedToolIds.has(t.id)) || [];

  const handleInstall = async (toolId: string) => {
    await installTool.mutateAsync({ serverId: serverId!, toolId });
    setShowInstallModal(false);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium">Server not found</h3>
        <Button onClick={() => navigate('/servers')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Servers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/servers')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="p-3 rounded-xl bg-muted">
            <Server className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{server.name}</h1>
            <p className="text-muted-foreground">
              Installed tools and packages
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowInstallModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Install Tool
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search installed tools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {installedToolIds.size} tools installed
        </span>
      </div>

      {/* Installed Tools */}
      {filteredTools.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed rounded-lg">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No tools installed</h3>
          <p className="text-muted-foreground mt-1">
            Install tools from the catalog to get started
          </p>
          <Button onClick={() => setShowInstallModal(true)} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Install Tool
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map((tool) => {
            const status = statusConfig[tool.status];
            const health = healthConfig[tool.healthStatus];
            const StatusIcon = status.icon;

            return (
              <div
                key={tool.id}
                className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">
                      {tool.definition?.displayName || 'Unknown Tool'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {tool.definition?.name}
                    </p>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded text-xs', health.className)}>
                    {health.label}
                  </span>
                </div>

                {/* Status */}
                <div className="mt-4 flex items-center gap-2">
                  <StatusIcon className={cn('h-4 w-4', status.className)} />
                  <span className="text-sm">{status.label}</span>
                </div>

                {/* Version */}
                {tool.installedVersion && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Version: {tool.installedVersion}
                  </div>
                )}

                {/* Error */}
                {tool.lastError && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-600">
                    {tool.lastError}
                  </div>
                )}

                {/* Footer */}
                <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {tool.installedAt
                      ? `Installed ${new Date(tool.installedAt).toLocaleDateString()}`
                      : 'Not installed'}
                  </span>
                  {tool.lastHealthCheck && (
                    <span>
                      Last check: {new Date(tool.lastHealthCheck).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Install Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-lg">Install Tool</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowInstallModal(false)}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {availableTools.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  All available tools are already installed
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableTools.map((tool) => (
                    <ToolCard
                      key={tool.id}
                      tool={tool}
                      onInstall={() => handleInstall(tool.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
