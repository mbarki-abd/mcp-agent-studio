import { lazy } from 'react';
import { Shield } from 'lucide-react';
import type { ModuleDefinition } from '../../core/modules';

const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));

// Export components for external use
export { AuditStatsCard } from './components/AuditStatsCard';
export { AuditLogTable } from './components/AuditLogTable';

export const auditModule: ModuleDefinition = {
  id: 'audit',
  name: 'Audit Logs',
  version: '1.0.0',
  description: 'System audit logging and security monitoring (Admin only)',
  icon: Shield,
  dependencies: [],

  routes: [
    {
      path: '/audit',
      element: AuditLogPage,
      permissions: [{ action: 'manage', subject: 'all' }], // Admin only
    },
  ],

  navigation: [
    {
      id: 'audit',
      label: 'Audit Logs',
      icon: Shield,
      path: '/audit',
      permissions: [{ action: 'manage', subject: 'all' }], // Admin only
    },
  ],

  settings: {
    defaultEnabled: true,
  },
};

export default auditModule;
