import { type LucideIcon } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface AuditStatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  loading?: boolean;
}

export function AuditStatsCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-primary',
  loading = false,
}: AuditStatsCardProps) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          {loading ? (
            <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1" />
          ) : (
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          )}
        </div>
        <div className={cn('p-3 rounded-lg bg-gray-50', iconColor)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
