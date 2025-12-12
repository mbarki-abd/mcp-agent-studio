import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronDown, Bot, Users, Loader2 } from 'lucide-react';
import { AgentStatusBadge } from './AgentStatusBadge';
import { cn } from '../../../lib/utils';
import { useAgentHierarchy, type AgentHierarchyNode } from '../../../core/api/hooks';
import type { AgentRole, AgentStatus } from '@mcp/types';

interface AgentHierarchyTreeProps {
  serverId?: string;
  selectedAgentId?: string | null;
  onSelectAgent?: (id: string | null) => void;
}

const roleColors: Record<AgentRole, string> = {
  MASTER: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  SUPERVISOR: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  WORKER: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

interface TreeNodeProps {
  node: AgentHierarchyNode;
  level: number;
  selectedAgentId?: string | null;
  onSelectAgent?: (id: string | null) => void;
}

function TreeNode({ node, level, selectedAgentId, onSelectAgent }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedAgentId === node.id;

  const RoleIcon = node.role === 'WORKER' ? Bot : Users;
  const role = node.role as AgentRole;

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors',
          isSelected
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-muted'
        )}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => onSelectAgent?.(node.id)}
      >
        {/* Expand/Collapse button */}
        <button
          type="button"
          className={cn(
            'w-5 h-5 flex items-center justify-center rounded hover:bg-muted-foreground/10',
            !hasChildren && 'invisible'
          )}
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {/* Role Icon */}
        <div className={cn('p-1 rounded', roleColors[role] || roleColors.WORKER)}>
          <RoleIcon className="h-3.5 w-3.5" />
        </div>

        {/* Agent Info */}
        <Link
          to={`/agents/${node.id}`}
          className="flex-1 min-w-0"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="font-medium text-sm truncate block">
            {node.displayName}
          </span>
        </Link>

        {/* Status Badge */}
        <AgentStatusBadge status={node.status as AgentStatus} size="sm" />
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {/* Connection line */}
          <div
            className="absolute left-0 top-0 bottom-0 w-px bg-border"
            style={{ left: `${level * 20 + 18}px` }}
          />
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedAgentId={selectedAgentId}
              onSelectAgent={onSelectAgent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AgentHierarchyTree({
  serverId,
  selectedAgentId,
  onSelectAgent,
}: AgentHierarchyTreeProps) {
  const { data, isLoading, error } = useAgentHierarchy(serverId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Loading hierarchy...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Bot className="h-10 w-10 text-red-500 mb-3" />
        <p className="text-sm text-red-500">Failed to load hierarchy</p>
        <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
      </div>
    );
  }

  const hierarchy = data?.hierarchy || [];

  if (hierarchy.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Bot className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No agents to display</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="space-y-1">
        {hierarchy.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            level={0}
            selectedAgentId={selectedAgentId}
            onSelectAgent={onSelectAgent}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className={cn('p-1 rounded', roleColors.MASTER)}>
            <Users className="h-3 w-3" />
          </div>
          <span>Master</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={cn('p-1 rounded', roleColors.SUPERVISOR)}>
            <Users className="h-3 w-3" />
          </div>
          <span>Supervisor</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={cn('p-1 rounded', roleColors.WORKER)}>
            <Bot className="h-3 w-3" />
          </div>
          <span>Worker</span>
        </div>
      </div>
    </div>
  );
}
