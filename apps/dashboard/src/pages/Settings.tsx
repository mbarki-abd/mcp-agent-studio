import { useState } from 'react';
import { User, Lock, Bell, Shield, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../core/auth';
import { useUpdateProfile, useChangePassword } from '../core/api/hooks';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

type SettingsTab = 'profile' | 'security' | 'notifications';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'security' as const, label: 'Security', icon: Shield },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="w-48 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {activeTab === 'profile' && <ProfileSettings />}
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
        </div>
      </div>
    </div>
  );
}

function ProfileSettings() {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile.mutateAsync({ name, email });
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Profile Information</h2>
        <p className="text-sm text-muted-foreground">
          Update your account's profile information and email address.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <p className="text-xs text-muted-foreground">
            If you change your email, you'll need to verify the new address.
          </p>
        </div>

        {updateProfile.error && (
          <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-md">
            {updateProfile.error instanceof Error
              ? updateProfile.error.message
              : 'An error occurred'}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 text-sm text-green-500 bg-green-500/10 rounded-md">
            <CheckCircle className="w-4 h-4" />
            Profile updated successfully
          </div>
        )}

        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </form>
    </div>
  );
}

function SecuritySettings() {
  const changePassword = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (newPassword !== confirmPassword) {
      setValidationError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setValidationError('New password must be at least 8 characters');
      return;
    }

    await changePassword.mutateAsync({ currentPassword, newPassword });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Change Password</h2>
        <p className="text-sm text-muted-foreground">
          Ensure your account is using a strong password to stay secure.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="currentPassword"
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="pl-10"
            />
          </div>
        </div>

        {(validationError || changePassword.error) && (
          <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-md">
            {validationError ||
              (changePassword.error instanceof Error
                ? changePassword.error.message
                : 'An error occurred')}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 text-sm text-green-500 bg-green-500/10 rounded-md">
            <CheckCircle className="w-4 h-4" />
            Password changed successfully
          </div>
        )}

        <Button type="submit" disabled={changePassword.isPending}>
          {changePassword.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            'Update Password'
          )}
        </Button>
      </form>

      <div className="pt-6 border-t border-border">
        <h3 className="text-lg font-semibold text-red-500">Danger Zone</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Irreversible and destructive actions.
        </p>
        <div className="mt-4 p-4 border border-red-500/20 rounded-lg bg-red-500/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data.
              </p>
            </div>
            <Button variant="destructive" size="sm">
              Delete Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationSettings() {
  const [emailNotifications, setEmailNotifications] = useState({
    taskCompleted: true,
    taskFailed: true,
    agentStatus: false,
    weeklyDigest: true,
  });

  const toggleNotification = (key: keyof typeof emailNotifications) => {
    setEmailNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const notifications = [
    {
      key: 'taskCompleted' as const,
      label: 'Task Completed',
      description: 'Get notified when a task completes successfully',
    },
    {
      key: 'taskFailed' as const,
      label: 'Task Failed',
      description: 'Get notified when a task fails',
    },
    {
      key: 'agentStatus' as const,
      label: 'Agent Status Changes',
      description: 'Get notified when an agent goes online or offline',
    },
    {
      key: 'weeklyDigest' as const,
      label: 'Weekly Digest',
      description: 'Receive a weekly summary of activity',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Email Notifications</h2>
        <p className="text-sm text-muted-foreground">
          Configure which notifications you receive via email.
        </p>
      </div>

      <div className="space-y-4">
        {notifications.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between p-4 border border-border rounded-lg"
          >
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
            <button
              onClick={() => toggleNotification(item.key)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                emailNotifications[item.key] ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  emailNotifications[item.key] ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <Button>Save Preferences</Button>
    </div>
  );
}

export default SettingsPage;
