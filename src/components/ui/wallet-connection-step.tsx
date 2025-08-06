import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bitcoin, Coins, Loader2 } from "lucide-react";
import { 
  useAppKit, 
  useAppKitAccount, 
  useAppKitState
} from "@reown/appkit/react";
import { useAuth } from "@/contexts/useAuth";

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
  const { initialized } = useAppKitState();
  const appKit = useAppKit();
  const { isAuthenticated } = useAuth();
  
  // Get account info for different chains
  const bitcoinAccount = useAppKitAccount({ namespace: "bip122" });
  const ethereumAccount = useAppKitAccount({ namespace: "eip155" });
  
  // Determine which account is connected
  const isBitcoinConnected = bitcoinAccount.isConnected;
  const isEthereumConnected = ethereumAccount.isConnected;
  const isConnected = isBitcoinConnected || isEthereumConnected;
  
  // Get the active account info
  const activeAccount = isBitcoinConnected ? bitcoinAccount : ethereumAccount;
  const activeAddress = activeAccount.address;
  const activeChain = isBitcoinConnected ? "Bitcoin" : "Ethereum";

  const handleBitcoinConnect = async () => {
    if (!initialized || !appKit) {
      console.error('AppKit not initialized');
      return;
    }
    
    setIsLoading(true);
    try {
      await appKit.open({ 
        view: "Connect", 
        namespace: "bip122" 
      });
    } catch (error) {
      console.error('Error connecting Bitcoin wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEthereumConnect = async () => {
    if (!initialized || !appKit) {
      console.error('AppKit not initialized');
      return;
    }
    
    setIsLoading(true);
    try {
      await appKit.open({ 
        view: "Connect", 
        namespace: "eip155" 
      });
    } catch (error) {
      console.error('Error connecting Ethereum wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    onComplete();
  };

  // Show loading state if AppKit is not initialized
  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-neutral-400 text-center">
          Initializing wallet connection...
        </p>
      </div>
    );
  }

  // Show connected state
  if (isConnected) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 space-y-4">
          <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-400 font-medium">Wallet Connected</span>
            </div>
            <p className="text-sm text-neutral-300 mb-2">
              Connected to {activeChain} with {activeAddress?.slice(0, 6)}...{activeAddress?.slice(-4)}
            </p>
          </div>
        </div>
        
        {/* Action Button */}
        <div className="mt-auto">
          <Button
            onClick={handleNext}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isLoading}
          >
            Next
          </Button>
        </div>
      </div>
    );
  }

  // Show connection options
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4">
        <p className="text-sm text-neutral-400 text-center">
          Choose a network and wallet to connect to OpChan
        </p>

        {/* Bitcoin Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bitcoin className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold text-white">Bitcoin</h3>
            <Badge variant="secondary" className="text-xs">
              Ordinal Verification Required
            </Badge>
          </div>
          <Button
            onClick={handleBitcoinConnect}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
            style={{
              height: '44px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect Bitcoin Wallet"
            )}
          </Button>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-neutral-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-black px-2 text-neutral-500">or</span>
          </div>
        </div>

        {/* Ethereum Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-white">Ethereum</h3>
            <Badge variant="secondary" className="text-xs">
              ENS Ownership Required
            </Badge>
          </div>
          <Button
            onClick={handleEthereumConnect}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            style={{
              height: '44px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect Ethereum Wallet"
            )}
          </Button>
        </div>

        <div className="text-xs text-neutral-500 text-center pt-2">
          Connect your wallet to use OpChan's features
        </div>
      </div>
    </div>
  );
} 