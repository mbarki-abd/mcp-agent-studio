import {
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  LogIn,
  LogOut,
  Plus,
  Edit,
  Trash,
  Key,
  RefreshCw,
  Plug,
  Unplug,
  HeartPulse,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { AuditLogEntry, AuditAction } from '../../../core/api/hooks';

interface AuditLogTableProps {
  logs: AuditLogEntry[];
  loading?: boolean;
  onViewDetails: (log: AuditLogEntry) => void;
}

const ACTION_ICONS: Record<AuditAction, typeof LogIn> = {
  LOGIN: LogIn,
  LOGOUT: LogOut,
  LOGIN_FAILED: LogIn,
  PASSWORD_CHANGE: Key,
  TOKEN_REFRESH: RefreshCw,
  CREATE: Plus,
  READ: Eye,
  UPDATE: Edit,
  DELETE: Trash,
  SERVER_CONNECT: Plug,
  SERVER_DISCONNECT: Unplug,
  HEALTH_CHECK: HeartPulse,
  AGENT_VALIDATE: ShieldCheck,
};

const ACTION_COLORS: Record<AuditAction, string> = {
  LOGIN: 'text-blue-600 bg-blue-50',
  LOGOUT: 'text-gray-600 bg-gray-50',
  LOGIN_FAILED: 'text-red-600 bg-red-50',
  PASSWORD_CHANGE: 'text-amber-600 bg-amber-50',
  TOKEN_REFRESH: 'text-cyan-600 bg-cyan-50',
  CREATE: 'text-green-600 bg-green-50',
  READ: 'text-indigo-600 bg-indigo-50',
  UPDATE: 'text-amber-600 bg-amber-50',
  DELETE: 'text-red-600 bg-red-50',
  SERVER_CONNECT: 'text-green-600 bg-green-50',
  SERVER_DISCONNECT: 'text-orange-600 bg-orange-50',
  HEALTH_CHECK: 'text-pink-600 bg-pink-50',
  AGENT_VALIDATE: 'text-purple-600 bg-purple-50',
};

export function AuditLogTable({ logs, loading, onViewDetails }: AuditLogTableProps) {
  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="mt-2 text-sm text-gray-500">Loading audit logs...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">No audit logs found</p>
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Time
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Action
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Resource
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            User
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Status
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Duration
          </th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {logs.map((log) => {
          const ActionIcon = ACTION_ICONS[log.action] || Eye;
          const actionColor = ACTION_COLORS[log.action] || 'text-gray-600 bg-gray-50';

          return (
            <tr key={log.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {new Date(log.timestamp).toLocaleString()}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <span className={cn('p-1.5 rounded', actionColor)}>
                    <ActionIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm font-medium text-gray-900">{log.action}</span>
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm">
                  <span className="font-medium text-gray-900">{log.resource}</span>
                  {log.resourceId && (
                    <span className="text-gray-500 ml-1">
                      ({log.resourceId.slice(0, 8)}...)
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {log.userEmail || log.userId?.slice(0, 8) || 'System'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                  log.status === 'SUCCESS' && 'bg-green-100 text-green-800',
                  log.status === 'FAILURE' && 'bg-red-100 text-red-800',
                  log.status === 'PARTIAL' && 'bg-yellow-100 text-yellow-800',
                )}>
                  {log.status === 'SUCCESS' && <CheckCircle className="h-3 w-3" />}
                  {log.status === 'FAILURE' && <XCircle className="h-3 w-3" />}
                  {log.status === 'PARTIAL' && <AlertCircle className="h-3 w-3" />}
                  {log.status}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {log.duration ? `${log.duration}ms` : '-'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-right">
                <button
                  onClick={() => onViewDetails(log)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="View details"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
