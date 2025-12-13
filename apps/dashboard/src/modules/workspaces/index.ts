import { lazy } from 'react';
import { FolderKanban } from 'lucide-react';
import type { ModuleDefinition } from '../../core/modules';

const WorkspacesList = lazy(() => import('./pages/WorkspacesList'));

export const workspacesModule: ModuleDefinition = {
  id: 'workspaces',
  name: 'Workspaces',
  version: '1.0.0',
  description: 'Organize agents into workspaces',
  icon: FolderKanban,

  routes: [
    {
      path: '/workspaces',
      element: WorkspacesList,
      permissions: [{ action: 'read', subject: 'Workspace' }],
    },
  ],

  navigation: [
    {
      id: 'workspaces',
      label: 'Workspaces',
      icon: FolderKanban,
      path: '/workspaces',
      permissions: [{ action: 'read', subject: 'Workspace' }],
    },
  ],

  settings: {
    defaultEnabled: true,
  },
};

export default workspacesModule;
