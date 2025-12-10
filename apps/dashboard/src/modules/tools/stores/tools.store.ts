import { create } from 'zustand';
import type { ToolCategory } from '@mcp/types';

interface ToolsState {
  selectedToolId: string | null;
  selectedCategory: ToolCategory | 'ALL';
  searchQuery: string;

  // Actions
  setSelectedTool: (id: string | null) => void;
  setSelectedCategory: (category: ToolCategory | 'ALL') => void;
  setSearchQuery: (query: string) => void;
}

export const useToolsStore = create<ToolsState>((set) => ({
  selectedToolId: null,
  selectedCategory: 'ALL',
  searchQuery: '',

  setSelectedTool: (id) => set({ selectedToolId: id }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
