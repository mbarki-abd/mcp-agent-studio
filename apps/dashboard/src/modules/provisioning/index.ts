import { lazy } from 'react';
import { CloudCog } from 'lucide-react';
import type { ModuleDefinition } from '../../core/modules';

const ProvisionServer = lazy(() => import('./pages/ProvisionServer'));

export const provisioningModule: ModuleDefinition = {
  id: 'provisioning',
  name: 'Provision',
  version: '1.0.0',
  description: 'Provision new MCP servers on Hetzner Cloud',
  icon: CloudCog,

  routes: [
    {
      path: '/provision',
      element: ProvisionServer,
      permissions: [{ action: 'create', subject: 'Server' }],
    },
  ],

  navigation: [
    {
      id: 'provisioning',
      label: 'Provision',
      icon: CloudCog,
      path: '/provision',
      permissions: [{ action: 'create', subject: 'Server' }],
    },
  ],

  settings: {
    defaultEnabled: true,
  },
};

export default provisioningModule;
