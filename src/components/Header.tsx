import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth, useNetworkStatus } from '@/hooks';
import { useForum } from '@/contexts/useForum';
import { Button } from '@/components/ui/button';

import {
  LogOut,
  Terminal,
  AlertTriangle,
  CheckCircle,
  Key,
  CircleSlash,
  Home,
  Grid3X3,
  User,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import { WalletWizard } from '@/components/ui/wallet-wizard';

import { useUserDisplay } from '@/hooks';

const Header = () => {
  const { verificationStatus, delegationInfo } = useAuth();
  const networkStatus = useNetworkStatus();
  const location = useLocation();
  const { toast } = useToast();
  const forum = useForum();

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

  // ✅ Get display name from enhanced hook
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
    if (!isConnected) return 'Connect Wallet';

    if (verificationStatus.level === 'verified-owner') {
      return delegationInfo.isActive ? 'Ready to Post' : 'Delegation Expired';
    } else if (verificationStatus.level === 'verified-basic') {
      return 'Verified (Read-only)';
    } else if (verificationStatus.level === 'unverified') {
      return verificationStatus.hasOrdinal
        ? 'Verify Wallet'
        : 'No Ordinals Found';
    } else {
      return 'Verify Wallet';
    }
  };

  const getStatusColor = () => {
    if (!isConnected) return 'text-red-400';

    if (
      verificationStatus.level === 'verified-owner' &&
      delegationInfo.isActive
    ) {
      return 'text-green-400';
    } else if (verificationStatus.level === 'verified-basic') {
      return 'text-yellow-400';
    } else if (verificationStatus.hasOrdinal || verificationStatus.hasENS) {
      return 'text-orange-400';
    } else {
      return 'text-red-400';
    }
  };

  const getStatusIcon = () => {
    if (!isConnected) return <CircleSlash className="w-4 h-4" />;

    if (
      verificationStatus.level === 'verified-owner' &&
      delegationInfo.isActive
    ) {
      return <CheckCircle className="w-4 h-4" />;
    } else if (verificationStatus.level === 'verified-basic') {
      return <AlertTriangle className="w-4 h-4" />;
    } else if (verificationStatus.hasOrdinal || verificationStatus.hasENS) {
      return <Key className="w-4 h-4" />;
    } else {
      return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <header className="bg-cyber-muted/20 border-b border-cyber-muted sticky top-0 z-50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-6">
            <Link
              to="/"
              className="text-xl font-bold text-glow hover:text-cyber-accent transition-colors"
            >
              <Terminal className="w-6 h-6 inline mr-2" />
              opchan
            </Link>

            <nav className="hidden md:flex space-x-4">
              <Link
                to="/"
                className={`flex items-center space-x-1 px-3 py-1 rounded-sm text-sm transition-colors ${
                  location.pathname === '/'
                    ? 'bg-cyber-accent/20 text-cyber-accent'
                    : 'text-cyber-neutral hover:text-cyber-accent hover:bg-cyber-muted/50'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Link>
              <Link
                to="/cells"
                className={`flex items-center space-x-1 px-3 py-1 rounded-sm text-sm transition-colors ${
                  location.pathname === '/cells'
                    ? 'bg-cyber-accent/20 text-cyber-accent'
                    : 'text-cyber-neutral hover:text-cyber-accent hover:bg-cyber-muted/50'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                <span>Cells</span>
              </Link>
              {isConnected && (
                <Link
                  to="/profile"
                  className={`flex items-center space-x-1 px-3 py-1 rounded-sm text-sm transition-colors ${
                    location.pathname === '/profile'
                      ? 'bg-cyber-accent/20 text-cyber-accent'
                      : 'text-cyber-neutral hover:text-cyber-accent hover:bg-cyber-muted/50'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </Link>
              )}
            </nav>
          </div>

          {/* Right side - Status and User */}
          <div className="flex items-center space-x-4">
            {/* Network Status */}
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  networkStatus.health.isConnected
                    ? 'bg-green-400'
                    : 'bg-red-400'
                }`}
              />
              <span className="text-xs text-cyber-neutral">
                {networkStatus.getStatusMessage()}
              </span>
              {forum.lastSync && (
                <span className="text-xs text-cyber-neutral ml-2">
                  Last updated{' '}
                  {new Date(forum.lastSync).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                  {forum.isSyncing ? ' • syncing…' : ''}
                </span>
              )}
            </div>

            {/* User Status */}
            {isConnected ? (
              <div className="flex items-center space-x-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center space-x-2">
                      <div className={getStatusColor()}>{getStatusIcon()}</div>
                      <div className="text-sm">
                        <div className="font-medium">{displayName}</div>
                        <div className={`text-xs ${getStatusColor()}`}>
                          {getAccountStatusText()}
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <div>Address: {address?.slice(0, 8)}...</div>
                      <div>Status: {getAccountStatusText()}</div>
                      {delegationInfo.timeRemaining && (
                        <div>
                          Delegation: {delegationInfo.timeRemaining} remaining
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
                  className="text-cyber-neutral hover:text-red-400"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleConnect}
                className="bg-cyber-accent hover:bg-cyber-accent/80"
              >
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Wallet Wizard */}
      <WalletWizard
        open={walletWizardOpen}
        onOpenChange={setWalletWizardOpen}
        onComplete={() => {
          setWalletWizardOpen(false);
          toast({
            title: 'Setup Complete',
            description: 'Your wallet is ready to use!',
          });
        }}
      />
    </header>
  );
};

export default Header;
