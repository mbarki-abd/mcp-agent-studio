import { create } from 'zustand';
import type { Agent, AgentStatus } from '@mcp/types';

interface AgentsState {
  selectedAgentId: string | null;
  agents: Agent[];
  statusUpdates: Map<string, AgentStatus>;

  // Actions
  setSelectedAgent: (id: string | null) => void;
  setAgents: (agents: Agent[]) => void;
  updateAgentStatus: (id: string, status: AgentStatus) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  removeAgent: (id: string) => void;
}

export const useAgentsStore = create<AgentsState>((set, get) => ({
  selectedAgentId: null,
  agents: [],
  statusUpdates: new Map(),

  setSelectedAgent: (id) => set({ selectedAgentId: id }),

  setAgents: (agents) => set({ agents }),

  updateAgentStatus: (id, status) => {
    const updates = new Map(get().statusUpdates);
    updates.set(id, status);
    set({
      statusUpdates: updates,
      agents: get().agents.map((a) => (a.id === id ? { ...a, status } : a)),
    });
  },

  updateAgent: (id, updates) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),

  removeAgent: (id) =>
    set((state) => ({
      agents: state.agents.filter((a) => a.id !== id),
      selectedAgentId: state.selectedAgentId === id ? null : state.selectedAgentId,
    })),
}));
