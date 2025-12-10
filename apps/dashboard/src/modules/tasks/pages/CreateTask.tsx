import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  ListTodo,
  Calendar,
  Bot,
  Terminal,
  Check,
  Loader2,
  Zap,
  Repeat,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  useCreateTask,
  useUpdateTask,
  useTask,
  useAgents,
} from '../../../core/api';
import { cn } from '../../../lib/utils';
import type { Priority, ExecutionMode, AssignmentMode, RecurrenceFreq } from '@mcp/types';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  executionMode: z.enum(['IMMEDIATE', 'SCHEDULED', 'RECURRING']),
  scheduledAt: z.string().optional(),
  recurrenceFrequency: z.enum(['MINUTELY', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM']).optional(),
  cronExpression: z.string().optional(),
  assignmentMode: z.enum(['MANUAL', 'AUTO', 'BY_CAPABILITY']),
  agentId: z.string().optional(),
  requiredCapabilities: z.array(z.string()),
  prompt: z.string().min(1, 'Prompt is required'),
  promptVariables: z.record(z.string()),
  timeout: z.number().min(0).optional(),
  maxRetries: z.number().min(0).max(10),
  retryDelay: z.number().min(0),
  timezone: z.string(),
});

type TaskFormData = z.infer<typeof taskSchema>;

const steps = [
  { id: 'info', title: 'Basic Info', icon: ListTodo },
  { id: 'schedule', title: 'Schedule', icon: Calendar },
  { id: 'agent', title: 'Agent', icon: Bot },
  { id: 'prompt', title: 'Prompt', icon: Terminal },
];

const priorities: Array<{ value: Priority; label: string; className: string }> = [
  { value: 'LOW', label: 'Low', className: 'border-gray-300 hover:border-gray-400' },
  { value: 'MEDIUM', label: 'Medium', className: 'border-blue-300 hover:border-blue-400' },
  { value: 'HIGH', label: 'High', className: 'border-orange-300 hover:border-orange-400' },
  { value: 'URGENT', label: 'Urgent', className: 'border-red-300 hover:border-red-400' },
];

const executionModes: Array<{ value: ExecutionMode; label: string; description: string; icon: typeof Zap }> = [
  { value: 'IMMEDIATE', label: 'Immediate', description: 'Run as soon as possible', icon: Zap },
  { value: 'SCHEDULED', label: 'Scheduled', description: 'Run at a specific time', icon: Calendar },
  { value: 'RECURRING', label: 'Recurring', description: 'Run on a schedule', icon: Repeat },
];

const assignmentModes: Array<{ value: AssignmentMode; label: string; description: string }> = [
  { value: 'MANUAL', label: 'Manual', description: 'Select a specific agent' },
  { value: 'AUTO', label: 'Automatic', description: 'Auto-assign based on availability' },
  { value: 'BY_CAPABILITY', label: 'By Capability', description: 'Assign based on required capabilities' },
];

const recurrenceOptions: Array<{ value: RecurrenceFreq; label: string; example: string }> = [
  { value: 'MINUTELY', label: 'Every Minute', example: '* * * * *' },
  { value: 'HOURLY', label: 'Hourly', example: '0 * * * *' },
  { value: 'DAILY', label: 'Daily', example: '0 0 * * *' },
  { value: 'WEEKLY', label: 'Weekly', example: '0 0 * * 0' },
  { value: 'MONTHLY', label: 'Monthly', example: '0 0 1 * *' },
  { value: 'CUSTOM', label: 'Custom Cron', example: '' },
];

const defaultCapabilities = [
  'code-review',
  'testing',
  'deployment',
  'documentation',
  'debugging',
  'refactoring',
];

