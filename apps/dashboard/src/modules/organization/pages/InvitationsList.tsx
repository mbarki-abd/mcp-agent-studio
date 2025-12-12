import { useState } from 'react';
import { Mail, Plus, X, Loader2, ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useOrganizationInvitations,
  useInviteUser,
  useCancelInvitation,
  type OrganizationInvitation,
} from '../../../core/api/hooks';

const STATUS_CONFIG: Record<OrganizationInvitation['status'], { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-yellow-500', label: 'Pending' },
  accepted: { icon: CheckCircle, color: 'text-green-500', label: 'Accepted' },
  expired: { icon: AlertCircle, color: 'text-red-500', label: 'Expired' },
  cancelled: { icon: XCircle, color: 'text-gray-500', label: 'Cancelled' },
};

const ROLE_OPTIONS: { value: OrganizationInvitation['role']; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MEMBER', label: 'Member' },
  { value: 'VIEWER', label: 'Viewer' },
];

export function InvitationsList() {
  const navigate = useNavigate();
  const { data, isLoading } = useOrganizationInvitations();
  const inviteUser = useInviteUser();
  const cancelInvitation = useCancelInvitation();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganizationInvitation['role']>('MEMBER');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    await inviteUser.mutateAsync({ email: inviteEmail, role: inviteRole });
    setInviteEmail('');
    setInviteRole('MEMBER');
    setShowInviteModal(false);
  };

  const handleCancel = async (invitationId: string) => {
    if (confirm('Are you sure you want to cancel this invitation?')) {
      await cancelInvitation.mutateAsync(invitationId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const invitations = data?.invitations || [];
  const pendingInvitations = invitations.filter((i) => i.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/organization')}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Invitations</h1>
            <p className="text-muted-foreground">
              {pendingInvitations.length} pending invitation{pendingInvitations.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Invite User
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Email</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Role</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Expires</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invitations.map((invitation) => {
              const statusConfig = STATUS_CONFIG[invitation.status];
              const StatusIcon = statusConfig.icon;

              return (
                <tr key={invitation.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-blue-500" />
                      </div>
                      <span className="font-medium">{invitation.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {invitation.role}
                  </td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-2 ${statusConfig.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      <span className="text-sm">{statusConfig.label}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end">
                      {invitation.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(invitation.id)}
                          className="flex items-center gap-2 px-3 py-1 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {invitations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Mail className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No invitations yet</p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Invite your first team member
            </button>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Invite User</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="colleague@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as OrganizationInvitation['role'])}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteUser.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {inviteUser.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InvitationsList;
