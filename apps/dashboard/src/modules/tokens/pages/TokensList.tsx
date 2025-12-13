import { useState, useEffect } from 'react';
import { Ticket, Plus, Copy, Trash2, XCircle, Loader2, Eye, EyeOff, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import {
  useTokens,
  useCreateToken,
  useDeleteToken,
  useRevokeToken,
  type Token,
  type CreateTokenResponse,
} from '../../../core/api/hooks/tokens';
import { useAgents } from '../../../core/api/hooks/agents';
import { useServers } from '../../../core/api/hooks/servers';

const PERMISSION_OPTIONS = [
  { id: 'agent:execute', label: 'Agent Execute' },
  { id: 'agent:read', label: 'Agent Read' },
  { id: 'task:create', label: 'Task Create' },
  { id: 'task:read', label: 'Task Read' },
  { id: 'task:execute', label: 'Task Execute' },
  { id: 'server:read', label: 'Server Read' },
];

const EXPIRY_OPTIONS = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'never', label: 'Never' },
];

export function TokensList() {
  // Server selection state
  const [selectedServerUrl, setSelectedServerUrl] = useState<string>('');
  const [selectedServerToken, setSelectedServerToken] = useState<string>('');

  // Fetch servers
  const { data: serversData } = useServers();
  const servers = serversData?.items || [];

  // Set default server if available
  useEffect(() => {
    if (servers.length > 0 && !selectedServerUrl) {
      const firstServer = servers[0];
      setSelectedServerUrl(firstServer.url);
      // In a real implementation, you'd get the token from auth context or server config
      setSelectedServerToken('demo-token'); // TODO: Get from auth context
    }
  }, [servers, selectedServerUrl]);

  // Tokens hooks - only enabled when server is selected
  const { data: tokensData, isLoading } = useTokens(
    selectedServerUrl,
    selectedServerToken,
    { enabled: !!selectedServerUrl && !!selectedServerToken }
  );
  const createToken = useCreateToken(selectedServerUrl, selectedServerToken);
  const deleteToken = useDeleteToken(selectedServerUrl, selectedServerToken);
  const revokeToken = useRevokeToken(selectedServerUrl, selectedServerToken);

  // Fetch agents for the selected server
  const { data: agentsData } = useAgents({
    serverId: servers.find(s => s.url === selectedServerUrl)?.id
  });
  const agents = agentsData?.items || [];

  // Form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenAgentId, setNewTokenAgentId] = useState('');
  const [newTokenPermissions, setNewTokenPermissions] = useState<string[]>([]);
  const [newTokenExpiry, setNewTokenExpiry] = useState('30d');
  const [createdToken, setCreatedToken] = useState<CreateTokenResponse | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createToken.mutateAsync({
      name: newTokenName,
      agentId: newTokenAgentId,
      permissions: newTokenPermissions,
      expiresIn: newTokenExpiry,
    });
    setCreatedToken(result);
    setNewTokenName('');
    setNewTokenAgentId('');
    setNewTokenPermissions([]);
    setNewTokenExpiry('30d');
  };

  const handleDelete = async (tokenId: string) => {
    if (confirm('Are you sure you want to delete this token? This action cannot be undone.')) {
      await deleteToken.mutateAsync(tokenId);
    }
  };

  const handleRevoke = async (tokenId: string) => {
    if (confirm('Are you sure you want to revoke this token? It will stop working immediately.')) {
      await revokeToken.mutateAsync(tokenId);
    }
  };

  const copyToClipboard = (text: string, tokenId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(tokenId);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const togglePermission = (permission: string) => {
    setNewTokenPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  const isTokenExpired = (token: Token) => {
    if (!token.expiresAt) return false;
    return new Date(token.expiresAt) < new Date();
  };

  const getTokenStatus = (token: Token) => {
    if (token.isRevoked) {
      return { icon: XCircle, color: 'text-red-500', label: 'Revoked' };
    }
    if (isTokenExpired(token)) {
      return { icon: Clock, color: 'text-yellow-500', label: 'Expired' };
    }
    return { icon: CheckCircle, color: 'text-green-500', label: 'Active' };
  };

  if (!selectedServerUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
        <p className="text-muted-foreground">No servers available. Please configure a server first.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tokens = tokensData || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Tokens</h1>
          <p className="text-muted-foreground">
            Manage authentication tokens for remote server access
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Server Selector */}
          {servers.length > 1 && (
            <select
              value={selectedServerUrl}
              onChange={(e) => setSelectedServerUrl(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {servers.map((server) => (
                <option key={server.id} value={server.url}>
                  {server.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Create Token
          </button>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
        <p className="text-sm text-yellow-600 dark:text-yellow-400">
          <strong>Security Notice:</strong> Tokens grant agent access to the remote server. Keep them secret and rotate them regularly.
        </p>
      </div>

      {/* Tokens List */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Agent</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Permissions</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Expires</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Last Used</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Created</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tokens.map((token) => {
              const statusConfig = getTokenStatus(token);
              const StatusIcon = statusConfig.icon;
              const agent = agents.find(a => a.id === token.agentId);

              return (
                <tr key={token.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Ticket className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{token.name}</p>
                        <code className="text-xs text-muted-foreground font-mono">
                          {token.prefix}...
                        </code>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm">{agent?.name || token.agentId}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {token.permissions.slice(0, 2).map((perm) => (
                        <span
                          key={perm}
                          className="px-2 py-1 bg-muted rounded text-xs"
                        >
                          {perm}
                        </span>
                      ))}
                      {token.permissions.length > 2 && (
                        <span className="px-2 py-1 bg-muted rounded text-xs">
                          +{token.permissions.length - 2} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-2 ${statusConfig.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      <span className="text-sm">{statusConfig.label}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {token.expiresAt
                      ? new Date(token.expiresAt).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {token.lastUsedAt
                      ? new Date(token.lastUsedAt).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(token.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {!token.isRevoked && !isTokenExpired(token) && (
                        <button
                          onClick={() => handleRevoke(token.id)}
                          className="p-2 text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-colors"
                          title="Revoke token"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(token.id)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete token"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {tokens.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Ticket className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No tokens yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Create your first token
            </button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && !createdToken && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Create Token</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Token Name
                </label>
                <input
                  type="text"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Production Agent Token"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Agent
                </label>
                <select
                  value={newTokenAgentId}
                  onChange={(e) => setNewTokenAgentId(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select an agent...</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Permissions
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
                  {PERMISSION_OPTIONS.map((perm) => (
                    <label key={perm.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newTokenPermissions.includes(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                        className="rounded border-border"
                      />
                      <span className="text-sm">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Expiration
                </label>
                <select
                  value={newTokenExpiry}
                  onChange={(e) => setNewTokenExpiry(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {EXPIRY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createToken.isPending || newTokenPermissions.length === 0 || !newTokenAgentId}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {createToken.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Ticket className="w-4 h-4" />
                  )}
                  Create Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Created Token Modal */}
      {createdToken && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-lg">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <h2 className="text-lg font-semibold">Token Created</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Make sure to copy your token now. You won't be able to see it again.
              </p>
            </div>

            <div className="bg-muted rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Your Token</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="p-1 hover:bg-background rounded transition-colors"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(createdToken.rawToken, createdToken.token.id)}
                    className="p-1 hover:bg-background rounded transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <code className="block font-mono text-sm break-all">
                {showToken ? createdToken.rawToken : '•'.repeat(40)}
              </code>
              {copiedToken === createdToken.token.id && (
                <p className="text-xs text-green-500 mt-2">Copied to clipboard!</p>
              )}
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-6">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                <strong>Token Details:</strong>
              </p>
              <ul className="text-xs text-blue-600 dark:text-blue-400 mt-2 space-y-1">
                <li>• Name: {createdToken.token.name}</li>
                <li>• Permissions: {createdToken.token.permissions.join(', ')}</li>
                <li>
                  • Expires: {createdToken.token.expiresAt
                    ? new Date(createdToken.token.expiresAt).toLocaleDateString()
                    : 'Never'}
                </li>
              </ul>
            </div>

            <button
              onClick={() => {
                setCreatedToken(null);
                setShowCreateModal(false);
              }}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TokensList;
