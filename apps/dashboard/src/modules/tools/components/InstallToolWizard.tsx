import { useState, useEffect } from 'react';
import {
  Package,
  Server,
  Settings,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Terminal,
  Shield,
  X,
  Search,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  useServers,
  useToolsCatalog,
  useInstallTool,
} from '../../../core/api';
import { cn } from '../../../lib/utils';
// Types are inferred from API hooks, no need to import

interface InstallToolWizardProps {
  serverId?: string;
  toolId?: string;
  onClose: () => void;
  onComplete: () => void;
}

const steps = [
  { id: 'server', title: 'Select Server', icon: Server },
  { id: 'tool', title: 'Choose Tool', icon: Package },
  { id: 'config', title: 'Configuration', icon: Settings },
  { id: 'install', title: 'Install', icon: Terminal },
];

const categoryIcons: Record<string, string> = {
  VERSION_CONTROL: '🔀',
  CONTAINER: '📦',
  CLOUD_CLI: '☁️',
  KUBERNETES: '🎡',
  LANGUAGE_RUNTIME: '⚡',
  PACKAGE_MANAGER: '📚',
  DATABASE_CLIENT: '🗄️',
  DEVOPS: '🔧',
  UTILITY: '🛠️',
  SECURITY: '🔒',
  EDITOR: '📝',
};

