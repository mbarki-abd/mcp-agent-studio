import { cn } from '../../../lib/utils';
import type { TaskStatus } from '@mcp/types';

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  DRAFT: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  PENDING: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  SCHEDULED: {
    label: 'Scheduled',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  QUEUED: {
    label: 'Queued',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  RUNNING: {
    label: 'Running',
    className: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
};

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.DRAFT;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          status === 'RUNNING' && 'bg-cyan-500 animate-pulse',
          status === 'COMPLETED' && 'bg-green-500',
          status === 'FAILED' && 'bg-red-500',
          status === 'SCHEDULED' && 'bg-blue-500',
          status === 'QUEUED' && 'bg-purple-500',
          status === 'PENDING' && 'bg-yellow-500',
          (status === 'DRAFT' || status === 'CANCELLED') && 'bg-gray-500'
        )}
      />
      {config.label}
    </span>
  );
}
