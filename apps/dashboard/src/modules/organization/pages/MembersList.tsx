import { useState } from 'react';
import { Users, MoreVertical, Shield, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useOrganizationMembers,
  useUpdateMemberRole,
  useRemoveMember,
  type OrganizationMember,
} from '../../../core/api/hooks';

const ROLE_LABELS: Record<OrganizationMember['role'], string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

const ROLE_COLORS: Record<OrganizationMember['role'], string> = {
  OWNER: 'bg-purple-500/10 text-purple-500',
  ADMIN: 'bg-blue-500/10 text-blue-500',
  MEMBER: 'bg-green-500/10 text-green-500',
  VIEWER: 'bg-gray-500/10 text-gray-500',
};

export function MembersList() {
  const navigate = useNavigate();
  const { data, isLoading } = useOrganizationMembers();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();

  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showRoleMenu, setShowRoleMenu] = useState<string | null>(null);

  const handleRoleChange = async (memberId: string, role: OrganizationMember['role']) => {
    await updateRole.mutateAsync({ memberId, role });
    setShowRoleMenu(null);
  };

  const handleRemove = async (memberId: string) => {
    if (confirm('Are you sure you want to remove this member?')) {
      await removeMember.mutateAsync(memberId);
    }
    setSelectedMember(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const members = data?.members || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/organization')}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Team Members</h1>
          <p className="text-muted-foreground">
            {members.length} member{members.length !== 1 ? 's' : ''} in your organization
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Member</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Role</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Joined</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {member.name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{member.name || 'Unnamed'}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="relative">
                    <button
                      onClick={() => setShowRoleMenu(showRoleMenu === member.id ? null : member.id)}
                      disabled={member.role === 'OWNER'}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${ROLE_COLORS[member.role]} ${
                        member.role !== 'OWNER' ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      <Shield className="w-3 h-3" />
                      {ROLE_LABELS[member.role]}
                    </button>

                    {showRoleMenu === member.id && member.role !== 'OWNER' && (
                      <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 min-w-[120px]">
                        {(['ADMIN', 'MEMBER', 'VIEWER'] as const).map((role) => (
                          <button
                            key={role}
                            onClick={() => handleRoleChange(member.id, role)}
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg ${
                              member.role === role ? 'bg-muted' : ''
                            }`}
                          >
                            {ROLE_LABELS[role]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {new Date(member.joinedAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {member.role !== 'OWNER' && (
                      <div className="relative">
                        <button
                          onClick={() => setSelectedMember(selectedMember === member.id ? null : member.id)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {selectedMember === member.id && (
                          <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 min-w-[140px]">
                            <button
                              onClick={() => handleRemove(member.id)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-muted transition-colors rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {members.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No members found</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MembersList;
