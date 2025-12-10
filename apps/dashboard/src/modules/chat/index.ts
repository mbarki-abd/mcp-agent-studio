import { lazy } from 'react';
import { MessageSquare } from 'lucide-react';
import type { ModuleDefinition } from '../../core/modules';

const AgentChat = lazy(() => import('./pages/AgentChat'));

export const chatModule: ModuleDefinition = {
  id: 'chat',
  name: 'Chat',
  version: '1.0.0',
  description: 'Chat interface for agent interactions',
  icon: MessageSquare,
  dependencies: ['agents'],

  routes: [
    {
      path: 'chat/:agentId',
      element: AgentChat,
      permissions: [{ action: 'execute', subject: 'Agent' }],
    },
  ],

  navigation: [],

  settings: {
    defaultEnabled: true,
  },
};

export default chatModule;
