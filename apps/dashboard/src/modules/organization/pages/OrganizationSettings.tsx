import { useState } from 'react';
import { Building2, Save, Loader2, Users, Mail, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useOrganization,
  useUpdateOrganization,
  useOrganizationUsage,
} from '../../../core/api/hooks';

export function OrganizationSettings() {
  const navigate = useNavigate();
  const { data: org, isLoading } = useOrganization();
  const { data: usage } = useOrganizationUsage();
  const updateOrg = useUpdateOrganization();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [initialized, setInitialized] = useState(false);

  // Initialize form when data loads
  if (org && !initialized) {
    setFormData({
      name: org.name || '',
      description: org.description || '',
    });
    setInitialized(true);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateOrg.mutateAsync(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organization Settings</h1>
          <p className="text-muted-foreground">
            Manage your organization's profile and settings
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/organization/members')}
          className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg hover:bg-muted transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">Members</p>
            <p className="text-sm text-muted-foreground">Manage team members</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/organization/invitations')}
          className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg hover:bg-muted transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="font-medium">Invitations</p>
            <p className="text-sm text-muted-foreground">Pending invites</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/settings/api-keys')}
          className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg hover:bg-muted transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="font-medium">Usage & Billing</p>
            <p className="text-sm text-muted-foreground">View usage stats</p>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Organization Form */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Organization Profile</h2>
              <p className="text-sm text-muted-foreground">
                {org?.plan ? `${org.plan.charAt(0).toUpperCase() + org.plan.slice(1)} Plan` : 'Free Plan'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Organization Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="My Organization"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={3}
                placeholder="What does your organization do?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Organization Slug
              </label>
              <input
                type="text"
                value={org?.slug || ''}
                disabled
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This cannot be changed
              </p>
            </div>

            <button
              type="submit"
              disabled={updateOrg.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {updateOrg.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </form>
        </div>

        {/* Usage Stats */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-6">Resource Usage</h2>

          <div className="space-y-4">
            <UsageBar
              label="Servers"
              used={usage?.servers?.used ?? 0}
              limit={usage?.servers?.limit ?? 10}
            />
            <UsageBar
              label="Agents"
              used={usage?.agents?.used ?? 0}
              limit={usage?.agents?.limit ?? 25}
            />
            <UsageBar
              label="Tasks"
              used={usage?.tasks?.used ?? 0}
              limit={usage?.tasks?.limit ?? 100}
            />
            <UsageBar
              label="API Calls (this month)"
              used={usage?.apiCalls?.used ?? 0}
              limit={usage?.apiCalls?.limit ?? 10000}
            />
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Need more resources?{' '}
              <button className="text-primary hover:underline">
                Upgrade your plan
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isWarning = percentage > 80;
  const isCritical = percentage > 95;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className={isCritical ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-muted-foreground'}>
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-primary'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default OrganizationSettings;
