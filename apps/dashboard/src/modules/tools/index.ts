import { lazy } from 'react';
import { Package } from 'lucide-react';
import type { ModuleDefinition } from '../../core/modules';

const ToolsCatalog = lazy(() => import('./pages/ToolsCatalog'));
const ServerTools = lazy(() => import('./pages/ServerTools'));
const AgentPermissions = lazy(() => import('./pages/AgentPermissions'));

export const toolsModule: ModuleDefinition = {
  id: 'tools',
  name: 'Tools',
  version: '1.0.0',
  description: 'Unix tools catalog and management',
  icon: Package,
  dependencies: ['servers'],

  routes: [
    {
      path: '/tools',
      element: ToolsCatalog,
      permissions: [{ action: 'read', subject: 'ToolDefinition' }],
    },
    {
      path: '/tools/server/:serverId',
      element: ServerTools,
      permissions: [{ action: 'read', subject: 'ServerTool' }],
    },
    {
      path: '/tools/agent/:agentId/permissions',
      element: AgentPermissions,
      permissions: [{ action: 'read', subject: 'AgentToolPermission' }],
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
