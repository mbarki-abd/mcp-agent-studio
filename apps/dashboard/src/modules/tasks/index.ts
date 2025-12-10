import { lazy } from 'react';
import { ListTodo } from 'lucide-react';
import type { ModuleDefinition } from '../../core/modules';

const TasksList = lazy(() => import('./pages/TasksList'));

export const tasksModule: ModuleDefinition = {
  id: 'tasks',
  name: 'Tasks',
  version: '1.0.0',
  description: 'Manage and schedule agent tasks',
  icon: ListTodo,
  dependencies: ['agents'],

  routes: [
    {
      path: 'tasks',
      element: TasksList,
      permissions: [{ action: 'read', subject: 'Task' }],
    },
  ],

  navigation: [
    {
      id: 'tasks',
      label: 'Tasks',
      icon: ListTodo,
      path: '/tasks',
      permissions: [{ action: 'read', subject: 'Task' }],
    },
  ],

  settings: {
    defaultEnabled: true,
  },
};

export default tasksModule;
