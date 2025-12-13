import { useState } from 'react';
import { Shield, Plus, Eye, EyeOff, Trash2, Lock, Unlock, Copy, Loader2, XCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import {
  useCredentials,
  useCreateCredential,
  useDeleteCredential,
  useCredentialValue,
  type Credential,
  type CredentialType,
  type CredentialVisibility,
} from '../../../core/api/hooks/credentials';
import { useServersStore } from '../../servers/stores/servers.store';
import { Can } from '../../../core/auth';

const CREDENTIAL_TYPES: { id: CredentialType; label: string; icon: typeof Shield }[] = [
  { id: 'api_key', label: 'API Key', icon: Shield },
  { id: 'password', label: 'Password', icon: Lock },
  { id: 'ssh_key', label: 'SSH Key', icon: Shield },
  { id: 'token', label: 'Token', icon: Shield },
  { id: 'certificate', label: 'Certificate', icon: Shield },
  { id: 'secret', label: 'Secret', icon: Lock },
  { id: 'other', label: 'Other', icon: Shield },
];

const VISIBILITY_OPTIONS: { id: CredentialVisibility; label: string; icon: typeof Lock; description: string }[] = [
  { id: 'private', label: 'Private', icon: Lock, description: 'Only you can access' },
  { id: 'internal', label: 'Internal', icon: Unlock, description: 'Team members can access' },
  { id: 'public', label: 'Public', icon: Unlock, description: 'Anyone can access' },
];

export function CredentialsList() {
  const { selectedServerId, servers } = useServersStore();
  const selectedServer = servers.find(s => s.id === selectedServerId);
  const serverUrl = selectedServer?.url || '';
  const token = selectedServer?.masterToken || '';

  const { data, isLoading } = useCredentials(serverUrl, token);
  const createCredential = useCreateCredential(serverUrl, token);
  const deleteCredential = useDeleteCredential(serverUrl, token);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCredential, setNewCredential] = useState({
    name: '',
    type: 'api_key' as CredentialType,
    value: '',
    visibility: 'private' as CredentialVisibility,
    description: '',
  });

  const [revealedCredentials, setRevealedCredentials] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const credentials = data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCredential.mutateAsync(newCredential);
    setShowCreateModal(false);
    setNewCredential({
      name: '',
      type: 'api_key',
      value: '',
      visibility: 'private',
      description: '',
    });
  };

  const handleDelete = async (credentialId: string, credentialName: string) => {
    if (confirm(`Are you sure you want to delete "${credentialName}"? This action cannot be undone.`)) {
      await deleteCredential.mutateAsync(credentialId);
    }
  };

  const toggleReveal = (credentialId: string) => {
    setRevealedCredentials((prev) => {
      const next = new Set(prev);
      if (next.has(credentialId)) {
        next.delete(credentialId);
      } else {
        next.add(credentialId);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string, credentialId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(credentialId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTypeIcon = (type: CredentialType) => {
    const config = CREDENTIAL_TYPES.find((t) => t.id === type);
    return config?.icon || Shield;
  };

  const getVisibilityIcon = (visibility: CredentialVisibility) => {
    const config = VISIBILITY_OPTIONS.find((v) => v.id === visibility);
    return config?.icon || Lock;
  };

  const getVisibilityColor = (visibility: CredentialVisibility) => {
    switch (visibility) {
      case 'private':
        return 'text-red-500';
      case 'internal':
        return 'text-yellow-500';
      case 'public':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  if (!selectedServer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
        <h3 className="text-lg font-medium">No Server Selected</h3>
        <p className="text-muted-foreground mt-1">
          Please select a server from the servers page to manage credentials
        </p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-7 h-7 text-primary" />
            Credential Vault
          </h1>
          <p className="text-muted-foreground">
            Securely store and manage your API keys, passwords, and secrets
          </p>
        </div>

        <Can I="create" a="Credential">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Add Credential
          </button>
        </Can>
      </div>

      {/* Security Warning Banner */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              <strong>Security Notice:</strong> All credentials are encrypted at rest and in transit.
              Access is logged for audit purposes. Never share credentials publicly or through unsecured channels.
            </p>
          </div>
        </div>
      </div>

      {/* Credentials Vault */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Type</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Visibility</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Value</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Created</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {credentials.map((credential) => {
              const TypeIcon = getTypeIcon(credential.type);
              const VisibilityIcon = getVisibilityIcon(credential.visibility);
              const isRevealed = revealedCredentials.has(credential.id);

              return (
                <CredentialRow
                  key={credential.id}
                  credential={credential}
                  serverUrl={serverUrl}
                  token={token}
                  isRevealed={isRevealed}
                  TypeIcon={TypeIcon}
                  VisibilityIcon={VisibilityIcon}
                  visibilityColor={getVisibilityColor(credential.visibility)}
                  onToggleReveal={() => toggleReveal(credential.id)}
                  onCopy={(value) => copyToClipboard(value, credential.id)}
                  onDelete={() => handleDelete(credential.id, credential.name)}
                  isCopied={copiedId === credential.id}
                />
              );
            })}
          </tbody>
        </table>

        {credentials.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium">Your vault is empty</h3>
            <p className="text-muted-foreground mt-1">Add your first credential to get started</p>
            <Can I="create" a="Credential">
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                Add Credential
              </button>
            </Can>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Add Credential
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCredential.name}
                  onChange={(e) => setNewCredential({ ...newCredential, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="My API Key"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={newCredential.type}
                  onChange={(e) => setNewCredential({ ...newCredential, type: e.target.value as CredentialType })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {CREDENTIAL_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Visibility <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {VISIBILITY_OPTIONS.map((option) => {
                    const VisIcon = option.icon;
                    return (
                      <label
                        key={option.id}
                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          newCredential.visibility === option.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="visibility"
                          value={option.id}
                          checked={newCredential.visibility === option.id}
                          onChange={(e) => setNewCredential({ ...newCredential, visibility: e.target.value as CredentialVisibility })}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <VisIcon className="w-4 h-4" />
                            <span className="font-medium text-sm">{option.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Value */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Value <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newCredential.value}
                  onChange={(e) => setNewCredential({ ...newCredential, value: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  placeholder="Enter secret value..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This value will be encrypted and stored securely
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newCredential.description}
                  onChange={(e) => setNewCredential({ ...newCredential, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Notes about this credential..."
                />
              </div>

              {/* Actions */}
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
                  disabled={createCredential.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {createCredential.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Shield className="w-4 h-4" />
                  )}
                  Create Credential
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Credential row component with value reveal
interface CredentialRowProps {
  credential: Credential;
  serverUrl: string;
  token: string;
  isRevealed: boolean;
  TypeIcon: typeof Shield;
  VisibilityIcon: typeof Lock;
  visibilityColor: string;
  onToggleReveal: () => void;
  onCopy: (value: string) => void;
  onDelete: () => void;
  isCopied: boolean;
}

function CredentialRow({
  credential,
  serverUrl,
  token,
  isRevealed,
  TypeIcon,
  VisibilityIcon,
  visibilityColor,
  onToggleReveal,
  onCopy,
  onDelete,
  isCopied,
}: CredentialRowProps) {
  const { data: credentialValue, isLoading } = useCredentialValue(
    serverUrl,
    token,
    credential.id,
    { enabled: isRevealed }
  );

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <TypeIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{credential.name}</p>
            {credential.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {credential.description}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
          {credential.type.replace('_', ' ').toUpperCase()}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className={`flex items-center gap-2 ${visibilityColor}`}>
          <VisibilityIcon className="w-4 h-4" />
          <span className="text-sm capitalize">{credential.visibility}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          {isRevealed ? (
            <>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <code className="px-2 py-1 bg-muted rounded text-sm font-mono max-w-[200px] truncate">
                  {credentialValue?.value}
                </code>
              )}
            </>
          ) : (
            <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
              {'•'.repeat(20)}
            </code>
          )}
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-muted-foreground">
        {new Date(credential.createdAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onToggleReveal}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title={isRevealed ? 'Hide value' : 'Reveal value'}
          >
            {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          {isRevealed && credentialValue && (
            <button
              onClick={() => onCopy(credentialValue.value)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Copy to clipboard"
            >
              {isCopied ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          )}
          <Can I="delete" a="Credential">
            <button
              onClick={onDelete}
              className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Delete credential"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </Can>
        </div>
      </td>
    </tr>
  );
}

export default CredentialsList;
