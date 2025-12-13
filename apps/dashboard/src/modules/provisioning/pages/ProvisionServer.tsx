import { useState } from 'react';
import {
  CloudCog,
  Server,
  MapPin,
  Settings,
  CheckCircle,
  Copy,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { cn } from '../../../lib/utils';

// Server type configurations
const SERVER_TYPES = [
  { id: 'cax11', name: 'CAX11', vcpus: 2, memory: '4 GB', disk: '40 GB', price: '€4.15/mo' },
  { id: 'cax21', name: 'CAX21', vcpus: 4, memory: '8 GB', disk: '80 GB', price: '€8.30/mo' },
  { id: 'cx11', name: 'CX11', vcpus: 1, memory: '2 GB', disk: '20 GB', price: '€3.79/mo' },
  { id: 'cx21', name: 'CX21', vcpus: 2, memory: '4 GB', disk: '40 GB', price: '€5.83/mo' },
];

const LOCATIONS = [
  { id: 'fsn1', name: 'Falkenstein', country: 'Germany', flag: '🇩🇪' },
  { id: 'nbg1', name: 'Nuremberg', country: 'Germany', flag: '🇩🇪' },
  { id: 'hel1', name: 'Helsinki', country: 'Finland', flag: '🇫🇮' },
];

interface ProvisioningState {
  hetznerToken: string;
  serverType: string;
  location: string;
  serverName: string;
  masterUrl: string;
  isProvisioning: boolean;
  isComplete: boolean;
  credentials?: {
    ipAddress: string;
    rootPassword: string;
    sshKey: string;
  };
}

export default function ProvisionServer() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showToken, setShowToken] = useState(false);
  const [state, setState] = useState<ProvisioningState>({
    hetznerToken: localStorage.getItem('hetzner_token') || '',
    serverType: 'cax11',
    location: 'fsn1',
    serverName: `mcp-server-${Date.now()}`,
    masterUrl: '',
    isProvisioning: false,
    isComplete: false,
  });

  const totalSteps = 6;

  const updateState = (updates: Partial<ProvisioningState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep === 1 && state.hetznerToken) {
      // Save token to localStorage
      localStorage.setItem('hetzner_token', state.hetznerToken);
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1 && !state.isProvisioning) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleProvision = async () => {
    updateState({ isProvisioning: true });

    // Simulate provisioning process
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Mock credentials
    updateState({
      isProvisioning: false,
      isComplete: true,
      credentials: {
        ipAddress: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        rootPassword: `root_${Math.random().toString(36).substring(2, 15)}`,
        sshKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ...',
      },
    });

    setCurrentStep(6);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return state.hetznerToken.length > 0;
      case 2:
        return state.serverType.length > 0;
      case 3:
        return state.location.length > 0;
      case 4:
        return state.serverName.length > 0;
      default:
        return true;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Provision MCP Server</h1>
        <p className="text-muted-foreground">
          Deploy a new MCP server on Hetzner Cloud infrastructure
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {[...Array(totalSteps)].map((_, idx) => {
          const stepNum = idx + 1;
          const isActive = currentStep === stepNum;
          const isComplete = currentStep > stepNum;

          return (
            <div key={stepNum} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    isActive && 'bg-primary text-primary-foreground',
                    isComplete && 'bg-green-500 text-white',
                    !isActive && !isComplete && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isComplete ? <CheckCircle className="h-4 w-4" /> : stepNum}
                </div>
                <span className="text-xs mt-1 text-center">
                  {stepNum === 1 && 'Token'}
                  {stepNum === 2 && 'Type'}
                  {stepNum === 3 && 'Location'}
                  {stepNum === 4 && 'Config'}
                  {stepNum === 5 && 'Review'}
                  {stepNum === 6 && 'Complete'}
                </span>
              </div>
              {stepNum < totalSteps && (
                <div
                  className={cn(
                    'h-0.5 flex-1 mx-2',
                    isComplete ? 'bg-green-500' : 'bg-muted'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Content Card */}
      <div className="border rounded-lg bg-card p-6">
        {/* Step 1: Hetzner API Token */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <CloudCog className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-lg font-semibold">Hetzner API Token</h2>
                <p className="text-sm text-muted-foreground">
                  Enter your Hetzner Cloud API token to provision servers
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-900">Security Notice</p>
                <p className="text-yellow-700 mt-1">
                  Your token is stored locally in your browser for convenience. Never share
                  your API token with others.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hetzner-token">API Token</Label>
              <div className="relative">
                <Input
                  id="hetzner-token"
                  type={showToken ? 'text' : 'password'}
                  placeholder="Enter your Hetzner API token..."
                  value={state.hetznerToken}
                  onChange={(e) => updateState({ hetznerToken: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showToken ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your token from{' '}
                <a
                  href="https://console.hetzner.cloud"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Hetzner Cloud Console
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Server Type */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Server className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-lg font-semibold">Select Server Type</h2>
                <p className="text-sm text-muted-foreground">
                  Choose the server specifications that fit your needs
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SERVER_TYPES.map((type) => (
                <div
                  key={type.id}
                  className={cn(
                    'border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md',
                    state.serverType === type.id &&
                      'ring-2 ring-primary border-primary bg-primary/5'
                  )}
                  onClick={() => updateState({ serverType: type.id })}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">{type.name}</h3>
                    <span className="text-sm font-medium text-primary">{type.price}</span>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>vCPUs:</span>
                      <span className="font-medium text-foreground">{type.vcpus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Memory:</span>
                      <span className="font-medium text-foreground">{type.memory}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Disk:</span>
                      <span className="font-medium text-foreground">{type.disk}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Location */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-lg font-semibold">Select Location</h2>
                <p className="text-sm text-muted-foreground">
                  Choose the datacenter location closest to your users
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {LOCATIONS.map((loc) => (
                <div
                  key={loc.id}
                  className={cn(
                    'border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md text-center',
                    state.location === loc.id &&
                      'ring-2 ring-primary border-primary bg-primary/5'
                  )}
                  onClick={() => updateState({ location: loc.id })}
                >
                  <div className="text-4xl mb-2">{loc.flag}</div>
                  <h3 className="font-semibold">{loc.name}</h3>
                  <p className="text-sm text-muted-foreground">{loc.country}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">{loc.id}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Configuration */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-lg font-semibold">Server Configuration</h2>
                <p className="text-sm text-muted-foreground">
                  Configure your server settings
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="server-name">Server Name</Label>
                <Input
                  id="server-name"
                  placeholder="mcp-server-production"
                  value={state.serverName}
                  onChange={(e) => updateState({ serverName: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  A unique name to identify your server
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="master-url">Master Server URL (Optional)</Label>
                <Input
                  id="master-url"
                  placeholder="https://master.example.com"
                  value={state.masterUrl}
                  onChange={(e) => updateState({ masterUrl: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  URL of the master server for automatic registration
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review & Confirm */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-lg font-semibold">Review & Confirm</h2>
                <p className="text-sm text-muted-foreground">
                  Please review your configuration before provisioning
                </p>
              </div>
            </div>

            <div className="space-y-3 bg-muted rounded-lg p-4">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Server Type:</span>
                <span className="font-medium">
                  {SERVER_TYPES.find((t) => t.id === state.serverType)?.name}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Location:</span>
                <span className="font-medium">
                  {LOCATIONS.find((l) => l.id === state.location)?.name}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Server Name:</span>
                <span className="font-medium">{state.serverName}</span>
              </div>
              {state.masterUrl && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Master URL:</span>
                  <span className="font-medium text-sm truncate max-w-[200px]">
                    {state.masterUrl}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Estimated Cost:</span>
                <span className="font-medium text-primary">
                  {SERVER_TYPES.find((t) => t.id === state.serverType)?.price}
                </span>
              </div>
            </div>

            {!state.isProvisioning && (
              <Button
                onClick={handleProvision}
                className="w-full"
                size="lg"
              >
                <CloudCog className="h-4 w-4 mr-2" />
                Start Provisioning
              </Button>
            )}

            {state.isProvisioning && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
                <h3 className="font-medium">Provisioning Server...</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This may take a few minutes
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 6: Success */}
        {currentStep === 6 && state.isComplete && state.credentials && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4 text-green-600">
              <CheckCircle className="h-6 w-6" />
              <div>
                <h2 className="text-lg font-semibold">Server Provisioned Successfully!</h2>
                <p className="text-sm text-muted-foreground">
                  Your server is ready to use
                </p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                Save these credentials in a secure location. You won't be able to retrieve
                them later.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>IP Address</Label>
                <div className="flex gap-2">
                  <Input value={state.credentials.ipAddress} readOnly />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(state.credentials!.ipAddress)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Root Password</Label>
                <div className="flex gap-2">
                  <Input type="password" value={state.credentials.rootPassword} readOnly />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(state.credentials!.rootPassword)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>SSH Connection</Label>
                <div className="flex gap-2">
                  <Input
                    value={`ssh root@${state.credentials.ipAddress}`}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      copyToClipboard(`ssh root@${state.credentials!.ipAddress}`)
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => window.location.href = '/servers'}>
                Go to Servers
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setState({
                    hetznerToken: state.hetznerToken,
                    serverType: 'cax11',
                    location: 'fsn1',
                    serverName: `mcp-server-${Date.now()}`,
                    masterUrl: '',
                    isProvisioning: false,
                    isComplete: false,
                  });
                  setCurrentStep(1);
                }}
              >
                Provision Another Server
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {currentStep < 5 && !state.isProvisioning && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleNext} disabled={!isStepValid()}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
