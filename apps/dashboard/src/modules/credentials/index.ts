import { lazy } from 'react';
import { Shield } from 'lucide-react';
import type { ModuleDefinition } from '../../core/modules';

const CredentialsList = lazy(() => import('./pages/CredentialsList'));

export const credentialsModule: ModuleDefinition = {
  id: 'credentials',
  name: 'Credentials',
  version: '1.0.0',
  description: 'Secure credential vault for API keys and secrets',
  icon: Shield,

  routes: [
    {
      path: '/credentials',
      element: CredentialsList,
      permissions: [{ action: 'read', subject: 'Credential' }],
    },
  ],

  navigation: [
    {
      id: 'credentials',
      label: 'Credentials',
      icon: Shield,
      path: '/credentials',
      permissions: [{ action: 'read', subject: 'Credential' }],
    },
  ],

  settings: {
    defaultEnabled: true,
  },
};

export default credentialsModule;
