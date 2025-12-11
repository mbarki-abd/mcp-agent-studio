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
      path: '/chat',
      element: AgentChat,
      permissions: [{ action: 'execute', subject: 'Agent' }],
    },
    {
      path: '/chat/:agentId',
      element: AgentChat,
      permissions: [{ action: 'execute', subject: 'Agent' }],
    },
  ],

  navigation: [
    {
      id: 'chat',
      label: 'Chat',
      path: '/chat',
      icon: MessageSquare,
      permissions: [{ action: 'execute', subject: 'Agent' }],
    },
  ],

  settings: {
    defaultEnabled: true,
  },
};

export default chatModule;
