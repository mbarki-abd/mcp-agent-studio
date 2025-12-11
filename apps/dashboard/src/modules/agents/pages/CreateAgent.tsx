import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Users,
  Server,
  Settings,
  Check,
  Loader2,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  useCreateAgent,
  useUpdateAgent,
  useAgent,
  useServers,
  useAgents,
} from '../../../core/api';
import { cn } from '../../../lib/utils';
import type { AgentRole } from '@mcp/types';

const agentSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers and hyphens'),
  displayName: z.string().min(1, 'Display name is required').max(100),
  description: z.string().max(500).optional(),
  role: z.enum(['MASTER', 'SUPERVISOR', 'WORKER']),
  serverId: z.string().min(1, 'Server is required'),
  supervisorId: z.string().optional(),
  unixUser: z.string().optional(),
  homeDir: z.string().optional(),
  capabilities: z.array(z.string()),
});

type AgentFormData = z.infer<typeof agentSchema>;

const steps = [
  { id: 'info', title: 'Basic Info', icon: Bot },
  { id: 'server', title: 'Server & Hierarchy', icon: Server },
  { id: 'capabilities', title: 'Capabilities', icon: Settings },
  { id: 'review', title: 'Review', icon: Check },
];

const roles: Array<{ value: AgentRole; label: string; description: string; icon: typeof Bot }> = [
  {
    value: 'MASTER',
    label: 'Master',
    description: 'Top-level orchestrator, can manage all agents',
    icon: Users,
  },
  {
    value: 'SUPERVISOR',
    label: 'Supervisor',
    description: 'Manages worker agents, reports to master',
    icon: Users,
  },
  {
    value: 'WORKER',
    label: 'Worker',
    description: 'Executes tasks, reports to supervisor',
    icon: Bot,
  },
];

const defaultCapabilities = [
  'code-review',
  'testing',
  'deployment',
  'documentation',
  'debugging',
  'refactoring',
  'security-audit',
  'performance-optimization',
  'database-management',
  'api-integration',
];

