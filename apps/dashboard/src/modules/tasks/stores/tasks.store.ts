import { create } from 'zustand';
import type { Task, TaskStatus } from '@mcp/types';

interface TasksState {
  selectedTaskId: string | null;
  tasks: Task[];
  filter: {
    status: TaskStatus | 'ALL';
    search: string;
  };

  // Actions
  setSelectedTask: (id: string | null) => void;
  setTasks: (tasks: Task[]) => void;
  setFilter: (filter: Partial<TasksState['filter']>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
}

export const useTasksStore = create<TasksState>((set) => ({
  selectedTaskId: null,
  tasks: [],
  filter: {
    status: 'ALL',
    search: '',
  },

  setSelectedTask: (id) => set({ selectedTaskId: id }),

  setTasks: (tasks) => set({ tasks }),

  setFilter: (filter) =>
    set((state) => ({
      filter: { ...state.filter, ...filter },
    })),

  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  removeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
      selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
    })),
}));
