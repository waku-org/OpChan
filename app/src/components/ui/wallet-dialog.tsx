import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bitcoin, Coins } from 'lucide-react';
import { useAuth, useAppKitWallet } from '@opchan/react';

interface WalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalletConnectionDialog({
  open,
  onOpenChange,
}: WalletDialogProps) {
  const { connect, disconnect } = useAuth();
  const wallet = useAppKitWallet();

  const handleDisconnect = async () => {
    await disconnect();
    onOpenChange(false);
  };

  const handleBitcoinConnect = () => {
    if (!wallet.isInitialized) {
      console.error('Wallet not initialized');
      return;
    }
    connect('bitcoin');
  };

  const handleEthereumConnect = () => {
    if (!wallet.isInitialized) {
      console.error('Wallet not initialized');
      return;
    }
    connect('ethereum');
  };

  // Show loading state if wallet is not initialized
  if (!wallet.isInitialized) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md border-neutral-800 bg-black text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">Connect Wallet</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Initializing wallet connection...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isConnected = wallet.isConnected;
  const activeChain = wallet.walletType === 'bitcoin' ? 'Bitcoin' : 'Ethereum';
  const activeAddress = wallet.address;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-neutral-800 bg-black text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Connect Wallet</DialogTitle>
          <DialogDescription className="text-neutral-400">
            {isConnected
              ? `Connected to ${activeChain} with ${activeAddress?.slice(0, 6)}...${activeAddress?.slice(-4)}`
              : 'Choose a network and wallet to connect to OpChan'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {!isConnected ? (
            <div className="space-y-4">
              {/* Bitcoin Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Bitcoin className="h-5 w-5 text-orange-500" />
                  <h3 className="font-semibold text-white">Bitcoin</h3>
                  <Badge variant="secondary" className="text-xs">
                    Ordinal Verification Required
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={handleBitcoinConnect}
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
                      gap: '8px',
                    }}
                  >
                    Connect Bitcoin Wallet
                  </Button>
                </div>
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
                <div className="space-y-2">
                  <Button
                    onClick={handleEthereumConnect}
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
                      gap: '8px',
                    }}
                  >
                    Connect Ethereum Wallet
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-700">
                <p className="text-sm text-neutral-300 mb-2">
                  Connected Network:
                </p>
                <p className="text-sm font-semibold text-white mb-2">
                  {activeChain}
                </p>
                <p className="text-sm text-neutral-300 mb-2">Address:</p>
                <p className="text-xs font-mono text-neutral-400 break-all">
                  {activeAddress
                    ? `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`
                    : ''}
                </p>
              </div>

              <Button
                onClick={handleDisconnect}
                variant="outline"
                className="w-full border-red-500 text-red-500 hover:bg-red-500/10"
              >
                Disconnect Wallet
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between text-xs text-neutral-500">
          <p>Connect your wallet to use OpChan's features</p>
          {isConnected && (
            <p className="text-green-400">
              ✓ Wallet connected to {activeChain}
            </p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