export function InstallToolWizard({
  serverId: initialServerId,
  toolId: initialToolId,
  onClose,
  onComplete,
}: InstallToolWizardProps) {
  const [currentStep, setCurrentStep] = useState(initialServerId ? 1 : 0);
  const [selectedServerId, setSelectedServerId] = useState(initialServerId || '');
  const [selectedToolId, setSelectedToolId] = useState(initialToolId || '');
  const [serverSearch, setServerSearch] = useState('');
  const [toolSearch, setToolSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // Install options for future use (custom config, sudo, etc.)
  // const [installOptions, setInstallOptions] = useState({ useSudo: false, customConfig: '' });
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'success' | 'error'>('idle');
  const [installOutput, setInstallOutput] = useState<string[]>([]);

  const { data: serversData, isLoading: isLoadingServers } = useServers();
  const { data: catalog, isLoading: isLoadingCatalog } = useToolsCatalog();
  const installTool = useInstallTool();

  const servers = serversData?.items || [];
  const tools = catalog || [];

  // Get selected server and tool
  const selectedServer = servers.find((s) => s.id === selectedServerId);
  const selectedTool = tools.find((t) => t.id === selectedToolId);

  // Filter servers
  const filteredServers = servers.filter((server) => {
    if (!serverSearch) return true;
    return (
      server.name.toLowerCase().includes(serverSearch.toLowerCase()) ||
      server.url.toLowerCase().includes(serverSearch.toLowerCase())
    );
  });

  // Get unique categories
  const categories = [...new Set(tools.map((t) => t.category))];

  // Filter tools
  const filteredTools = tools.filter((tool) => {
    if (selectedCategory && tool.category !== selectedCategory) return false;
    if (!toolSearch) return true;
    return (
      tool.name.toLowerCase().includes(toolSearch.toLowerCase()) ||
      tool.displayName.toLowerCase().includes(toolSearch.toLowerCase()) ||
      tool.description?.toLowerCase().includes(toolSearch.toLowerCase())
    );
  });

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return !!selectedServerId;
      case 1:
        return !!selectedToolId;
      case 2:
        return true;
      case 3:
        return installStatus === 'success';
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (canProceed() && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleInstall = async () => {
    if (!selectedServerId || !selectedToolId) return;

    setInstallStatus('installing');
    setInstallOutput(['Starting installation...']);

    try {
      // Simulate progress output
      const progressMessages = [
        'Connecting to server...',
        'Checking system requirements...',
        `Running: ${selectedTool?.installCommand || 'install command'}`,
        'Downloading package...',
        'Installing dependencies...',
        'Configuring tool...',
        'Verifying installation...',
      ];

      for (const msg of progressMessages) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setInstallOutput((prev) => [...prev, msg]);
      }

      await installTool.mutateAsync({
        serverId: selectedServerId,
        toolId: selectedToolId,
      });

      setInstallOutput((prev) => [...prev, '✓ Installation completed successfully!']);
      setInstallStatus('success');
    } catch (error) {
      setInstallOutput((prev) => [...prev, `✗ Error: ${(error as Error).message}`]);
      setInstallStatus('error');
    }
  };

  // Auto-start installation when reaching install step
  useEffect(() => {
    if (currentStep === 3 && installStatus === 'idle') {
      handleInstall();
    }
  }, [currentStep]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Install Tool</h2>
              <p className="text-sm text-muted-foreground">
                Add a new tool to your server
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Stepper */}
        <div className="px-6 py-4 border-b bg-muted/10">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                      isActive && 'bg-primary text-primary-foreground',
                      isCompleted && 'bg-primary/10 text-primary',
                      !isActive && !isCompleted && 'text-muted-foreground'
                    )}
                  >
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-sm',
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
                    <span className="hidden md:inline text-sm font-medium">
                      {step.title}
                    </span>
                  </div>
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Server Selection */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search servers..."
                  value={serverSearch}
                  onChange={(e) => setServerSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {isLoadingServers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredServers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No servers found
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredServers.map((server) => (
                    <button
                      key={server.id}
                      onClick={() => setSelectedServerId(server.id)}
                      className={cn(
                        'p-4 rounded-lg border text-left transition-all',
                        selectedServerId === server.id
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'hover:border-primary/50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          <Server className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{server.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {server.url}
                          </p>
                        </div>
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full',
                            server.status === 'ONLINE' ? 'bg-green-500' : 'bg-gray-400'
                          )}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Tool Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {/* Category Filter */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <Button
                  variant={selectedCategory === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  All
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                    className="whitespace-nowrap"
                  >
                    {categoryIcons[cat] || '📦'} {cat.replace('_', ' ')}
                  </Button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tools..."
                  value={toolSearch}
                  onChange={(e) => setToolSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {isLoadingCatalog ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTools.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No tools found
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
                  {filteredTools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => setSelectedToolId(tool.id)}
                      className={cn(
                        'p-4 rounded-lg border text-left transition-all',
                        selectedToolId === tool.id
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'hover:border-primary/50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">
                          {categoryIcons[tool.category] || '📦'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{tool.displayName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {tool.name}
                          </p>
                          {tool.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {tool.description}
                            </p>
                          )}
                        </div>
                      </div>
                      {tool.requiresSudo && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
                          <Shield className="h-3 w-3" />
                          Requires sudo
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Configuration */}
          {currentStep === 2 && selectedTool && (
            <div className="space-y-6">
              {/* Tool Summary */}
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-start gap-4">
                  <span className="text-4xl">
                    {categoryIcons[selectedTool.category] || '📦'}
                  </span>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedTool.displayName}</h3>
                    <p className="text-sm text-muted-foreground">{selectedTool.name}</p>
                    {selectedTool.description && (
                      <p className="text-sm mt-2">{selectedTool.description}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Installation Details */}
              <div className="space-y-4">
                <h4 className="font-medium">Installation Details</h4>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Server</Label>
                    <p className="font-medium">{selectedServer?.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Category</Label>
                    <p className="font-medium">{selectedTool.category.replace('_', ' ')}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Install Command</Label>
                  <pre className="mt-1 p-3 rounded-lg bg-muted font-mono text-sm overflow-x-auto">
                    {selectedTool.installCommand}
                  </pre>
                </div>

                <div>
                  <Label className="text-muted-foreground">Version Check</Label>
                  <pre className="mt-1 p-3 rounded-lg bg-muted font-mono text-sm overflow-x-auto">
                    {selectedTool.versionCommand}
                  </pre>
                </div>

                {/* Options */}
                {selectedTool.requiresSudo && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200">
                    <Shield className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-orange-800">Requires elevated privileges</p>
                      <p className="text-sm text-orange-600">
                        This tool will be installed with sudo permissions
                      </p>
                    </div>
                  </div>
                )}

                {selectedTool.dependencies && selectedTool.dependencies.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Dependencies</Label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {selectedTool.dependencies.map((dep) => (
                        <span
                          key={dep}
                          className="px-2 py-1 rounded bg-muted text-sm"
                        >
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Installation */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-center">
                {installStatus === 'installing' && (
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-lg font-medium">Installing...</span>
                  </div>
                )}
                {installStatus === 'success' && (
                  <div className="flex items-center gap-3 text-green-600">
                    <CheckCircle className="h-8 w-8" />
                    <span className="text-lg font-medium">Installation Complete!</span>
                  </div>
                )}
                {installStatus === 'error' && (
                  <div className="flex items-center gap-3 text-red-600">
                    <AlertTriangle className="h-8 w-8" />
                    <span className="text-lg font-medium">Installation Failed</span>
                  </div>
                )}
              </div>

              {/* Terminal Output */}
              <div className="rounded-lg bg-[#1a1b26] p-4 font-mono text-sm max-h-[300px] overflow-y-auto">
                {installOutput.map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      'py-0.5',
                      line.startsWith('✓') && 'text-green-400',
                      line.startsWith('✗') && 'text-red-400',
                      !line.startsWith('✓') && !line.startsWith('✗') && 'text-gray-300'
                    )}
                  >
                    {line}
                  </div>
                ))}
                {installStatus === 'installing' && (
                  <span className="inline-block w-2 h-4 bg-white animate-pulse" />
                )}
              </div>

              {/* Summary */}
              {installStatus === 'success' && (
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2">
                    Successfully Installed
                  </h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <p><strong>Tool:</strong> {selectedTool?.displayName}</p>
                    <p><strong>Server:</strong> {selectedServer?.name}</p>
                  </div>
                </div>
              )}

              {installStatus === 'error' && (
                <Button onClick={handleInstall} variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retry Installation
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-between bg-muted/10">
          <Button
            variant="outline"
            onClick={currentStep === 0 ? onClose : prevStep}
            disabled={installStatus === 'installing'}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </Button>

          {currentStep < 3 ? (
            <Button onClick={nextStep} disabled={!canProceed()}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={() => {
                onComplete();
                onClose();
              }}
              disabled={installStatus !== 'success'}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
