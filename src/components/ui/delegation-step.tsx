import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Key, Clock, Shield, Loader2, CheckCircle, AlertCircle } from "lucide-react";
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
    isAuthenticating 
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
          message: "Key delegation successful! You can now interact with the forum without additional wallet approvals.",
          expiry: expiryDate
        });
      } else {
        setDelegationResult({
          success: false,
          message: "Key delegation failed. You can still use the forum but will need to approve each action."
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

  const formatTimeRemaining = () => {
    const remaining = delegationTimeRemaining();
    if (remaining <= 0) return "Expired";
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  // Show delegation result
  if (delegationResult) {
    return (
      <div className="space-y-4">
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
        
        <Button
          onClick={handleComplete}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Complete Setup"
          )}
        </Button>
      </div>
    );
  }

  // Show existing delegation status
  if (isDelegationValid()) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-green-400 font-medium">Key Already Delegated</span>
          </div>
          <p className="text-sm text-neutral-300 mb-2">
            You already have an active key delegation.
          </p>
          <div className="text-xs text-neutral-400">
            <p>Time remaining: {formatTimeRemaining()}</p>
            {currentUser?.delegationExpiry && (
              <p>Expires: {new Date(currentUser.delegationExpiry).toLocaleString()}</p>
            )}
          </div>
        </div>
        
        <Button
          onClick={handleComplete}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          disabled={isLoading}
        >
          Complete Setup
        </Button>
      </div>
    );
  }

  // Show delegation form
  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <Key className="h-8 w-8 text-blue-500" />
        </div>
        <h3 className="text-lg font-semibold text-white">
          Delegate Signing Key
        </h3>
        <p className="text-sm text-neutral-400">
          Create a browser-based signing key for better user experience
        </p>
      </div>

      <div className="p-4 bg-neutral-900/50 border border-neutral-700 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-white">What is key delegation?</span>
        </div>
        <ul className="text-xs text-neutral-400 space-y-1">
          <li>• Creates a browser-based signing key for 24 hours</li>
          <li>• Allows posting, commenting, and voting without wallet approval</li>
          <li>• Automatically expires for security</li>
          <li>• Can be renewed anytime</li>
        </ul>
      </div>

      {currentUser?.browserPubKey && (
        <div className="p-3 bg-neutral-900/30 border border-neutral-600 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Key className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-white">Browser Key Generated</span>
          </div>
          <p className="text-xs text-neutral-400 font-mono break-all">
            {currentUser.browserPubKey.slice(0, 20)}...{currentUser.browserPubKey.slice(-20)}
          </p>
        </div>
      )}

      <div className="space-y-3">
        <Button
          onClick={handleDelegate}
          disabled={isLoading || isAuthenticating}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading || isAuthenticating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Delegating Key...
            </>
          ) : (
            "Delegate Signing Key"
          )}
        </Button>
        
        <Button
          onClick={onBack}
          variant="outline"
          className="w-full border-neutral-600 text-neutral-400 hover:bg-neutral-800"
          disabled={isLoading || isAuthenticating}
        >
          Back to Verification
        </Button>
      </div>

      <div className="text-xs text-neutral-500 text-center space-y-1">
        <p>Key delegation is optional but recommended for better UX</p>
        <p>You can still use the forum without delegation</p>
      </div>
    </div>
  );
} 