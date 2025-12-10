import { cn } from '../../../lib/utils';
import type { AgentStatus } from '@mcp/types';

interface AgentStatusBadgeProps {
  status: AgentStatus;
  className?: string;
}

const statusConfig: Record<AgentStatus, { label: string; className: string }> = {
  PENDING_VALIDATION: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  ACTIVE: {
    label: 'Active',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  INACTIVE: {
    label: 'Inactive',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  BUSY: {
    label: 'Busy',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  ERROR: {
    label: 'Error',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
};

export function AgentStatusBadge({ status, className }: AgentStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.INACTIVE;

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
