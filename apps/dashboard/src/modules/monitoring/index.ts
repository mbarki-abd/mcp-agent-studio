import { lazy } from 'react';
import { Activity } from 'lucide-react';
import type { ModuleDefinition } from '../../core/modules';

const ControlCenter = lazy(() => import('./pages/ControlCenter'));

export const monitoringModule: ModuleDefinition = {
  id: 'monitoring',
  name: 'Monitoring',
  version: '1.0.0',
  description: 'Real-time agent monitoring and control center',
  icon: Activity,
  dependencies: ['agents'],

  routes: [
    {
      path: '/monitoring',
      element: ControlCenter,
      permissions: [{ action: 'read', subject: 'Agent' }],
    },
  ],

  navigation: [
    {
      id: 'monitoring',
      label: 'Monitoring',
      icon: Activity,
      path: '/monitoring',
      permissions: [{ action: 'read', subject: 'Agent' }],
    },
  ],

  settings: {
    defaultEnabled: true,
  },
};

export default monitoringModule;
