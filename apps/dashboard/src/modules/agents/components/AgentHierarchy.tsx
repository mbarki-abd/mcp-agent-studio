import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronDown, Bot, Users } from 'lucide-react';
import { AgentStatusBadge } from './AgentStatusBadge';
import { cn } from '../../../lib/utils';
import type { Agent, AgentRole } from '@mcp/types';

interface AgentNode extends Agent {
  children?: AgentNode[];
}

interface AgentHierarchyProps {
  agents: Agent[];
  selectedAgentId?: string;
  onSelectAgent?: (id: string) => void;
}

const roleColors: Record<AgentRole, string> = {
  MASTER: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  SUPERVISOR: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  WORKER: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

function buildTree(agents: Agent[]): AgentNode[] {
  const agentMap = new Map<string, AgentNode>();
  const roots: AgentNode[] = [];

  // First pass: create nodes
  agents.forEach((agent) => {
    agentMap.set(agent.id, { ...agent, children: [] });
  });

  // Second pass: build tree
  agents.forEach((agent) => {
    const node = agentMap.get(agent.id)!;
    if (agent.supervisorId && agentMap.has(agent.supervisorId)) {
      const parent = agentMap.get(agent.supervisorId)!;
      parent.children = parent.children || [];
      parent.children.push(node);
    } else if (agent.role === 'MASTER') {
      roots.push(node);
    }
  });

  // Add orphan workers/supervisors without supervisor to root
  agents.forEach((agent) => {
    if (
      agent.role !== 'MASTER' &&
      (!agent.supervisorId || !agentMap.has(agent.supervisorId))
    ) {
      const node = agentMap.get(agent.id)!;
      if (!roots.includes(node)) {
        roots.push(node);
      }
    }
  });

  return roots;
}

interface TreeNodeProps {
  node: AgentNode;
  level: number;
  selectedAgentId?: string;
  onSelectAgent?: (id: string) => void;
}

function TreeNode({ node, level, selectedAgentId, onSelectAgent }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedAgentId === node.id;

  const RoleIcon = node.role === 'WORKER' ? Bot : Users;

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
        <div className={cn('p-1 rounded', roleColors[node.role])}>
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
        <AgentStatusBadge status={node.status} size="sm" />
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {/* Connection line */}
          <div
            className="absolute left-0 top-0 bottom-0 w-px bg-border"
            style={{ left: `${level * 20 + 18}px` }}
          />
          {node.children!.map((child) => (
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

export function AgentHierarchy({
  agents,
  selectedAgentId,
  onSelectAgent,
}: AgentHierarchyProps) {
  const tree = buildTree(agents);

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Bot className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No agents to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tree.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          level={0}
          selectedAgentId={selectedAgentId}
          onSelectAgent={onSelectAgent}
        />
      ))}
    </div>
  );
}
