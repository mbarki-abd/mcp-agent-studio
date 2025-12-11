import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, Check, Server, Zap, Package, Bot } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { WizardProvider, useWizard } from './WizardContext';
import { Step1Basics } from './Step1Basics';
import { Step2Validation } from './Step2Validation';
import { Step3Tools } from './Step3Tools';
import { Step4Agent } from './Step4Agent';
import { useCreateServer, useCreateAgent, useInstallTool } from '../../../../core/api/hooks';

const STEPS = [
  { number: 1, title: 'Basics', icon: Server },
  { number: 2, title: 'Validate', icon: Zap },
  { number: 3, title: 'Tools', icon: Package },
  { number: 4, title: 'Agent', icon: Bot },
];

function WizardContent() {
  const navigate = useNavigate();
  const { step, data, nextStep, prevStep, canProceed, isLastStep, setCreatedServerId } = useWizard();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createServer = useCreateServer();
  const createAgent = useCreateAgent();
  const installTool = useInstallTool();

  const handleNext = async () => {
    if (isLastStep) {
      await handleSubmit();
    } else {
      nextStep();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Step 1: Create the server
      const serverResult = await createServer.mutateAsync({
        name: data.name,
        description: data.description || undefined,
        url: data.url,
        masterToken: data.masterToken,
        autoConnect: data.autoConnect,
        isDefault: data.isDefault,
      });

      const serverId = serverResult.id;
      setCreatedServerId(serverId);

      // Step 2: Install selected tools (in parallel)
      if (data.selectedTools.length > 0) {
        await Promise.all(
          data.selectedTools.map((toolId) =>
            installTool.mutateAsync({ serverId, toolId }).catch((err) => {
              console.error(`Failed to install tool ${toolId}:`, err);
              // Don't fail the whole process for tool installation errors
            })
          )
        );
      }

      // Step 3: Create initial agent if requested
      if (data.createAgent && data.agentName) {
        await createAgent.mutateAsync({
          serverId,
          name: data.agentName,
          displayName: data.agentDisplayName || data.agentName,
          capabilities: data.agentCapabilities,
          description: data.agentPromptTemplate || undefined,
        });
      }

      // Navigate to the server detail page
      navigate(`/servers`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create server';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1Basics />;
      case 2:
        return <Step2Validation />;
      case 3:
        return <Step3Tools />;
      case 4:
        return <Step4Agent />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/servers')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add Server</h1>
          <p className="text-muted-foreground">
            Configure a new MCP server connection
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8 px-4">
        {STEPS.map((s, index) => {
          const Icon = s.icon;
          const isActive = step === s.number;
          const isCompleted = step > s.number;
          const isLast = index === STEPS.length - 1;

          return (
            <div key={s.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-colors
                    ${isCompleted ? 'bg-green-500 text-white' : ''}
                    ${isActive ? 'bg-primary text-primary-foreground' : ''}
                    ${!isActive && !isCompleted ? 'bg-muted text-muted-foreground' : ''}
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`text-xs mt-1 ${
                    isActive ? 'text-primary font-medium' : 'text-muted-foreground'
                  }`}
                >
                  {s.title}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`w-16 h-0.5 mx-2 ${
                    isCompleted ? 'bg-green-500' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="border rounded-lg p-6 mb-6 min-h-[400px]">
        {renderStep()}
      </div>

      {/* Error Message */}
      {submitError && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-300">
          {submitError}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={step === 1 || isSubmitting}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => navigate('/servers')} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleNext} disabled={!canProceed || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : isLastStep ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Create Server
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ServerWizard() {
  return (
    <WizardProvider>
      <WizardContent />
    </WizardProvider>
  );
}
