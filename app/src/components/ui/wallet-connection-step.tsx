import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@opchan/react';
import { useEffect } from 'react';

interface WalletConnectionStepProps {
  onComplete: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function WalletConnectionStep({
  onComplete,
  isLoading,
  setIsLoading,
}: WalletConnectionStepProps) {
  const { isAuthenticated, currentUser, connect } = useAuth();

  // Auto-complete step when wallet connects
  useEffect(() => {
    if (isAuthenticated && currentUser?.address) {
      onComplete();
    }
  }, [isAuthenticated, currentUser, onComplete]);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      connect();
    } catch (error) {
      console.error('Error connecting wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show connected state
  if (isAuthenticated && currentUser) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 space-y-4">
          <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-green-400 font-medium">
                Wallet Connected
              </span>
            </div>
            <p className="text-sm text-neutral-300 mb-2">
              Connected with {currentUser.address.slice(0, 6)}...
              {currentUser.address.slice(-4)}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-auto">
          <Button
            onClick={onComplete}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isLoading}
          >
            Next
          </Button>
        </div>
      </div>
    );
  }

  // Show connection option
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4">
        <p className="text-sm text-neutral-400 text-center">
          Connect your Ethereum wallet to use OpChan
        </p>

        {/* Ethereum Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 justify-center">
            <Wallet className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-white">Ethereum Wallet</h3>
            <Badge variant="secondary" className="text-xs">
              ENS Optional
            </Badge>
          </div>
          <Button
            onClick={handleConnect}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            style={{
              height: '48px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="h-5 w-5" />
                Connect Wallet
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-neutral-500 text-center pt-2">
          Supports MetaMask, WalletConnect, Coinbase Wallet, and more
        </div>
      </div>
    </div>
  );
}
