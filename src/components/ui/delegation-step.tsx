import React from 'react';
import { Button } from './button';
import { useAuth } from '@/contexts/useAuth';
import { CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { DelegationDuration } from '@/lib/identity/signatures/key-delegation';

interface DelegationStepProps {
  onComplete: () => void;
  onBack: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function DelegationStep({
  onComplete,
  onBack,
  isLoading,
  setIsLoading,
}: DelegationStepProps) {
  const { 
    currentUser, 
    delegateKey, 
    isDelegationValid, 
    delegationTimeRemaining,
    isAuthenticating,
    clearDelegation
  } = useAuth();
  
  const [selectedDuration, setSelectedDuration] = React.useState<DelegationDuration>('7days');
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
          message: "Key delegation successful!",
          expiry: expiryDate
        });
      } else {
        setDelegationResult({
          success: false,
          message: "Key delegation failed."
        });
      }
    } catch (error) {
      setDelegationResult({
        success: false,
        message: "Delegation failed. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  // Show delegation result
  if (delegationResult) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 space-y-4">
          <div className={`p-4 rounded-lg border ${
            delegationResult.success 
              ? 'bg-green-900/20 border-green-500/30' 
              : 'bg-yellow-900/20 border-yellow-500/30'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {delegationResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              <span className={`font-medium ${
                delegationResult.success ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {delegationResult.success ? 'Delegation Complete' : 'Delegation Result'}
              </span>
            </div>
            <p className="text-sm text-neutral-300 mb-2">
              {delegationResult.message}
            </p>
            {delegationResult.expiry && (
              <div className="text-xs text-neutral-400">
                <p>Expires: {delegationResult.expiry}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Action Button */}
        <div className="mt-auto">
          <Button
            onClick={handleComplete}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            disabled={isLoading}
          >
            Complete Setup
          </Button>
        </div>
      </div>
    );
  }

  // Show minimal delegation status
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-neutral-100">Key Delegation</h3>
          <p className="text-sm text-neutral-400">
            Delegate signing authority to your browser for convenient forum interactions
          </p>
        </div>
        
        <div className="space-y-3">
          {/* Status */}
          <div className="flex items-center gap-2">
            {isDelegationValid() ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
            <span className={`text-sm font-medium ${
              isDelegationValid() ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {isDelegationValid() ? 'Delegated' : 'Required'}
            </span>
            {isDelegationValid() && (
              <span className="text-xs text-neutral-400">
                {Math.floor(delegationTimeRemaining() / (1000 * 60 * 60))}h {Math.floor((delegationTimeRemaining() % (1000 * 60 * 60)) / (1000 * 60))}m remaining
              </span>
            )}
          </div>
          
          {/* Duration Selection */}
          {!isDelegationValid() && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-neutral-300">Delegation Duration:</label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="duration"
                    value="7days"
                    checked={selectedDuration === '7days'}
                    onChange={(e) => setSelectedDuration(e.target.value as DelegationDuration)}
                    className="w-4 h-4 text-green-600 bg-neutral-800 border-neutral-600 focus:ring-green-500 focus:ring-2"
                  />
                  <span className="text-sm text-neutral-300">1 Week</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="duration"
                    value="30days"
                    checked={selectedDuration === '30days'}
                    onChange={(e) => setSelectedDuration(e.target.value as DelegationDuration)}
                    className="w-4 h-4 text-green-600 bg-neutral-800 border-neutral-600 focus:ring-green-500 focus:ring-2"
                  />
                  <span className="text-sm text-neutral-300">30 Days</span>
                </label>
              </div>
            </div>
          )}
          
          {/* Delegated Browser Public Key */}
          {isDelegationValid() && currentUser?.browserPubKey && (
            <div className="text-xs text-neutral-400">
              <div className="font-mono break-all bg-neutral-800 p-2 rounded">
                {currentUser.browserPubKey}
              </div>
            </div>
          )}
          
          {/* Wallet Address */}
          {currentUser && (
            <div className="text-xs text-neutral-400">
              <div className="font-mono break-all">
                {currentUser.address}
              </div>
            </div>
          )}
          
          {/* Delete Button for Active Delegations */}
          {isDelegationValid() && (
            <div className="flex justify-end">
              <Button
                onClick={clearDelegation}
                variant="outline"
                size="sm"
                className="text-red-400 border-red-400/30 hover:bg-red-400/10"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear Delegation
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="mt-auto space-y-2">
        {isDelegationValid() ? (
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
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            disabled={isLoading || isAuthenticating}
          >
            {isAuthenticating ? 'Delegating...' : 'Delegate Key'}
          </Button>
        )}
        
        <Button
          onClick={onBack}
          variant="outline"
          className="w-full border-neutral-600 text-neutral-300 hover:bg-neutral-800"
          disabled={isLoading}
        >
          Back
        </Button>
      </div>
    </div>
  );
} 