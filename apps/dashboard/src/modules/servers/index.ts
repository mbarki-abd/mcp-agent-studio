import { lazy } from 'react';
import { Server } from 'lucide-react';
import type { ModuleDefinition } from '../../core/modules';

const ServersList = lazy(() => import('./pages/ServersList'));
const CreateServer = lazy(() => import('./pages/CreateServer'));
const ServerDashboard = lazy(() => import('./pages/ServerDashboard'));
const ServerHealth = lazy(() => import('./pages/ServerHealth'));

export const serversModule: ModuleDefinition = {
  id: 'servers',
  name: 'Server Configuration',
  version: '1.0.0',
  description: 'Manage MCP server connections',
  icon: Server,

  routes: [
    {
      path: '/servers',
      element: ServersList,
      permissions: [{ action: 'read', subject: 'ServerConfiguration' }],
    },
    {
      path: '/servers/new',
      element: CreateServer,
      permissions: [{ action: 'create', subject: 'ServerConfiguration' }],
    },
    {
      path: '/servers/:id',
      element: ServerDashboard,
      permissions: [{ action: 'read', subject: 'ServerConfiguration' }],
    },
    {
      path: '/servers/:id/health',
      element: ServerHealth,
      permissions: [{ action: 'read', subject: 'ServerConfiguration' }],
    },
  ],

  navigation: [
    {
      id: 'servers',
      label: 'Servers',
      icon: Server,
      path: '/servers',
      permissions: [{ action: 'read', subject: 'ServerConfiguration' }],
    },
  ],

  settings: {
    defaultEnabled: true,
  },
};

export default serversModule;
