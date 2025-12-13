import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderKanban, RefreshCw, AlertCircle, Users, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  useWorkspaces,
  useCreateWorkspace,
  useDeleteWorkspace,
  type Workspace,
  type WorkspaceType,
  type CreateWorkspaceRequest,
} from '../../../core/api/hooks/workspaces';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { Can } from '../../../core/auth';
import { cn } from '../../../lib/utils';

// For now, we'll use mock server/token - this should be replaced with actual context
const MOCK_SERVER_URL = 'http://localhost:3000';
const MOCK_TOKEN = 'mock-token';

interface WorkspaceCardProps {
  workspace: Workspace;
  onDelete?: () => void;
  onNavigateToProjects?: () => void;
}

function WorkspaceCard({ workspace, onDelete, onNavigateToProjects }: WorkspaceCardProps) {
  const typeColors: Record<WorkspaceType, string> = {
    personal: 'bg-blue-100 text-blue-800 border-blue-200',
    team: 'bg-purple-100 text-purple-800 border-purple-200',
    shared: 'bg-green-100 text-green-800 border-green-200',
  };

  const typeIcons: Record<WorkspaceType, typeof Users> = {
    personal: FolderKanban,
    team: Users,
    shared: Users,
  };

  const Icon = typeIcons[workspace.type];

  return (
    <div className="relative p-6 rounded-lg border bg-card hover:shadow-md transition-all cursor-pointer" onClick={onNavigateToProjects}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', typeColors[workspace.type].replace('text-', 'bg-').replace('-800', '-50'))}>
            <Icon className={cn('h-5 w-5', typeColors[workspace.type].split(' ')[1])} />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{workspace.name}</h3>
            <p className="text-xs text-muted-foreground">Owner: {workspace.ownerName}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <AlertCircle className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onNavigateToProjects?.(); }}>
              <FolderKanban className="h-4 w-4 mr-2" />
              View Projects
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Type Badge */}
      <div className="mt-4">
        <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', typeColors[workspace.type])}>
          {workspace.type}
        </span>
      </div>

      {/* Description */}
      {workspace.description && (
        <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{workspace.description}</p>
      )}

      {/* Stats */}
      <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            <strong>{workspace.projectsCount}</strong> projects
          </span>
          <span className="text-muted-foreground">
            <strong>{workspace.membersCount}</strong> members
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(workspace.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

interface CreateWorkspaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateWorkspaceRequest) => void;
  isLoading?: boolean;
}

function CreateWorkspaceDialog({ isOpen, onClose, onSubmit, isLoading }: CreateWorkspaceDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<WorkspaceType>('personal');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      type,
      description: description || undefined,
    });
    // Reset form
    setName('');
    setType('personal');
    setDescription('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Create Workspace</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Workspace"
              required
            />
          </div>

          <div>
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as WorkspaceType)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              required
            >
              <option value="personal">Personal</option>
              <option value="team">Team</option>
              <option value="shared">Shared</option>
            </select>
          </div>

          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Workspace description..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WorkspacesList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: workspaces = [], isLoading, error, refetch } = useWorkspaces(MOCK_SERVER_URL, MOCK_TOKEN);
  const createWorkspace = useCreateWorkspace(MOCK_SERVER_URL, MOCK_TOKEN);
  const deleteWorkspace = useDeleteWorkspace(MOCK_SERVER_URL, MOCK_TOKEN);

  const filteredWorkspaces = useMemo(
    () =>
      workspaces.filter(
        (w) =>
          w.name.toLowerCase().includes(search.toLowerCase()) ||
          w.description?.toLowerCase().includes(search.toLowerCase()) ||
          w.ownerName.toLowerCase().includes(search.toLowerCase())
      ),
    [workspaces, search]
  );

  const handleCreateWorkspace = async (data: CreateWorkspaceRequest) => {
    try {
      await createWorkspace.mutateAsync(data);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create workspace:', error);
      alert('Failed to create workspace. Please try again.');
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string, workspaceName: string) => {
    if (window.confirm(`Are you sure you want to delete workspace "${workspaceName}"?`)) {
      try {
        await deleteWorkspace.mutateAsync({ workspaceId });
      } catch (error) {
        console.error('Failed to delete workspace:', error);
        alert('Failed to delete workspace. Please try again.');
      }
    }
  };

  const handleNavigateToProjects = (workspaceId: string) => {
    navigate(`/projects?workspaceId=${workspaceId}`);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium">Failed to load workspaces</h3>
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
          <h1 className="text-2xl font-bold">Workspaces</h1>
          <p className="text-muted-foreground">Organize your projects into workspaces</p>
        </div>
        <Can I="create" a="Workspace">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Workspace
          </Button>
        </Can>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search workspaces..."
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
            <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredWorkspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed rounded-lg">
          <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No workspaces found</h3>
          <p className="text-muted-foreground mt-1">
            {search ? 'Try adjusting your search' : 'Create your first workspace to get started'}
          </p>
          {!search && (
            <Can I="create" a="Workspace">
              <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Workspace
              </Button>
            </Can>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkspaces.map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              onDelete={() => handleDeleteWorkspace(workspace.id, workspace.name)}
              onNavigateToProjects={() => handleNavigateToProjects(workspace.id)}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateWorkspaceDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateWorkspace}
        isLoading={createWorkspace.isPending}
      />
    </div>
  );
}
