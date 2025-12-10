import { cn } from '../../../lib/utils';
import type { ServerStatus } from '@mcp/types';

interface ServerStatusBadgeProps {
  status: ServerStatus;
  className?: string;
}

const statusConfig: Record<ServerStatus, { label: string; className: string }> = {
  ONLINE: {
    label: 'Online',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  OFFLINE: {
    label: 'Offline',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  DEGRADED: {
    label: 'Degraded',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  UNKNOWN: {
    label: 'Unknown',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
};

export function ServerStatusBadge({ status, className }: ServerStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.UNKNOWN;

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
          status === 'ONLINE' && 'bg-green-500 animate-pulse',
          status === 'OFFLINE' && 'bg-red-500',
          status === 'DEGRADED' && 'bg-yellow-500',
          status === 'UNKNOWN' && 'bg-gray-500',
          status === 'MAINTENANCE' && 'bg-blue-500'
        )}
      />
      {config.label}
    </span>
  );
}
