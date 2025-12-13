import { lazy } from 'react';
import { Ticket } from 'lucide-react';
import type { ModuleDefinition } from '../../core/modules';

const TokensList = lazy(() => import('./pages/TokensList'));

export const tokensModule: ModuleDefinition = {
  id: 'tokens',
  name: 'Tokens',
  version: '1.0.0',
  description: 'Manage agent tokens for remote server access',
  icon: Ticket,

  routes: [
    {
      path: '/tokens',
      element: TokensList,
      permissions: [{ action: 'read', subject: 'Token' }],
    },
  ],

  navigation: [
    {
      id: 'tokens',
      label: 'Tokens',
      icon: Ticket,
      path: '/tokens',
      permissions: [{ action: 'read', subject: 'Token' }],
    },
  ],

  settings: {
    defaultEnabled: true,
  },
};

export default tokensModule;
