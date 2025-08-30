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
import { useAuth } from '@/contexts/useAuth';
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
  const { isAuthenticated, verificationStatus, isDelegationValid } = useAuth();
  const hasInitialized = React.useRef(false);

  // Reset wizard when opened and determine starting step
  React.useEffect(() => {
    if (open && !hasInitialized.current) {
      // Determine the appropriate starting step based on current state
      if (!isAuthenticated) {
        setCurrentStep(1); // Start at connection step if not authenticated
      } else if (
        isAuthenticated &&
        (verificationStatus === 'unverified' ||
          verificationStatus === 'verifying')
      ) {
        setCurrentStep(2); // Start at verification step if authenticated but not verified
      } else if (
        isAuthenticated &&
        (verificationStatus === 'verified-owner' ||
          verificationStatus === 'verified-basic' ||
          verificationStatus === 'verified-none') &&
        !isDelegationValid()
      ) {
        setCurrentStep(3); // Start at delegation step if verified but no valid delegation
      } else {
        setCurrentStep(3); // Default to step 3 if everything is complete
      }
      setIsLoading(false);
      hasInitialized.current = true;
    } else if (!open) {
      hasInitialized.current = false;
    }
  }, [open, isAuthenticated, verificationStatus, isDelegationValid]);

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

  const getStepStatus = (step: WizardStep) => {
    if (step === 1) {
      return isAuthenticated ? 'complete' : 'current';
    } else if (step === 2) {
      if (!isAuthenticated) return 'disabled';
      if (
        verificationStatus === 'unverified' ||
        verificationStatus === 'verifying'
      )
        return 'current';
      if (
        verificationStatus === 'verified-owner' ||
        verificationStatus === 'verified-basic' ||
        verificationStatus === 'verified-none'
      )
        return 'complete';
      return 'disabled';
    } else if (step === 3) {
      if (
        !isAuthenticated ||
        (verificationStatus !== 'verified-owner' &&
          verificationStatus !== 'verified-basic' &&
          verificationStatus !== 'verified-none')
      )
        return 'disabled';
      if (isDelegationValid()) return 'complete';
      return 'current';
    }
    return 'disabled';
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
      <DialogContent className="sm:max-w-md border-neutral-800 bg-black text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Setup Your Account</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Complete these steps to access all OpChan features
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3].map(step => (
            <div key={step} className="flex items-center">
              <div className="flex items-center gap-2">
                {renderStepIcon(step as WizardStep)}
                <span
                  className={`text-sm ${
                    getStepStatus(step as WizardStep) === 'current'
                      ? 'text-blue-500 font-medium'
                      : getStepStatus(step as WizardStep) === 'complete'
                        ? 'text-green-500'
                        : 'text-gray-400'
                  }`}
                >
                  {getStepTitle(step as WizardStep)}
                </span>
              </div>
              {step < 3 && (
                <div
                  className={`w-8 h-px mx-2 ${
                    getStepStatus(step as WizardStep) === 'complete'
                      ? 'bg-green-500'
                      : 'bg-gray-600'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content - Fixed height container */}
        <div className="h-[400px] flex flex-col">
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
        <div className="flex justify-between items-center pt-4 border-t border-neutral-700">
          <p className="text-xs text-neutral-500">Step {currentStep} of 3</p>
          {currentStep > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStep((currentStep - 1) as WizardStep)}
              disabled={isLoading}
              className="text-neutral-400 hover:text-white"
            >
              Back
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
