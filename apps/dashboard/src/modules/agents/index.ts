import { lazy } from 'react';
import { Bot } from 'lucide-react';
import type { ModuleDefinition } from '../../core/modules';

const AgentsList = lazy(() => import('./pages/AgentsList'));
const AgentDashboard = lazy(() => import('./pages/AgentDashboard'));
const CreateAgent = lazy(() => import('./pages/CreateAgent'));
const AgentStats = lazy(() => import('./pages/AgentStats'));

export const agentsModule: ModuleDefinition = {
  id: 'agents',
  name: 'Agents',
  version: '1.0.0',
  description: 'Manage AI agents and their hierarchy',
  icon: Bot,
  dependencies: ['servers'],

  routes: [
    {
      path: '/agents',
      element: AgentsList,
      permissions: [{ action: 'read', subject: 'Agent' }],
    },
    {
      path: '/agents/new',
      element: CreateAgent,
      permissions: [{ action: 'create', subject: 'Agent' }],
    },
    {
      path: '/agents/:id',
      element: AgentDashboard,
      permissions: [{ action: 'read', subject: 'Agent' }],
    },
    {
      path: '/agents/:id/edit',
      element: CreateAgent,
      permissions: [{ action: 'update', subject: 'Agent' }],
    },
    {
      path: '/agents/:id/stats',
      element: AgentStats,
      permissions: [{ action: 'read', subject: 'Agent' }],
    },
  ],

  navigation: [
    {
      id: 'agents',
      label: 'Agents',
      icon: Bot,
      path: '/agents',
      permissions: [{ action: 'read', subject: 'Agent' }],
    },
  ],

  settings: {
    defaultEnabled: true,
  },
};

export default agentsModule;
