import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';
import { useForum } from '@/contexts/useForum';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LogOut,
  Terminal,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  Key,
  RefreshCw,
  CircleSlash,
  Home,
  Grid3X3,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import { WalletWizard } from '@/components/ui/wallet-wizard';
import { CallSignSetupDialog } from '@/components/ui/call-sign-setup-dialog';
import { useUserDisplay } from '@/hooks/useUserDisplay';

const Header = () => {
  const { verificationStatus, getDelegationStatus } = useAuth();
  const { isNetworkConnected, isRefreshing } = useForum();
  const location = useLocation();
  const { toast } = useToast();
  // Use AppKit hooks for multi-chain support
  const bitcoinAccount = useAppKitAccount({ namespace: 'bip122' });
  const ethereumAccount = useAppKitAccount({ namespace: 'eip155' });
  const { disconnect } = useDisconnect();

  // Determine which account is connected
  const isBitcoinConnected = bitcoinAccount.isConnected;
  const isEthereumConnected = ethereumAccount.isConnected;
  const isConnected = isBitcoinConnected || isEthereumConnected;
  const address = isConnected
    ? isBitcoinConnected
      ? bitcoinAccount.address
      : ethereumAccount.address
    : undefined;

  const [walletWizardOpen, setWalletWizardOpen] = useState(false);

  // Get display name from hook
  const { displayName } = useUserDisplay(address || '');

  // Use sessionStorage to persist wizard state across navigation
  const getHasShownWizard = () => {
    try {
      return sessionStorage.getItem('hasShownWalletWizard') === 'true';
    } catch {
      return false;
    }
  };

  const setHasShownWizard = (value: boolean) => {
    try {
      sessionStorage.setItem('hasShownWalletWizard', value.toString());
    } catch {
      // Fallback if sessionStorage is not available
    }
  };

  // Auto-open wizard when wallet connects for the first time
  React.useEffect(() => {
    if (isConnected && !getHasShownWizard()) {
      setWalletWizardOpen(true);
      setHasShownWizard(true);
    }
  }, [isConnected]);

  const handleConnect = async () => {
    setWalletWizardOpen(true);
  };

  const handleDisconnect = async () => {
    await disconnect();
    setHasShownWizard(false); // Reset so wizard can show again on next connection
    toast({
      title: 'Wallet Disconnected',
      description: 'Your wallet has been disconnected successfully.',
    });
  };

  const getAccountStatusText = () => {
    switch (verificationStatus) {
      case 'unverified':
        return 'Setup Required';
      case 'verifying':
        return 'Verifying...';
      case 'verified-none':
        return 'Read-Only Access';
      case 'verified-basic':
        return getDelegationStatus().isValid ? 'Full Access' : 'Setup Key';
      case 'verified-owner':
        return getDelegationStatus().isValid ? 'Premium Access' : 'Setup Key';
      default:
        return 'Setup Account';
    }
  };

  const getAccountStatusIcon = () => {
    switch (verificationStatus) {
      case 'unverified':
        return <AlertTriangle className="w-3 h-3" />;
      case 'verifying':
        return <RefreshCw className="w-3 h-3 animate-spin" />;
      case 'verified-none':
        return <CircleSlash className="w-3 h-3" />;
      case 'verified-basic':
        return getDelegationStatus().isValid ? (
          <CheckCircle className="w-3 h-3" />
        ) : (
          <CheckCircle className="w-3 h-3" />
        );
      case 'verified-owner':
        return getDelegationStatus().isValid ? (
          <CheckCircle className="w-3 h-3" />
        ) : (
          <Key className="w-3 h-3" />
        );
      default:
        return <AlertTriangle className="w-3 h-3" />;
    }
  };

  const getAccountStatusVariant = () => {
    switch (verificationStatus) {
      case 'unverified':
        return 'destructive';
      case 'verifying':
        return 'outline';
      case 'verified-none':
        return 'secondary';
      case 'verified-basic':
        return getDelegationStatus().isValid ? 'default' : 'outline';
      case 'verified-owner':
        return getDelegationStatus().isValid ? 'default' : 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <>
      <header className="border-b border-cyber-muted bg-cyber-dark fixed top-0 left-0 right-0 z-50 h-16">
        <div className="container mx-auto px-4 h-full flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Terminal className="text-cyber-accent w-6 h-6" />
              <Link
                to="/"
                className="text-xl font-bold text-glow text-cyber-accent"
              >
                OpChan
              </Link>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center space-x-1">
              <Link
                to="/"
                className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-sm transition-colors ${
                  location.pathname === '/'
                    ? 'bg-cyber-accent/20 text-cyber-accent'
                    : 'text-gray-300 hover:text-cyber-accent hover:bg-cyber-accent/10'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Feed</span>
              </Link>
              <Link
                to="/cells"
                className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-sm transition-colors ${
                  location.pathname === '/cells'
                    ? 'bg-cyber-accent/20 text-cyber-accent'
                    : 'text-gray-300 hover:text-cyber-accent hover:bg-cyber-accent/10'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                <span>Cells</span>
              </Link>
            </nav>
          </div>

          <div className="flex gap-3 items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant={isNetworkConnected ? 'default' : 'destructive'}
                  className="flex items-center gap-1 text-xs px-2 h-7 cursor-help"
                >
                  {isNetworkConnected ? (
                    <>
                      <Wifi className="w-3 h-3" />
                      <span>WAKU: Connected</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3" />
                      <span>WAKU: Offline</span>
                    </>
                  )}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="text-sm">
                <p>
                  {isNetworkConnected
                    ? 'Waku network connection active.'
                    : 'Waku network connection lost.'}
                </p>
                {isRefreshing && <p>Refreshing data...</p>}
              </TooltipContent>
            </Tooltip>

            {!isConnected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleConnect}
                className="text-xs px-2 h-7"
              >
                Connect Wallet
              </Button>
            ) : (
              <div className="flex gap-2 items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={getAccountStatusVariant()}
                      size="sm"
                      onClick={() => setWalletWizardOpen(true)}
                      className="flex items-center gap-1 text-xs px-2 h-7"
                    >
                      {getAccountStatusIcon()}
                      <span>{getAccountStatusText()}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[260px] text-sm">
                    <p className="font-semibold mb-1">Account Setup</p>
                    <p>
                      Click to view and manage your wallet connection,
                      verification status, and key delegation.
                    </p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="hidden md:flex items-center text-xs text-muted-foreground cursor-default px-2 h-7">
                      {displayName}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="text-sm">
                    <p>
                      {displayName !==
                      `${address?.slice(0, 5)}...${address?.slice(-4)}`
                        ? `${displayName} (${address})`
                        : address}
                    </p>
                  </TooltipContent>
                </Tooltip>
                <CallSignSetupDialog />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDisconnect}
                      className="w-7 h-7"
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-sm">
                    Disconnect Wallet
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      </header>

      <WalletWizard
        open={walletWizardOpen}
        onOpenChange={setWalletWizardOpen}
        onComplete={() => {
          toast({
            title: 'Setup Complete',
            description: 'You can now use all OpChan features!',
          });
        }}
      />
    </>
  );
};

export default Header;
