import { cn } from '../../../lib/utils';
import type { AgentStatus } from '@mcp/types';

interface AgentStatusBadgeProps {
  status: AgentStatus;
  className?: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<AgentStatus, { label: string; className: string }> = {
  PENDING_VALIDATION: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  },
  ACTIVE: {
    label: 'Active',
    className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  },
  INACTIVE: {
    label: 'Inactive',
    className: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  },
  BUSY: {
    label: 'Busy',
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  },
  ERROR: {
    label: 'Error',
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  },
};

export function AgentStatusBadge({ status, className, size = 'md' }: AgentStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.INACTIVE;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
        config.className,
        className
      )}
    >
      <span
        className={cn(
          'rounded-full',
          size === 'sm' ? 'w-1 h-1 mr-1' : 'w-1.5 h-1.5 mr-1.5',
          status === 'ACTIVE' && 'bg-green-500 animate-pulse',
          status === 'BUSY' && 'bg-blue-500 animate-pulse',
          status === 'PENDING_VALIDATION' && 'bg-yellow-500',
          status === 'INACTIVE' && 'bg-gray-500',
          status === 'ERROR' && 'bg-red-500'
        )}
      />
      {config.label}
    </span>
  );
}
