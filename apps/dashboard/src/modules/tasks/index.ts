import { lazy } from 'react';
import { ListTodo } from 'lucide-react';
import type { ModuleDefinition } from '../../core/modules';

const TasksList = lazy(() => import('./pages/TasksList'));
const TaskDetail = lazy(() => import('./pages/TaskDetail'));
const CreateTask = lazy(() => import('./pages/CreateTask'));

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
    {
      path: 'tasks/new',
      element: CreateTask,
      permissions: [{ action: 'create', subject: 'Task' }],
    },
    {
      path: 'tasks/:id',
      element: TaskDetail,
      permissions: [{ action: 'read', subject: 'Task' }],
    },
    {
      path: 'tasks/:id/edit',
      element: CreateTask,
      permissions: [{ action: 'update', subject: 'Task' }],
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
