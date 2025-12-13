import { lazy } from 'react';
import { FolderTree } from 'lucide-react';
import type { ModuleDefinition } from '../../core/modules';

const FileBrowser = lazy(() => import('./pages/FileBrowser'));

export const filesystemModule: ModuleDefinition = {
  id: 'filesystem',
  name: 'Files',
  version: '1.0.0',
  description: 'Browse and manage agent filesystems',
  icon: FolderTree,

  routes: [
    {
      path: '/files',
      element: FileBrowser,
      permissions: [{ action: 'read', subject: 'Filesystem' }],
    },
  ],

  navigation: [
    {
      id: 'filesystem',
      label: 'Files',
      icon: FolderTree,
      path: '/files',
      permissions: [{ action: 'read', subject: 'Filesystem' }],
    },
  ],

  settings: {
    defaultEnabled: true,
  },
};

export default filesystemModule;
