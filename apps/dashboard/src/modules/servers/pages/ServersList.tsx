import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Server, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { ServerCard } from '../components/ServerCard';
import { useServers, useDeleteServer, useTestServerConnection } from '../../../core/api';
import { useServersStore } from '../stores/servers.store';
import { Can } from '../../../core/auth';

export default function ServersList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch } = useServers();
  const deleteServer = useDeleteServer();
  const testConnection = useTestServerConnection();

  const { selectedServerId, setSelectedServer } = useServersStore();

  const servers = data?.items || [];

  const filteredServers = servers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.url.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this server?')) {
      await deleteServer.mutateAsync(id);
    }
  };

  const handleTestConnection = async (id: string) => {
    const result = await testConnection.mutateAsync(id);
    if (result.success) {
      alert(`Connection successful! Latency: ${result.latency}ms`);
    } else {
      alert('Connection failed');
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium">Failed to load servers</h3>
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
          <h1 className="text-2xl font-bold">Server Configurations</h1>
          <p className="text-muted-foreground">
            Manage your MCP server connections
          </p>
        </div>
        <Can I="create" a="ServerConfiguration">
          <Button onClick={() => navigate('/servers/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Server
          </Button>
        </Can>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search servers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : filteredServers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed rounded-lg">
          <Server className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No servers found</h3>
          <p className="text-muted-foreground mt-1">
            {search
              ? 'Try adjusting your search'
              : 'Add your first MCP server to get started'}
          </p>
          {!search && (
            <Can I="create" a="ServerConfiguration">
              <Button onClick={() => navigate('/servers/new')} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Server
              </Button>
            </Can>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              isSelected={selectedServerId === server.id}
              onSelect={() => setSelectedServer(server.id)}
              onEdit={() => navigate(`/servers/${server.id}/edit`)}
              onDelete={() => handleDelete(server.id)}
              onTestConnection={() => handleTestConnection(server.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
