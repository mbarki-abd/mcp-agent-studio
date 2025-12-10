import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ListTodo, RefreshCw, AlertCircle, Filter } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { TaskCard } from '../components/TaskCard';
import { useTasks, useDeleteTask, useRunTask, useCancelTask } from '../../../core/api';
import { useTasksStore } from '../stores/tasks.store';
import { Can } from '../../../core/auth';
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

  const { data, isLoading, error, refetch } = useTasks({
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
  });
  const deleteTask = useDeleteTask();
  const runTask = useRunTask();
  const cancelTask = useCancelTask();

  const { selectedTaskId, setSelectedTask } = useTasksStore();

  const tasks = data?.items || [];

  const filteredTasks = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

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
            <TaskCard
              key={task.id}
              task={task}
              isSelected={selectedTaskId === task.id}
              onSelect={() => setSelectedTask(task.id)}
              onEdit={() => navigate(`/tasks/${task.id}/edit`)}
              onDelete={() => handleDelete(task.id)}
              onRun={() => handleRun(task.id)}
              onCancel={() => handleCancel(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
