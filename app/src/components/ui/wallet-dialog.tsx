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
import { Coins } from 'lucide-react';
import { useAuth } from '@opchan/react';

interface WalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalletConnectionDialog({
  open,
  onOpenChange,
}: WalletDialogProps) {
  const { connect, disconnect, currentUser } = useAuth();

  const handleDisconnect = async () => {
    await disconnect();
    onOpenChange(false);
  };

  const handleConnect = () => {
    connect();
  };

  const isConnected = Boolean(currentUser);
  const activeChain = 'Ethereum';
  const activeAddress = currentUser?.address;

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
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold text-white">Ethereum</h3>
                  <Badge variant="secondary" className="text-xs">
                    ENS Ownership Recommended
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={handleConnect}
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
                    Connect Wallet
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
