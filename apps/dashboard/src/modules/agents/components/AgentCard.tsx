import { Bot, MoreVertical, Trash2, Edit, CheckCircle, Play, Users } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { AgentStatusBadge } from './AgentStatusBadge';
import { cn } from '../../../lib/utils';
import type { Agent, AgentRole } from '@mcp/types';

interface AgentCardProps {
  agent: Agent;
  isSelected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onValidate?: () => void;
  onExecute?: () => void;
}

const roleIcons: Record<AgentRole, typeof Bot> = {
  MASTER: Users,
  SUPERVISOR: Users,
  WORKER: Bot,
};

const roleColors: Record<AgentRole, string> = {
  MASTER: 'bg-purple-100 text-purple-600',
  SUPERVISOR: 'bg-blue-100 text-blue-600',
  WORKER: 'bg-gray-100 text-gray-600',
};

export function AgentCard({
  agent,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onValidate,
  onExecute,
}: AgentCardProps) {
  const RoleIcon = roleIcons[agent.role] || Bot;

  return (
    <div
      className={cn(
        'relative p-4 rounded-lg border bg-card cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary border-primary'
      )}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', roleColors[agent.role])}>
            <RoleIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium text-sm">{agent.displayName}</h3>
            <p className="text-xs text-muted-foreground">{agent.name}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            {agent.status === 'PENDING_VALIDATION' && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onValidate?.(); }}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Validate
              </DropdownMenuItem>
            )}
            {agent.status === 'ACTIVE' && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onExecute?.(); }}>
                <Play className="h-4 w-4 mr-2" />
                Execute
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600"
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status & Role */}
      <div className="mt-4 flex items-center gap-2">
        <AgentStatusBadge status={agent.status} />
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded capitalize">
          {agent.role.toLowerCase()}
        </span>
      </div>

      {/* Description */}
      {agent.description && (
        <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
          {agent.description}
        </p>
      )}

      {/* Capabilities */}
      {Array.isArray(agent.capabilities) && agent.capabilities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {(agent.capabilities as string[]).slice(0, 3).map((cap) => (
            <span
              key={cap}
              className="text-xs bg-muted px-1.5 py-0.5 rounded"
            >
              {cap}
            </span>
          ))}
          {(agent.capabilities as string[]).length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{(agent.capabilities as string[]).length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
        Created {new Date(agent.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}