export default function CreateAgent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [currentStep, setCurrentStep] = useState(0);

  const { data: existingAgent, isLoading: isLoadingAgent } = useAgent(id || '', {
    enabled: isEditing,
  });
  const { data: serversData } = useServers();
  const servers = serversData?.items || [];

  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    trigger,
  } = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      role: 'WORKER',
      capabilities: [],
    },
  });

  const selectedServerId = watch('serverId');
  const selectedRole = watch('role');
  const formValues = watch();

  // Load supervisors for selected server
  const { data: agentsData } = useAgents({
    serverId: selectedServerId,
  });
  const potentialSupervisors =
    agentsData?.items?.filter(
      (a) =>
        a.id !== id &&
        (a.role === 'MASTER' || a.role === 'SUPERVISOR') &&
        a.status === 'ACTIVE'
    ) || [];

  // Populate form when editing
  useEffect(() => {
    if (existingAgent) {
      setValue('name', existingAgent.name);
      setValue('displayName', existingAgent.displayName);
      setValue('description', existingAgent.description || '');
      setValue('role', existingAgent.role);
      setValue('serverId', existingAgent.serverId);
      setValue('supervisorId', existingAgent.supervisorId || '');
      setValue('unixUser', existingAgent.unixUser || '');
      setValue('homeDir', existingAgent.homeDir || '');
      setValue('capabilities', (existingAgent.capabilities as string[]) || []);
    }
  }, [existingAgent, setValue]);

  const onSubmit = async (data: AgentFormData) => {
    try {
      if (isEditing) {
        await updateAgent.mutateAsync({
          id,
          data: {
            ...data,
            supervisorId: data.supervisorId || undefined,
          },
        });
      } else {
        await createAgent.mutateAsync({
          ...data,
          supervisorId: data.supervisorId || undefined,
        });
      }
      navigate('/agents');
    } catch (error) {
      console.error('Failed to save agent:', error);
    }
  };

  const nextStep = async () => {
    const fieldsToValidate: Record<number, (keyof AgentFormData)[]> = {
      0: ['name', 'displayName', 'role'],
      1: ['serverId'],
      2: [],
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

  if (isEditing && isLoadingAgent) {
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
        <Button variant="ghost" size="icon" onClick={() => navigate('/agents')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? 'Edit Agent' : 'Create Agent'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing
              ? 'Update agent configuration'
              : 'Configure a new AI agent for your server'}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name *</Label>
                <Input
                  id="name"
                  placeholder="my-agent"
                  {...register('name')}
                  disabled={isEditing}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Unique identifier (lowercase, hyphens only)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  placeholder="My Agent"
                  {...register('displayName')}
                />
                {errors.displayName && (
                  <p className="text-sm text-red-500">{errors.displayName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="w-full min-h-[80px] px-3 py-2 rounded-md border bg-background text-sm resize-none"
                placeholder="What does this agent do?"
                {...register('description')}
              />
            </div>

            <div className="space-y-3">
              <Label>Role *</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {roles.map((role) => {
                      const RoleIcon = role.icon;
                      return (
                        <button
                          key={role.value}
                          type="button"
                          onClick={() => field.onChange(role.value)}
                          className={cn(
                            'p-4 rounded-lg border text-left transition-all',
                            field.value === role.value
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'hover:border-primary/50'
                          )}
                        >
                          <RoleIcon className="h-5 w-5 mb-2" />
                          <p className="font-medium">{role.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {role.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            </div>
          </div>
        )}

        {/* Step 2: Server & Hierarchy */}
        {currentStep === 1 && (
          <div className="space-y-6 p-6 border rounded-lg">
            <h2 className="font-semibold text-lg">Server & Hierarchy</h2>

            <div className="space-y-2">
              <Label htmlFor="serverId">Server *</Label>
              <Controller
                name="serverId"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-3 py-2 rounded-md border bg-background"
                  >
                    <option value="">Select a server</option>
                    {servers.map((server) => (
                      <option key={server.id} value={server.id}>
                        {server.name}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.serverId && (
                <p className="text-sm text-red-500">{errors.serverId.message}</p>
              )}
            </div>

            {selectedRole !== 'MASTER' && (
              <div className="space-y-2">
                <Label htmlFor="supervisorId">Supervisor</Label>
                <Controller
                  name="supervisorId"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full px-3 py-2 rounded-md border bg-background"
                      disabled={!selectedServerId}
                    >
                      <option value="">No supervisor (auto-assign)</option>
                      {potentialSupervisors.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.displayName} ({agent.role.toLowerCase()})
                        </option>
                      ))}
                    </select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  {selectedRole === 'WORKER'
                    ? 'Worker agents report to a supervisor or master'
                    : 'Supervisors report to the master agent'}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unixUser">Unix User</Label>
                <Input
                  id="unixUser"
                  placeholder="agent-user"
                  {...register('unixUser')}
                />
                <p className="text-xs text-muted-foreground">
                  System user for agent execution
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="homeDir">Home Directory</Label>
                <Input
                  id="homeDir"
                  placeholder="/home/agent"
                  {...register('homeDir')}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Capabilities */}
        {currentStep === 2 && (
          <div className="space-y-6 p-6 border rounded-lg">
            <h2 className="font-semibold text-lg">Capabilities</h2>
            <p className="text-sm text-muted-foreground">
              Select the capabilities this agent should have. This helps with
              automatic task assignment.
            </p>

            <Controller
              name="capabilities"
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

            <div className="space-y-2">
              <Label>Custom Capabilities</Label>
              <div className="flex gap-2">
                <Input
                  id="customCapability"
                  placeholder="Add custom capability"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      const value = input.value.trim().toLowerCase();
                      if (value && !formValues.capabilities.includes(value)) {
                        setValue('capabilities', [...formValues.capabilities, value]);
                        input.value = '';
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const input = document.getElementById(
                      'customCapability'
                    ) as HTMLInputElement;
                    const value = input.value.trim().toLowerCase();
                    if (value && !formValues.capabilities.includes(value)) {
                      setValue('capabilities', [...formValues.capabilities, value]);
                      input.value = '';
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 3 && (
          <div className="space-y-6 p-6 border rounded-lg">
            <h2 className="font-semibold text-lg">Review Configuration</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{formValues.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    ({formValues.name})
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="font-medium capitalize">
                    {formValues.role?.toLowerCase()}
                  </p>
                </div>

                {formValues.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm">{formValues.description}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Server</p>
                  <p className="font-medium">
                    {servers.find((s) => s.id === formValues.serverId)?.name ||
                      '-'}
                  </p>
                </div>

                {formValues.supervisorId && (
                  <div>
                    <p className="text-sm text-muted-foreground">Supervisor</p>
                    <p className="font-medium">
                      {potentialSupervisors.find(
                        (a) => a.id === formValues.supervisorId
                      )?.displayName || '-'}
                    </p>
                  </div>
                )}

                {formValues.unixUser && (
                  <div>
                    <p className="text-sm text-muted-foreground">Unix User</p>
                    <p className="font-mono text-sm">{formValues.unixUser}</p>
                  </div>
                )}
              </div>
            </div>

            {formValues.capabilities.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Capabilities
                </p>
                <div className="flex flex-wrap gap-2">
                  {formValues.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 0 ? () => navigate('/agents') : prevStep}
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
              {isEditing ? 'Update Agent' : 'Create Agent'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
