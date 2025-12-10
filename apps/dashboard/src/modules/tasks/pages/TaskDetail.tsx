import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ListTodo,
  Play,
  XCircle,
  Edit,
  Trash2,
  Clock,
  Calendar,
  Bot,
  RefreshCw,
  AlertCircle,
  Settings,
  History,
  Terminal,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { TaskStatusBadge } from '../components/TaskStatusBadge';
import {
  useTask,
  useTaskExecutions,
  useDeleteTask,
  useRunTask,
  useCancelTask,
  useAgent,
} from '../../../core/api';
import { Can } from '../../../core/auth';
import { cn } from '../../../lib/utils';
import type { Priority, ExecutionStatus } from '@mcp/types';

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  LOW: { label: 'Low', className: 'bg-gray-100 text-gray-700' },
  MEDIUM: { label: 'Medium', className: 'bg-blue-100 text-blue-700' },
  HIGH: { label: 'High', className: 'bg-orange-100 text-orange-700' },
  URGENT: { label: 'Urgent', className: 'bg-red-100 text-red-700' },
};

const executionStatusConfig: Record<ExecutionStatus, { label: string; className: string }> = {
  QUEUED: { label: 'Queued', className: 'bg-gray-100 text-gray-700' },
  RUNNING: { label: 'Running', className: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  FAILED: { label: 'Failed', className: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Cancelled', className: 'bg-yellow-100 text-yellow-700' },
  TIMEOUT: { label: 'Timeout', className: 'bg-orange-100 text-orange-700' },
};

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: task, isLoading, error, refetch } = useTask(id || '');
  const { data: executions = [] } = useTaskExecutions(id || '');
  const deleteTask = useDeleteTask();
  const runTask = useRunTask();
  const cancelTask = useCancelTask();

  // Get assigned agent info
  const { data: agent } = useAgent(task?.agentId || '', {
    enabled: !!task?.agentId,
  });

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await deleteTask.mutateAsync(id!);
      navigate('/tasks');
    }
  };

  const handleRun = async () => {
    await runTask.mutateAsync(id!);
    refetch();
  };

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this task?')) {
      await cancelTask.mutateAsync(id!);
      refetch();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-muted animate-pulse rounded-lg" />
            <div className="h-48 bg-muted animate-pulse rounded-lg" />
          </div>
          <div className="h-96 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium">Task not found</h3>
        <p className="text-muted-foreground mt-1">
          {error?.message || 'The task you are looking for does not exist'}
        </p>
        <Button onClick={() => navigate('/tasks')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tasks
        </Button>
      </div>
    );
  }

  const canRun = ['DRAFT', 'PENDING', 'SCHEDULED', 'FAILED'].includes(task.status);
  const canCancel = ['QUEUED', 'RUNNING'].includes(task.status);
  const priority = priorityConfig[task.priority];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tasks')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="p-3 rounded-xl bg-muted">
            <ListTodo className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{task.title}</h1>
              <TaskStatusBadge status={task.status} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn('px-2 py-0.5 rounded text-xs font-medium', priority.className)}>
                {priority.label}
              </span>
              <span className="text-sm text-muted-foreground">
                {task.executionMode.toLowerCase()} execution
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>

          {canRun && (
            <Can I="execute" a="Task">
              <Button onClick={handleRun}>
                <Play className="h-4 w-4 mr-2" />
                Run Now
              </Button>
            </Can>
          )}

          {canCancel && (
            <Can I="update" a="Task">
              <Button variant="destructive" onClick={handleCancel}>
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </Can>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Can I="update" a="Task">
                <DropdownMenuItem onClick={() => navigate(`/tasks/${id}/edit`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              </Can>
              <DropdownMenuSeparator />
              <Can I="delete" a="Task">
                <DropdownMenuItem className="text-red-600" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </Can>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info Card */}
          <div className="border rounded-lg p-6 space-y-6">
            <h2 className="font-semibold text-lg">Task Information</h2>

            {task.description && (
              <p className="text-muted-foreground">{task.description}</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Priority</p>
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium', priority.className)}>
                  {priority.label}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Assignment Mode</p>
                <p className="font-medium capitalize">
                  {task.assignmentMode.toLowerCase().replace('_', ' ')}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Run Count</p>
                <p className="font-medium">{task.runCount}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Max Retries</p>
                <p className="font-medium">{task.maxRetries}</p>
              </div>
            </div>

            {/* Required Capabilities */}
            {task.requiredCapabilities?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Required Capabilities</p>
                <div className="flex flex-wrap gap-2">
                  {task.requiredCapabilities.map((cap) => (
                    <span
                      key={cap}
                      className="px-2.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="pt-4 border-t grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
              </div>
              {task.lastRunAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <History className="h-4 w-4" />
                  <span>Last run {new Date(task.lastRunAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Prompt Card */}
          <div className="border rounded-lg p-6 space-y-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Prompt
            </h2>
            <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto whitespace-pre-wrap font-mono">
              {task.prompt}
            </pre>
            {Object.keys(task.promptVariables || {}).length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Variables</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(task.promptVariables).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      <code className="px-1.5 py-0.5 bg-muted rounded text-xs">{key}</code>
                      <span className="text-muted-foreground">=</span>
                      <span className="truncate">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Execution History */}
          <div className="border rounded-lg p-6 space-y-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Execution History
            </h2>

            {executions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No executions yet</p>
            ) : (
              <div className="space-y-3">
                {executions.slice(0, 10).map((exec) => {
                  const status = executionStatusConfig[exec.status];
                  return (
                    <div
                      key={exec.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn('px-2 py-0.5 rounded text-xs', status.className)}>
                          {status.label}
                        </span>
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(exec.startedAt).toLocaleString()}
                          </p>
                          {exec.durationMs && (
                            <p className="text-xs text-muted-foreground">
                              Duration: {(exec.durationMs / 1000).toFixed(2)}s
                            </p>
                          )}
                        </div>
                      </div>
                      {exec.tokensUsed && (
                        <span className="text-xs text-muted-foreground">
                          {exec.tokensUsed} tokens
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Schedule Info */}
          <div className="border rounded-lg p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </h3>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Execution Mode</p>
                <p className="font-medium capitalize">{task.executionMode.toLowerCase()}</p>
              </div>

              {task.scheduledAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Scheduled For</p>
                  <p className="font-medium">
                    {new Date(task.scheduledAt).toLocaleString()}
                  </p>
                </div>
              )}

              {task.cronExpression && (
                <div>
                  <p className="text-sm text-muted-foreground">Cron Expression</p>
                  <code className="px-2 py-1 bg-muted rounded text-xs">
                    {task.cronExpression}
                  </code>
                </div>
              )}

              {task.nextRunAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Next Run</p>
                  <p className="font-medium">
                    {new Date(task.nextRunAt).toLocaleString()}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground">Timezone</p>
                <p className="font-medium">{task.timezone}</p>
              </div>
            </div>
          </div>

          {/* Assigned Agent */}
          <div className="border rounded-lg p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Assigned Agent
            </h3>

            {agent ? (
              <Link
                to={`/agents/${agent.id}`}
                className="block p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                <p className="font-medium">{agent.displayName}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {agent.role.toLowerCase()} - {agent.status.toLowerCase()}
                </p>
              </Link>
            ) : task.assignmentMode === 'AUTO' ? (
              <p className="text-sm text-muted-foreground">
                Agent will be auto-assigned based on availability
              </p>
            ) : task.assignmentMode === 'BY_CAPABILITY' ? (
              <p className="text-sm text-muted-foreground">
                Agent will be assigned based on required capabilities
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No agent assigned</p>
            )}
          </div>

          {/* Retry Settings */}
          <div className="border rounded-lg p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry Settings
            </h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Retries</span>
                <span className="font-medium">{task.maxRetries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Retry Delay</span>
                <span className="font-medium">{task.retryDelay}s</span>
              </div>
              {task.timeout && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timeout</span>
                  <span className="font-medium">{task.timeout}s</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