export default function CreateTask() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [currentStep, setCurrentStep] = useState(0);

  const { data: existingTask, isLoading: isLoadingTask } = useTask(id || '', {
    enabled: isEditing,
  });

  const { data: agentsData } = useAgents({ status: 'ACTIVE' });
  const agents = agentsData?.items || [];

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    trigger,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      priority: 'MEDIUM',
      executionMode: 'IMMEDIATE',
      assignmentMode: 'AUTO',
      requiredCapabilities: [],
      promptVariables: {},
      maxRetries: 3,
      retryDelay: 60,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  const executionMode = watch('executionMode');
  const assignmentMode = watch('assignmentMode');
  const recurrenceFrequency = watch('recurrenceFrequency');
  const formValues = watch();

  // Populate form when editing
  useEffect(() => {
    if (existingTask) {
      setValue('title', existingTask.title);
      setValue('description', existingTask.description || '');
      setValue('priority', existingTask.priority);
      setValue('executionMode', existingTask.executionMode);
      setValue('scheduledAt', existingTask.scheduledAt ? new Date(existingTask.scheduledAt).toISOString().slice(0, 16) : '');
      setValue('recurrenceFrequency', existingTask.recurrenceFrequency);
      setValue('cronExpression', existingTask.cronExpression || '');
      setValue('assignmentMode', existingTask.assignmentMode);
      setValue('agentId', existingTask.agentId || '');
      setValue('requiredCapabilities', existingTask.requiredCapabilities || []);
      setValue('prompt', existingTask.prompt);
      setValue('promptVariables', existingTask.promptVariables || {});
      setValue('timeout', existingTask.timeout);
      setValue('maxRetries', existingTask.maxRetries);
      setValue('retryDelay', existingTask.retryDelay);
      setValue('timezone', existingTask.timezone);
    }
  }, [existingTask, setValue]);

  const onSubmit = async (data: TaskFormData) => {
    try {
      const taskData = {
        ...data,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        agentId: data.agentId || undefined,
      };

      if (isEditing) {
        await updateTask.mutateAsync({ id, data: taskData });
      } else {
        await createTask.mutateAsync(taskData);
      }
      navigate('/tasks');
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  };

  const nextStep = async () => {
    const fieldsToValidate: Record<number, (keyof TaskFormData)[]> = {
      0: ['title', 'priority'],
      1: ['executionMode'],
      2: ['assignmentMode'],
    };

    const isValid = await trigger(fieldsToValidate[currentStep] || []);
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (isEditing && isLoadingTask) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/tasks')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? 'Edit Task' : 'Create Task'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update task configuration' : 'Configure a new task for execution'}
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <div key={step.id} className="flex items-center">
              <button
                type="button"
                onClick={() => index < currentStep && setCurrentStep(index)}
                disabled={index > currentStep}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                  isActive && 'bg-primary text-primary-foreground',
                  isCompleted && 'bg-primary/10 text-primary cursor-pointer',
                  !isActive && !isCompleted && 'text-muted-foreground'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    isActive && 'bg-primary-foreground/20',
                    isCompleted && 'bg-primary/20'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <StepIcon className="h-4 w-4" />
                  )}
                </div>
                <span className="hidden sm:inline text-sm font-medium">
                  {step.title}
                </span>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-8 md:w-16 h-0.5 mx-2',
                    index < currentStep ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Basic Info */}
        {currentStep === 0 && (
          <div className="space-y-6 p-6 border rounded-lg">
            <h2 className="font-semibold text-lg">Basic Information</h2>

            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                placeholder="Enter task title"
                {...register('title')}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="w-full min-h-[80px] px-3 py-2 rounded-md border bg-background text-sm resize-none"
                placeholder="What does this task do?"
                {...register('description')}
              />
            </div>

            <div className="space-y-3">
              <Label>Priority *</Label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {priorities.map((priority) => (
                      <button
                        key={priority.value}
                        type="button"
                        onClick={() => field.onChange(priority.value)}
                        className={cn(
                          'p-3 rounded-lg border-2 text-center transition-all',
                          field.value === priority.value
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : priority.className
                        )}
                      >
                        <p className="font-medium">{priority.label}</p>
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>
          </div>
        )}

        {/* Step 2: Schedule */}
        {currentStep === 1 && (
          <div className="space-y-6 p-6 border rounded-lg">
            <h2 className="font-semibold text-lg">Schedule</h2>

            <div className="space-y-3">
              <Label>Execution Mode *</Label>
              <Controller
                name="executionMode"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {executionModes.map((mode) => {
                      const ModeIcon = mode.icon;
                      return (
                        <button
                          key={mode.value}
                          type="button"
                          onClick={() => field.onChange(mode.value)}
                          className={cn(
                            'p-4 rounded-lg border text-left transition-all',
                            field.value === mode.value
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'hover:border-primary/50'
                          )}
                        >
                          <ModeIcon className="h-5 w-5 mb-2" />
                          <p className="font-medium">{mode.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {mode.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            </div>

            {executionMode === 'SCHEDULED' && (
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">Scheduled Date & Time</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  {...register('scheduledAt')}
                />
              </div>
            )}

            {executionMode === 'RECURRING' && (
              <>
                <div className="space-y-3">
                  <Label>Recurrence Frequency</Label>
                  <Controller
                    name="recurrenceFrequency"
                    control={control}
                    render={({ field }) => (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {recurrenceOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              field.onChange(option.value);
                              if (option.value !== 'CUSTOM' && option.example) {
                                setValue('cronExpression', option.example);
                              }
                            }}
                            className={cn(
                              'p-3 rounded-lg border text-left transition-all',
                              field.value === option.value
                                ? 'border-primary bg-primary/5'
                                : 'hover:border-primary/50'
                            )}
                          >
                            <p className="font-medium text-sm">{option.label}</p>
                            {option.example && (
                              <code className="text-xs text-muted-foreground">
                                {option.example}
                              </code>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  />
                </div>

                {recurrenceFrequency === 'CUSTOM' && (
                  <div className="space-y-2">
                    <Label htmlFor="cronExpression">Cron Expression</Label>
                    <Input
                      id="cronExpression"
                      placeholder="*/15 * * * *"
                      {...register('cronExpression')}
                    />
                    <p className="text-xs text-muted-foreground">
                      Format: minute hour day month weekday
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                {...register('timezone')}
              />
            </div>
          </div>
        )}

        {/* Step 3: Agent */}
        {currentStep === 2 && (
          <div className="space-y-6 p-6 border rounded-lg">
            <h2 className="font-semibold text-lg">Agent Assignment</h2>

            <div className="space-y-3">
              <Label>Assignment Mode *</Label>
              <Controller
                name="assignmentMode"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {assignmentModes.map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => field.onChange(mode.value)}
                        className={cn(
                          'p-4 rounded-lg border text-left transition-all',
                          field.value === mode.value
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'hover:border-primary/50'
                        )}
                      >
                        <p className="font-medium">{mode.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {mode.description}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {assignmentMode === 'MANUAL' && (
              <div className="space-y-2">
                <Label>Select Agent</Label>
                <Controller
                  name="agentId"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full px-3 py-2 rounded-md border bg-background"
                    >
                      <option value="">Select an agent</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.displayName} ({agent.role.toLowerCase()})
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>
            )}

            {assignmentMode === 'BY_CAPABILITY' && (
              <div className="space-y-3">
                <Label>Required Capabilities</Label>
                <Controller
                  name="requiredCapabilities"
                  control={control}
                  render={({ field }) => (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {defaultCapabilities.map((cap) => {
                        const isSelected = field.value.includes(cap);
                        return (
                          <button
                            key={cap}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                field.onChange(field.value.filter((c) => c !== cap));
                              } else {
                                field.onChange([...field.value, cap]);
                              }
                            }}
                            className={cn(
                              'px-3 py-2 rounded-lg border text-sm text-left transition-all',
                              isSelected
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'hover:border-primary/50'
                            )}
                          >
                            <span className="mr-2">{isSelected ? '✓' : '○'}</span>
                            {cap}
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxRetries">Max Retries</Label>
                <Input
                  id="maxRetries"
                  type="number"
                  min={0}
                  max={10}
                  {...register('maxRetries', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="retryDelay">Retry Delay (seconds)</Label>
                <Input
                  id="retryDelay"
                  type="number"
                  min={0}
                  {...register('retryDelay', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (seconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  min={0}
                  placeholder="No timeout"
                  {...register('timeout', { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Prompt */}
        {currentStep === 3 && (
          <div className="space-y-6 p-6 border rounded-lg">
            <h2 className="font-semibold text-lg">Prompt</h2>

            <div className="space-y-2">
              <Label htmlFor="prompt">Task Prompt *</Label>
              <textarea
                id="prompt"
                className="w-full min-h-[200px] px-3 py-2 rounded-md border bg-background text-sm font-mono resize-none"
                placeholder="Enter the prompt for the agent..."
                {...register('prompt')}
              />
              {errors.prompt && (
                <p className="text-sm text-red-500">{errors.prompt.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Use {'{{variable}}'} syntax for dynamic values
              </p>
            </div>

            {/* Review Summary */}
            <div className="p-4 bg-muted rounded-lg space-y-4">
              <h3 className="font-medium">Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Title</p>
                  <p className="font-medium">{formValues.title || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Priority</p>
                  <p className="font-medium">{formValues.priority}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Execution</p>
                  <p className="font-medium capitalize">{formValues.executionMode?.toLowerCase()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Assignment</p>
                  <p className="font-medium capitalize">
                    {formValues.assignmentMode?.toLowerCase().replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 0 ? () => navigate('/tasks') : prevStep}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentStep === 0 ? 'Cancel' : 'Previous'}
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button type="button" onClick={nextStep}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Task' : 'Create Task'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
