import { lazy } from 'react';
import { Key } from 'lucide-react';
import type { ModuleDefinition } from '../../core/modules';

const ApiKeysList = lazy(() => import('./pages/ApiKeysList'));

export const apiKeysModule: ModuleDefinition = {
  id: 'apikeys',
  name: 'API Keys',
  version: '1.0.0',
  description: 'Manage API keys for programmatic access',
  icon: Key,

  routes: [
    {
      path: '/settings/api-keys',
      element: ApiKeysList,
      permissions: [{ action: 'read', subject: 'ApiKey' }],
    },
  ],

  navigation: [
    {
      id: 'apikeys',
      label: 'API Keys',
      icon: Key,
      path: '/settings/api-keys',
      permissions: [{ action: 'read', subject: 'ApiKey' }],
    },
  ],

  settings: {
    defaultEnabled: true,
  },
};

export default apiKeysModule;
