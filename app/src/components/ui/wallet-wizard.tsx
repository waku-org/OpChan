import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks';
import { useDelegation } from '@/hooks/useDelegation';
import { EVerificationStatus } from '@opchan/core';
import { WalletConnectionStep } from './wallet-connection-step';
import { VerificationStep } from './verification-step';
import { DelegationStep } from './delegation-step';

interface WalletWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

type WizardStep = 1 | 2 | 3;

export function WalletWizard({
  open,
  onOpenChange,
  onComplete,
}: WalletWizardProps) {
  const [currentStep, setCurrentStep] = React.useState<WizardStep>(1);
  const [isLoading, setIsLoading] = React.useState(false);
  const { isAuthenticated, verificationStatus } = useAuth();
  const { delegationStatus } = useDelegation();

  // Reset wizard when opened - always start at step 1 for simplicity
  React.useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setIsLoading(false);
    }
  }, [open]);

  const handleStepComplete = (step: WizardStep) => {
    if (step < 3) {
      setCurrentStep((step + 1) as WizardStep);
    } else {
      onComplete();
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return; // Prevent closing during operations
    onOpenChange(false);
  };

  // Consolidated step status logic
  const getStepStatus = (step: WizardStep) => {
    // Check actual completion status first
    const isActuallyComplete = (step: WizardStep): boolean => {
      switch (step) {
        case 1:
          return isAuthenticated;
        case 2:
          return verificationStatus !== EVerificationStatus.WALLET_UNCONNECTED;
        case 3:
          return delegationStatus.isValid;
        default:
          return false;
      }
    };

    if (isActuallyComplete(step)) {
      return 'complete';
    } else if (step === currentStep) {
      return 'current';
    } else {
      return 'disabled';
    }
  };

  const renderStepIcon = (step: WizardStep) => {
    const status = getStepStatus(step);

    if (status === 'complete') {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (status === 'current') {
      return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
    } else {
      return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepTitle = (step: WizardStep) => {
    switch (step) {
      case 1:
        return 'Connect Wallet';
      case 2:
        return 'Verify Ownership';
      case 3:
        return 'Delegate Key';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg border-neutral-800 bg-black text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Setup Your Account</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Complete these steps to access all OpChan features
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((step, index) => (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center gap-2">
                {renderStepIcon(step as WizardStep)}
                <span
                  className={`text-sm font-medium ${
                    getStepStatus(step as WizardStep) === 'current'
                      ? 'text-blue-500'
                      : getStepStatus(step as WizardStep) === 'complete'
                        ? 'text-green-500'
                        : 'text-gray-400'
                  }`}
                >
                  {getStepTitle(step as WizardStep)}
                </span>
              </div>
              {index < 2 && (
                <div
                  className={`w-16 h-px mx-4 ${
                    getStepStatus(step as WizardStep) === 'complete'
                      ? 'bg-green-500'
                      : 'bg-gray-600'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content - Flexible height container */}
        <div className="min-h-[400px] flex flex-col">
          {currentStep === 1 && (
            <WalletConnectionStep
              onComplete={() => handleStepComplete(1)}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          )}

          {currentStep === 2 && (
            <VerificationStep
              onComplete={() => handleStepComplete(2)}
              onBack={() => setCurrentStep(1)}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          )}

          {currentStep === 3 && (
            <DelegationStep
              onComplete={() => handleStepComplete(3)}
              onBack={() => setCurrentStep(2)}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-6 mt-4 border-t border-neutral-700">
          <p className="text-xs text-neutral-500">Step {currentStep} of 3</p>
          {currentStep > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStep((currentStep - 1) as WizardStep)}
              disabled={isLoading}
              className="text-neutral-400 hover:text-white hover:bg-neutral-800"
            >
              Back
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
