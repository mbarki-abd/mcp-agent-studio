import { create } from 'zustand';
import type { AgentStatus } from '@mcp/types';

interface AgentMonitorData {
  id: string;
  name: string;
  displayName: string;
  status: AgentStatus;
  currentTask?: string;
  todoProgress?: {
    completed: number;
    total: number;
    currentItem?: string;
  };
  lastUpdate: Date;
}

interface MonitoringState {
  agents: Map<string, AgentMonitorData>;
  selectedAgentId: string | null;
  viewMode: 'grid' | 'list';
  showOffline: boolean;

  // Actions
  setAgentData: (id: string, data: Partial<AgentMonitorData>) => void;
  updateAgentStatus: (id: string, status: AgentStatus) => void;
  updateTodoProgress: (id: string, progress: AgentMonitorData['todoProgress']) => void;
  setSelectedAgent: (id: string | null) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setShowOffline: (show: boolean) => void;
  clearAgents: () => void;
}

export const useMonitoringStore = create<MonitoringState>((set, get) => ({
  agents: new Map(),
  selectedAgentId: null,
  viewMode: 'grid',
  showOffline: true,

  setAgentData: (id, data) => {
    const agents = new Map(get().agents);
    const existing = agents.get(id);
    agents.set(id, {
      ...existing,
      id,
      name: data.name || existing?.name || '',
      displayName: data.displayName || existing?.displayName || '',
      status: data.status || existing?.status || 'INACTIVE',
      currentTask: data.currentTask ?? existing?.currentTask,
      todoProgress: data.todoProgress ?? existing?.todoProgress,
      lastUpdate: new Date(),
    } as AgentMonitorData);
    set({ agents });
  },

  updateAgentStatus: (id, status) => {
    const agents = new Map(get().agents);
    const existing = agents.get(id);
    if (existing) {
      agents.set(id, { ...existing, status, lastUpdate: new Date() });
      set({ agents });
    }
  },

  updateTodoProgress: (id, progress) => {
    const agents = new Map(get().agents);
    const existing = agents.get(id);
    if (existing) {
      agents.set(id, { ...existing, todoProgress: progress, lastUpdate: new Date() });
      set({ agents });
    }
  },

  setSelectedAgent: (id) => set({ selectedAgentId: id }),

  setViewMode: (viewMode) => set({ viewMode }),

  setShowOffline: (showOffline) => set({ showOffline }),

  clearAgents: () => set({ agents: new Map() }),
}));
