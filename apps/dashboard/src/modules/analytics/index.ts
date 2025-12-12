import { lazy } from 'react';
import { BarChart3 } from 'lucide-react';
import type { ModuleDefinition } from '../../core/modules';

const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'));

// Export components for external use
export { MetricCard } from './components/MetricCard';
export { TrendChart } from './components/TrendChart';
export { DistributionChart } from './components/DistributionChart';
export { TopAgentsTable } from './components/TopAgentsTable';

export const analyticsModule: ModuleDefinition = {
  id: 'analytics',
  name: 'Analytics',
  version: '1.0.0',
  description: 'Comprehensive analytics and reporting dashboard',
  icon: BarChart3,
  dependencies: [],

  routes: [
    {
      path: '/analytics',
      element: AnalyticsDashboard,
      permissions: [{ action: 'read', subject: 'Analytics' }],
    },
  ],

  navigation: [
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      path: '/analytics',
      permissions: [{ action: 'read', subject: 'Analytics' }],
    },
  ],

  settings: {
    defaultEnabled: true,
  },
};

export default analyticsModule;
