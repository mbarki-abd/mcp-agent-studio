import { useState } from 'react';
import { Key, Plus, Copy, Trash2, RefreshCw, Loader2, Eye, EyeOff, Clock, CheckCircle, XCircle } from 'lucide-react';
import {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
  useRegenerateApiKey,
  type ApiKey,
  type ApiKeyWithSecret,
} from '../../../core/api/hooks';

const SCOPE_OPTIONS = [
  { id: 'servers:read', label: 'Servers (Read)' },
  { id: 'servers:write', label: 'Servers (Write)' },
  { id: 'agents:read', label: 'Agents (Read)' },
  { id: 'agents:write', label: 'Agents (Write)' },
  { id: 'tasks:read', label: 'Tasks (Read)' },
  { id: 'tasks:write', label: 'Tasks (Write)' },
  { id: 'tasks:execute', label: 'Tasks (Execute)' },
];

const STATUS_CONFIG: Record<ApiKey['status'], { icon: typeof CheckCircle; color: string; label: string }> = {
  active: { icon: CheckCircle, color: 'text-green-500', label: 'Active' },
  revoked: { icon: XCircle, color: 'text-red-500', label: 'Revoked' },
  expired: { icon: Clock, color: 'text-yellow-500', label: 'Expired' },
};

export function ApiKeysList() {
  const { data, isLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const regenerateKey = useRegenerateApiKey();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>([]);
  const [newKeyExpiry, setNewKeyExpiry] = useState('');
  const [createdKey, setCreatedKey] = useState<ApiKeyWithSecret | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createKey.mutateAsync({
      name: newKeyName,
      scopes: newKeyScopes,
      expiresAt: newKeyExpiry || undefined,
    });
    setCreatedKey(result);
    setNewKeyName('');
    setNewKeyScopes([]);
    setNewKeyExpiry('');
  };

  const handleRevoke = async (keyId: string) => {
    if (confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      await revokeKey.mutateAsync(keyId);
    }
  };

  const handleRegenerate = async (keyId: string) => {
    if (confirm('Are you sure you want to regenerate this API key? The old key will stop working immediately.')) {
      const result = await regenerateKey.mutateAsync(keyId);
      setCreatedKey(result);
    }
  };

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleScope = (scope: string) => {
    setNewKeyScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const keys = data?.keys || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">
            Create and manage API keys for programmatic access
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Create API Key
        </button>
      </div>

      {/* Warning Banner */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
        <p className="text-sm text-yellow-600 dark:text-yellow-400">
          <strong>Security Notice:</strong> API keys grant access to your resources. Keep them secret and never share them publicly.
        </p>
      </div>

      {/* Keys List */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Key</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Last Used</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Created</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {keys.map((key) => {
              const statusConfig = STATUS_CONFIG[key.status];
              const StatusIcon = statusConfig.icon;

              return (
                <tr key={key.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Key className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{key.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {key.scopes.length} scope{key.scopes.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                      {key.keyPrefix}...
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-2 ${statusConfig.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      <span className="text-sm">{statusConfig.label}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {key.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleRegenerate(key.id)}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                            title="Regenerate key"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRevoke(key.id)}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Revoke key"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {keys.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Key className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No API keys yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Create your first API key
            </button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && !createdKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Create API Key</h2>
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
                  Key Name
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="My API Key"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Scopes
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {SCOPE_OPTIONS.map((scope) => (
                    <label key={scope.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newKeyScopes.includes(scope.id)}
                        onChange={() => toggleScope(scope.id)}
                        className="rounded border-border"
                      />
                      <span className="text-sm">{scope.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Expiration (optional)
                </label>
                <input
                  type="date"
                  value={newKeyExpiry}
                  onChange={(e) => setNewKeyExpiry(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
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
                  disabled={createKey.isPending || newKeyScopes.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {createKey.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4" />
                  )}
                  Create Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Created Key Modal */}
      {createdKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-lg">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <h2 className="text-lg font-semibold">API Key Created</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Make sure to copy your API key now. You won't be able to see it again.
              </p>
            </div>

            <div className="bg-muted rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Your API Key</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="p-1 hover:bg-background rounded transition-colors"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(createdKey.key, createdKey.id)}
                    className="p-1 hover:bg-background rounded transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <code className="block font-mono text-sm break-all">
                {showKey ? createdKey.key : '•'.repeat(40)}
              </code>
              {copiedKey === createdKey.id && (
                <p className="text-xs text-green-500 mt-2">Copied to clipboard!</p>
              )}
            </div>

            <button
              onClick={() => {
                setCreatedKey(null);
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

export default ApiKeysList;
