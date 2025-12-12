import { lazy } from 'react';
import { Building2 } from 'lucide-react';
import type { ModuleDefinition } from '../../core/modules';

const OrganizationSettings = lazy(() => import('./pages/OrganizationSettings'));
const MembersList = lazy(() => import('./pages/MembersList'));
const InvitationsList = lazy(() => import('./pages/InvitationsList'));

export const organizationModule: ModuleDefinition = {
  id: 'organization',
  name: 'Organization',
  version: '1.0.0',
  description: 'Manage organization settings, members, and invitations',
  icon: Building2,

  routes: [
    {
      path: '/organization',
      element: OrganizationSettings,
      permissions: [{ action: 'read', subject: 'Organization' }],
    },
    {
      path: '/organization/members',
      element: MembersList,
      permissions: [{ action: 'read', subject: 'Organization' }],
    },
    {
      path: '/organization/invitations',
      element: InvitationsList,
      permissions: [{ action: 'manage', subject: 'Organization' }],
    },
  ],

  navigation: [
    {
      id: 'organization',
      label: 'Organization',
      icon: Building2,
      path: '/organization',
      permissions: [{ action: 'read', subject: 'Organization' }],
    },
  ],

  settings: {
    defaultEnabled: true,
  },
};

export default organizationModule;
