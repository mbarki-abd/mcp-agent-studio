import { useState } from 'react';
import {
  Shield,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
  useAuditLogs,
  useAuditStats,
  useFailedLogins,
  type AuditAction,
  type AuditStatus,
  type AuditLogEntry,
  type AuditQueryParams,
} from '../../../core/api/hooks';
import { AuditStatsCard } from '../components/AuditStatsCard';
import { AuditLogTable } from '../components/AuditLogTable';

const ACTIONS: AuditAction[] = [
  'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'TOKEN_REFRESH',
  'CREATE', 'READ', 'UPDATE', 'DELETE',
  'SERVER_CONNECT', 'SERVER_DISCONNECT', 'HEALTH_CHECK',
  'AGENT_VALIDATE'
];
const STATUSES: AuditStatus[] = ['SUCCESS', 'FAILURE', 'PARTIAL'];
const RESOURCES = ['auth', 'servers', 'agents', 'tasks', 'tools', 'chat', 'audit'];

export default function AuditLogPage() {
  const [filters, setFilters] = useState<AuditQueryParams>({
    limit: 50,
    offset: 0,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const { data: logsData, isLoading: logsLoading, refetch } = useAuditLogs(filters);
  const { data: stats, isLoading: statsLoading } = useAuditStats(24);
  const { data: failedLogins } = useFailedLogins(24, 10);

  const logs = logsData?.logs || [];
  const total = logsData?.total || 0;

  const handleFilterChange = (key: keyof AuditQueryParams, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
      offset: 0, // Reset pagination on filter change
    }));
  };

  const handlePageChange = (newOffset: number) => {
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };

  const currentPage = Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1;
  const totalPages = Math.ceil(total / (filters.limit || 50));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Audit Logs
          </h1>
          <p className="text-gray-500 mt-1">
            Monitor system activity and security events (Admin only)
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AuditStatsCard
          title="Total Events"
          value={stats?.totalLogs || 0}
          icon={Activity}
          loading={statsLoading}
        />
        <AuditStatsCard
          title="Success Rate"
          value={
            stats?.byStatus
              ? `${Math.round((stats.byStatus.SUCCESS / stats.totalLogs) * 100)}%`
              : '0%'
          }
          icon={CheckCircle}
          iconColor="text-green-500"
          loading={statsLoading}
        />
        <AuditStatsCard
          title="Failed Logins"
          value={failedLogins?.length || 0}
          icon={AlertTriangle}
          iconColor="text-amber-500"
          loading={statsLoading}
        />
        <AuditStatsCard
          title="Avg Response"
          value={stats?.avgDuration ? `${Math.round(stats.avgDuration)}ms` : 'N/A'}
          icon={Clock}
          loading={statsLoading}
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          <span className="text-sm text-gray-500">
            Showing {logs.length} of {total} events
          </span>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <select
                value={filters.action || ''}
                onChange={(e) => handleFilterChange('action', e.target.value as AuditAction)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">All Actions</option>
                {ACTIONS.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value as AuditStatus)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">All Statuses</option>
                {STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Resource Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resource
              </label>
              <select
                value={filters.resource || ''}
                onChange={(e) => handleFilterChange('resource', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">All Resources</option>
                {RESOURCES.map(resource => (
                  <option key={resource} value={resource}>{resource}</option>
                ))}
              </select>
            </div>

            {/* User ID Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User ID
              </label>
              <input
                type="text"
                value={filters.userId || ''}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                placeholder="Filter by user ID..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <AuditLogTable
          logs={logs}
          loading={logsLoading}
          onViewDetails={setSelectedLog}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(Math.max(0, (filters.offset || 0) - (filters.limit || 50)))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange((filters.offset || 0) + (filters.limit || 50))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Audit Log Details</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">ID</label>
                  <p className="font-mono text-sm">{selectedLog.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Timestamp</label>
                  <p className="text-sm">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Action</label>
                  <p className="text-sm font-medium">{selectedLog.action}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <span className={cn(
                    'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                    selectedLog.status === 'SUCCESS' && 'bg-green-100 text-green-800',
                    selectedLog.status === 'FAILURE' && 'bg-red-100 text-red-800',
                    selectedLog.status === 'PARTIAL' && 'bg-yellow-100 text-yellow-800',
                  )}>
                    {selectedLog.status}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Resource</label>
                  <p className="text-sm">{selectedLog.resource}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Resource ID</label>
                  <p className="font-mono text-sm">{selectedLog.resourceId || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">User</label>
                  <p className="text-sm">{selectedLog.userEmail || selectedLog.userId || 'System'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">IP Address</label>
                  <p className="font-mono text-sm">{selectedLog.ipAddress || 'N/A'}</p>
                </div>
                {selectedLog.duration && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Duration</label>
                    <p className="text-sm">{selectedLog.duration}ms</p>
                  </div>
                )}
                {selectedLog.errorMessage && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">Error</label>
                    <p className="text-sm text-red-600">{selectedLog.errorMessage}</p>
                  </div>
                )}
              </div>
              {selectedLog.userAgent && (
                <div>
                  <label className="text-sm font-medium text-gray-500">User Agent</label>
                  <p className="text-sm text-gray-600 break-all">{selectedLog.userAgent}</p>
                </div>
              )}
              {(selectedLog.oldValue !== undefined || selectedLog.newValue !== undefined) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Changes</label>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLog.oldValue !== undefined && selectedLog.oldValue !== null && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Before</p>
                        <pre className="bg-red-50 p-2 rounded text-xs overflow-auto max-h-40">
                          {String(JSON.stringify(selectedLog.oldValue, null, 2))}
                        </pre>
                      </div>
                    )}
                    {selectedLog.newValue !== undefined && selectedLog.newValue !== null && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">After</p>
                        <pre className="bg-green-50 p-2 rounded text-xs overflow-auto max-h-40">
                          {String(JSON.stringify(selectedLog.newValue, null, 2))}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Metadata</label>
                  <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-40">
                    {String(JSON.stringify(selectedLog.metadata, null, 2))}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
