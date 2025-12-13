import { lazy } from 'react';
import { FolderGit2 } from 'lucide-react';
import type { ModuleDefinition } from '../../core/modules';

const ProjectsList = lazy(() => import('./pages/ProjectsList'));

export const projectsModule: ModuleDefinition = {
  id: 'projects',
  name: 'Projects',
  version: '1.0.0',
  description: 'Manage development projects',
  icon: FolderGit2,

  routes: [
    {
      path: '/projects',
      element: ProjectsList,
      permissions: [{ action: 'read', subject: 'Project' }],
    },
  ],

  navigation: [
    {
      id: 'projects',
      label: 'Projects',
      icon: FolderGit2,
      path: '/projects',
      permissions: [{ action: 'read', subject: 'Project' }],
    },
  ],

  settings: {
    defaultEnabled: true,
  },
};

export default projectsModule;
