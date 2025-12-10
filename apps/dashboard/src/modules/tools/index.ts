import { lazy } from 'react';
import { Package } from 'lucide-react';
import type { ModuleDefinition } from '../../core/modules';

const ToolsCatalog = lazy(() => import('./pages/ToolsCatalog'));

export const toolsModule: ModuleDefinition = {
  id: 'tools',
  name: 'Tools',
  version: '1.0.0',
  description: 'Unix tools catalog and management',
  icon: Package,
  dependencies: ['servers'],

  routes: [
    {
      path: 'tools',
      element: ToolsCatalog,
      permissions: [{ action: 'read', subject: 'ToolDefinition' }],
    },
  ],

  navigation: [
    {
      id: 'tools',
      label: 'Tools',
      icon: Package,
      path: '/tools',
      permissions: [{ action: 'read', subject: 'ToolDefinition' }],
    },
  ],

  settings: {
    defaultEnabled: true,
  },
};

export default toolsModule;
