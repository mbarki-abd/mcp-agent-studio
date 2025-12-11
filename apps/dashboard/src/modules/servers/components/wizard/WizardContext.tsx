import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { ServerValidationResult } from '../../../../core/api/hooks';

export interface WizardData {
  // Step 1: Basics
  name: string;
  description: string;
  url: string;
  masterToken: string;
  autoConnect: boolean;
  isDefault: boolean;

  // Step 2: Validation result
  validationResult: ServerValidationResult | null;

  // Step 3: Tools to install
  selectedTools: string[];

  // Step 4: Initial agent
  createAgent: boolean;
  agentName: string;
  agentDisplayName: string;
  agentCapabilities: string[];
  agentPromptTemplate: string;
}

interface WizardContextType {
  step: number;
  data: WizardData;
  setStep: (step: number) => void;
  updateData: (updates: Partial<WizardData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  canProceed: boolean;
  setCanProceed: (value: boolean) => void;
  isLastStep: boolean;
  createdServerId: string | null;
  setCreatedServerId: (id: string | null) => void;
}

const defaultData: WizardData = {
  name: '',
  description: '',
  url: '',
  masterToken: '',
  autoConnect: true,
  isDefault: false,
  validationResult: null,
  selectedTools: [],
  createAgent: true,
  agentName: '',
  agentDisplayName: '',
  agentCapabilities: ['shell', 'file_system', 'code_execution'],
  agentPromptTemplate: '',
};

const WizardContext = createContext<WizardContextType | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(defaultData);
  const [canProceed, setCanProceed] = useState(false);
  const [createdServerId, setCreatedServerId] = useState<string | null>(null);

  const updateData = useCallback((updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const nextStep = useCallback(() => {
    if (step < 4) {
      setStep(step + 1);
      setCanProceed(false);
    }
  }, [step]);

  const prevStep = useCallback(() => {
    if (step > 1) {
      setStep(step - 1);
    }
  }, [step]);

  return (
    <WizardContext.Provider
      value={{
        step,
        data,
        setStep,
        updateData,
        nextStep,
        prevStep,
        canProceed,
        setCanProceed,
        isLastStep: step === 4,
        createdServerId,
        setCreatedServerId,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within WizardProvider');
  }
  return context;
}
