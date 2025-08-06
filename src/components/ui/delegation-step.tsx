import * as React from "react";
import { Button } from "@/components/ui/button";
import { Key, Loader2, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/useAuth";

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
      const success = await delegateKey();
      
      if (success) {
        const expiryDate = currentUser.delegationExpiry 
          ? new Date(currentUser.delegationExpiry).toLocaleString()
          : '24 hours from now';
          
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
            <Key className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-white">
            Delegate Signing Key
          </h3>
          <p className="text-sm text-neutral-400">
            Create a browser-based signing key
          </p>
        </div>

        {/* Delegation Status */}
        <div className="p-4 bg-neutral-900/30 border border-neutral-700 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-white">Key Delegation</span>
            </div>
            {currentUser?.walletType === 'bitcoin' ? (
              <div className="text-orange-500 text-sm">₿</div>
            ) : (
              <div className="text-blue-500 text-sm">Ξ</div>
            )}
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
                  className="border-red-600/50 text-red-400 hover:bg-red-600/20 hover:border-red-500 text-xs px-2 py-1 h-auto"
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Remove
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-auto space-y-3">
        {!isDelegationValid() && (
          <Button
            onClick={handleDelegate}
            disabled={isLoading || isAuthenticating}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading || isAuthenticating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Delegating...
              </>
            ) : (
              "Delegate Key"
            )}
          </Button>
        )}
        
        {isDelegationValid() && (
          <Button
            onClick={handleComplete}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            disabled={isLoading}
          >
            Complete Setup
          </Button>
        )}
        
        <Button
          onClick={onBack}
          variant="outline"
          className="w-full border-neutral-600 text-neutral-400 hover:bg-neutral-800"
          disabled={isLoading || isAuthenticating}
        >
          Back
        </Button>
      </div>
    </div>
  );
} 