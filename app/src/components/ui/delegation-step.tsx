import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { useAuth, useAuthActions } from '@/hooks';
import { useAuth as useAuthContext } from '@/contexts/useAuth';
import { CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { DelegationDuration, DelegationFullStatus } from 'opchan-core/delegation';

interface DelegationStepProps {
  onComplete: () => void;
  onBack?: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function DelegationStep({
  onComplete,
  onBack,
  isLoading,
  setIsLoading,
}: DelegationStepProps) {
  const { currentUser, isAuthenticating } = useAuth();
  const { getDelegationStatus } = useAuthContext();
  const [delegationInfo, setDelegationInfo] =
    useState<DelegationFullStatus | null>(null);
  const { delegateKey, clearDelegation } = useAuthActions();

  // Load delegation status
  useEffect(() => {
    getDelegationStatus().then(setDelegationInfo).catch(console.error);
  }, [getDelegationStatus]);

  const [selectedDuration, setSelectedDuration] =
    React.useState<DelegationDuration>('7days');
  const [delegationResult, setDelegationResult] = React.useState<{
    success: boolean;
    message: string;
    expiry?: string;
  } | null>(null);

  const handleDelegate = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    setDelegationResult(null);

    try {
      const success = await delegateKey(selectedDuration);

      if (success) {
        const expiryDate = currentUser.delegationExpiry
          ? new Date(currentUser.delegationExpiry).toLocaleString()
          : `${selectedDuration === '7days' ? '1 week' : '30 days'} from now`;

        setDelegationResult({
          success: true,
          message: 'Key delegation successful!',
          expiry: expiryDate,
        });
      } else {
        setDelegationResult({
          success: false,
          message: 'Key delegation failed.',
        });
      }
    } catch (error) {
      setDelegationResult({
        success: false,
        message: `Delegation failed. Please try again: ${error}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  // Show delegation result
  if (delegationResult) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 space-y-4">
          <div className="text-center">
            {delegationResult.success ? (
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            ) : (
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            )}
            <h3 className="text-lg font-semibold mb-2">
              {delegationResult.success ? 'Success!' : 'Failed'}
            </h3>
            <p className="text-sm text-neutral-400">
              {delegationResult.message}
            </p>
            {delegationResult.success && delegationResult.expiry && (
              <p className="text-xs text-neutral-500 mt-2">
                Expires: {delegationResult.expiry}
              </p>
            )}
          </div>
        </div>

        <div className="mt-auto space-y-2">
          <Button
            onClick={handleComplete}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            Continue
          </Button>
          {onBack && (
            <Button onClick={onBack} variant="outline" className="w-full">
              Back
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-white">
            Step 3: Key Delegation
          </h3>
          <p className="text-sm text-neutral-400">
            Delegate signing authority to your browser for convenient forum
            interactions
          </p>
        </div>

        <div className="space-y-3">
          {/* Status */}
          <div className="flex items-center gap-2">
            {delegationInfo?.isValid ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
            <span
              className={`text-sm font-medium ${
                delegationInfo?.isValid ? 'text-green-400' : 'text-yellow-400'
              }`}
            >
              {delegationInfo?.isValid ? 'Delegated' : 'Required'}
            </span>
            {delegationInfo?.isValid && delegationInfo?.timeRemaining && (
              <span className="text-xs text-neutral-400">
                {delegationInfo.timeRemaining} remaining
              </span>
            )}
          </div>

          {/* Duration Selection */}
          {!delegationInfo?.isValid && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-neutral-300">
                Delegation Duration:
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="duration"
                    value="7days"
                    checked={selectedDuration === '7days'}
                    onChange={e =>
                      setSelectedDuration(e.target.value as DelegationDuration)
                    }
                    className="text-blue-500"
                  />
                  <span className="text-sm text-neutral-300">
                    7 days (recommended)
                  </span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="duration"
                    value="30days"
                    checked={selectedDuration === '30days'}
                    onChange={e =>
                      setSelectedDuration(e.target.value as DelegationDuration)
                    }
                    className="text-blue-500"
                  />
                  <span className="text-sm text-neutral-300">30 days</span>
                </label>
              </div>
            </div>
          )}

          {/* Delegated Browser Public Key */}
          {delegationInfo?.isValid && currentUser?.browserPubKey && (
            <div className="text-xs text-neutral-400">
              <div className="font-mono break-all bg-neutral-800 p-2 rounded">
                {currentUser.browserPubKey}
              </div>
            </div>
          )}

          {/* User Address */}
          {currentUser && (
            <div className="text-xs text-neutral-400">
              <div className="font-mono break-all">{currentUser.address}</div>
            </div>
          )}

          {/* Delete Button for Active Delegations */}
          {delegationInfo?.isValid && (
            <div className="flex justify-end">
              <Button
                onClick={clearDelegation}
                variant="outline"
                size="sm"
                className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear Delegation
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-auto space-y-2">
        {delegationInfo?.isValid ? (
          <Button
            onClick={handleComplete}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            disabled={isLoading}
          >
            Continue
          </Button>
        ) : (
          <Button
            onClick={handleDelegate}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isLoading || isAuthenticating}
          >
            {isLoading ? 'Delegating...' : 'Delegate Key'}
          </Button>
        )}
        {onBack && (
          <Button
            onClick={onBack}
            variant="outline"
            className="w-full"
            disabled={isLoading}
          >
            Back
          </Button>
        )}
      </div>
    </div>
  );
}
