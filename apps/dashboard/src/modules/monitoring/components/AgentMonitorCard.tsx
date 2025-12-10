import { Bot, Activity, Clock } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { AgentStatus } from '@mcp/types';

interface AgentMonitorCardProps {
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
  isSelected?: boolean;
  onClick?: () => void;
}

const statusColors: Record<AgentStatus, string> = {
  ACTIVE: 'border-green-500 bg-green-50',
  BUSY: 'border-blue-500 bg-blue-50',
  PENDING_VALIDATION: 'border-yellow-500 bg-yellow-50',
  INACTIVE: 'border-gray-300 bg-gray-50',
  ERROR: 'border-red-500 bg-red-50',
};

const statusDotColors: Record<AgentStatus, string> = {
  ACTIVE: 'bg-green-500',
  BUSY: 'bg-blue-500 animate-pulse',
  PENDING_VALIDATION: 'bg-yellow-500',
  INACTIVE: 'bg-gray-400',
  ERROR: 'bg-red-500',
};

export function AgentMonitorCard({
  displayName,
  status,
  currentTask,
  todoProgress,
  lastUpdate,
  isSelected,
  onClick,
}: AgentMonitorCardProps) {
  const progressPercent = todoProgress
    ? Math.round((todoProgress.completed / todoProgress.total) * 100)
    : 0;

  return (
    <div
      className={cn(
        'relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md',
        statusColors[status],
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-sm">{displayName}</span>
        </div>
        <div className={cn('w-3 h-3 rounded-full', statusDotColors[status])} />
      </div>

      {/* Status */}
      <div className="mt-3 text-xs text-muted-foreground uppercase tracking-wide">
        {status.replace('_', ' ')}
      </div>

      {/* Current task */}
      {currentTask && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          <Activity className="h-3 w-3" />
          <span className="truncate">{currentTask}</span>
        </div>
      )}

      {/* Todo progress */}
      {todoProgress && todoProgress.total > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span>Progress</span>
            <span>{todoProgress.completed}/{todoProgress.total}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {todoProgress.currentItem && (
            <p className="mt-1 text-xs text-muted-foreground truncate">
              {todoProgress.currentItem}
            </p>
          )}
        </div>
      )}

      {/* Last update */}
      <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{formatTimeAgo(lastUpdate)}</span>
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
