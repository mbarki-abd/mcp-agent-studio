import { lazy } from 'react';
import { Bot } from 'lucide-react';
import type { ModuleDefinition } from '../../core/modules';

const AgentsList = lazy(() => import('./pages/AgentsList'));

export const agentsModule: ModuleDefinition = {
  id: 'agents',
  name: 'Agents',
  version: '1.0.0',
  description: 'Manage AI agents and their hierarchy',
  icon: Bot,
  dependencies: ['servers'],

  routes: [
    {
      path: 'agents',
      element: AgentsList,
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
