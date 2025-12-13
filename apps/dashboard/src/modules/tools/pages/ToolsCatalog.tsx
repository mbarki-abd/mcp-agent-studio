import { useState, useMemo } from 'react';
import { Package, RefreshCw, AlertCircle, Filter, Search } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { ToolCard } from '../components/ToolCard';
import { useToolsCatalog } from '../../../core/api';
import { useToolsStore } from '../stores/tools.store';
import type { ToolCategory, ToolDefinition } from '@mcp/types';

const categoryFilters: Array<{ value: ToolCategory | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'VERSION_CONTROL', label: 'Version Control' },
  { value: 'CONTAINER', label: 'Containers' },
  { value: 'CLOUD_CLI', label: 'Cloud CLI' },
  { value: 'KUBERNETES', label: 'Kubernetes' },
  { value: 'LANGUAGE_RUNTIME', label: 'Languages' },
  { value: 'PACKAGE_MANAGER', label: 'Package Managers' },
  { value: 'DATABASE_CLIENT', label: 'Databases' },
  { value: 'DEVOPS', label: 'DevOps' },
  { value: 'UTILITY', label: 'Utilities' },
  { value: 'SECURITY', label: 'Security' },
  { value: 'EDITOR', label: 'Editors' },
];

export default function ToolsCatalog() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ToolCategory | 'ALL'>('ALL');

  const { data: tools, isLoading, error, refetch } = useToolsCatalog();
  const { setSelectedTool } = useToolsStore();

  const filteredTools = useMemo(
    () =>
      (tools || []).filter((tool: ToolDefinition) => {
        // Category filter
        if (category !== 'ALL' && tool.category !== category) return false;

        // Search filter
        if (search) {
          const searchLower = search.toLowerCase();
          return (
            tool.name.toLowerCase().includes(searchLower) ||
            tool.displayName.toLowerCase().includes(searchLower) ||
            tool.description?.toLowerCase().includes(searchLower) ||
            tool.tags?.some((t: string) => t.toLowerCase().includes(searchLower))
          );
        }

        return true;
      }),
    [tools, category, search]
  );

  // Group tools by category
  const groupedTools = useMemo(
    () =>
      filteredTools.reduce((acc: Record<ToolCategory, ToolDefinition[]>, tool: ToolDefinition) => {
        const cat = tool.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(tool);
        return acc;
      }, {} as Record<ToolCategory, ToolDefinition[]>),
    [filteredTools]
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium">Failed to load tools catalog</h3>
        <p className="text-muted-foreground mt-1">{error.message}</p>
        <Button onClick={() => refetch()} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tools Catalog</h1>
          <p className="text-muted-foreground">
            Browse and install development tools on your servers
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              {categoryFilters.find((f) => f.value === category)?.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-64 overflow-y-auto">
            {categoryFilters.map((filter) => (
              <DropdownMenuItem
                key={filter.value}
                onClick={() => setCategory(filter.value)}
              >
                {filter.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{filteredTools.length} tools</span>
        <span>|</span>
        <span>{Object.keys(groupedTools).length} categories</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredTools.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed rounded-lg">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No tools found</h3>
          <p className="text-muted-foreground mt-1">
            Try adjusting your search or filters
          </p>
        </div>
      ) : category === 'ALL' ? (
        // Grouped view
        <div className="space-y-8">
          {Object.entries(groupedTools).map(([cat, categoryTools]) => (
            <div key={cat}>
              <h2 className="text-lg font-semibold mb-4 capitalize">
                {cat.toLowerCase().replace('_', ' ')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(categoryTools as ToolDefinition[]).map((tool: ToolDefinition) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    onClick={() => setSelectedTool(tool.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Flat view for single category
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTools.map((tool: ToolDefinition) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onClick={() => setSelectedTool(tool.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
