import { ListTodo, MoreVertical, Trash2, Edit, Play, XCircle, Clock, Calendar } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { TaskStatusBadge } from './TaskStatusBadge';
import { cn } from '../../../lib/utils';
import type { Task, Priority } from '@mcp/types';

interface TaskCardProps {
  task: Task;
  isSelected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRun?: () => void;
  onCancel?: () => void;
}

const priorityColors: Record<Priority, string> = {
  LOW: 'text-gray-500',
  MEDIUM: 'text-blue-500',
  HIGH: 'text-orange-500',
  URGENT: 'text-red-500',
};

export function TaskCard({
  task,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onRun,
  onCancel,
}: TaskCardProps) {
  const canRun = ['DRAFT', 'PENDING', 'SCHEDULED', 'FAILED'].includes(task.status);
  const canCancel = ['QUEUED', 'RUNNING'].includes(task.status);

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
          <div className="p-2 rounded-lg bg-muted">
            <ListTodo className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{task.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn('text-xs font-medium', priorityColors[task.priority])}>
                {task.priority}
              </span>
              {task.executionMode === 'RECURRING' && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Recurring
                </span>
              )}
            </div>
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
            {canRun && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRun?.(); }}>
                <Play className="h-4 w-4 mr-2" />
                Run Now
              </DropdownMenuItem>
            )}
            {canCancel && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCancel?.(); }}>
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
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

      {/* Status */}
      <div className="mt-4">
        <TaskStatusBadge status={task.status} />
      </div>

      {/* Description */}
      {task.description && (
        <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Schedule info */}
      {task.scheduledAt && (
        <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>
            Scheduled: {new Date(task.scheduledAt).toLocaleString()}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {task.runCount > 0
            ? `Runs: ${task.runCount}`
            : 'Never run'}
        </span>
        {task.lastRunAt && (
          <span>Last: {new Date(task.lastRunAt).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}
