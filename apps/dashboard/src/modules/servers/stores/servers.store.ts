import { create } from 'zustand';
import type { ServerConfiguration } from '@mcp/types';

interface ServersState {
  selectedServerId: string | null;
  servers: ServerConfiguration[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setSelectedServer: (id: string | null) => void;
  setServers: (servers: ServerConfiguration[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateServer: (id: string, updates: Partial<ServerConfiguration>) => void;
  removeServer: (id: string) => void;
}

export const useServersStore = create<ServersState>((set) => ({
  selectedServerId: null,
  servers: [],
  isLoading: false,
  error: null,

  setSelectedServer: (id) => set({ selectedServerId: id }),

  setServers: (servers) => set({ servers }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  updateServer: (id, updates) =>
    set((state) => ({
      servers: state.servers.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),

  removeServer: (id) =>
    set((state) => ({
      servers: state.servers.filter((s) => s.id !== id),
      selectedServerId: state.selectedServerId === id ? null : state.selectedServerId,
    })),
}));
