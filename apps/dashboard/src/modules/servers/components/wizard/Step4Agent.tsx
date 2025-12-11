import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bot, Sparkles, Code, FolderOpen, Terminal } from 'lucide-react';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { useWizard } from './WizardContext';

const schema = z.object({
  createAgent: z.boolean(),
  agentName: z.string().min(1, 'Agent name is required').max(50).optional().or(z.literal('')),
  agentDisplayName: z.string().max(100).optional(),
  agentCapabilities: z.array(z.string()),
  agentPromptTemplate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const CAPABILITY_OPTIONS = [
  { id: 'shell', label: 'Shell Commands', icon: Terminal, description: 'Execute bash/shell commands' },
  { id: 'file_system', label: 'File System', icon: FolderOpen, description: 'Read, write, and manage files' },
  { id: 'code_execution', label: 'Code Execution', icon: Code, description: 'Run code in various languages' },
  { id: 'web_search', label: 'Web Search', icon: Sparkles, description: 'Search the web for information' },
];

const PROMPT_TEMPLATES = [
  {
    id: 'general',
    name: 'General Assistant',
    template: `You are a helpful AI assistant on an MCP server. You can help with various tasks including:
- File management and organization
- Code review and analysis
- System administration tasks
- Documentation and research

Always be concise and helpful. Ask for clarification when needed.`,
  },
  {
    id: 'devops',
    name: 'DevOps Engineer',
    template: `You are a DevOps engineer assistant. You specialize in:
- CI/CD pipeline management
- Container orchestration (Docker, Kubernetes)
- Infrastructure as Code (Terraform, Ansible)
- Cloud platform management (AWS, GCP, Azure)

Follow best practices for security and reliability.`,
  },
  {
    id: 'developer',
    name: 'Software Developer',
    template: `You are a software development assistant. You excel at:
- Writing clean, maintainable code
- Code review and refactoring
- Debugging and troubleshooting
- Test-driven development

Follow SOLID principles and write self-documenting code.`,
  },
];

export function Step4Agent() {
  const { data, updateData, setCanProceed } = useWizard();

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      createAgent: data.createAgent,
      agentName: data.agentName,
      agentDisplayName: data.agentDisplayName,
      agentCapabilities: data.agentCapabilities,
      agentPromptTemplate: data.agentPromptTemplate,
    },
  });

  const formValues = watch();

  useEffect(() => {
    updateData({
      createAgent: formValues.createAgent,
      agentName: formValues.agentName || '',
      agentDisplayName: formValues.agentDisplayName || '',
      agentCapabilities: formValues.agentCapabilities,
      agentPromptTemplate: formValues.agentPromptTemplate || '',
    });

    // Validate: either skip agent creation or provide valid agent name
    const isValid = !formValues.createAgent || (formValues.agentName && formValues.agentName.length > 0);
    setCanProceed(Boolean(isValid));
  }, [formValues, updateData, setCanProceed]);

  const toggleCapability = (capId: string) => {
    const current = formValues.agentCapabilities;
    const newCapabilities = current.includes(capId)
      ? current.filter((c) => c !== capId)
      : [...current, capId];
    setValue('agentCapabilities', newCapabilities);
  };

  const selectTemplate = (template: string) => {
    setValue('agentPromptTemplate', template);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Bot className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Create Initial Agent</h2>
        <p className="text-muted-foreground mt-1">
          Set up your first agent on this server (optional)
        </p>
      </div>

      <div className="p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="createAgent"
            {...register('createAgent')}
            className="h-5 w-5 rounded border-gray-300"
          />
          <div>
            <Label htmlFor="createAgent" className="font-medium cursor-pointer">
              Create an agent on this server
            </Label>
            <p className="text-sm text-muted-foreground">
              You can skip this and create agents later
            </p>
          </div>
        </div>
      </div>

      {formValues.createAgent && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agentName">Agent ID *</Label>
              <Input
                id="agentName"
                placeholder="my-agent"
                {...register('agentName')}
                className={errors.agentName ? 'border-red-500' : ''}
              />
              {errors.agentName && (
                <p className="text-sm text-red-500">{errors.agentName.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Unique identifier (lowercase, no spaces)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agentDisplayName">Display Name</Label>
              <Input
                id="agentDisplayName"
                placeholder="My Agent"
                {...register('agentDisplayName')}
              />
              <p className="text-xs text-muted-foreground">
                Human-readable name
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Capabilities</Label>
            <div className="grid grid-cols-2 gap-3">
              {CAPABILITY_OPTIONS.map((cap) => {
                const isSelected = formValues.agentCapabilities.includes(cap.id);
                const Icon = cap.icon;
                return (
                  <div
                    key={cap.id}
                    onClick={() => toggleCapability(cap.id)}
                    className={`
                      p-3 rounded-lg border-2 cursor-pointer transition-all
                      ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="font-medium text-sm">{cap.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{cap.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <Label>System Prompt Template</Label>
            <div className="flex gap-2 flex-wrap">
              {PROMPT_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => selectTemplate(tpl.template)}
                  className={`
                    px-3 py-1.5 rounded-full text-sm border transition-colors
                    ${
                      formValues.agentPromptTemplate === tpl.template
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  {tpl.name}
                </button>
              ))}
            </div>
            <textarea
              {...register('agentPromptTemplate')}
              placeholder="Enter a custom system prompt for the agent..."
              className="w-full h-32 p-3 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-muted-foreground">
              This prompt will be used as the agent's system instructions
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
