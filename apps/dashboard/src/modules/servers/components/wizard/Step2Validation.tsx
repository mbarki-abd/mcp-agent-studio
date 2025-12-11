import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Server, Zap, Clock, RefreshCw } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { useWizard } from './WizardContext';
import { useValidateServerConnection } from '../../../../core/api/hooks';

type ValidationState = 'idle' | 'validating' | 'success' | 'error';

export function Step2Validation() {
  const { data, updateData, setCanProceed } = useWizard();
  const [validationState, setValidationState] = useState<ValidationState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const validateConnection = useValidateServerConnection();

  const runValidation = async () => {
    setValidationState('validating');
    setErrorMessage('');

    try {
      const result = await validateConnection.mutateAsync({
        url: data.url,
        masterToken: data.masterToken,
      });

      if (result.valid) {
        updateData({ validationResult: result });
        setValidationState('success');
        setCanProceed(true);
      } else {
        setErrorMessage(result.error || 'Validation failed');
        setValidationState('error');
        setCanProceed(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      setErrorMessage(message);
      setValidationState('error');
      setCanProceed(false);
    }
  };

  useEffect(() => {
    if (validationState === 'idle' && data.url && data.masterToken) {
      runValidation();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const renderContent = () => {
    switch (validationState) {
      case 'idle':
        return (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Click the button below to validate the connection</p>
            <Button onClick={runValidation} className="mt-4">
              Start Validation
            </Button>
          </div>
        );

      case 'validating':
        return (
          <div className="space-y-4">
            <ValidationStep
              icon={<Loader2 className="w-5 h-5 animate-spin text-primary" />}
              title="Connecting to server..."
              subtitle={data.url}
              status="loading"
            />
            <ValidationStep
              icon={<Server className="w-5 h-5 text-muted-foreground" />}
              title="Checking server health"
              status="pending"
            />
            <ValidationStep
              icon={<Zap className="w-5 h-5 text-muted-foreground" />}
              title="Fetching capabilities"
              status="pending"
            />
          </div>
        );

      case 'success':
        return (
          <div className="space-y-4">
            <ValidationStep
              icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
              title="Connection successful"
              subtitle={data.url}
              status="success"
            />
            <ValidationStep
              icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
              title="Server is healthy"
              subtitle={`Version: ${data.validationResult?.serverVersion || 'unknown'}`}
              status="success"
            />
            <ValidationStep
              icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
              title="Capabilities fetched"
              subtitle={`${data.validationResult?.capabilities?.length || 0} capabilities available`}
              status="success"
            />

            <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg">
              <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                Server Details
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <Server className="w-4 h-4" />
                  <span>Version:</span>
                  <span className="font-mono">{data.validationResult?.serverVersion}</span>
                </div>
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <Clock className="w-4 h-4" />
                  <span>Latency:</span>
                  <span className="font-mono">{data.validationResult?.latency}ms</span>
                </div>
              </div>
              {data.validationResult?.capabilities && data.validationResult.capabilities.length > 0 && (
                <div className="mt-3">
                  <span className="text-sm text-green-700 dark:text-green-300">Capabilities:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {data.validationResult.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="space-y-4">
            <ValidationStep
              icon={<XCircle className="w-5 h-5 text-red-500" />}
              title="Connection failed"
              subtitle={errorMessage}
              status="error"
            />

            <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
              <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                Troubleshooting
              </h4>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                <li>Verify the server URL is correct and accessible</li>
                <li>Check that the master token is valid</li>
                <li>Ensure the server is running and responding to health checks</li>
                <li>Check firewall settings if the server is behind a network</li>
              </ul>
            </div>

            <div className="flex justify-center">
              <Button onClick={runValidation} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Validation
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Zap className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Validate Connection</h2>
        <p className="text-muted-foreground mt-1">
          Testing connection to your MCP server
        </p>
      </div>

      {renderContent()}
    </div>
  );
}

interface ValidationStepProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  status: 'pending' | 'loading' | 'success' | 'error';
}

function ValidationStep({ icon, title, subtitle, status }: ValidationStepProps) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
        status === 'success'
          ? 'bg-green-50 dark:bg-green-950/30'
          : status === 'error'
          ? 'bg-red-50 dark:bg-red-950/30'
          : status === 'loading'
          ? 'bg-primary/5'
          : 'bg-muted/30'
      }`}
    >
      {icon}
      <div>
        <p
          className={`font-medium ${
            status === 'success'
              ? 'text-green-800 dark:text-green-200'
              : status === 'error'
              ? 'text-red-800 dark:text-red-200'
              : ''
          }`}
        >
          {title}
        </p>
        {subtitle && (
          <p
            className={`text-sm ${
              status === 'error'
                ? 'text-red-600 dark:text-red-400'
                : 'text-muted-foreground'
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
