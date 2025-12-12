import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ListTodo, RefreshCw, AlertCircle, Filter, CheckSquare, Square, X, Play, Trash2, XCircle, RotateCcw } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { TaskCard } from '../components/TaskCard';
import {
  useTasks,
  useDeleteTask,
  useRunTask,
  useCancelTask,
  useBulkCancelTasks,
  useBulkDeleteTasks,
  useBulkExecuteTasks,
  useBulkRetryTasks,
} from '../../../core/api';
import { useTasksStore } from '../stores/tasks.store';
import { Can } from '../../../core/auth';
import { cn } from '../../../lib/utils';
import type { TaskStatus } from '@mcp/types';

const statusFilters: Array<{ value: TaskStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Status' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'QUEUED', label: 'Queued' },
  { value: 'RUNNING', label: 'Running' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
];

export default function TasksList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, isLoading, error, refetch } = useTasks({
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
  });
  const deleteTask = useDeleteTask();
  const runTask = useRunTask();
  const cancelTask = useCancelTask();

  // Bulk operations
  const bulkCancel = useBulkCancelTasks();
  const bulkDelete = useBulkDeleteTasks();
  const bulkExecute = useBulkExecuteTasks();
  const bulkRetry = useBulkRetryTasks();

  const { selectedTaskId, setSelectedTask } = useTasksStore();

  const tasks = data?.items || [];

  const filteredTasks = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  // Check if any bulk operation is loading
  const isBulkLoading = bulkCancel.isPending || bulkDelete.isPending || bulkExecute.isPending || bulkRetry.isPending;

  // Get counts for selected tasks by status
  const selectedTasksStats = useMemo(() => {
    const selectedTasks = tasks.filter((t) => selectedIds.has(t.id));
    return {
      total: selectedTasks.length,
      canExecute: selectedTasks.filter((t) => ['DRAFT', 'PENDING', 'SCHEDULED'].includes(t.status)).length,
      canCancel: selectedTasks.filter((t) => ['RUNNING', 'QUEUED', 'PENDING'].includes(t.status)).length,
      canRetry: selectedTasks.filter((t) => t.status === 'FAILED').length,
      canDelete: selectedTasks.length,
    };
  }, [selectedIds, tasks]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await deleteTask.mutateAsync(id);
    }
  };

  const handleRun = async (id: string) => {
    await runTask.mutateAsync(id);
  };

  const handleCancel = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this task?')) {
      await cancelTask.mutateAsync(id);
    }
  };

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredTasks.map((t) => t.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Bulk action handlers
  const handleBulkExecute = async () => {
    const executableTasks = tasks.filter(
      (t) => selectedIds.has(t.id) && ['DRAFT', 'PENDING', 'SCHEDULED'].includes(t.status)
    );
    if (executableTasks.length === 0) {
      alert('No tasks can be executed. Tasks must be in DRAFT, PENDING, or SCHEDULED status.');
      return;
    }
    await bulkExecute.mutateAsync(executableTasks.map((t) => t.id));
    clearSelection();
  };

  const handleBulkCancel = async () => {
    const cancellableTasks = tasks.filter(
      (t) => selectedIds.has(t.id) && ['RUNNING', 'QUEUED', 'PENDING'].includes(t.status)
    );
    if (cancellableTasks.length === 0) {
      alert('No tasks can be cancelled. Tasks must be in RUNNING, QUEUED, or PENDING status.');
      return;
    }
    if (window.confirm(`Cancel ${cancellableTasks.length} task(s)?`)) {
      await bulkCancel.mutateAsync(cancellableTasks.map((t) => t.id));
      clearSelection();
    }
  };

  const handleBulkRetry = async () => {
    const failedTasks = tasks.filter((t) => selectedIds.has(t.id) && t.status === 'FAILED');
    if (failedTasks.length === 0) {
      alert('No failed tasks to retry.');
      return;
    }
    await bulkRetry.mutateAsync(failedTasks.map((t) => t.id));
    clearSelection();
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (window.confirm(`Delete ${ids.length} task(s)? This cannot be undone.`)) {
      await bulkDelete.mutateAsync(ids);
      clearSelection();
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium">Failed to load tasks</h3>
        <p className="text-muted-foreground mt-1">{error.message}</p>
        <Button onClick={() => refetch()} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">
            Manage and schedule agent tasks
          </p>
        </div>
        <Can I="create" a="Task">
          <Button onClick={() => navigate('/tasks/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        </Can>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-muted/50 border rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedIds.size} selected
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            {selectedTasksStats.canExecute > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkExecute}
                disabled={isBulkLoading}
              >
                <Play className="h-4 w-4 mr-1" />
                Execute ({selectedTasksStats.canExecute})
              </Button>
            )}
            {selectedTasksStats.canCancel > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkCancel}
                disabled={isBulkLoading}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancel ({selectedTasksStats.canCancel})
              </Button>
            )}
            {selectedTasksStats.canRetry > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkRetry}
                disabled={isBulkLoading}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Retry ({selectedTasksStats.canRetry})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-600"
              onClick={handleBulkDelete}
              disabled={isBulkLoading}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete ({selectedTasksStats.total})
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              {statusFilters.find((f) => f.value === statusFilter)?.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {statusFilters.map((filter) => (
              <DropdownMenuItem
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>

        {/* Select All / Clear */}
        {filteredTasks.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={selectedIds.size === filteredTasks.length ? clearSelection : selectAll}
          >
            {selectedIds.size === filteredTasks.length ? (
              <>
                <Square className="h-4 w-4 mr-2" />
                Clear All
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4 mr-2" />
                Select All
              </>
            )}
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-52 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed rounded-lg">
          <ListTodo className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No tasks found</h3>
          <p className="text-muted-foreground mt-1">
            {search || statusFilter !== 'ALL'
              ? 'Try adjusting your filters'
              : 'Create your first task to get started'}
          </p>
          {!search && statusFilter === 'ALL' && (
            <Can I="create" a="Task">
              <Button onClick={() => navigate('/tasks/new')} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </Can>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => (
            <div key={task.id} className="relative">
              {/* Selection checkbox */}
              <button
                type="button"
                className={cn(
                  'absolute top-3 left-3 z-10 p-1 rounded transition-colors',
                  selectedIds.has(task.id)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/80 hover:bg-muted text-muted-foreground'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(task.id);
                }}
              >
                {selectedIds.has(task.id) ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>

              <TaskCard
                task={task}
                isSelected={selectedTaskId === task.id}
                onSelect={() => setSelectedTask(task.id)}
                onEdit={() => navigate(`/tasks/${task.id}/edit`)}
                onDelete={() => handleDelete(task.id)}
                onRun={() => handleRun(task.id)}
                onCancel={() => handleCancel(task.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
